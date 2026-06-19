import { getDatabase } from '../database/sqlite';
import Electron from '../lib/electronApi';
import path from '../lib/nodePath';
import { existsSync, copyFileSync, mkdirSync, statSync } from 'node:fs';

export interface GedCategorie { id: number; code: string; label: string; parentId: number | null; icone: string }
export interface GedDocument { id: number; uuid: string; hotelId: number | null; categorieId: number | null; categorieLabel: string | null; titre: string; description: string | null; nomFichier: string; taille: number | null; mimeType: string | null; tags: string[]; version: string; statut: string; confidentiel: boolean; uploadedBy: number | null; uploaderNom: string | null; dateDocument: string | null; dateExpiration: string | null; createdAt: string }
export interface UploadDocumentInput { hotelId?: number; categorieId?: number; titre: string; description?: string; tags?: string[]; version?: string; confidentiel?: boolean; dateDocument?: string; dateExpiration?: string }

function getGedRoot(): string {
  const ud = Electron.app.getPath('userData');
  const dir = path.join(ud, 'ged');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function mapDoc(r: Record<string, unknown>): GedDocument {
  let tags: string[] = [];
  try { tags = JSON.parse(r.tags as string || '[]'); } catch { tags = []; }
  return { id: r.id as number, uuid: r.uuid as string, hotelId: r.hotel_id as number | null, categorieId: r.categorie_id as number | null, categorieLabel: r.cat_label as string | null, titre: r.titre as string, description: r.description as string | null, nomFichier: r.nom_fichier as string, taille: r.taille_octets as number | null, mimeType: r.mime_type as string | null, tags, version: r.version as string, statut: r.statut as string, confidentiel: Boolean(r.confidentiel), uploadedBy: r.uploaded_by as number | null, uploaderNom: r.uploader_nom as string | null, dateDocument: r.date_document as string | null, dateExpiration: r.date_expiration as string | null, createdAt: r.created_at as string };
}

export function listCategories(): GedCategorie[] {
  const rows = getDatabase().prepare(`SELECT * FROM ged_categories ORDER BY label`).all() as Record<string, unknown>[];
  return rows.map(r => ({ id: r.id as number, code: r.code as string, label: r.label as string, parentId: r.parent_id as number | null, icone: r.icone as string }));
}

export function listDocuments(hotelId?: number, categorieId?: number, search?: string): GedDocument[] {
  const db = getDatabase();
  const where: string[] = ["d.statut != 'supprime'"];
  const params: unknown[] = [];
  if (hotelId) { where.push('d.hotel_id = ?'); params.push(hotelId); }
  if (categorieId) { where.push('d.categorie_id = ?'); params.push(categorieId); }
  if (search) { where.push("(d.titre LIKE ? OR d.description LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  const rows = db.prepare(`SELECT d.*, c.label AS cat_label, u.full_name AS uploader_nom FROM ged_documents d LEFT JOIN ged_categories c ON c.id = d.categorie_id LEFT JOIN users u ON u.id = d.uploaded_by WHERE ${where.join(' AND ')} ORDER BY d.created_at DESC`).all(...params) as Record<string, unknown>[];
  return rows.map(mapDoc);
}

export async function uploadDocument(actorId: number, input: UploadDocumentInput): Promise<GedDocument> {
  const result = await Electron.dialog.showOpenDialog({ properties: ['openFile'], title: 'Sélectionner un document', filters: [{ name: 'Tous les fichiers', extensions: ['*'] }] });
  if (result.canceled || !result.filePaths[0]) throw new Error('Aucun fichier sélectionné');
  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath);
  const nomFichier = path.basename(srcPath);
  const uuid = crypto.randomUUID().replace(/-/g,'').slice(0,16);
  const destNom = `${uuid}${ext}`;
  const destPath = path.join(getGedRoot(), destNom);
  copyFileSync(srcPath, destPath);
  const taille = statSync(destPath).size;
  const db = getDatabase();
  const res = db.prepare(`INSERT INTO ged_documents (hotel_id,categorie_id,titre,description,nom_fichier,chemin,taille_octets,tags,version,confidentiel,uploaded_by,date_document,date_expiration) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`)
    .get(input.hotelId ?? null, input.categorieId ?? null, input.titre, input.description ?? null, nomFichier, destPath, taille, JSON.stringify(input.tags ?? []), input.version ?? '1.0', input.confidentiel ? 1 : 0, actorId, input.dateDocument ?? null, input.dateExpiration ?? null) as { id: number };
  return listDocuments().find(d => d.id === res.id)!;
}

export function archiverDocument(id: number): void {
  getDatabase().prepare(`UPDATE ged_documents SET statut = 'archive', updated_at = datetime('now') WHERE id = ?`).run(id);
}

export function ouvrirDocument(id: number): void {
  const db = getDatabase();
  const doc = db.prepare(`SELECT chemin FROM ged_documents WHERE id = ?`).get(id) as { chemin: string } | undefined;
  if (!doc) throw new Error('Document introuvable');
  void Electron.shell.openPath(doc.chemin);
}
