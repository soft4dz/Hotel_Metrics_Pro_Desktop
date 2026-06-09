import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { getActorContext, isGlobalAdminRole } from './actorContext';
import { assertPermission, userHasPermission } from './permissions.service';

function assertPortmaster(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (userHasPermission(actorUserId, 'portmaster.full') || isGlobalAdminRole(actor.roleCode)) {
    return actor;
  }
  assertPermission(actorUserId, 'portmaster.full');
  return actor;
}

export interface TarifTranche {
  id?: number;
  longueurMinM: number;
  longueurMaxM: number | null;
  montantPeriode: number;
}

export interface TarifListItem {
  id: number;
  code: string;
  label: string;
  typePrestation: string;
  dateEffet: string;
  isActive: boolean;
}

export interface TarifDto {
  id: number;
  code: string;
  label: string;
  typePrestation: string;
  montantJournalier: number | null;
  dateEffet: string;
  dateFin: string | null;
  isActive: boolean;
  tranches: TarifTranche[];
}

export interface SaveTarifInput {
  code: string;
  label: string;
  typePrestation: string;
  montantJournalier?: number | null;
  dateEffet: string;
  dateFin?: string | null;
  isActive?: boolean;
  tranches: TarifTranche[];
}

export function listTarifs(actorUserId: number): TarifListItem[] {
  assertPortmaster(actorUserId);
  return getDatabase()
    .prepare(
      `
    SELECT id, code, label, type_prestation AS typePrestation, date_effet AS dateEffet, is_active AS isActive
    FROM port_tarifs WHERE deleted_at IS NULL ORDER BY date_effet DESC, code
  `,
    )
    .all() as TarifListItem[];
}

export function getTarif(actorUserId: number, id: number): TarifDto | null {
  assertPortmaster(actorUserId);
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM port_tarifs WHERE id = ? AND deleted_at IS NULL`).get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  const tranches = db
    .prepare(
      `SELECT id, longueur_min_m AS longueurMinM, longueur_max_m AS longueurMaxM, montant_periode AS montantPeriode
       FROM port_tarif_tranches WHERE tarif_id = ? ORDER BY longueur_min_m`,
    )
    .all(id) as TarifTranche[];
  return {
    id: row.id as number,
    code: row.code as string,
    label: row.label as string,
    typePrestation: row.type_prestation as string,
    montantJournalier: (row.montant_journalier as number) ?? null,
    dateEffet: row.date_effet as string,
    dateFin: (row.date_fin as string) ?? null,
    isActive: Boolean(row.is_active),
    tranches,
  };
}

export function saveTarif(actorUserId: number, input: SaveTarifInput, id?: number): TarifDto {
  const actor = assertPortmaster(actorUserId);
  const db = getDatabase();

  const used = db
    .prepare(`SELECT id FROM port_tarifs WHERE code = ? AND deleted_at IS NULL AND id != ?`)
    .get(input.code.trim(), id ?? 0);
  if (used) throw new Error('Code tarif déjà utilisé.');

  const payload = {
    code: input.code.trim(),
    label: input.label.trim(),
    type_prestation: input.typePrestation,
    montant_journalier: input.montantJournalier ?? null,
    date_effet: input.dateEffet,
    date_fin: input.dateFin ?? null,
    is_active: input.isActive !== false ? 1 : 0,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    db.prepare(
      `UPDATE port_tarifs SET code=@code, label=@label, type_prestation=@type_prestation,
       montant_journalier=@montant_journalier, date_effet=@date_effet, date_fin=@date_fin,
       is_active=@is_active, updated_at=@updated_at WHERE id=@id`,
    ).run({ ...payload, id });
    db.prepare(`DELETE FROM port_tarif_tranches WHERE tarif_id = ?`).run(id);
  } else {
    const r = db
      .prepare(
        `INSERT INTO port_tarifs (uuid, code, label, type_prestation, montant_journalier, date_effet, date_fin, is_active)
         VALUES (@uuid, @code, @label, @type_prestation, @montant_journalier, @date_effet, @date_fin, @is_active)`,
      )
      .run({ uuid: randomUUID(), ...payload });
    id = Number(r.lastInsertRowid);
  }

  const ins = db.prepare(
    `INSERT INTO port_tarif_tranches (tarif_id, longueur_min_m, longueur_max_m, montant_periode) VALUES (?, ?, ?, ?)`,
  );
  for (const t of input.tranches) {
    ins.run(id, t.longueurMinM, t.longueurMaxM ?? null, t.montantPeriode);
  }

  writeAuditLog({
    userId: actor.userId,
    userEmail: actor.email,
    roleCode: actor.roleCode,
    action: 'UPDATE',
    module: 'portmaster',
    page: 'TarifsPage',
    description: `Tarif ${input.code}`,
  });

  return getTarif(actorUserId, id)!;
}

/** Simulation tarifaire selon longueur bateau (m) */
export function simulerTarif(
  actorUserId: number,
  tarifId: number,
  longueurM: number,
): { montant: number; tranche: string } {
  assertPortmaster(actorUserId);
  const tarif = getTarif(actorUserId, tarifId);
  if (!tarif) throw new Error('Tarif introuvable.');

  for (const t of tarif.tranches) {
    const max = t.longueurMaxM ?? 9999;
    if (longueurM >= t.longueurMinM && longueurM <= max) {
      return {
        montant: t.montantPeriode,
        tranche: `${t.longueurMinM}–${t.longueurMaxM ?? '∞'} m`,
      };
    }
  }

  if (tarif.montantJournalier) {
    return { montant: tarif.montantJournalier * 30, tranche: 'Tarif journalier × 30' };
  }

  return { montant: 0, tranche: 'Aucune tranche applicable' };
}
