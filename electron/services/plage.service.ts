import { getDatabase } from '../database/sqlite';

export interface PlageConfig { hotelId: number; capacitePlage: number; capacitePiscine: number; tarifAdulte: number; tarifEnfant: number; tarifResident: number }
export interface PlageEntree {
  id: number; uuid: string; hotelId: number; zone: string; dateEntree: string;
  nbAdultes: number; nbEnfants: number; nbResidents: number; montant: number;
  observation: string | null; createdAt: string;
  nombreAdultes: number; nombreEnfants: number; nombrePersonnes: number;
  montantPaye: number; typeVisiteur: string; formule: string;
}
export interface CreateEntreeInput { hotelId: number; zone?: string; dateEntree?: string; nbAdultes?: number; nbEnfants?: number; nbResidents?: number; observation?: string }
export interface PlageStats {
  totalEntreesJour: number; recettesJour: number; totalPersonnesJour: number; recettesMois: number;
  totalVisiteursJour: number; chiffreAffaireJour: number;
  totalEntreesMois: number; totalVisiteursMois: number; chiffreAffaireMois: number;
}

function mapEntree(r: Record<string, unknown>): PlageEntree {
  const nbAdultes = r.nb_adultes as number;
  const nbEnfants = r.nb_enfants as number;
  const nbResidents = r.nb_residents as number;
  const montant = r.montant as number;
  const zone = r.zone as string;
  const observation = r.observation as string | null;
  return { id: r.id as number, uuid: r.uuid as string, hotelId: r.hotel_id as number,
    zone, dateEntree: r.date_entree as string,
    nbAdultes, nbEnfants, nbResidents, montant, observation,
    createdAt: r.created_at as string,
    nombreAdultes: nbAdultes, nombreEnfants: nbEnfants,
    nombrePersonnes: nbAdultes + nbEnfants + nbResidents,
    montantPaye: montant, typeVisiteur: observation ?? 'touriste', formule: zone };
}

export function getPlageConfig(hotelId: number): PlageConfig {
  const db = getDatabase();
  const r = db.prepare(`SELECT * FROM plage_config WHERE hotel_id = ?`).get(hotelId) as Record<string, number> | undefined;
  return r ? { hotelId, capacitePlage: r.capacite_plage, capacitePiscine: r.capacite_piscine,
    tarifAdulte: r.tarif_adulte, tarifEnfant: r.tarif_enfant, tarifResident: r.tarif_resident }
    : { hotelId, capacitePlage: 0, capacitePiscine: 0, tarifAdulte: 0, tarifEnfant: 0, tarifResident: 0 };
}

export function savePlageConfig(hotelId: number, input: Partial<PlageConfig>): PlageConfig {
  const db = getDatabase();
  const c = getPlageConfig(hotelId);
  db.prepare(`INSERT INTO plage_config (hotel_id,capacite_plage,capacite_piscine,tarif_adulte,tarif_enfant,tarif_resident) VALUES (?,?,?,?,?,?)
    ON CONFLICT(hotel_id) DO UPDATE SET capacite_plage=excluded.capacite_plage, capacite_piscine=excluded.capacite_piscine,
    tarif_adulte=excluded.tarif_adulte, tarif_enfant=excluded.tarif_enfant, tarif_resident=excluded.tarif_resident, updated_at=datetime('now')`)
    .run(hotelId, input.capacitePlage ?? c.capacitePlage, input.capacitePiscine ?? c.capacitePiscine,
      input.tarifAdulte ?? c.tarifAdulte, input.tarifEnfant ?? c.tarifEnfant, input.tarifResident ?? c.tarifResident);
  return getPlageConfig(hotelId);
}

export function listEntrees(hotelId: number, dateDebut?: string, dateFin?: string): PlageEntree[] {
  const db = getDatabase();
  const where: string[] = ['hotel_id = ?'];
  const params: unknown[] = [hotelId];
  if (dateDebut) { where.push('date_entree >= ?'); params.push(dateDebut); }
  if (dateFin) { where.push('date_entree <= ?'); params.push(dateFin); }
  const rows = db.prepare(`SELECT * FROM plage_entrees WHERE ${where.join(' AND ')} ORDER BY date_entree DESC, id DESC`).all(...params) as Record<string, unknown>[];
  return rows.map(mapEntree);
}

export function createEntree(actorId: number, input: CreateEntreeInput): PlageEntree {
  const db = getDatabase();
  const cfg = getPlageConfig(input.hotelId);
  const nbA = input.nbAdultes ?? 0; const nbE = input.nbEnfants ?? 0; const nbR = input.nbResidents ?? 0;
  const montant = nbA * cfg.tarifAdulte + nbE * cfg.tarifEnfant + nbR * cfg.tarifResident;
  const res = db.prepare(`INSERT INTO plage_entrees (hotel_id,zone,date_entree,nb_adultes,nb_enfants,nb_residents,montant,observation,saisi_par)
    VALUES (?,?,?,?,?,?,?,?,?) RETURNING id`)
    .get(input.hotelId, input.zone ?? 'plage', input.dateEntree ?? new Date().toISOString().slice(0,10),
      nbA, nbE, nbR, montant, input.observation ?? null, actorId) as { id: number };
  return mapEntree(db.prepare(`SELECT * FROM plage_entrees WHERE id = ?`).get(res.id) as Record<string, unknown>);
}

export function getPlageStats(hotelId: number): PlageStats {
  const db = getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const moisDebut = `${today.slice(0, 7)}-01`;
  const rj = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(montant),0) AS rec, COALESCE(SUM(nb_adultes+nb_enfants+nb_residents),0) AS pers FROM plage_entrees WHERE hotel_id = ? AND date_entree = ?`).get(hotelId, today) as { n: number; rec: number; pers: number };
  const rm = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(montant),0) AS rec, COALESCE(SUM(nb_adultes+nb_enfants+nb_residents),0) AS pers FROM plage_entrees WHERE hotel_id = ? AND date_entree >= ?`).get(hotelId, moisDebut) as { n: number; rec: number; pers: number };
  return {
    totalEntreesJour: rj.n,
    recettesJour: rj.rec,
    totalPersonnesJour: rj.pers,
    recettesMois: rm.rec,
    totalVisiteursJour: rj.pers,
    chiffreAffaireJour: rj.rec,
    totalEntreesMois: rm.n,
    totalVisiteursMois: rm.pers,
    chiffreAffaireMois: rm.rec,
  };
}
