import { createHash } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, actorCanAccessHotel } from './actorContext';

export interface FichePolice {
  id: number;
  hotelId: number;
  reservationId: number | null;
  nom: string;
  prenom: string;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  nationalite: string | null;
  typePiece: FichePoliceTypePiece;
  numeroPiece: string;
  dateEntree: string;
  dateSortiePrevue: string | null;
  dateSortieReelle: string | null;
  chambreNumero: string | null;
  statut: string;
}

export const FICHE_POLICE_TYPE_PIECES = ['cni', 'passeport', 'permis_sejour', 'autre'] as const;
export type FichePoliceTypePiece = typeof FICHE_POLICE_TYPE_PIECES[number];

export interface CreateFichePoliceInput {
  hotelId: number;
  reservationId?: number | null;
  nom: string;
  prenom: string;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  nationalite?: string | null;
  typePiece: FichePoliceTypePiece;
  numeroPiece: string;
  dateEntree: string;
  dateSortiePrevue?: string | null;
  dateSortieReelle?: string | null;
  chambreNumero?: string | null;
  statut?: 'present' | 'parti' | 'annule';
}

export type UpdateFichePoliceInput = Partial<Omit<CreateFichePoliceInput, 'hotelId' | 'reservationId'>>;

function assertTypePiece(value: string): asserts value is FichePoliceTypePiece {
  if (!(FICHE_POLICE_TYPE_PIECES as readonly string[]).includes(value)) {
    throw new Error(`Type de pièce invalide: ${value}`);
  }
}

export interface TaxeSejourDeclaration {
  id: number;
  hotelId: number;
  periode: string;
  nbNuitees: number;
  tauxUnitaire: number;
  montantTotal: number;
  statut: string;
}

export interface RapportTourisme {
  id: number;
  hotelId: number;
  periode: string;
  nbNuitees: number;
  nbClients: number;
  tauxOccupation: number;
  nationalites: Record<string, number>;
  statut: string;
}

export function listFichesPolice(actorUserId: number, hotelId?: number, statut?: string): FichePolice[] {
  const actor = getActorContext(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (hotelId) {
    if (!actorCanAccessHotel(actor, hotelId)) throw new Error('Accès refusé.');
    conds.push('hotel_id = ?'); params.push(hotelId);
  } else if (!actor.allHotelsAccess) {
    if (actor.hotelIds.length === 0) return [];
    conds.push(`hotel_id IN (${actor.hotelIds.map(() => '?').join(',')})`);
    params.push(...actor.hotelIds);
  }
  if (statut) { conds.push('statut = ?'); params.push(statut); }
  return (getDatabase().prepare(`SELECT * FROM fiche_police WHERE ${conds.join(' AND ')} ORDER BY date_entree DESC LIMIT 500`).all(...params) as Record<string, unknown>[]).map(mapFiche);
}

function mapFiche(row: Record<string, unknown>): FichePolice {
  return {
    id: Number(row.id), hotelId: Number(row.hotel_id),
    reservationId: row.reservation_id != null ? Number(row.reservation_id) : null,
    nom: String(row.nom), prenom: String(row.prenom),
    dateNaissance: row.date_naissance ? String(row.date_naissance) : null,
    lieuNaissance: row.lieu_naissance ? String(row.lieu_naissance) : null,
    nationalite: row.nationalite ? String(row.nationalite) : null,
    typePiece: String(row.type_piece) as FichePoliceTypePiece, numeroPiece: String(row.numero_piece),
    dateEntree: String(row.date_entree), dateSortiePrevue: row.date_sortie_prevue ? String(row.date_sortie_prevue) : null,
    dateSortieReelle: row.date_sortie_reelle ? String(row.date_sortie_reelle) : null,
    chambreNumero: row.chambre_numero ? String(row.chambre_numero) : null, statut: String(row.statut),
  };
}

export function createFichePolice(actorUserId: number, input: CreateFichePoliceInput): FichePolice {
  if (!actorCanAccessHotel(getActorContext(actorUserId), input.hotelId)) throw new Error('Accès refusé.');
  assertTypePiece(input.typePiece);
  const r = getDatabase().prepare(`
    INSERT INTO fiche_police (hotel_id, reservation_id, nom, prenom, date_naissance, lieu_naissance, nationalite, type_piece, numero_piece, date_entree, date_sortie_prevue, date_sortie_reelle, chambre_numero, statut, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(input.hotelId, input.reservationId ?? null, input.nom, input.prenom, input.dateNaissance ?? null, input.lieuNaissance ?? null, input.nationalite ?? null, input.typePiece, input.numeroPiece, input.dateEntree, input.dateSortiePrevue ?? null, input.dateSortieReelle ?? null, input.chambreNumero ?? null, input.statut ?? 'present', actorUserId);
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'hotel_legal', description: `Fiche police ${input.nom} ${input.prenom}` });
  return mapFiche(getDatabase().prepare('SELECT * FROM fiche_police WHERE id=?').get(Number(r.lastInsertRowid)) as Record<string, unknown>);
}

export function updateFichePolice(actorUserId: number, ficheId: number, input: UpdateFichePoliceInput): FichePolice {
  const db = getDatabase();
  const current = db.prepare('SELECT * FROM fiche_police WHERE id=?').get(ficheId) as Record<string, unknown> | undefined;
  if (!current) throw new Error('Fiche de police introuvable.');
  if (!actorCanAccessHotel(getActorContext(actorUserId), Number(current.hotel_id))) throw new Error('Accès refusé.');
  if (input.typePiece !== undefined) assertTypePiece(input.typePiece);

  const columns: [keyof UpdateFichePoliceInput, string][] = [
    ['nom', 'nom'], ['prenom', 'prenom'], ['dateNaissance', 'date_naissance'],
    ['lieuNaissance', 'lieu_naissance'], ['nationalite', 'nationalite'],
    ['typePiece', 'type_piece'], ['numeroPiece', 'numero_piece'], ['dateEntree', 'date_entree'],
    ['dateSortiePrevue', 'date_sortie_prevue'], ['dateSortieReelle', 'date_sortie_reelle'],
    ['chambreNumero', 'chambre_numero'], ['statut', 'statut'],
  ];
  const sets = ["updated_at=datetime('now')"];
  const params: unknown[] = [];
  for (const [key, column] of columns) {
    if (input[key] !== undefined) {
      sets.push(`${column}=?`);
      params.push(input[key]);
    }
  }
  params.push(ficheId);
  db.prepare(`UPDATE fiche_police SET ${sets.join(', ')} WHERE id=?`).run(...params);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'hotel_legal', description: `Fiche police #${ficheId} mise à jour` });
  return mapFiche(db.prepare('SELECT * FROM fiche_police WHERE id=?').get(ficheId) as Record<string, unknown>);
}

/** Préremplit une fiche police depuis une réservation (check-in). */
export function createFichePoliceFromReservation(actorUserId: number, reservationId: number): FichePolice {
  const db = getDatabase();
  const res = db.prepare(`
    SELECT r.*, c.numero AS chambre_numero
    FROM reservations r
    LEFT JOIN chambres c ON c.id = r.chambre_id
    WHERE r.id = ? AND r.deleted_at IS NULL
  `).get(reservationId) as Record<string, unknown> | undefined;
  if (!res) throw new Error('Réservation introuvable.');
  const hotelId = Number(res.hotel_id);
  if (!actorCanAccessHotel(getActorContext(actorUserId), hotelId)) throw new Error('Accès refusé.');

  const existing = db.prepare(`SELECT id FROM fiche_police WHERE reservation_id = ? LIMIT 1`).get(reservationId) as { id: number } | undefined;
  if (existing) return mapFiche(db.prepare('SELECT * FROM fiche_police WHERE id=?').get(existing.id) as Record<string, unknown>);

  return createFichePolice(actorUserId, {
    hotelId,
    reservationId,
    nom: String(res.client_nom),
    prenom: String(res.client_prenom ?? ''),
    dateNaissance: null,
    lieuNaissance: null,
    nationalite: null,
    typePiece: 'cni',
    numeroPiece: 'A COMPLETER',
    dateEntree: String(res.date_arrivee),
    dateSortiePrevue: String(res.date_depart),
    dateSortieReelle: null,
    chambreNumero: res.chambre_numero ? String(res.chambre_numero) : null,
    statut: 'present',
  });
}

export function checkoutFichePolice(actorUserId: number, ficheId: number, dateSortie: string): FichePolice {
  const db = getDatabase();
  const current = db.prepare('SELECT hotel_id FROM fiche_police WHERE id=?').get(ficheId) as { hotel_id: number } | undefined;
  if (!current) throw new Error('Fiche de police introuvable.');
  if (!actorCanAccessHotel(getActorContext(actorUserId), Number(current.hotel_id))) throw new Error('Accès refusé.');
  db.prepare(`UPDATE fiche_police SET statut='parti', date_sortie_reelle=?, updated_at=datetime('now') WHERE id=?`).run(dateSortie, ficheId);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'hotel_legal', description: `Checkout fiche police #${ficheId}` });
  return mapFiche(db.prepare('SELECT * FROM fiche_police WHERE id=?').get(ficheId) as Record<string, unknown>);
}

export function calculerTaxeSejour(actorUserId: number, hotelId: number, periode: string, tauxUnitaire = 200): TaxeSejourDeclaration {
  if (!actorCanAccessHotel(getActorContext(actorUserId), hotelId)) throw new Error('Accès refusé.');
  const db = getDatabase();
  const fiches = db.prepare(`
    SELECT id FROM fiche_police WHERE hotel_id=? AND strftime('%Y-%m', date_entree)=? AND statut IN ('present','parti')
  `).all(hotelId, periode) as { id: number }[];

  let nbNuitees = 0;
  const stmt = db.prepare(`INSERT INTO taxe_sejour_lignes (declaration_id, fiche_police_id, nb_nuites, montant) VALUES (?, ?, 1, ?)`);

  db.prepare(`
    INSERT INTO taxe_sejour_declarations (hotel_id, periode, nb_nuites, taux_unitaire, montant_total, statut)
    VALUES (?, ?, 0, ?, 0, 'brouillon')
    ON CONFLICT(hotel_id, periode) DO UPDATE SET updated_at=datetime('now')
  `).run(hotelId, periode, tauxUnitaire);

  const decl = db.prepare(`SELECT * FROM taxe_sejour_declarations WHERE hotel_id=? AND periode=?`).get(hotelId, periode) as Record<string, unknown>;
  const declId = Number(decl.id);
  db.prepare('DELETE FROM taxe_sejour_lignes WHERE declaration_id=?').run(declId);

  for (const f of fiches) {
    nbNuitees += 1;
    stmt.run(declId, f.id, tauxUnitaire);
  }
  const montant = nbNuitees * tauxUnitaire;
  db.prepare(`UPDATE taxe_sejour_declarations SET nb_nuites=?, montant_total=?, statut='calculee', updated_at=datetime('now') WHERE id=?`).run(nbNuitees, montant, declId);
  writeAuditLog({ userId: actorUserId, action: 'UPDATE', module: 'hotel_legal', description: `Taxe séjour ${periode} — ${montant} DA` });
  return mapTaxe(db.prepare('SELECT * FROM taxe_sejour_declarations WHERE id=?').get(declId) as Record<string, unknown>);
}

function mapTaxe(row: Record<string, unknown>): TaxeSejourDeclaration {
  return {
    id: Number(row.id), hotelId: Number(row.hotel_id), periode: String(row.periode),
    nbNuitees: Number(row.nb_nuites), tauxUnitaire: Number(row.taux_unitaire),
    montantTotal: Number(row.montant_total), statut: String(row.statut),
  };
}

export function genererRapportTourisme(actorUserId: number, hotelId: number, periode: string): RapportTourisme {
  if (!actorCanAccessHotel(getActorContext(actorUserId), hotelId)) throw new Error('Accès refusé.');
  const db = getDatabase();
  const fiches = db.prepare(`
    SELECT nationalite FROM fiche_police WHERE hotel_id=? AND strftime('%Y-%m', date_entree)=?
  `).all(hotelId, periode) as { nationalite: string | null }[];

  const nationalites: Record<string, number> = {};
  for (const f of fiches) {
    const nat = f.nationalite ?? 'Non renseignée';
    nationalites[nat] = (nationalites[nat] ?? 0) + 1;
  }

  const nbClients = fiches.length;
  const nbNuitees = nbClients;
  const chambres = (db.prepare(`SELECT COUNT(*) as c FROM chambres WHERE hotel_id=? AND deleted_at IS NULL`).get(hotelId) as { c: number }).c || 1;
  const joursMois = 30;
  const tauxOccupation = Math.round((nbNuitees / (chambres * joursMois)) * 1000) / 10;

  db.prepare(`
    INSERT INTO rapports_tourisme (hotel_id, periode, nb_nuites, nb_clients, taux_occupation, nationalites_json, statut, generated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'genere', datetime('now'))
    ON CONFLICT(hotel_id, periode) DO UPDATE SET nb_nuites=excluded.nb_nuites, nb_clients=excluded.nb_clients,
      taux_occupation=excluded.taux_occupation, nationalites_json=excluded.nationalites_json, statut='genere', generated_at=datetime('now')
  `).run(hotelId, periode, nbNuitees, nbClients, tauxOccupation, JSON.stringify(nationalites));

  const row = db.prepare(`SELECT * FROM rapports_tourisme WHERE hotel_id=? AND periode=?`).get(hotelId, periode) as Record<string, unknown>;
  writeAuditLog({ userId: actorUserId, action: 'CREATE', module: 'hotel_legal', description: `Rapport tourisme ${periode}` });
  return mapRapport(row);
}

function mapRapport(row: Record<string, unknown>): RapportTourisme {
  let nationalites = {};
  try { nationalites = JSON.parse(String(row.nationalites_json ?? '{}')); } catch { /* ignore */ }
  return {
    id: Number(row.id), hotelId: Number(row.hotel_id), periode: String(row.periode),
    nbNuitees: Number(row.nb_nuites), nbClients: Number(row.nb_clients),
    tauxOccupation: Number(row.taux_occupation), nationalites, statut: String(row.statut),
  };
}

export function listRapportsTourisme(actorUserId: number, hotelId?: number): RapportTourisme[] {
  const actor = getActorContext(actorUserId);
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (hotelId) {
    if (!actorCanAccessHotel(actor, hotelId)) throw new Error('Accès refusé.');
    conds.push('hotel_id = ?'); params.push(hotelId);
  } else if (!actor.allHotelsAccess) {
    if (actor.hotelIds.length === 0) return [];
    conds.push(`hotel_id IN (${actor.hotelIds.map(() => '?').join(',')})`);
    params.push(...actor.hotelIds);
  }
  return (getDatabase().prepare(`SELECT * FROM rapports_tourisme WHERE ${conds.join(' AND ')} ORDER BY periode DESC`).all(...params) as Record<string, unknown>[]).map(mapRapport);
}

export function exportFichesPoliceCsv(actorUserId: number, hotelId: number): string {
  const rows = listFichesPolice(actorUserId, hotelId);
  const lines = ['Nom;Prénom;Nationalité;N° pièce;Entrée;Sortie;Chambre;Statut', ...rows.map((r) => [r.nom, r.prenom, r.nationalite ?? '', r.numeroPiece, r.dateEntree, r.dateSortieReelle ?? '', r.chambreNumero ?? '', r.statut].join(';'))];
  return lines.join('\n');
}

export function hashLegalDocument(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
