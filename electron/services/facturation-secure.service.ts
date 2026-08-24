import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database/sqlite';
import { writeAuditLog } from './audit.service';
import { dualWrite } from './dualWrite';
import {
  actorCanAccessHotel,
  getActorContext,
  isGlobalAdminRole,
} from './actorContext';
import * as base from './facturation.service';

export type {
  AddPaiementInput,
  ClientFacturation,
  CreateClientInput,
  CreateFactureInput,
  FacturationDashboard,
  FactureDetail,
  FactureFilters,
  FactureListItem,
  FactureStatut,
  LigneFacture,
  LigneInput,
  ModePaiementFact,
  PaiementFacture,
  TypeClient,
} from './facturation.service';

export const getFacturationDashboard = base.getFacturationDashboard;
export const listFactures = base.listFactures;
export const getFactureDetail = base.getFactureDetail;
export const soumettreFacture = base.soumettreFacture;
export const validerFacture = base.validerFacture;
export const annulerFacture = base.annulerFacture;
export const deleteFacture = base.deleteFacture;
export const listClients = base.listClients;
export const createClient = base.createClient;
export const updateClient = base.updateClient;
export const deleteClient = base.deleteClient;

function assertCanFacturer(actorUserId: number) {
  const actor = getActorContext(actorUserId);
  if (!isGlobalAdminRole(actor.roleCode)) {
    throw new Error('Permission refusée. Rôle administrateur requis.');
  }
  return actor;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateLine(line: base.LigneInput) {
  const tauxTva = line.tauxTva ?? 19;
  const montantHt = roundCurrency(line.quantite * line.prixUnitaire);
  const montantTva = roundCurrency((montantHt * tauxTva) / 100);
  const montantTtc = roundCurrency(montantHt + montantTva);
  return { tauxTva, montantHt, montantTva, montantTtc };
}

function normalizedHotelCode(code: string): string {
  const normalized = code
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16);
  return normalized || 'UNITE';
}

function nextInvoiceNumber(hotelId: number, dateEmission: string): string {
  const db = getDatabase();
  const hotel = db
    .prepare(`SELECT code FROM hotels WHERE id = ? AND deleted_at IS NULL`)
    .get(hotelId) as { code: string } | undefined;
  if (!hotel) throw new Error(`Unité ${hotelId} introuvable.`);

  const exercice = Number(dateEmission.slice(0, 4));
  const sequence = db
    .prepare(
      `
      INSERT INTO facture_sequences (hotel_id, exercice, last_value, updated_at)
      VALUES (?, ?, 1, datetime('now'))
      ON CONFLICT (hotel_id, exercice) DO UPDATE SET
        last_value = facture_sequences.last_value + 1,
        updated_at = datetime('now')
      RETURNING last_value
    `,
    )
    .get(hotelId, exercice) as { last_value: number };

  return `FAC-${normalizedHotelCode(hotel.code)}-${exercice}-${String(sequence.last_value).padStart(6, '0')}`;
}

export function createFacture(
  actorUserId: number,
  input: base.CreateFactureInput,
): base.FactureDetail {
  const actor = assertCanFacturer(actorUserId);
  if (!actorCanAccessHotel(actor, input.hotelId)) throw new Error('Accès hôtel refusé.');
  if (!input.lignes.length) throw new Error('La facture doit contenir au moins une ligne.');

  const db = getDatabase();
  const dateEmission = input.dateEmission ?? new Date().toISOString().slice(0, 10);
  const calculations = input.lignes.map(calculateLine);
  const totalHt = roundCurrency(calculations.reduce((sum, line) => sum + line.montantHt, 0));
  const totalTva = roundCurrency(calculations.reduce((sum, line) => sum + line.montantTva, 0));
  const totalTtc = roundCurrency(calculations.reduce((sum, line) => sum + line.montantTtc, 0));

  const transaction = db.transaction(() => {
    let clientNom = input.clientNom ?? '';
    if (input.clientId && !clientNom) {
      const client = db
        .prepare(
          `SELECT nom, raison_sociale FROM clients_facturation WHERE id = ? AND deleted_at IS NULL`,
        )
        .get(input.clientId) as { nom: string; raison_sociale: string | null } | undefined;
      if (!client) throw new Error(`Client ${input.clientId} introuvable.`);
      clientNom = client.raison_sociale ?? client.nom;
    }

    const numero = nextInvoiceNumber(input.hotelId, dateEmission);
    const result = db
      .prepare(
        `
        INSERT INTO factures (
          uuid, hotel_id, client_id, client_nom, numero, date_emission,
          date_echeance, statut, montant_ht, montant_tva, montant_ttc,
          montant_paye, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'brouillon', ?, ?, ?, 0, ?, ?)
      `,
      )
      .run(
        randomUUID(),
        input.hotelId,
        input.clientId ?? null,
        clientNom,
        numero,
        dateEmission,
        input.dateEcheance ?? null,
        totalHt,
        totalTva,
        totalTtc,
        input.notes ?? null,
        actorUserId,
      );

    const factureId = Number(result.lastInsertRowid);
    const insertLine = db.prepare(
      `
      INSERT INTO lignes_facture (
        facture_id, designation, quantite, prix_unitaire, taux_tva,
        montant_ht, montant_tva, montant_ttc, ordre
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    );

    input.lignes.forEach((line, index) => {
      const calc = calculations[index]!;
      insertLine.run(
        factureId,
        line.designation,
        line.quantite,
        line.prixUnitaire,
        calc.tauxTva,
        calc.montantHt,
        calc.montantTva,
        calc.montantTtc,
        line.ordre ?? index,
      );
    });

    writeAuditLog({
      userId: actorUserId,
      action: 'CREATE',
      module: 'facturation',
      description: `Facture ${numero} créée`,
    });

    return { factureId, numero, clientNom };
  });

  const created = transaction();
  const facture = base.getFactureDetail(actorUserId, created.factureId);
  dualWrite(facture, 'post', '/facturation', {
    hotelId: input.hotelId,
    clientId: input.clientId,
    clientNom: created.clientNom,
    dateEmission,
    dateEcheance: input.dateEcheance,
    notes: input.notes,
    lignes: input.lignes,
  });
  return facture;
}

export function updateFacture(
  actorUserId: number,
  id: number,
  input: Partial<base.CreateFactureInput>,
): base.FactureDetail {
  return getDatabase().transaction(() => base.updateFacture(actorUserId, id, input))();
}

export function addPaiement(
  actorUserId: number,
  input: base.AddPaiementInput,
): base.FactureDetail {
  return getDatabase().transaction(() => base.addPaiement(actorUserId, input))();
}

export function deletePaiement(actorUserId: number, id: number): base.FactureDetail {
  return getDatabase().transaction(() => base.deletePaiement(actorUserId, id))();
}
