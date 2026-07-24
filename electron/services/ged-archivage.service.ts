import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';

export interface GedRetentionPolicy {
  id: number;
  code: string;
  libelle: string;
  categorieCode: string | null;
  dureeAnnees: number;
}

export interface GedLegalArchive {
  id: number;
  documentId: number;
  documentTitre: string;
  hashSha256: string;
  horodatage: string;
  retentionUntil: string;
  statut: string;
  politiqueCode: string | null;
}

function addYears(isoDate: string, years: number): string {
  const d = new Date(isoDate);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/** Bloque toute suppression ou altération de statut sur un document sous archive légale active. */
export function assertDocumentLegallyProtected(documentId: number): void {
  const row = getDatabase().prepare(`
    SELECT a.id, a.retention_until FROM ged_legal_archives a
    WHERE a.document_id=? AND a.statut='actif' LIMIT 1
  `).get(documentId) as { id: number; retention_until: string } | undefined;
  if (row) {
    throw new Error(
      `Document protégé par archivage légal (archive #${row.id}, rétention jusqu'au ${row.retention_until}). Suppression interdite.`,
    );
  }
}

export function isDocumentLegallyProtected(documentId: number): boolean {
  const row = getDatabase().prepare(`
    SELECT id FROM ged_legal_archives WHERE document_id=? AND statut='actif' LIMIT 1
  `).get(documentId);
  return Boolean(row);
}

export function listRetentionPolicies(): GedRetentionPolicy[] {
  return (getDatabase().prepare('SELECT * FROM ged_retention_policies WHERE actif=1 ORDER BY code').all() as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id), code: String(r.code), libelle: String(r.libelle),
    categorieCode: r.categorie_code ? String(r.categorie_code) : null, dureeAnnees: Number(r.duree_annees),
  }));
}

export function archiverLegalement(actorUserId: number, documentId: number, politiqueCode = 'LEGAL_COMPTA'): GedLegalArchive {
  const db = getDatabase();
  const doc = db.prepare(`
    SELECT d.id, d.titre, d.chemin, c.code as cat_code FROM ged_documents d
    LEFT JOIN ged_categories c ON c.id = d.categorie_id WHERE d.id=? AND d.statut != 'supprime'
  `).get(documentId) as { id: number; titre: string; chemin: string; cat_code: string | null } | undefined;
  if (!doc) throw new Error('Document GED introuvable.');

  const politique = db.prepare('SELECT * FROM ged_retention_policies WHERE code=? AND actif=1').get(politiqueCode) as Record<string, unknown> | undefined
    ?? db.prepare(`SELECT * FROM ged_retention_policies WHERE categorie_code=? AND actif=1 LIMIT 1`).get(doc.cat_code ?? 'divers') as Record<string, unknown> | undefined;
  if (!politique) throw new Error('Politique de rétention introuvable.');

  let hash: string;
  try {
    hash = createHash('sha256').update(readFileSync(doc.chemin)).digest('hex');
  } catch {
    hash = createHash('sha256').update(`${doc.id}|${doc.titre}|${Date.now()}`).digest('hex');
  }

  const horodatage = new Date().toISOString();
  const retentionUntil = addYears(horodatage.slice(0, 10), Number(politique.duree_annees));

  const existing = db.prepare('SELECT id FROM ged_legal_archives WHERE document_id=? AND statut=\'actif\'').get(documentId) as { id: number } | undefined;
  if (existing) {
    return getLegalArchive(existing.id);
  }

  const r = db.prepare(`
    INSERT INTO ged_legal_archives (document_id, politique_id, hash_sha256, horodatage, retention_until, statut, archived_by)
    VALUES (?, ?, ?, ?, ?, 'actif', ?)
  `).run(documentId, politique.id, hash, horodatage, retentionUntil, actorUserId);

  db.prepare(`UPDATE ged_documents SET statut='archive', updated_at=datetime('now') WHERE id=?`).run(documentId);

  writeAuditLog({
    userId: actorUserId, action: 'CREATE', module: 'ged',
    description: `Archivage légal doc #${documentId} — rétention jusqu'au ${retentionUntil}`,
  });
  return getLegalArchive(Number(r.lastInsertRowid));
}

function getLegalArchive(id: number): GedLegalArchive {
  const row = getDatabase().prepare(`
    SELECT a.*, d.titre as document_titre, p.code as politique_code
    FROM ged_legal_archives a
    INNER JOIN ged_documents d ON d.id = a.document_id
    LEFT JOIN ged_retention_policies p ON p.id = a.politique_id WHERE a.id=?
  `).get(id) as Record<string, unknown>;
  return {
    id: Number(row.id), documentId: Number(row.document_id), documentTitre: String(row.document_titre),
    hashSha256: String(row.hash_sha256), horodatage: String(row.horodatage),
    retentionUntil: String(row.retention_until), statut: String(row.statut),
    politiqueCode: row.politique_code ? String(row.politique_code) : null,
  };
}

export function listLegalArchives(_actorUserId: number): GedLegalArchive[] {
  return (getDatabase().prepare(`
    SELECT a.*, d.titre as document_titre, p.code as politique_code
    FROM ged_legal_archives a INNER JOIN ged_documents d ON d.id=a.document_id
    LEFT JOIN ged_retention_policies p ON p.id=a.politique_id
    ORDER BY a.horodatage DESC LIMIT 200
  `).all() as Record<string, unknown>[]).map((row) => ({
    id: Number(row.id), documentId: Number(row.document_id), documentTitre: String(row.document_titre),
    hashSha256: String(row.hash_sha256), horodatage: String(row.horodatage),
    retentionUntil: String(row.retention_until), statut: String(row.statut),
    politiqueCode: row.politique_code ? String(row.politique_code) : null,
  }));
}

export function verifierIntegriteArchive(archiveId: number): { ok: boolean; hashAttendu: string; hashCalcule?: string } {
  const db = getDatabase();
  const arch = db.prepare(`
    SELECT a.hash_sha256, d.chemin FROM ged_legal_archives a INNER JOIN ged_documents d ON d.id=a.document_id WHERE a.id=?
  `).get(archiveId) as { hash_sha256: string; chemin: string } | undefined;
  if (!arch) throw new Error('Archive introuvable.');
  try {
    const calc = createHash('sha256').update(readFileSync(arch.chemin)).digest('hex');
    return { ok: calc === arch.hash_sha256, hashAttendu: arch.hash_sha256, hashCalcule: calc };
  } catch {
    return { ok: false, hashAttendu: arch.hash_sha256 };
  }
}

export function marquerArchivesExpirees(): number {
  const db = getDatabase();
  const r = db.prepare(`
    UPDATE ged_legal_archives SET statut='expire', updated_at=datetime('now')
    WHERE statut='actif' AND retention_until < date('now')
  `).run();
  return r.changes;
}
