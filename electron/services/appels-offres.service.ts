import { randomUUID } from 'node:crypto';
import { existsSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { getDatabase } from '../database/sqlite';
import Electron from '../lib/electronApi';
import path from '../lib/nodePath';
import { getActorContext, applyActorHotelFilter, actorCanAccessHotel } from './actorContext';
import { assertPermission } from './permissions.service';
import { writeAuditLog } from './audit.service';
import { createBon } from './achats.service';
import type {
  AppelOffres, CreateAppelOffresInput,
  LotAppelOffres, CreateLotInput,
  DocumentAppelOffres, UploadDocumentAoInput,
  FournisseurInviteAo,
  OffreAo, CreateOffreAoInput,
  MembreCommission,
  CritereEvaluation, CreateCritereInput,
  NoteEvaluation,
  ProcesVerbalAo, OuvrirPlisInput,
  AttribuerLotInput,
} from '../../src/shared/types/appelsOffres';

const db = () => getDatabase();
const round2 = (n: number) => Math.round(n * 100) / 100;

function assertHotel(actorId: number, hotelId: number): void {
  if (!actorCanAccessHotel(getActorContext(actorId), hotelId)) throw new Error('Accès hôtel refusé.');
}

function nextNumero(): string {
  const year = new Date().getFullYear();
  const row = db().prepare(`SELECT COUNT(*) n FROM appels_offres WHERE numero LIKE ?`).get(`AO-${year}-%`) as { n: number };
  return `AO-${year}-${String(row.n + 1).padStart(4, '0')}`;
}

function getAoRoot(): string {
  const dir = path.join(Electron.app.getPath('userData'), 'appels-offres');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getDossierRow(id: number): Record<string, unknown> {
  const row = db().prepare(`SELECT * FROM appels_offres WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Dossier d’appel d’offres introuvable.');
  return row;
}

// ── Dossiers ──────────────────────────────────────────────────────────────────

export function listAppelsOffres(actorId: number, hotelId?: number): AppelOffres[] {
  const actor = getActorContext(actorId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  applyActorHotelFilter(actor, conditions, params, { column: 'hotel_id', alias: 'a' });
  if (hotelId) { conditions.push('a.hotel_id = ?'); params.push(hotelId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db().prepare(`
    SELECT a.*, h.name as hotel_name,
      (SELECT COUNT(*) FROM appel_offres_lots l WHERE l.appel_offres_id = a.id) lots_count,
      (SELECT COUNT(*) FROM appel_offres_fournisseurs f WHERE f.appel_offres_id = a.id) fournisseurs_count,
      (SELECT COUNT(*) FROM appel_offres_offres o WHERE o.appel_offres_id = a.id) offres_count
    FROM appels_offres a
    INNER JOIN hotels h ON h.id = a.hotel_id
    ${where}
    ORDER BY a.id DESC
  `).all(...params) as Record<string, unknown>[];
  return rows.map((r) => {
    const demandeIds = (db().prepare(`SELECT demande_id FROM appel_offres_demandes WHERE appel_offres_id = ?`).all(r.id as number) as { demande_id: number }[]).map((d) => d.demande_id);
    return {
      id: r.id as number, uuid: r.uuid as string, numero: r.numero as string,
      hotelId: r.hotel_id as number, hotelName: r.hotel_name as string,
      objet: r.objet as string, regime: r.regime as AppelOffres['regime'],
      statut: r.statut as AppelOffres['statut'],
      dateLancement: r.date_lancement as string | null,
      dateLimiteDepot: r.date_limite_depot as string | null,
      dateOuverture: r.date_ouverture as string | null,
      demandeIds,
      lotsCount: r.lots_count as number,
      fournisseursCount: r.fournisseurs_count as number,
      offresCount: r.offres_count as number,
      createdAt: r.created_at as string,
    };
  });
}

export function createAppelOffres(actorId: number, input: CreateAppelOffresInput): AppelOffres {
  assertPermission(actorId, 'appels-offres.gerer');
  assertHotel(actorId, input.hotelId);
  if (!input.demandeIds.length) throw new Error('Rattachez au moins une demande d’achat approuvée.');
  for (const demandeId of input.demandeIds) {
    const demande = db().prepare(`SELECT hotel_id, statut FROM demandes_achat WHERE id = ?`).get(demandeId) as { hotel_id: number; statut: string } | undefined;
    if (!demande) throw new Error(`Demande #${demandeId} introuvable.`);
    if (demande.hotel_id !== input.hotelId) throw new Error(`Demande #${demandeId} rattachée à un autre établissement.`);
    if (demande.statut !== 'approuvee') throw new Error(`Demande #${demandeId} non approuvée.`);
  }
  const id = db().transaction(() => {
    const res = db().prepare(`
      INSERT INTO appels_offres (uuid, numero, hotel_id, objet, regime, date_limite_depot, cree_par)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), nextNumero(), input.hotelId, input.objet.trim(), input.regime, input.dateLimiteDepot ?? null, actorId);
    const id = Number(res.lastInsertRowid);
    const stmt = db().prepare(`INSERT INTO appel_offres_demandes (appel_offres_id, demande_id) VALUES (?, ?)`);
    for (const demandeId of new Set(input.demandeIds)) stmt.run(id, demandeId);
    return id;
  })();
  writeAuditLog({ userId: actorId, action: 'CREATE', module: 'appels-offres', description: `Dossier appel d’offres créé — ${input.objet}` });
  return listAppelsOffres(actorId, input.hotelId).find((a) => a.id === id)!;
}

export function publierAppelOffres(actorId: number, id: number, dateLimiteDepot: string): AppelOffres {
  const dossier = getDossierRow(id);
  assertHotel(actorId, dossier.hotel_id as number);
  if (dossier.statut !== 'brouillon') throw new Error('Seul un dossier brouillon peut être publié.');
  const lots = db().prepare(`SELECT COUNT(*) n FROM appel_offres_lots WHERE appel_offres_id = ?`).get(id) as { n: number };
  if (!lots.n) throw new Error('Ajoutez au moins un lot avant de publier.');
  const invites = db().prepare(`SELECT COUNT(*) n FROM appel_offres_fournisseurs WHERE appel_offres_id = ?`).get(id) as { n: number };
  if (!invites.n) throw new Error('Invitez au moins un fournisseur avant de publier.');
  db().prepare(`
    UPDATE appels_offres SET statut = 'publie', date_lancement = date('now'), date_limite_depot = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(dateLimiteDepot, id);
  writeAuditLog({ userId: actorId, action: 'UPDATE', module: 'appels-offres', description: `Dossier ${dossier.numero} publié` });
  return listAppelsOffres(actorId, dossier.hotel_id as number).find((a) => a.id === id)!;
}

export function annulerAppelOffres(actorId: number, id: number, motif: string): AppelOffres {
  const dossier = getDossierRow(id);
  assertHotel(actorId, dossier.hotel_id as number);
  if (dossier.statut === 'attribue') throw new Error('Un dossier déjà attribué ne peut plus être annulé.');
  db().prepare(`UPDATE appels_offres SET statut = 'annule', updated_at = datetime('now') WHERE id = ?`).run(id);
  writeAuditLog({ userId: actorId, action: 'UPDATE', module: 'appels-offres', description: `Dossier ${dossier.numero} annulé — ${motif}` });
  return listAppelsOffres(actorId, dossier.hotel_id as number).find((a) => a.id === id)!;
}

// ── Lots ──────────────────────────────────────────────────────────────────────

function mapLot(r: Record<string, unknown>): LotAppelOffres {
  return {
    id: r.id as number, appelOffresId: r.appel_offres_id as number,
    numeroLot: r.numero_lot as string, designation: r.designation as string,
    montantEstime: r.montant_estime as number, statut: r.statut as LotAppelOffres['statut'],
    attributionOffreId: r.attribution_offre_id as number | null,
    bonCommandeId: r.bon_commande_id as number | null,
  };
}

export function listLots(actorId: number, appelOffresId: number): LotAppelOffres[] {
  const dossier = getDossierRow(appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  const rows = db().prepare(`SELECT * FROM appel_offres_lots WHERE appel_offres_id = ? ORDER BY numero_lot`).all(appelOffresId) as Record<string, unknown>[];
  return rows.map(mapLot);
}

export function createLot(actorId: number, input: CreateLotInput): LotAppelOffres {
  const dossier = getDossierRow(input.appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  if (dossier.statut !== 'brouillon') throw new Error('Les lots ne peuvent être ajoutés qu’en phase brouillon.');
  const res = db().prepare(`
    INSERT INTO appel_offres_lots (appel_offres_id, numero_lot, designation, montant_estime)
    VALUES (?, ?, ?, ?)
  `).run(input.appelOffresId, input.numeroLot.trim(), input.designation.trim(), input.montantEstime ?? 0);
  return listLots(actorId, input.appelOffresId).find((l) => l.id === Number(res.lastInsertRowid))!;
}

export function deleteLot(actorId: number, id: number): boolean {
  const lot = db().prepare(`SELECT l.*, a.hotel_id, a.statut as dossier_statut FROM appel_offres_lots l INNER JOIN appels_offres a ON a.id = l.appel_offres_id WHERE l.id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!lot) throw new Error('Lot introuvable.');
  assertHotel(actorId, lot.hotel_id as number);
  if (lot.dossier_statut !== 'brouillon') throw new Error('Les lots ne peuvent être supprimés qu’en phase brouillon.');
  db().prepare(`DELETE FROM appel_offres_lots WHERE id = ?`).run(id);
  return true;
}

// ── Documents ─────────────────────────────────────────────────────────────────

function mapDocument(r: Record<string, unknown>): DocumentAppelOffres {
  return {
    id: r.id as number, appelOffresId: r.appel_offres_id as number, lotId: r.lot_id as number | null,
    typeDocument: r.type_document as DocumentAppelOffres['typeDocument'],
    titre: r.titre as string, nomFichier: r.nom_fichier as string,
    taille: r.taille_octets as number | null, createdAt: r.created_at as string,
  };
}

export function listDocuments(actorId: number, appelOffresId: number): DocumentAppelOffres[] {
  const dossier = getDossierRow(appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  const rows = db().prepare(`SELECT * FROM appel_offres_documents WHERE appel_offres_id = ? ORDER BY created_at DESC`).all(appelOffresId) as Record<string, unknown>[];
  return rows.map(mapDocument);
}

export async function uploadDocument(actorId: number, input: UploadDocumentAoInput): Promise<DocumentAppelOffres> {
  const dossier = getDossierRow(input.appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  const result = await Electron.dialog.showOpenDialog({ properties: ['openFile'], title: 'Sélectionner un document', filters: [{ name: 'Tous les fichiers', extensions: ['*'] }] });
  if (result.canceled || !result.filePaths[0]) throw new Error('Aucun fichier sélectionné.');
  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath);
  const nomFichier = path.basename(srcPath);
  const destNom = `${randomUUID().replace(/-/g, '').slice(0, 16)}${ext}`;
  const destPath = path.join(getAoRoot(), destNom);
  copyFileSync(srcPath, destPath);
  const taille = statSync(destPath).size;
  const res = db().prepare(`
    INSERT INTO appel_offres_documents (appel_offres_id, lot_id, type_document, titre, nom_fichier, chemin, taille_octets, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(input.appelOffresId, input.lotId ?? null, input.typeDocument, input.titre.trim(), nomFichier, destPath, taille, actorId);
  return listDocuments(actorId, input.appelOffresId).find((d) => d.id === Number(res.lastInsertRowid))!;
}

export function ouvrirDocument(actorId: number, id: number): void {
  const doc = db().prepare(`SELECT d.chemin, a.hotel_id FROM appel_offres_documents d INNER JOIN appels_offres a ON a.id = d.appel_offres_id WHERE d.id = ?`).get(id) as { chemin: string; hotel_id: number } | undefined;
  if (!doc) throw new Error('Document introuvable.');
  assertHotel(actorId, doc.hotel_id);
  void Electron.shell.openPath(doc.chemin);
}

export function deleteDocument(actorId: number, id: number): boolean {
  const doc = db().prepare(`SELECT a.hotel_id FROM appel_offres_documents d INNER JOIN appels_offres a ON a.id = d.appel_offres_id WHERE d.id = ?`).get(id) as { hotel_id: number } | undefined;
  if (!doc) throw new Error('Document introuvable.');
  assertHotel(actorId, doc.hotel_id);
  db().prepare(`DELETE FROM appel_offres_documents WHERE id = ?`).run(id);
  return true;
}

// ── Fournisseurs invités ────────────────────────────────────────────────────────

function mapInvite(r: Record<string, unknown>): FournisseurInviteAo {
  return {
    id: r.id as number, appelOffresId: r.appel_offres_id as number,
    fournisseurId: r.fournisseur_id as number, fournisseurNom: r.fournisseur_nom as string,
    statut: r.statut as FournisseurInviteAo['statut'],
    invitedAt: r.invited_at as string, reponseAt: r.reponse_at as string | null,
  };
}

export function listFournisseursInvites(actorId: number, appelOffresId: number): FournisseurInviteAo[] {
  const dossier = getDossierRow(appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  const rows = db().prepare(`
    SELECT f.*, fo.raison_sociale as fournisseur_nom
    FROM appel_offres_fournisseurs f
    INNER JOIN fournisseurs fo ON fo.id = f.fournisseur_id
    WHERE f.appel_offres_id = ? ORDER BY fo.raison_sociale
  `).all(appelOffresId) as Record<string, unknown>[];
  return rows.map(mapInvite);
}

export function inviteFournisseurs(actorId: number, appelOffresId: number, fournisseurIds: number[]): FournisseurInviteAo[] {
  const dossier = getDossierRow(appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  if (dossier.statut !== 'brouillon') throw new Error('Les invitations ne peuvent être ajoutées qu’en phase brouillon.');
  const stmt = db().prepare(`INSERT OR IGNORE INTO appel_offres_fournisseurs (appel_offres_id, fournisseur_id) VALUES (?, ?)`);
  for (const fid of new Set(fournisseurIds)) stmt.run(appelOffresId, fid);
  return listFournisseursInvites(actorId, appelOffresId);
}

export function removeFournisseurInvite(actorId: number, id: number): boolean {
  const invite = db().prepare(`SELECT a.hotel_id, a.statut FROM appel_offres_fournisseurs f INNER JOIN appels_offres a ON a.id = f.appel_offres_id WHERE f.id = ?`).get(id) as { hotel_id: number; statut: string } | undefined;
  if (!invite) throw new Error('Invitation introuvable.');
  assertHotel(actorId, invite.hotel_id);
  if (invite.statut !== 'brouillon') throw new Error('Les invitations ne peuvent être retirées qu’en phase brouillon.');
  db().prepare(`DELETE FROM appel_offres_fournisseurs WHERE id = ?`).run(id);
  return true;
}

// ── Grille d'évaluation ──────────────────────────────────────────────────────

function mapCritere(r: Record<string, unknown>): CritereEvaluation {
  return {
    id: r.id as number, appelOffresId: r.appel_offres_id as number,
    libelle: r.libelle as string, typeCritere: r.type_critere as CritereEvaluation['typeCritere'],
    ponderationPct: r.ponderation_pct as number,
  };
}

export function listCriteres(actorId: number, appelOffresId: number): CritereEvaluation[] {
  const dossier = getDossierRow(appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  const rows = db().prepare(`SELECT * FROM appel_offres_criteres WHERE appel_offres_id = ? ORDER BY id`).all(appelOffresId) as Record<string, unknown>[];
  return rows.map(mapCritere);
}

export function createCritere(actorId: number, input: CreateCritereInput): CritereEvaluation {
  const dossier = getDossierRow(input.appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  const existing = db().prepare(`SELECT COALESCE(SUM(ponderation_pct), 0) total FROM appel_offres_criteres WHERE appel_offres_id = ?`).get(input.appelOffresId) as { total: number };
  if (existing.total + input.ponderationPct > 100.001) throw new Error(`Pondération totale dépasserait 100% (déjà ${existing.total}%).`);
  if (input.typeCritere === 'prix' && db().prepare(`SELECT 1 FROM appel_offres_criteres WHERE appel_offres_id = ? AND type_critere = 'prix'`).get(input.appelOffresId)) {
    throw new Error('Un seul critère de type "prix" est autorisé.');
  }
  const res = db().prepare(`
    INSERT INTO appel_offres_criteres (appel_offres_id, libelle, type_critere, ponderation_pct)
    VALUES (?, ?, ?, ?)
  `).run(input.appelOffresId, input.libelle.trim(), input.typeCritere, input.ponderationPct);
  return listCriteres(actorId, input.appelOffresId).find((c) => c.id === Number(res.lastInsertRowid))!;
}

export function deleteCritere(actorId: number, id: number): boolean {
  const critere = db().prepare(`SELECT a.hotel_id FROM appel_offres_criteres c INNER JOIN appels_offres a ON a.id = c.appel_offres_id WHERE c.id = ?`).get(id) as { hotel_id: number } | undefined;
  if (!critere) throw new Error('Critère introuvable.');
  assertHotel(actorId, critere.hotel_id);
  db().prepare(`DELETE FROM appel_offres_criteres WHERE id = ?`).run(id);
  return true;
}

export function listNotes(actorId: number, lotId: number): NoteEvaluation[] {
  const lot = db().prepare(`SELECT a.hotel_id FROM appel_offres_lots l INNER JOIN appels_offres a ON a.id = l.appel_offres_id WHERE l.id = ?`).get(lotId) as { hotel_id: number } | undefined;
  if (!lot) throw new Error('Lot introuvable.');
  assertHotel(actorId, lot.hotel_id);
  const rows = db().prepare(`
    SELECT n.* FROM appel_offres_notes n
    INNER JOIN appel_offres_offres o ON o.id = n.offre_id
    WHERE o.lot_id = ?
  `).all(lotId) as Record<string, unknown>[];
  return rows.map((r) => ({ offreId: r.offre_id as number, critereId: r.critere_id as number, note: r.note as number, commentaire: r.commentaire as string | null }));
}

export function saveNote(actorId: number, input: NoteEvaluation): boolean {
  const row = db().prepare(`
    SELECT a.hotel_id FROM appel_offres_offres o
    INNER JOIN appels_offres a ON a.id = o.appel_offres_id
    WHERE o.id = ?
  `).get(input.offreId) as { hotel_id: number } | undefined;
  if (!row) throw new Error('Offre introuvable.');
  assertHotel(actorId, row.hotel_id);
  if (input.note < 0 || input.note > 100) throw new Error('La note doit être comprise entre 0 et 100.');
  db().prepare(`
    INSERT INTO appel_offres_notes (offre_id, critere_id, note, commentaire, noted_by, noted_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(offre_id, critere_id) DO UPDATE SET
      note = excluded.note, commentaire = excluded.commentaire, noted_by = excluded.noted_by, noted_at = excluded.noted_at
  `).run(input.offreId, input.critereId, input.note, input.commentaire ?? null, actorId);
  return true;
}

// ── Offres ────────────────────────────────────────────────────────────────────

function computeScores(appelOffresId: number, lotId: number, offres: Record<string, unknown>[]): Map<number, number | null> {
  const criteres = db().prepare(`SELECT * FROM appel_offres_criteres WHERE appel_offres_id = ?`).all(appelOffresId) as Record<string, unknown>[];
  const scores = new Map<number, number | null>();
  if (!criteres.length || !offres.length) {
    for (const o of offres) scores.set(o.id as number, null);
    return scores;
  }
  const ttcValues = offres.map((o) => Number(o.montant_ttc)).filter((v) => v > 0);
  const cheapest = ttcValues.length ? Math.min(...ttcValues) : 0;
  const notesRows = db().prepare(`
    SELECT n.* FROM appel_offres_notes n
    INNER JOIN appel_offres_offres o ON o.id = n.offre_id
    WHERE o.lot_id = ?
  `).all(lotId) as Record<string, unknown>[];
  const notesByOffre = new Map<string, number>();
  for (const n of notesRows) notesByOffre.set(`${n.offre_id}_${n.critere_id}`, Number(n.note));

  for (const o of offres) {
    let score = 0;
    for (const c of criteres) {
      const critereId = c.id as number;
      let note: number;
      if (c.type_critere === 'prix') {
        const montant = Number(o.montant_ttc);
        note = montant > 0 && cheapest > 0 ? Math.min(100, round2((cheapest / montant) * 100)) : 0;
      } else {
        note = notesByOffre.get(`${o.id}_${critereId}`) ?? 0;
      }
      score += (Number(c.ponderation_pct) / 100) * note;
    }
    scores.set(o.id as number, round2(score));
  }
  return scores;
}

function mapOffre(r: Record<string, unknown>, score: number | null): OffreAo {
  return {
    id: r.id as number, appelOffresId: r.appel_offres_id as number, lotId: r.lot_id as number,
    fournisseurId: r.fournisseur_id as number, fournisseurNom: r.fournisseur_nom as string,
    reference: r.reference as string | null,
    montantHt: r.montant_ht as number, montantTva: r.montant_tva as number, montantTtc: r.montant_ttc as number,
    delaiLivraisonJours: r.delai_livraison_jours as number, conditionsPaiement: r.conditions_paiement as string | null,
    conformeAdministrativement: r.conforme_administrativement === 1, retenue: r.retenue === 1,
    score,
  };
}

export function listOffres(actorId: number, appelOffresId: number, lotId?: number): OffreAo[] {
  const dossier = getDossierRow(appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  const conditions = ['o.appel_offres_id = ?'];
  const params: unknown[] = [appelOffresId];
  if (lotId) { conditions.push('o.lot_id = ?'); params.push(lotId); }
  const rows = db().prepare(`
    SELECT o.*, f.raison_sociale as fournisseur_nom
    FROM appel_offres_offres o
    INNER JOIN fournisseurs f ON f.id = o.fournisseur_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY o.lot_id, o.montant_ttc
  `).all(...params) as Record<string, unknown>[];

  const byLot = new Map<number, Record<string, unknown>[]>();
  for (const r of rows) {
    const lid = r.lot_id as number;
    if (!byLot.has(lid)) byLot.set(lid, []);
    byLot.get(lid)!.push(r);
  }
  const scores = new Map<number, number | null>();
  for (const [lid, offresLot] of byLot) {
    for (const [offreId, score] of computeScores(appelOffresId, lid, offresLot)) scores.set(offreId, score);
  }
  return rows.map((r) => mapOffre(r, scores.get(r.id as number) ?? null));
}

export function createOffre(actorId: number, input: CreateOffreAoInput): OffreAo {
  const dossier = getDossierRow(input.appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  if (!['publie', 'ouvert'].includes(dossier.statut as string)) throw new Error('Le dossier doit être publié pour recevoir des offres.');
  const invited = db().prepare(`SELECT id FROM appel_offres_fournisseurs WHERE appel_offres_id = ? AND fournisseur_id = ?`).get(input.appelOffresId, input.fournisseurId) as { id: number } | undefined;
  if (!invited) throw new Error('Ce fournisseur n’est pas invité sur ce dossier.');
  const lot = db().prepare(`SELECT statut FROM appel_offres_lots WHERE id = ? AND appel_offres_id = ?`).get(input.lotId, input.appelOffresId) as { statut: string } | undefined;
  if (!lot) throw new Error('Lot introuvable pour ce dossier.');
  if (lot.statut !== 'ouvert') throw new Error('Ce lot n’accepte plus d’offres.');

  const ht = input.montantHt;
  const tva = input.montantTva ?? round2(ht * 0.19);
  db().transaction(() => {
    db().prepare(`
      INSERT INTO appel_offres_offres (appel_offres_id, lot_id, fournisseur_id, reference, montant_ht, montant_tva, montant_ttc, delai_livraison_jours, conditions_paiement, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(lot_id, fournisseur_id) DO UPDATE SET
        reference = excluded.reference, montant_ht = excluded.montant_ht, montant_tva = excluded.montant_tva,
        montant_ttc = excluded.montant_ttc, delai_livraison_jours = excluded.delai_livraison_jours,
        conditions_paiement = excluded.conditions_paiement
    `).run(input.appelOffresId, input.lotId, input.fournisseurId, input.reference ?? null, round2(ht), round2(tva), round2(ht + tva), input.delaiLivraisonJours ?? 0, input.conditionsPaiement ?? null, actorId);
    db().prepare(`UPDATE appel_offres_fournisseurs SET statut = 'a_repondu', reponse_at = datetime('now') WHERE appel_offres_id = ? AND fournisseur_id = ?`).run(input.appelOffresId, input.fournisseurId);
  })();
  return listOffres(actorId, input.appelOffresId, input.lotId).find((o) => o.fournisseurId === input.fournisseurId)!;
}

// ── Commission d'ouverture ────────────────────────────────────────────────────

function mapMembre(r: Record<string, unknown>): MembreCommission {
  return { id: r.id as number, appelOffresId: r.appel_offres_id as number, nom: r.nom as string, fonction: r.fonction as string | null, role: r.role as MembreCommission['role'] };
}

export function listCommission(actorId: number, appelOffresId: number): MembreCommission[] {
  const dossier = getDossierRow(appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  return (db().prepare(`SELECT * FROM appel_offres_commission WHERE appel_offres_id = ? ORDER BY id`).all(appelOffresId) as Record<string, unknown>[]).map(mapMembre);
}

// ── Procès-verbaux ────────────────────────────────────────────────────────────

function mapPv(r: Record<string, unknown>): ProcesVerbalAo {
  let contenu: Record<string, unknown> = {};
  try { contenu = JSON.parse(r.contenu_json as string); } catch { contenu = {}; }
  return { id: r.id as number, appelOffresId: r.appel_offres_id as number, lotId: r.lot_id as number | null, typePv: r.type_pv as ProcesVerbalAo['typePv'], dateSeance: r.date_seance as string, contenu, createdAt: r.created_at as string };
}

export function listPv(actorId: number, appelOffresId: number): ProcesVerbalAo[] {
  const dossier = getDossierRow(appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  return (db().prepare(`SELECT * FROM appel_offres_pv WHERE appel_offres_id = ? ORDER BY id DESC`).all(appelOffresId) as Record<string, unknown>[]).map(mapPv);
}

export function ouvrirPlis(actorId: number, input: OuvrirPlisInput): ProcesVerbalAo {
  assertPermission(actorId, 'appels-offres.commission');
  const dossier = getDossierRow(input.appelOffresId);
  assertHotel(actorId, dossier.hotel_id as number);
  if (dossier.statut !== 'publie') throw new Error('Le dossier doit être publié pour procéder à l’ouverture des plis.');
  if (!input.membres.length) throw new Error('Renseignez au moins un membre de la commission.');

  const offres = db().prepare(`
    SELECT o.*, f.raison_sociale as fournisseur_nom, l.numero_lot, l.designation as lot_designation
    FROM appel_offres_offres o
    INNER JOIN fournisseurs f ON f.id = o.fournisseur_id
    INNER JOIN appel_offres_lots l ON l.id = o.lot_id
    WHERE o.appel_offres_id = ?
    ORDER BY l.numero_lot, o.montant_ttc
  `).all(input.appelOffresId) as Record<string, unknown>[];

  const pvId = db().transaction(() => {
    db().prepare(`DELETE FROM appel_offres_commission WHERE appel_offres_id = ?`).run(input.appelOffresId);
    const stmt = db().prepare(`INSERT INTO appel_offres_commission (appel_offres_id, nom, fonction, role) VALUES (?, ?, ?, ?)`);
    for (const m of input.membres) stmt.run(input.appelOffresId, m.nom.trim(), m.fonction?.trim() ?? null, m.role);

    db().prepare(`UPDATE appels_offres SET statut = 'ouvert', date_ouverture = ?, updated_at = datetime('now') WHERE id = ?`).run(input.dateSeance, input.appelOffresId);

    const contenu = {
      dossierNumero: dossier.numero, membres: input.membres,
      offres: offres.map((o) => ({
        lot: o.numero_lot, designation: o.lot_designation, fournisseur: o.fournisseur_nom,
        montantTtc: o.montant_ttc, conforme: o.conforme_administrativement === 1,
      })),
    };
    const res = db().prepare(`
      INSERT INTO appel_offres_pv (appel_offres_id, type_pv, contenu_json, date_seance, cree_par)
      VALUES (?, 'ouverture', ?, ?, ?)
    `).run(input.appelOffresId, JSON.stringify(contenu), input.dateSeance, actorId);
    return Number(res.lastInsertRowid);
  })();

  writeAuditLog({ userId: actorId, action: 'CREATE', module: 'appels-offres', description: `Ouverture des plis — dossier ${dossier.numero}` });
  return listPv(actorId, input.appelOffresId).find((pv) => pv.id === pvId)!;
}

// ── Attribution ───────────────────────────────────────────────────────────────

export function attribuerLot(actorId: number, input: AttribuerLotInput): { lot: LotAppelOffres; bonId: number } {
  assertPermission(actorId, 'appels-offres.attribuer');
  const offre = db().prepare(`
    SELECT o.*, l.numero_lot, l.designation as lot_designation, l.statut as lot_statut, a.hotel_id, a.numero as dossier_numero, a.statut as dossier_statut
    FROM appel_offres_offres o
    INNER JOIN appel_offres_lots l ON l.id = o.lot_id
    INNER JOIN appels_offres a ON a.id = o.appel_offres_id
    WHERE o.id = ?
  `).get(input.offreId) as Record<string, unknown> | undefined;
  if (!offre) throw new Error('Offre introuvable.');
  if (offre.lot_id !== input.lotId) throw new Error('Cette offre ne correspond pas au lot indiqué.');
  assertHotel(actorId, offre.hotel_id as number);
  if (offre.dossier_statut !== 'ouvert') throw new Error('Le dossier doit être en phase d’ouverture/évaluation pour attribuer un lot.');
  if (offre.lot_statut !== 'ouvert') throw new Error('Ce lot est déjà clôturé.');

  const tvaPct = Number(offre.montant_ht) > 0 ? round2((Number(offre.montant_tva) / Number(offre.montant_ht)) * 100) : 19;
  const bon = createBon(actorId, {
    hotelId: offre.hotel_id as number,
    fournisseurId: offre.fournisseur_id as number,
    notes: `Lot ${offre.numero_lot} — ${offre.dossier_numero}`,
    lignes: [{ designation: offre.lot_designation as string, quantite: 1, prixUnitaire: Number(offre.montant_ht), tvaPct }],
  });

  db().transaction(() => {
    db().prepare(`UPDATE appel_offres_offres SET retenue = CASE WHEN id = ? THEN 1 ELSE 0 END WHERE lot_id = ?`).run(input.offreId, input.lotId);
    db().prepare(`UPDATE appel_offres_lots SET statut = 'attribue', attribution_offre_id = ?, bon_commande_id = ? WHERE id = ?`).run(input.offreId, bon.id, input.lotId);
    const contenu = { lot: offre.numero_lot, designation: offre.lot_designation, fournisseur: offre.fournisseur_nom ?? null, montantTtc: offre.montant_ttc, bonNumero: bon.numero };
    db().prepare(`INSERT INTO appel_offres_pv (appel_offres_id, lot_id, type_pv, contenu_json, date_seance, cree_par) VALUES (?, ?, 'attribution', ?, date('now'), ?)`)
      .run(offre.appel_offres_id, input.lotId, JSON.stringify(contenu), actorId);

    const remaining = db().prepare(`SELECT COUNT(*) n FROM appel_offres_lots WHERE appel_offres_id = ? AND statut = 'ouvert'`).get(offre.appel_offres_id) as { n: number };
    if (remaining.n === 0) {
      db().prepare(`UPDATE appels_offres SET statut = 'attribue', updated_at = datetime('now') WHERE id = ?`).run(offre.appel_offres_id);
    }
  })();

  writeAuditLog({ userId: actorId, action: 'CREATE', module: 'appels-offres', description: `Lot ${offre.numero_lot} attribué — BC ${bon.numero}` });
  return { lot: listLots(actorId, offre.appel_offres_id as number).find((l) => l.id === input.lotId)!, bonId: bon.id };
}

export function marquerLotInfructueux(actorId: number, lotId: number): LotAppelOffres {
  const lot = db().prepare(`SELECT l.*, a.hotel_id, a.id as appel_offres_id FROM appel_offres_lots l INNER JOIN appels_offres a ON a.id = l.appel_offres_id WHERE l.id = ?`).get(lotId) as Record<string, unknown> | undefined;
  if (!lot) throw new Error('Lot introuvable.');
  assertHotel(actorId, lot.hotel_id as number);
  if (lot.statut !== 'ouvert') throw new Error('Ce lot est déjà clôturé.');
  db().prepare(`UPDATE appel_offres_lots SET statut = 'infructueux' WHERE id = ?`).run(lotId);
  const remaining = db().prepare(`SELECT COUNT(*) n FROM appel_offres_lots WHERE appel_offres_id = ? AND statut = 'ouvert'`).get(lot.appel_offres_id) as { n: number };
  if (remaining.n === 0) {
    db().prepare(`UPDATE appels_offres SET statut = 'attribue', updated_at = datetime('now') WHERE id = ?`).run(lot.appel_offres_id);
  }
  writeAuditLog({ userId: actorId, action: 'UPDATE', module: 'appels-offres', description: `Lot ${lot.numero_lot} déclaré infructueux` });
  return listLots(actorId, lot.appel_offres_id as number).find((l) => l.id === lotId)!;
}
