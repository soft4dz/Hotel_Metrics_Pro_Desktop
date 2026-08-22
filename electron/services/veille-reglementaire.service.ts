import { randomUUID } from 'node:crypto';
import { existsSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { getDatabase } from '../database/sqlite';
import Electron from '../lib/electronApi';
import path from '../lib/nodePath';
import { getActorContext, applyActorHotelFilter, actorCanAccessHotel } from './actorContext';
import { assertPermission } from './permissions.service';
import { writeAuditLog } from './audit.service';
import type {
  TexteReglementaire, CreateTexteReglementaireInput, UpdateTexteReglementaireInput,
} from '../../src/shared/types/veilleReglementaire';

const db = () => getDatabase();

function getRoot(): string {
  const dir = path.join(Electron.app.getPath('userData'), 'veille-reglementaire');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function mapTexte(r: Record<string, unknown>): TexteReglementaire {
  return {
    id: r.id as number, uuid: r.uuid as string,
    hotelId: r.hotel_id as number | null, hotelName: r.hotel_name as string | null,
    reference: r.reference as string | null, titre: r.titre as string,
    typeTexte: r.type_texte as TexteReglementaire['typeTexte'],
    categorie: r.categorie as TexteReglementaire['categorie'],
    datePublication: r.date_publication as string | null,
    dateEntreeVigueur: r.date_entree_vigueur as string | null,
    dateRevue: r.date_revue as string | null,
    resume: r.resume as string | null,
    statutConformite: r.statut_conformite as TexteReglementaire['statutConformite'],
    responsable: r.responsable as string | null,
    urlSource: r.url_source as string | null,
    nomFichier: r.nom_fichier as string | null, taille: r.taille_octets as number | null,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export function listTextes(
  actorId: number,
  filters?: { hotelId?: number; categorie?: string; statutConformite?: string; search?: string },
): TexteReglementaire[] {
  const actor = getActorContext(actorId);
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Un texte est visible s'il est global (hotel_id NULL) ou rattaché à un hôtel accessible.
  const restrictive: string[] = [];
  applyActorHotelFilter(actor, restrictive, params, { column: 'hotel_id', alias: 'v' });
  if (restrictive.length) conditions.push(`(v.hotel_id IS NULL OR ${restrictive[0]})`);

  if (filters?.hotelId) { conditions.push('(v.hotel_id = ? OR v.hotel_id IS NULL)'); params.push(filters.hotelId); }
  if (filters?.categorie) { conditions.push('v.categorie = ?'); params.push(filters.categorie); }
  if (filters?.statutConformite) { conditions.push('v.statut_conformite = ?'); params.push(filters.statutConformite); }
  if (filters?.search) { conditions.push('(v.titre LIKE ? OR v.reference LIKE ? OR v.resume LIKE ?)'); const s = `%${filters.search}%`; params.push(s, s, s); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db().prepare(`
    SELECT v.*, h.name as hotel_name
    FROM veille_reglementaire v
    LEFT JOIN hotels h ON h.id = v.hotel_id
    ${where}
    ORDER BY COALESCE(v.date_revue, '9999-99-99'), v.date_publication DESC, v.id DESC
  `).all(...params) as Record<string, unknown>[];
  return rows.map(mapTexte);
}

export function createTexte(actorId: number, input: CreateTexteReglementaireInput): TexteReglementaire {
  assertPermission(actorId, 'veille.gerer');
  if (input.hotelId) {
    if (!actorCanAccessHotel(getActorContext(actorId), input.hotelId)) throw new Error('Accès hôtel refusé.');
  }
  const res = db().prepare(`
    INSERT INTO veille_reglementaire
      (uuid, hotel_id, reference, titre, type_texte, categorie, date_publication, date_entree_vigueur, date_revue, resume, statut_conformite, responsable, url_source, cree_par)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(), input.hotelId ?? null, input.reference?.trim() ?? null, input.titre.trim(),
    input.typeTexte, input.categorie,
    input.datePublication ?? null, input.dateEntreeVigueur ?? null, input.dateRevue ?? null,
    input.resume?.trim() ?? null, input.statutConformite ?? 'a_evaluer', input.responsable?.trim() ?? null,
    input.urlSource?.trim() ?? null,
    actorId,
  );
  writeAuditLog({ userId: actorId, action: 'CREATE', module: 'veille-reglementaire', description: `Texte "${input.titre}" ajouté` });
  return listTextes(actorId).find((t) => t.id === Number(res.lastInsertRowid))!;
}

export function updateTexte(actorId: number, id: number, input: UpdateTexteReglementaireInput): TexteReglementaire {
  assertPermission(actorId, 'veille.gerer');
  const existing = db().prepare(`SELECT * FROM veille_reglementaire WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!existing) throw new Error('Texte introuvable.');
  if (existing.hotel_id) {
    if (!actorCanAccessHotel(getActorContext(actorId), existing.hotel_id as number)) throw new Error('Accès hôtel refusé.');
  }
  const hotelId = input.hotelId !== undefined ? input.hotelId : (existing.hotel_id as number | null);
  db().prepare(`
    UPDATE veille_reglementaire SET
      hotel_id = ?, reference = ?, titre = ?, type_texte = ?, categorie = ?,
      date_publication = ?, date_entree_vigueur = ?, date_revue = ?, resume = ?,
      statut_conformite = ?, responsable = ?, url_source = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    hotelId ?? null,
    (input.reference !== undefined ? input.reference?.trim() : existing.reference) ?? null,
    input.titre !== undefined ? input.titre.trim() : (existing.titre as string),
    input.typeTexte ?? (existing.type_texte as string),
    input.categorie ?? (existing.categorie as string),
    input.datePublication !== undefined ? input.datePublication : existing.date_publication,
    input.dateEntreeVigueur !== undefined ? input.dateEntreeVigueur : existing.date_entree_vigueur,
    input.dateRevue !== undefined ? input.dateRevue : existing.date_revue,
    input.resume !== undefined ? input.resume?.trim() : existing.resume,
    input.statutConformite ?? (existing.statut_conformite as string),
    input.responsable !== undefined ? input.responsable?.trim() : existing.responsable,
    input.urlSource !== undefined ? input.urlSource?.trim() : existing.url_source,
    id,
  );
  writeAuditLog({ userId: actorId, action: 'UPDATE', module: 'veille-reglementaire', description: `Texte #${id} modifié` });
  return listTextes(actorId).find((t) => t.id === id)!;
}

export function deleteTexte(actorId: number, id: number): boolean {
  assertPermission(actorId, 'veille.gerer');
  db().prepare(`DELETE FROM veille_reglementaire WHERE id = ?`).run(id);
  writeAuditLog({ userId: actorId, action: 'DELETE', module: 'veille-reglementaire', description: `Texte #${id} supprimé` });
  return true;
}

export async function attachDocument(actorId: number, id: number): Promise<TexteReglementaire> {
  assertPermission(actorId, 'veille.gerer');
  const existing = db().prepare(`SELECT id FROM veille_reglementaire WHERE id = ?`).get(id);
  if (!existing) throw new Error('Texte introuvable.');
  const result = await Electron.dialog.showOpenDialog({ properties: ['openFile'], title: 'Sélectionner le texte réglementaire', filters: [{ name: 'Tous les fichiers', extensions: ['*'] }] });
  if (result.canceled || !result.filePaths[0]) throw new Error('Aucun fichier sélectionné.');
  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath);
  const nomFichier = path.basename(srcPath);
  const destPath = path.join(getRoot(), `${randomUUID().replace(/-/g, '').slice(0, 16)}${ext}`);
  copyFileSync(srcPath, destPath);
  const taille = statSync(destPath).size;
  db().prepare(`UPDATE veille_reglementaire SET nom_fichier = ?, chemin = ?, taille_octets = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(nomFichier, destPath, taille, id);
  return listTextes(actorId).find((t) => t.id === id)!;
}

export function ouvrirDocument(actorId: number, id: number): void {
  const row = db().prepare(`SELECT chemin, hotel_id FROM veille_reglementaire WHERE id = ?`).get(id) as { chemin: string | null; hotel_id: number | null } | undefined;
  if (!row?.chemin) throw new Error('Aucun document attaché.');
  if (row.hotel_id && !actorCanAccessHotel(getActorContext(actorId), row.hotel_id)) throw new Error('Accès hôtel refusé.');
  void Electron.shell.openPath(row.chemin);
}
