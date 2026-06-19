import { getDatabase } from '../database/sqlite';

export interface Equipement { id: number; uuid: string; hotelId: number; code: string; designation: string; categorie: string; localisation: string | null; marque: string | null; modele: string | null; numSerie: string | null; dateAchat: string | null; garantieFin: string | null; statut: string; createdAt: string }
export interface Intervention { id: number; uuid: string; hotelId: number; equipementId: number | null; equipementDesignation: string | null; typeIntervention: string; titre: string; description: string | null; priorite: string; statut: string; technicienId: number | null; technicienNom: string | null; dateDemande: string; datePlanifiee: string | null; dateDebut: string | null; dateFin: string | null; dureeHeures: number | null; coutPieces: number; coutMainOeuvre: number; rapport: string | null; createdAt: string }
export interface CreateEquipementInput { hotelId: number; code: string; designation: string; categorie?: string; localisation?: string; marque?: string; modele?: string; numSerie?: string; dateAchat?: string; garantieFin?: string }
export interface CreateInterventionInput { hotelId: number; equipementId?: number; typeIntervention?: string; titre: string; description?: string; priorite?: string; technicienId?: number; datePlanifiee?: string }
export interface UpdateInterventionInput { statut?: string; technicienId?: number | null; datePlanifiee?: string | null; dateDebut?: string | null; dateFin?: string | null; dureeHeures?: number | null; coutPieces?: number; coutMainOeuvre?: number; rapport?: string | null }

function mapEquip(r: Record<string, unknown>): Equipement {
  return { id: r.id as number, uuid: r.uuid as string, hotelId: r.hotel_id as number, code: r.code as string, designation: r.designation as string, categorie: r.categorie as string, localisation: r.localisation as string | null, marque: r.marque as string | null, modele: r.modele as string | null, numSerie: r.num_serie as string | null, dateAchat: r.date_achat as string | null, garantieFin: r.garantie_fin as string | null, statut: r.statut as string, createdAt: r.created_at as string };
}
function mapInterv(r: Record<string, unknown>): Intervention {
  return { id: r.id as number, uuid: r.uuid as string, hotelId: r.hotel_id as number, equipementId: r.equipement_id as number | null, equipementDesignation: r.equip_design as string | null, typeIntervention: r.type_intervention as string, titre: r.titre as string, description: r.description as string | null, priorite: r.priorite as string, statut: r.statut as string, technicienId: r.technicien_id as number | null, technicienNom: r.tech_nom as string | null, dateDemande: r.date_demande as string, datePlanifiee: r.date_planifiee as string | null, dateDebut: r.date_debut as string | null, dateFin: r.date_fin as string | null, dureeHeures: r.duree_heures as number | null, coutPieces: r.cout_pieces as number, coutMainOeuvre: r.cout_main_oeuvre as number, rapport: r.rapport as string | null, createdAt: r.created_at as string };
}

export function listEquipements(hotelId: number): Equipement[] {
  const rows = getDatabase().prepare(`SELECT * FROM equipements WHERE hotel_id = ? ORDER BY designation`).all(hotelId) as Record<string, unknown>[];
  return rows.map(mapEquip);
}

export function createEquipement(input: CreateEquipementInput): Equipement {
  const db = getDatabase();
  const res = db.prepare(`INSERT INTO equipements (hotel_id,code,designation,categorie,localisation,marque,modele,num_serie,date_achat,garantie_fin) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`)
    .get(input.hotelId, input.code, input.designation, input.categorie ?? 'autre', input.localisation ?? null, input.marque ?? null, input.modele ?? null, input.numSerie ?? null, input.dateAchat ?? null, input.garantieFin ?? null) as { id: number };
  return mapEquip(db.prepare(`SELECT * FROM equipements WHERE id = ?`).get(res.id) as Record<string, unknown>);
}

export function listInterventions(hotelId: number, statut?: string): Intervention[] {
  const db = getDatabase();
  const where = statut ? 'AND i.statut = ?' : '';
  const params = statut ? [hotelId, statut] : [hotelId];
  const rows = db.prepare(`SELECT i.*, e.designation AS equip_design, u.full_name AS tech_nom FROM interventions i LEFT JOIN equipements e ON e.id = i.equipement_id LEFT JOIN users u ON u.id = i.technicien_id WHERE i.hotel_id = ? ${where} ORDER BY i.priorite='urgente' DESC, i.date_demande DESC`).all(...params) as Record<string, unknown>[];
  return rows.map(mapInterv);
}

export function createIntervention(actorId: number, input: CreateInterventionInput): Intervention {
  const db = getDatabase();
  const res = db.prepare(`INSERT INTO interventions (hotel_id,equipement_id,type_intervention,titre,description,priorite,technicien_id,date_planifiee,cree_par) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id`)
    .get(input.hotelId, input.equipementId ?? null, input.typeIntervention ?? 'corrective', input.titre, input.description ?? null, input.priorite ?? 'normale', input.technicienId ?? null, input.datePlanifiee ?? null, actorId) as { id: number };
  return listInterventions(input.hotelId).find(i => i.id === res.id)!;
}

export function updateIntervention(id: number, input: UpdateInterventionInput): Intervention {
  const db = getDatabase();
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const params: unknown[] = [];
  if (input.statut !== undefined) { sets.push('statut = ?'); params.push(input.statut); }
  if (input.technicienId !== undefined) { sets.push('technicien_id = ?'); params.push(input.technicienId); }
  if (input.datePlanifiee !== undefined) { sets.push('date_planifiee = ?'); params.push(input.datePlanifiee); }
  if (input.dateDebut !== undefined) { sets.push('date_debut = ?'); params.push(input.dateDebut); }
  if (input.dateFin !== undefined) { sets.push('date_fin = ?'); params.push(input.dateFin); }
  if (input.dureeHeures !== undefined) { sets.push('duree_heures = ?'); params.push(input.dureeHeures); }
  if (input.coutPieces !== undefined) { sets.push('cout_pieces = ?'); params.push(input.coutPieces); }
  if (input.coutMainOeuvre !== undefined) { sets.push('cout_main_oeuvre = ?'); params.push(input.coutMainOeuvre); }
  if (input.rapport !== undefined) { sets.push('rapport = ?'); params.push(input.rapport); }
  params.push(id);
  db.prepare(`UPDATE interventions SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  const row = db.prepare(`SELECT i.*, e.designation AS equip_design, u.full_name AS tech_nom FROM interventions i LEFT JOIN equipements e ON e.id = i.equipement_id LEFT JOIN users u ON u.id = i.technicien_id WHERE i.id = ?`).get(id);
  if (!row) throw new Error('Intervention introuvable');
  return mapInterv(row as Record<string, unknown>);
}

export function getMaintenanceStats(hotelId: number): { total: number; enCours: number; urgentes: number; coutMois: number } {
  const db = getDatabase();
  const mois = new Date().toISOString().slice(0,7);
  const r = db.prepare(`SELECT COUNT(*) AS total, SUM(statut='en_cours') AS en_cours, SUM(statut NOT IN ('terminee','annulee') AND priorite='urgente') AS urgentes FROM interventions WHERE hotel_id = ?`).get(hotelId) as Record<string, number>;
  const cout = db.prepare(`SELECT COALESCE(SUM(cout_pieces+cout_main_oeuvre),0) AS c FROM interventions WHERE hotel_id = ? AND strftime('%Y-%m',date_fin) = ? AND statut='terminee'`).get(hotelId, mois) as { c: number };
  return { total: r.total, enCours: r.en_cours, urgentes: r.urgentes, coutMois: cout.c };
}
