import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from '../lib/nodePath';
import Electron from '../lib/electronApi';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import { calculatePaieDz } from './rh-conformite-dz.service';
import { listEmployes } from './rh.service';
import type {
  CreatePrimeInput,
  RhBulletin,
  RhDlgConfig,
  RhDlgExchangeResult,
  RhDlgJournalEntry,
  RhPrime,
  UpdateDlgConfigInput,
} from '../../src/shared/types/rh';

const SETTINGS_KEYS = {
  exportPath: 'rh_dlg_export_path',
  importPath: 'rh_dlg_import_path',
  prefixMatricule: 'rh_dlg_prefix_matricule',
  lastExport: 'rh_dlg_last_export',
  lastImport: 'rh_dlg_last_import',
} as const;

function assertRhPaie(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

function readSetting(key: string, fallback = ''): string {
  const row = getDatabase()
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

function writeSetting(key: string, value: string): void {
  getDatabase()
    .prepare(`INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`)
    .run(key, value);
}

function periodeBounds(periode: string): { debut: string; fin: string } {
  const [y, m] = periode.split('-').map(Number);
  const fin = new Date(y, m, 0).toISOString().slice(0, 10);
  return { debut: `${periode}-01`, fin };
}

function defaultMatricule(employeId: number, prefix: string): string {
  const p = prefix.trim() || 'HMP';
  return `${p}-${String(employeId).padStart(5, '0')}`;
}

function resolveMatricule(
  employeId: number,
  dlgMatricule: string | null | undefined,
  prefix: string,
): string {
  return (dlgMatricule?.trim() || defaultMatricule(employeId, prefix)).toUpperCase();
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvLine(cols: (string | number)[]): string {
  return cols.map(csvEscape).join(';');
}

function parseCsvSemicolon(content: string): string[][] {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ';' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  });
}

function mapBulletin(row: Record<string, unknown>): RhBulletin {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    dlgMatricule: (row.dlg_matricule as string | null) ?? null,
    periode: row.periode as string,
    brut: row.brut as number,
    net: row.net as number,
    charges: row.charges as number,
    heuresTravaillees: row.heures_travaillees as number,
    joursAbsence: row.jours_absence as number,
    primesTotal: row.primes_total as number,
    statut: row.statut as RhBulletin['statut'],
    source: row.source as RhBulletin['source'],
    dlgReference: (row.dlg_reference as string | null) ?? null,
    tresorerieId: (row.tresorerie_id as number | null) ?? null,
  };
}

const bulletinSql = `
  SELECT b.*, e.prenom || ' ' || e.nom AS employe_nom, e.dlg_matricule
  FROM rh_bulletins b
  INNER JOIN rh_employes e ON e.id = b.employe_id AND e.deleted_at IS NULL
`;

export function getDlgConfig(actorUserId: number): RhDlgConfig {
  assertRhPaie(actorUserId);
  return {
    exportPath: readSetting(SETTINGS_KEYS.exportPath),
    importPath: readSetting(SETTINGS_KEYS.importPath),
    prefixMatricule: readSetting(SETTINGS_KEYS.prefixMatricule, 'HMP'),
    lastExportAt: readSetting(SETTINGS_KEYS.lastExport, '') || null,
    lastImportAt: readSetting(SETTINGS_KEYS.lastImport, '') || null,
  };
}

export function setDlgConfig(actorUserId: number, input: UpdateDlgConfigInput): RhDlgConfig {
  assertRhPaie(actorUserId);
  if (input.exportPath !== undefined) writeSetting(SETTINGS_KEYS.exportPath, input.exportPath.trim());
  if (input.importPath !== undefined) writeSetting(SETTINGS_KEYS.importPath, input.importPath.trim());
  if (input.prefixMatricule !== undefined) writeSetting(SETTINGS_KEYS.prefixMatricule, input.prefixMatricule.trim());
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: 'Config passerelle DLG PC PAIE' });
  return getDlgConfig(actorUserId);
}

export async function pickDlgFolder(actorUserId: number, kind: 'export' | 'import'): Promise<string | null> {
  assertRhPaie(actorUserId);
  const { canceled, filePaths } = await Electron.dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: kind === 'export' ? 'Dossier export DLG PC PAIE' : 'Dossier import DLG PC PAIE',
  });
  if (canceled || !filePaths[0]) return null;
  const folder = filePaths[0];
  if (kind === 'export') setDlgConfig(actorUserId, { exportPath: folder });
  else setDlgConfig(actorUserId, { importPath: folder });
  return folder;
}

export function listBulletins(actorUserId: number, periode?: string): RhBulletin[] {
  assertRhPaie(actorUserId);
  const conditions = ['1=1'];
  const params: unknown[] = [];
  if (periode) {
    conditions.push('b.periode = ?');
    params.push(periode);
  }
  return getDatabase()
    .prepare(`${bulletinSql} WHERE ${conditions.join(' AND ')} ORDER BY e.nom, e.prenom`)
    .all(...params)
    .map((r) => mapBulletin(r as Record<string, unknown>));
}

export function listPrimes(actorUserId: number, periode?: string, employeId?: number): RhPrime[] {
  assertRhPaie(actorUserId);
  const conditions = ['1=1'];
  const params: unknown[] = [];
  if (periode) {
    conditions.push('p.periode = ?');
    params.push(periode);
  }
  if (employeId) {
    conditions.push('p.employe_id = ?');
    params.push(employeId);
  }
  return getDatabase()
    .prepare(`
      SELECT p.*, e.prenom || ' ' || e.nom AS employe_nom
      FROM rh_primes p
      INNER JOIN rh_employes e ON e.id = p.employe_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.periode DESC, employe_nom
    `)
    .all(...params)
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as number,
        employeId: r.employe_id as number,
        employeNom: r.employe_nom as string,
        periode: r.periode as string,
        code: r.code as string,
        libelle: r.libelle as string,
        montant: r.montant as number,
        source: r.source as RhPrime['source'],
      };
    });
}

export function createPrime(actorUserId: number, input: CreatePrimeInput): RhPrime {
  assertRhPaie(actorUserId);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO rh_primes (employe_id, periode, code, libelle, montant, source)
    VALUES (?, ?, ?, ?, ?, 'manuel')
  `).run(input.employeId, input.periode, input.code.trim(), input.libelle.trim(), input.montant);
  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Prime ${input.code} employé #${input.employeId} (${input.periode})`,
  });
  return listPrimes(actorUserId, input.periode, input.employeId).find((p) => p.id === Number(result.lastInsertRowid))!;
}

export function deletePrime(actorUserId: number, primeId: number): void {
  assertRhPaie(actorUserId);
  getDatabase().prepare(`DELETE FROM rh_primes WHERE id = ?`).run(primeId);
}

function logDlgJournal(
  actorUserId: number,
  sens: 'export' | 'import',
  periode: string | null,
  fichier: string,
  nbLignes: number,
  statut: RhDlgJournalEntry['statut'],
  message: string | null,
): void {
  getDatabase().prepare(`
    INSERT INTO rh_dlg_journal (sens, periode, fichier, nb_lignes, statut, message, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(sens, periode, fichier, nbLignes, statut, message, actorUserId);
}

export function listDlgJournal(actorUserId: number, limit = 30): RhDlgJournalEntry[] {
  assertRhPaie(actorUserId);
  return getDatabase()
    .prepare(`SELECT * FROM rh_dlg_journal ORDER BY created_at DESC LIMIT ?`)
    .all(limit)
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as number,
        sens: row.sens as RhDlgJournalEntry['sens'],
        periode: (row.periode as string | null) ?? null,
        fichier: row.fichier as string,
        nbLignes: row.nb_lignes as number,
        statut: row.statut as RhDlgJournalEntry['statut'],
        message: (row.message as string | null) ?? null,
        createdAt: row.created_at as string,
      };
    });
}

export function generatePrePaie(actorUserId: number, periode: string): RhBulletin[] {
  assertRhPaie(actorUserId);
  const db = getDatabase();
  const { debut, fin } = periodeBounds(periode);
  const employes = listEmployes(actorUserId).filter((e) => e.statutRh === 'actif');

  for (const emp of employes) {
    const contrat = db.prepare(`
      SELECT salaire_brut FROM rh_contrats WHERE employe_id = ? AND actif = 1 ORDER BY date_debut DESC LIMIT 1
    `).get(emp.id) as { salaire_brut: number } | undefined;
    if (!contrat) continue;

    const heures = (db.prepare(`
      SELECT COALESCE(SUM(heures_travaillees), 0) AS h
      FROM rh_pointages WHERE employe_id = ? AND date BETWEEN ? AND ? AND statut = 'valide'
    `).get(emp.id, debut, fin) as { h: number }).h;

    const joursAbs = (db.prepare(`
      SELECT COALESCE(SUM(CAST(julianday(date_fin) - julianday(date_debut) + 1 AS REAL)), 0) AS j
      FROM rh_absences
      WHERE employe_id = ? AND statut = 'approuvee' AND date_debut <= ? AND date_fin >= ?
    `).get(emp.id, fin, debut) as { j: number }).j;

    const primesTotal = (db.prepare(`
      SELECT COALESCE(SUM(montant), 0) AS t FROM rh_primes WHERE employe_id = ? AND periode = ?
    `).get(emp.id, periode) as { t: number }).t;

    const brut = contrat.salaire_brut + primesTotal;
    const empRow = db.prepare(`SELECT enfants_charge FROM rh_employes WHERE id = ?`).get(emp.id) as
      | { enfants_charge: number }
      | undefined;
    const paie = calculatePaieDz(brut, empRow?.enfants_charge ?? 0);
    const charges = paie.chargesSalariales;
    const net = paie.net;

    db.prepare(`
      INSERT INTO rh_bulletins (
        employe_id, periode, brut, net, charges, heures_travaillees, jours_absence, primes_total, statut, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'brouillon', 'local')
      ON CONFLICT(employe_id, periode) DO UPDATE SET
        brut = excluded.brut,
        net = excluded.net,
        charges = excluded.charges,
        heures_travaillees = excluded.heures_travaillees,
        jours_absence = excluded.jours_absence,
        primes_total = excluded.primes_total,
        updated_at = datetime('now')
      WHERE rh_bulletins.statut IN ('brouillon', 'exporte')
    `).run(emp.id, periode, brut, net, charges, heures, joursAbs, primesTotal);
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Pré-paie générée ${periode}`,
  });
  return listBulletins(actorUserId, periode);
}

export function exportVersDlg(actorUserId: number, periode: string): RhDlgExchangeResult {
  assertRhPaie(actorUserId);
  const config = getDlgConfig(actorUserId);
  if (!config.exportPath) throw new Error('Configurez le dossier export DLG PC PAIE.');

  const bulletins = listBulletins(actorUserId, periode);
  if (bulletins.length === 0) {
    throw new Error('Aucun bulletin pour cette période. Générez d\'abord la pré-paie.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(config.exportPath, `DLG_EXPORT_${periode}_${stamp}`);
  mkdirSync(outDir, { recursive: true });

  const employes = listEmployes(actorUserId).filter((e) => e.statutRh === 'actif');
  const db = getDatabase();
  const salariesLines = [
    csvLine([
      'MATRICULE',
      'NOM',
      'PRENOM',
      'DATE_EMBAUCHE',
      'FONCTION',
      'SERVICE',
      'SALAIRE_BASE',
      'TELEPHONE',
      'EMAIL',
    ]),
  ];

  for (const emp of employes) {
    const matricule = resolveMatricule(emp.id, emp.dlgMatricule, config.prefixMatricule);
    if (!emp.dlgMatricule) {
      db.prepare(`UPDATE rh_employes SET dlg_matricule = ?, updated_at = datetime('now') WHERE id = ?`).run(
        matricule,
        emp.id,
      );
    }
    const contrat = db.prepare(`
      SELECT salaire_brut FROM rh_contrats WHERE employe_id = ? AND actif = 1 LIMIT 1
    `).get(emp.id) as { salaire_brut: number } | undefined;
    salariesLines.push(
      csvLine([
        matricule,
        emp.nom,
        emp.prenom,
        emp.dateEmbauche,
        emp.posteNom ?? '',
        emp.departementNom ?? emp.hotelName ?? '',
        contrat?.salaire_brut ?? 0,
        emp.telephone ?? '',
        emp.emailPersonnel ?? '',
      ]),
    );
  }

  const variablesLines = [
    csvLine(['MATRICULE', 'CODE_RUBRIQUE', 'LIBELLE', 'VALEUR', 'UNITE', 'PERIODE']),
  ];
  for (const b of bulletins) {
    const matricule = resolveMatricule(b.employeId, b.dlgMatricule, config.prefixMatricule);
    variablesLines.push(
      csvLine([matricule, 'HEURES_TRAVAILLEES', 'Heures travaillées', b.heuresTravaillees, 'H', periode]),
    );
    if (b.joursAbsence > 0) {
      variablesLines.push(
        csvLine([matricule, 'ABSENCE_JOURS', 'Jours absence', b.joursAbsence, 'J', periode]),
      );
    }
    if (b.primesTotal > 0) {
      variablesLines.push(
        csvLine([matricule, 'PRIME_VARIABLE', 'Primes variables', b.primesTotal, 'M', periode]),
      );
    }
    const primes = listPrimes(actorUserId, periode, b.employeId);
    for (const pr of primes) {
      variablesLines.push(csvLine([matricule, pr.code, pr.libelle, pr.montant, 'M', periode]));
    }
  }

  const salariesFile = path.join(outDir, 'SALARIES.csv');
  const variablesFile = path.join(outDir, `VARIABLES_${periode.replace('-', '')}.csv`);
  const readmeFile = path.join(outDir, 'README_IMPORT_DLG.txt');
  const manifestFile = path.join(outDir, 'manifest.json');

  const bom = '\uFEFF';
  writeFileSync(salariesFile, bom + salariesLines.join('\n'), 'utf8');
  writeFileSync(variablesFile, bom + variablesLines.join('\n'), 'utf8');
  writeFileSync(
    readmeFile,
    [
      'PASSERELLE Hotel Metrics Pro → DLG PC PAIE',
      `Période : ${periode}`,
      `Généré le : ${new Date().toISOString()}`,
      '',
      'Étapes dans DLG PC PAIE :',
      '1. Menu Fichier → Importer données depuis un dossier',
      '2. Sélectionner ce dossier',
      '3. Cocher : Tables + Salariés + Variables (rubriques)',
      '4. Vérifier la correspondance des matricules',
      '',
      'Fichiers :',
      '- SALARIES.csv : fiches salariés',
      `- VARIABLES_${periode.replace('-', '')}.csv : variables mensuelles`,
      '',
      'Après calcul paie dans DLG, déposer BULLETINS_' + periode.replace('-', '') + '.csv',
      'dans le dossier import configuré dans Hotel Metrics Pro, puis lancer Import.',
    ].join('\n'),
    'utf8',
  );
  writeFileSync(
    manifestFile,
    JSON.stringify(
      {
        source: 'Hotel_Metrics_Pro',
        target: 'DLG_PC_PAIE',
        periode,
        fichiers: ['SALARIES.csv', path.basename(variablesFile)],
        nbSalaries: employes.length,
        nbVariables: variablesLines.length - 1,
      },
      null,
      2,
    ),
    'utf8',
  );

  const db2 = getDatabase();
  for (const b of bulletins) {
    db2.prepare(`
      UPDATE rh_bulletins SET statut = 'exporte', dlg_reference = ?, updated_at = datetime('now')
      WHERE id = ? AND statut IN ('brouillon', 'exporte')
    `).run(outDir, b.id);
  }

  writeSetting(SETTINGS_KEYS.lastExport, new Date().toISOString());
  logDlgJournal(actorUserId, 'export', periode, outDir, bulletins.length, 'ok', 'Export DLG réussi');

  writeAuditLog({
    userId: actorUserId,
    action: 'EXPORT',
    module: 'rh',
    description: `Export DLG PC PAIE ${periode} → ${outDir}`,
  });

  return {
    ok: true,
    periode,
    fichiers: [salariesFile, variablesFile, readmeFile, manifestFile],
    nbLignes: bulletins.length,
    message: `${bulletins.length} bulletin(s) exporté(s) vers ${outDir}`,
  };
}

export function importDepuisDlg(actorUserId: number, periode: string): RhDlgExchangeResult {
  assertRhPaie(actorUserId);
  const config = getDlgConfig(actorUserId);
  if (!config.importPath) throw new Error('Configurez le dossier import DLG PC PAIE.');
  if (!existsSync(config.importPath)) throw new Error('Dossier import introuvable.');

  const suffix = periode.replace('-', '');
  const candidates = [
    `BULLETINS_${suffix}.csv`,
    `RESULTAT_PAIE_${suffix}.csv`,
    `PAIE_${suffix}.csv`,
  ];
  let filePath: string | null = null;
  for (const name of candidates) {
    const p = path.join(config.importPath, name);
    if (existsSync(p)) {
      filePath = p;
      break;
    }
  }
  if (!filePath) {
    const files = readdirSync(config.importPath).filter((f) =>
      f.toUpperCase().includes('BULLETIN') && f.endsWith('.csv'),
    );
    if (files.length === 1) filePath = path.join(config.importPath, files[0]);
  }
  if (!filePath) {
    throw new Error(
      `Fichier BULLETINS_${suffix}.csv introuvable dans le dossier import. Exportez les bulletins depuis DLG PC PAIE.`,
    );
  }

  const rows = parseCsvSemicolon(readFileSync(filePath, 'utf8'));
  if (rows.length < 2) throw new Error('Fichier import vide ou invalide.');

  const header = rows[0].map((h) => h.toUpperCase().replace(/\s+/g, '_'));
  const idx = (name: string) => header.findIndex((h) => h.includes(name));
  const iMat = idx('MATRICULE');
  const iBrut = idx('BRUT');
  const iNet = idx('NET');
  const iCharges = header.findIndex((h) => h.includes('CHARGE') || h.includes('COTIS'));
  const iHeures = idx('HEURE');
  if (iMat < 0 || iBrut < 0 || iNet < 0) {
    throw new Error('Colonnes requises : MATRICULE, BRUT, NET (séparateur ;).');
  }

  const db = getDatabase();
  let ok = 0;
  let errors = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const matricule = row[iMat]?.toUpperCase();
    if (!matricule) continue;
    const emp = db
      .prepare(`SELECT id FROM rh_employes WHERE UPPER(dlg_matricule) = ? AND deleted_at IS NULL`)
      .get(matricule) as { id: number } | undefined;
    if (!emp) {
      errors++;
      continue;
    }
    const brut = parseFloat(row[iBrut]?.replace(',', '.') || '0');
    const net = parseFloat(row[iNet]?.replace(',', '.') || '0');
    const charges = iCharges >= 0 ? parseFloat(row[iCharges]?.replace(',', '.') || '0') : Math.round((brut - net) * 100) / 100;
    const heures = iHeures >= 0 ? parseFloat(row[iHeures]?.replace(',', '.') || '0') : 0;

    db.prepare(`
      INSERT INTO rh_bulletins (employe_id, periode, brut, net, charges, heures_travaillees, statut, source, dlg_reference)
      VALUES (?, ?, ?, ?, ?, ?, 'importe', 'dlg', ?)
      ON CONFLICT(employe_id, periode) DO UPDATE SET
        brut = excluded.brut,
        net = excluded.net,
        charges = excluded.charges,
        heures_travaillees = CASE WHEN excluded.heures_travaillees > 0 THEN excluded.heures_travaillees ELSE rh_bulletins.heures_travaillees END,
        statut = 'importe',
        source = 'dlg',
        dlg_reference = excluded.dlg_reference,
        updated_at = datetime('now')
    `).run(emp.id, periode, brut, net, charges, heures, filePath);
    ok++;
  }

  const statut: RhDlgJournalEntry['statut'] = errors > 0 && ok > 0 ? 'partiel' : errors > 0 ? 'erreur' : 'ok';
  writeSetting(SETTINGS_KEYS.lastImport, new Date().toISOString());
  logDlgJournal(
    actorUserId,
    'import',
    periode,
    filePath,
    ok,
    statut,
    errors > 0 ? `${errors} matricule(s) non reconnu(s)` : null,
  );

  writeAuditLog({
    userId: actorUserId,
    action: 'IMPORT',
    module: 'rh',
    description: `Import DLG PC PAIE ${periode} ← ${filePath}`,
  });

  return {
    ok: ok > 0,
    periode,
    fichiers: [filePath],
    nbLignes: ok,
    message:
      ok > 0
        ? `${ok} bulletin(s) importé(s)${errors > 0 ? `, ${errors} ignoré(s)` : ''}.`
        : 'Aucune ligne importée — vérifiez les matricules DLG.',
  };
}

export function validerBulletin(actorUserId: number, bulletinId: number): RhBulletin {
  assertRhPaie(actorUserId);
  getDatabase()
    .prepare(`UPDATE rh_bulletins SET statut = 'valide', updated_at = datetime('now') WHERE id = ?`)
    .run(bulletinId);
  const row = getDatabase().prepare(`${bulletinSql} WHERE b.id = ?`).get(bulletinId) as Record<string, unknown>;
  return mapBulletin(row);
}

export function comptabiliserBulletinTresorerie(
  actorUserId: number,
  bulletinId: number,
  hotelId: number,
  dateOperation: string,
): RhBulletin {
  assertRhPaie(actorUserId);
  const db = getDatabase();
  const b = db.prepare(`${bulletinSql} WHERE b.id = ?`).get(bulletinId) as Record<string, unknown> | undefined;
  if (!b) throw new Error('Bulletin introuvable.');
  if (b.statut !== 'valide' && b.statut !== 'importe') {
    throw new Error('Validez le bulletin avant comptabilisation trésorerie.');
  }
  if (b.tresorerie_id) throw new Error('Bulletin déjà comptabilisé.');

  const net = b.net as number;
  const empNom = b.employe_nom as string;
  const periode = b.periode as string;
  const result = db.prepare(`
    INSERT INTO journal_caisse (hotel_id, date_operation, libelle, entree, sortie, created_by)
    VALUES (?, ?, ?, 0, ?, ?)
  `).run(hotelId, dateOperation, `Paie ${periode} — ${empNom}`, net, actorUserId);

  db.prepare(`
    UPDATE rh_bulletins SET tresorerie_id = ?, updated_at = datetime('now') WHERE id = ?
  `).run(Number(result.lastInsertRowid), bulletinId);

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Paie ${empNom} comptabilisée trésorerie (${net})`,
  });

  const updated = db.prepare(`${bulletinSql} WHERE b.id = ?`).get(bulletinId) as Record<string, unknown>;
  return mapBulletin(updated);
}
