import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { assertPermission } from './permissions.service';
import type { PaieParafiscaleParams } from './rh-paie-dz-engine';

export type PaieClotureStatut = 'brouillon' | 'valide' | 'cloture';

export interface PaieClotureMensuelle {
  id: number;
  periode: string;
  statut: PaieClotureStatut;
  nbBulletins: number;
  valideAt: string | null;
  clotureAt: string | null;
}

function assertRhPaie(actorUserId: number): void {
  assertPermission(actorUserId, 'rh.manage');
}

export function getPaieParams(): Required<PaieParafiscaleParams> {
  const db = getDatabase();
  const rows = db.prepare('SELECT cle, valeur FROM rh_paie_params').all() as { cle: string; valeur: number }[];
  const map = Object.fromEntries(rows.map((r) => [r.cle, r.valeur]));
  return {
    tauxAccidentTravail: map.taux_accident_travail ?? 0.0125,
    tauxAssuranceChomage: map.taux_assurance_chomage ?? 0.015,
    tauxFormationPro: map.taux_formation_pro ?? 0.01,
  };
}

export function assertPeriodePaieModifiable(periode: string): void {
  const db = getDatabase();
  const cloture = db.prepare('SELECT statut FROM rh_paie_clotures WHERE periode = ?').get(periode) as { statut: string } | undefined;
  if (cloture?.statut === 'cloture') {
    throw new Error(`Paie ${periode} clôturée — modification interdite.`);
  }
}

export function getPaieCloture(actorUserId: number, periode: string): PaieClotureMensuelle {
  assertRhPaie(actorUserId);
  const db = getDatabase();
  let row = db.prepare('SELECT * FROM rh_paie_clotures WHERE periode = ?').get(periode) as Record<string, unknown> | undefined;
  if (!row) {
    const nb = db.prepare(`SELECT COUNT(*) as c FROM rh_bulletins WHERE periode = ?`).get(periode) as { c: number };
    db.prepare(`INSERT INTO rh_paie_clotures (periode, statut, nb_bulletins) VALUES (?, 'brouillon', ?)`).run(periode, nb.c);
    row = db.prepare('SELECT * FROM rh_paie_clotures WHERE periode = ?').get(periode) as Record<string, unknown>;
  }
  return mapCloture(row);
}

export function listPaieClotures(actorUserId: number): PaieClotureMensuelle[] {
  assertRhPaie(actorUserId);
  return (getDatabase().prepare('SELECT * FROM rh_paie_clotures ORDER BY periode DESC').all() as Record<string, unknown>[]).map(mapCloture);
}

function mapCloture(row: Record<string, unknown>): PaieClotureMensuelle {
  return {
    id: Number(row.id),
    periode: String(row.periode),
    statut: row.statut as PaieClotureStatut,
    nbBulletins: Number(row.nb_bulletins ?? 0),
    valideAt: row.valide_at ? String(row.valide_at) : null,
    clotureAt: row.cloture_at ? String(row.cloture_at) : null,
  };
}

export function validerPaieMensuelle(actorUserId: number, periode: string): PaieClotureMensuelle {
  assertRhPaie(actorUserId);
  const db = getDatabase();
  getPaieCloture(actorUserId, periode);

  const brouillons = db.prepare(`SELECT COUNT(*) as c FROM rh_bulletins WHERE periode = ? AND statut = 'brouillon'`).get(periode) as { c: number };
  if (brouillons.c > 0) throw new Error(`${brouillons.c} bulletin(s) encore en brouillon.`);

  db.prepare(`
    UPDATE rh_bulletins SET statut = 'valide', updated_at = datetime('now')
    WHERE periode = ? AND statut IN ('brouillon', 'exporte', 'importe')
  `).run(periode);

  const nb = db.prepare(`SELECT COUNT(*) as c FROM rh_bulletins WHERE periode = ? AND statut = 'valide'`).get(periode) as { c: number };
  db.prepare(`
    UPDATE rh_paie_clotures SET statut='valide', nb_bulletins=?, valide_at=datetime('now'), valide_by=?
    WHERE periode=?
  `).run(nb.c, actorUserId, periode);

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Paie ${periode} validée (${nb.c} bulletins)` });
  return getPaieCloture(actorUserId, periode);
}

export function cloturerPaieMensuelle(actorUserId: number, periode: string): PaieClotureMensuelle {
  assertRhPaie(actorUserId);
  const db = getDatabase();
  const cloture = getPaieCloture(actorUserId, periode);
  if (cloture.statut === 'cloture') throw new Error('Période déjà clôturée.');
  if (cloture.statut !== 'valide') throw new Error('Validez la paie mensuelle avant clôture.');

  db.prepare(`
    UPDATE rh_paie_clotures SET statut='cloture', cloture_at=datetime('now'), cloture_by=?
    WHERE periode=?
  `).run(actorUserId, periode);

  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'rh', description: `Paie ${periode} clôturée — verrouillage mensuel` });
  return getPaieCloture(actorUserId, periode);
}
