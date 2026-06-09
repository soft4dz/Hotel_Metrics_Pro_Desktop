import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import {
  assertObjectifsEdit,
  assertRecettesValidate,
  getActorContext,
  applyActorHotelFilter,
  resolveHotelId,
  type ActorContext,
} from './actorContext';
import { userHasPermission } from './permissions.service';

const VALID_RECETTE_STATUTS = `('valide', 'validated')`;

export interface ObjectifFilters {
  hotelId?: number;
  annee?: number;
  mois?: number;
}

export interface ObjectifListItem {
  id: number;
  hotelId: number;
  hotelName: string;
  mois: number;
  annee: number;
  objectifTotal: number;
  realiseTotal: number;
  tauxRealisation: number;
}

export interface ObjectifDto {
  id: number | null;
  hotelId: number;
  hotelName: string;
  mois: number;
  annee: number;
  objectifHebergement: number;
  objectifRestauration: number;
  objectifBoissons: number;
  objectifAutres: number;
  capaciteChambres: number | null;
  chambresVendues: number | null;
  tauxOccupationChambres: number | null;
  capaciteNuitees: number | null;
  nuiteesVendues: number | null;
  tauxFrequentationNuitees: number | null;
  capaciteRestaurant: number | null;
  couvertsVendus: number | null;
  tauxFrequentationRestaurant: number | null;
  prixMoyenChambre: number | null;
  revenuParChambreConstruite: number | null;
  prixMoyenCouvert: number | null;
  consoHebergement: number | null;
  consoRestauration: number | null;
  consoBoissons: number | null;
  consoAutres: number | null;
  realiseHebergement: number;
  realiseRestauration: number;
  realiseBoissons: number;
  realiseAutres: number;
  canEdit: boolean;
}

export interface SaveObjectifInput {
  hotelId: number;
  mois: number;
  annee: number;
  objectifHebergement: number;
  objectifRestauration: number;
  objectifBoissons: number;
  objectifAutres: number;
  capaciteChambres?: number | null;
  chambresVendues?: number | null;
  tauxOccupationChambres?: number | null;
  capaciteNuitees?: number | null;
  nuiteesVendues?: number | null;
  tauxFrequentationNuitees?: number | null;
  capaciteRestaurant?: number | null;
  couvertsVendus?: number | null;
  tauxFrequentationRestaurant?: number | null;
  prixMoyenChambre?: number | null;
  revenuParChambreConstruite?: number | null;
  prixMoyenCouvert?: number | null;
  consoHebergement?: number | null;
  consoRestauration?: number | null;
  consoBoissons?: number | null;
  consoAutres?: number | null;
}

function objectifTotal(row: {
  objectif_hebergement: number;
  objectif_restauration: number;
  objectif_boissons: number;
  objectif_autres: number;
}): number {
  return (
    row.objectif_hebergement +
    row.objectif_restauration +
    row.objectif_boissons +
    row.objectif_autres
  );
}

function sumRealiseForMonth(
  db: ReturnType<typeof getDatabase>,
  hotelId: number,
  annee: number,
  mois: number,
): number {
  const month = String(mois).padStart(2, '0');
  const prefix = `${annee}-${month}`;
  const row = db
    .prepare(
      `
    SELECT COALESCE(SUM(rj.montant), 0) AS total
    FROM recettes_journalieres rj
    WHERE rj.hotel_id = ?
      AND rj.deleted_at IS NULL
      AND rj.statut IN ${VALID_RECETTE_STATUTS}
      AND rj.date_journal LIKE ?
  `,
    )
    .get(hotelId, `${prefix}%`) as { total: number };
  return row.total;
}

function realiseByCategory(
  db: ReturnType<typeof getDatabase>,
  hotelId: number,
  annee: number,
  mois: number,
): { hebergement: number; restauration: number; boissons: number; autres: number } {
  const month = String(mois).padStart(2, '0');
  const prefix = `${annee}-${month}`;
  const row = db
    .prepare(
      `
    SELECT
      COALESCE(SUM(CASE WHEN rub.code = 'HEBERGEMENT' THEN rj.montant ELSE 0 END), 0) AS hebergement,
      COALESCE(SUM(CASE WHEN rub.code = 'RESTAURATION' THEN rj.montant ELSE 0 END), 0) AS restauration,
      COALESCE(SUM(CASE WHEN rub.code = 'BOISSONS' THEN rj.montant ELSE 0 END), 0) AS boissons,
      COALESCE(SUM(CASE WHEN rub.code NOT IN ('HEBERGEMENT', 'RESTAURATION', 'BOISSONS') THEN rj.montant ELSE 0 END), 0) AS autres
    FROM recettes_journalieres rj
    INNER JOIN rubriques rub ON rub.id = rj.rubrique_id
    WHERE rj.hotel_id = ?
      AND rj.deleted_at IS NULL
      AND rj.statut IN ${VALID_RECETTE_STATUTS}
      AND rj.date_journal LIKE ?
  `,
    )
    .get(hotelId, `${prefix}%`) as {
    hebergement: number;
    restauration: number;
    boissons: number;
    autres: number;
  };
  return row;
}

export function listObjectifs(
  actorUserId: number,
  filters: ObjectifFilters,
): ObjectifListItem[] {
  const actor = getActorContext(actorUserId);
  assertRecettesValidate(actor);

  const db = getDatabase();
  const conditions = ['o.deleted_at IS NULL'];
  const params: unknown[] = [];

  applyActorHotelFilter(actor, conditions, params, {
    alias: 'o',
    column: 'hotel_id',
    filterHotelId: filters.hotelId,
  });

  if (filters.annee) {
    conditions.push('o.annee = ?');
    params.push(filters.annee);
  }
  if (filters.mois) {
    conditions.push('o.mois = ?');
    params.push(filters.mois);
  }

  const rows = db
    .prepare(
      `
    SELECT
      o.id, o.hotel_id AS hotelId, h.name AS hotelName, o.mois, o.annee,
      o.objectif_hebergement, o.objectif_restauration, o.objectif_boissons, o.objectif_autres
    FROM objectifs o
    INNER JOIN hotels h ON h.id = o.hotel_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY o.annee DESC, o.mois DESC, h.name
  `,
    )
    .all(...params) as Array<{
    id: number;
    hotelId: number;
    hotelName: string;
    mois: number;
    annee: number;
    objectif_hebergement: number;
    objectif_restauration: number;
    objectif_boissons: number;
    objectif_autres: number;
  }>;

  return rows.map((r) => {
    const objTotal = objectifTotal(r);
    const realiseTotal = sumRealiseForMonth(db, r.hotelId, r.annee, r.mois);
    const taux = objTotal > 0 ? Math.round((realiseTotal / objTotal) * 1000) / 10 : 0;
    return {
      id: r.id,
      hotelId: r.hotelId,
      hotelName: r.hotelName,
      mois: r.mois,
      annee: r.annee,
      objectifTotal: objTotal,
      realiseTotal,
      tauxRealisation: taux,
    };
  });
}

export function getObjectif(
  actorUserId: number,
  hotelId: number,
  annee: number,
  mois: number,
): ObjectifDto {
  const actor = getActorContext(actorUserId);
  assertRecettesValidate(actor);
  const hid = resolveHotelId(actor, hotelId);

  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT o.*, h.name AS hotel_name
    FROM objectifs o
    INNER JOIN hotels h ON h.id = o.hotel_id
    WHERE o.hotel_id = ? AND o.annee = ? AND o.mois = ? AND o.deleted_at IS NULL
  `,
    )
    .get(hid, annee, mois) as Record<string, unknown> | undefined;

  const realise = realiseByCategory(db, hid, annee, mois);
  const canEdit = userCanEditObjectifs(actor);

  const base = {
    hotelId: hid,
    hotelName: row ? (row.hotel_name as string) : '',
    mois,
    annee,
    realiseHebergement: realise.hebergement,
    realiseRestauration: realise.restauration,
    realiseBoissons: realise.boissons,
    realiseAutres: realise.autres,
    canEdit,
  };

  if (!row) {
    const hotel = db.prepare(`SELECT name FROM hotels WHERE id = ?`).get(hid) as
      | { name: string }
      | undefined;
    return {
      id: null,
      ...base,
      hotelName: hotel?.name ?? '',
      objectifHebergement: 0,
      objectifRestauration: 0,
      objectifBoissons: 0,
      objectifAutres: 0,
      capaciteChambres: null,
      chambresVendues: null,
      tauxOccupationChambres: null,
      capaciteNuitees: null,
      nuiteesVendues: null,
      tauxFrequentationNuitees: null,
      capaciteRestaurant: null,
      couvertsVendus: null,
      tauxFrequentationRestaurant: null,
      prixMoyenChambre: null,
      revenuParChambreConstruite: null,
      prixMoyenCouvert: null,
      consoHebergement: null,
      consoRestauration: null,
      consoBoissons: null,
      consoAutres: null,
    };
  }

  return {
    id: row.id as number,
    ...base,
    hotelName: row.hotel_name as string,
    objectifHebergement: row.objectif_hebergement as number,
    objectifRestauration: row.objectif_restauration as number,
    objectifBoissons: row.objectif_boissons as number,
    objectifAutres: row.objectif_autres as number,
    capaciteChambres: (row.capacite_chambres as number) ?? null,
    chambresVendues: (row.chambres_vendues as number) ?? null,
    tauxOccupationChambres: (row.taux_occupation_chambres as number) ?? null,
    capaciteNuitees: (row.capacite_nuitees as number) ?? null,
    nuiteesVendues: (row.nuitees_vendues as number) ?? null,
    tauxFrequentationNuitees: (row.taux_frequentation_nuitees as number) ?? null,
    capaciteRestaurant: (row.capacite_restaurant as number) ?? null,
    couvertsVendus: (row.couverts_vendus as number) ?? null,
    tauxFrequentationRestaurant: (row.taux_frequentation_restaurant as number) ?? null,
    prixMoyenChambre: (row.prix_moyen_chambre as number) ?? null,
    revenuParChambreConstruite: (row.revenu_par_chambre_construite as number) ?? null,
    prixMoyenCouvert: (row.prix_moyen_couvert as number) ?? null,
    consoHebergement: (row.conso_hebergement as number) ?? null,
    consoRestauration: (row.conso_restauration as number) ?? null,
    consoBoissons: (row.conso_boissons as number) ?? null,
    consoAutres: (row.conso_autres as number) ?? null,
  };
}

function userCanEditObjectifs(actor: ActorContext): boolean {
  if (isGlobalAdminRole(actor.roleCode)) return true;
  return (
    userHasPermission(actor.userId, 'recettes.saisie') ||
    userHasPermission(actor.userId, 'recettes.validate')
  );
}

export function saveObjectif(actorUserId: number, input: SaveObjectifInput): ObjectifDto {
  const actor = getActorContext(actorUserId);
  assertObjectifsEdit(actor);
  const hid = resolveHotelId(actor, input.hotelId);

  if (input.mois < 1 || input.mois > 12) throw new Error('Mois invalide.');
  if (input.annee < 2000 || input.annee > 2100) throw new Error('Année invalide.');

  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT id FROM objectifs WHERE hotel_id = ? AND annee = ? AND mois = ? AND deleted_at IS NULL`,
    )
    .get(hid, input.annee, input.mois) as { id: number } | undefined;

  const payload = {
    objectif_hebergement: input.objectifHebergement,
    objectif_restauration: input.objectifRestauration,
    objectif_boissons: input.objectifBoissons,
    objectif_autres: input.objectifAutres,
    capacite_chambres: input.capaciteChambres ?? null,
    chambres_vendues: input.chambresVendues ?? null,
    taux_occupation_chambres: input.tauxOccupationChambres ?? null,
    capacite_nuitees: input.capaciteNuitees ?? null,
    nuitees_vendues: input.nuiteesVendues ?? null,
    taux_frequentation_nuitees: input.tauxFrequentationNuitees ?? null,
    capacite_restaurant: input.capaciteRestaurant ?? null,
    couverts_vendus: input.couvertsVendus ?? null,
    taux_frequentation_restaurant: input.tauxFrequentationRestaurant ?? null,
    prix_moyen_chambre: input.prixMoyenChambre ?? null,
    revenu_par_chambre_construite: input.revenuParChambreConstruite ?? null,
    prix_moyen_couvert: input.prixMoyenCouvert ?? null,
    conso_hebergement: input.consoHebergement ?? null,
    conso_restauration: input.consoRestauration ?? null,
    conso_boissons: input.consoBoissons ?? null,
    conso_autres: input.consoAutres ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    db.prepare(
      `
      UPDATE objectifs SET
        objectif_hebergement = @objectif_hebergement,
        objectif_restauration = @objectif_restauration,
        objectif_boissons = @objectif_boissons,
        objectif_autres = @objectif_autres,
        capacite_chambres = @capacite_chambres,
        chambres_vendues = @chambres_vendues,
        taux_occupation_chambres = @taux_occupation_chambres,
        capacite_nuitees = @capacite_nuitees,
        nuitees_vendues = @nuitees_vendues,
        taux_frequentation_nuitees = @taux_frequentation_nuitees,
        capacite_restaurant = @capacite_restaurant,
        couverts_vendus = @couverts_vendus,
        taux_frequentation_restaurant = @taux_frequentation_restaurant,
        prix_moyen_chambre = @prix_moyen_chambre,
        revenu_par_chambre_construite = @revenu_par_chambre_construite,
        prix_moyen_couvert = @prix_moyen_couvert,
        conso_hebergement = @conso_hebergement,
        conso_restauration = @conso_restauration,
        conso_boissons = @conso_boissons,
        conso_autres = @conso_autres,
        updated_at = @updated_at
      WHERE id = @id
    `,
    ).run({ ...payload, id: existing.id });
  } else {
    db.prepare(
      `
      INSERT INTO objectifs (
        uuid, hotel_id, mois, annee,
        objectif_hebergement, objectif_restauration, objectif_boissons, objectif_autres,
        capacite_chambres, chambres_vendues, taux_occupation_chambres,
        capacite_nuitees, nuitees_vendues, taux_frequentation_nuitees,
        capacite_restaurant, couverts_vendus, taux_frequentation_restaurant,
        prix_moyen_chambre, revenu_par_chambre_construite, prix_moyen_couvert,
        conso_hebergement, conso_restauration, conso_boissons, conso_autres
      ) VALUES (
        @uuid, @hotel_id, @mois, @annee,
        @objectif_hebergement, @objectif_restauration, @objectif_boissons, @objectif_autres,
        @capacite_chambres, @chambres_vendues, @taux_occupation_chambres,
        @capacite_nuitees, @nuitees_vendues, @taux_frequentation_nuitees,
        @capacite_restaurant, @couverts_vendus, @taux_frequentation_restaurant,
        @prix_moyen_chambre, @revenu_par_chambre_construite, @prix_moyen_couvert,
        @conso_hebergement, @conso_restauration, @conso_boissons, @conso_autres
      )
    `,
    ).run({
      uuid: randomUUID(),
      hotel_id: hid,
      mois: input.mois,
      annee: input.annee,
      ...payload,
    });
  }

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: existing ? 'UPDATE' : 'CREATE',
    module: 'objectifs',
    page: 'ObjectifFormPage',
    description: `Objectifs ${input.mois}/${input.annee} — hôtel ${hid}`,
  });

  return getObjectif(actorUserId, hid, input.annee, input.mois);
}
