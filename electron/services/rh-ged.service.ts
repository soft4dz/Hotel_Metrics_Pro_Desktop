import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from '../lib/nodePath';
import Electron from '../lib/electronApi';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission, userHasPermission } from './permissions.service';
import type {
  RhDossierEmploye,
  RhDossierModele,
  RhDocument,
  TypeDocumentRh,
} from '../../src/shared/types/rh';

function assertRhGedManage(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

function rhDocumentsDir(): string {
  const dir = path.join(Electron.app.getPath('userData'), 'data', 'rh-documents');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function mapDocument(row: Record<string, unknown>): RhDocument {
  return {
    id: row.id as number,
    employeId: row.employe_id as number,
    employeNom: row.employe_nom as string,
    type: row.type as RhDocument['type'],
    nom: row.nom as string,
    fichierPath: row.fichier_path as string,
    mimeType: (row.mime_type as string) ?? null,
    taille: (row.taille as number) ?? null,
    createdAt: row.created_at as string,
    source: (row.source as RhDocument['source']) ?? 'upload',
    statutValidation: (row.statut_validation as RhDocument['statutValidation']) ?? 'brouillon',
    valideN1Par: (row.valide_n1_par as number) ?? null,
    valideN1At: (row.valide_n1_at as string) ?? null,
    scanBatch: (row.scan_batch as string) ?? null,
    modeleCode: (row.modele_code as string) ?? null,
  };
}

const DOC_SQL = `
  SELECT d.*, e.prenom || ' ' || e.nom AS employe_nom
  FROM rh_documents d INNER JOIN rh_employes e ON e.id = d.employe_id
`;

function loadDossierModeles(): RhDossierModele[] {
  return getDatabase()
    .prepare(`SELECT * FROM rh_dossier_modeles ORDER BY ordre`)
    .all()
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
        code: row.code as string,
        libelle: row.libelle as string,
        typeDocument: row.type_document as TypeDocumentRh,
        obligatoire: Boolean(row.obligatoire),
        ordre: row.ordre as number,
      };
    });
}

export function listDossierModeles(actorUserId: number): RhDossierModele[] {
  assertPermission(actorUserId, 'rh.manage');
  return loadDossierModeles();
}

export function getDossierEmploye(actorUserId: number, employeId: number): RhDossierEmploye {
  if (!userHasPermission(actorUserId, 'rh.manage') && !userHasPermission(actorUserId, 'rh.team')) {
    assertPermission(actorUserId, 'rh.self');
  }
  const db = getDatabase();
  const modeles = loadDossierModeles();
  const docs = db
    .prepare(`${DOC_SQL} WHERE d.employe_id = ? ORDER BY d.created_at DESC`)
    .all(employeId)
    .map((r) => mapDocument(r as Record<string, unknown>));

  const emp = db
    .prepare(`SELECT prenom || ' ' || nom AS nom FROM rh_employes WHERE id = ?`)
    .get(employeId) as { nom: string };

  const pieces = modeles.map((m) => {
    const doc = docs.find((d) => d.modeleCode === m.code && d.statutValidation === 'valide');
    const pending = docs.find((d) => d.modeleCode === m.code && d.statutValidation !== 'valide');
    return {
      modele: m,
      document: doc ?? pending ?? null,
      present: Boolean(doc),
      enAttente: Boolean(pending && !doc),
    };
  });

  const obligatoires = pieces.filter((p) => p.modele.obligatoire);
  const complets = obligatoires.filter((p) => p.present).length;

  return {
    employeId,
    employeNom: emp.nom,
    pieces,
    tauxCompletude: obligatoires.length ? Math.round((complets / obligatoires.length) * 100) : 100,
    documents: docs,
  };
}

export async function scanDossierFromFolder(
  actorUserId: number,
  employeId: number,
  modeleCode?: string,
): Promise<RhDocument[]> {
  assertRhGedManage(actorUserId);
  const { canceled, filePaths } = await Electron.dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Sélectionner le dossier scanné',
  });
  if (canceled || !filePaths[0]) throw new Error('Import annulé.');

  const folder = filePaths[0];
  const batch = `scan_${Date.now()}`;
  const exts = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif']);
  const files = readdirSync(folder).filter((f) => exts.has(path.extname(f).toLowerCase()));
  if (files.length === 0) throw new Error('Aucun fichier PDF ou image dans ce dossier.');

  const db = getDatabase();
  const modeles = loadDossierModeles();
  const created: RhDocument[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const src = path.join(folder, file);
    const destName = `${employeId}_${batch}_${file}`;
    const dest = path.join(rhDocumentsDir(), destName);
    copyFileSync(src, dest);
    const size = statSync(dest).size;

    let code = modeleCode;
    if (!code && files.length === modeles.length) {
      code = modeles[i]?.code;
    }
    const modele = code ? modeles.find((m) => m.code === code) : undefined;
    const upper = file.toUpperCase();
    if (!modele) {
      if (upper.includes('CIN') || upper.includes('IDENT')) code = 'CIN';
      else if (upper.includes('NSS') || upper.includes('CNAS')) code = 'NSS';
      else if (upper.includes('CONTRAT')) code = 'CONTRAT';
      else if (upper.includes('RIB')) code = 'RIB';
      else if (upper.includes('CV')) code = 'CV';
      else if (upper.includes('MED')) code = 'VISITE_MED';
      else if (upper.includes('ANEM')) code = 'ANEM';
    }
    const m = code ? modeles.find((x) => x.code === code) : undefined;

    const result = db.prepare(`
      INSERT INTO rh_documents (
        employe_id, type, nom, fichier_path, taille, source, statut_validation,
        scan_batch, modele_code
      ) VALUES (?, ?, ?, ?, ?, 'scan', 'en_attente_n1', ?, ?)
    `).run(
      employeId,
      m?.typeDocument ?? 'autre',
      m?.libelle ?? file,
      dest,
      size,
      batch,
      m?.code ?? null,
    );

    const row = db.prepare(`${DOC_SQL} WHERE d.id = ?`).get(result.lastInsertRowid) as Record<string, unknown>;
    created.push(mapDocument(row));
  }

  writeAuditLog({
    userId: actorUserId,
    action: 'CREATE',
    module: 'rh',
    description: `Scan GED dossier employé #${employeId} — ${created.length} fichier(s)`,
  });
  return created;
}

export async function pickAndScanSingleDocument(
  actorUserId: number,
  employeId: number,
  modeleCode: string,
): Promise<RhDocument> {
  assertRhGedManage(actorUserId);
  const { canceled, filePaths } = await Electron.dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Documents', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'tiff'] }],
    title: 'Scanner / importer un document',
  });
  if (canceled || !filePaths[0]) throw new Error('Import annulé.');

  const src = filePaths[0];
  const base = path.basename(src);
  const dest = path.join(rhDocumentsDir(), `${employeId}_${Date.now()}_${base}`);
  copyFileSync(src, dest);
  const modele = listDossierModeles(actorUserId).find((m) => m.code === modeleCode);
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO rh_documents (
      employe_id, type, nom, fichier_path, taille, source, statut_validation, modele_code
    ) VALUES (?, ?, ?, ?, ?, 'scan', 'en_attente_n1', ?)
  `).run(
    employeId,
    modele?.typeDocument ?? 'autre',
    modele?.libelle ?? base,
    dest,
    statSync(dest).size,
    modeleCode,
  );
  const row = db.prepare(`${DOC_SQL} WHERE d.id = ?`).get(result.lastInsertRowid) as Record<string, unknown>;
  return mapDocument(row);
}

export function soumettreDocumentValidation(actorUserId: number, documentId: number): RhDocument {
  assertRhGedManage(actorUserId);
  getDatabase()
    .prepare(`UPDATE rh_documents SET statut_validation = 'en_attente_n1' WHERE id = ?`)
    .run(documentId);
  const row = getDatabase().prepare(`${DOC_SQL} WHERE d.id = ?`).get(documentId) as Record<string, unknown>;
  return mapDocument(row);
}
