import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from './betterSqlite';
import { getDatabase } from './sqlite';
import { rowsFromInsert, toInt, toNumber } from './legacyParser';
import {
  legacyPasswordRawFromRow,
  normalizeLegacyPasswordHash,
} from '../utils/legacyPassword';
import { logger } from '../utils/logger';

export interface ImportResult {
  ok: boolean;
  message: string;
  stats: Record<string, number>;
}

const LEGACY_ROLE_MAP: Record<string, string> = {
  admin: 'ADMIN_DEC',
  pdg: 'PDG',
  utilisateur_hotel: 'CONTROLEUR_UNITE',
};

const RUBRIQUE_CODE_BY_TYPE: Record<string, string> = {
  '1': 'HEBERGEMENT',
  '2': 'RESTAURATION',
  '3': 'BOISSONS',
  '4': 'AUTRES',
};

function readSqlFile(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`Fichier introuvable : ${filePath}`);
  }
  return readFileSync(filePath, 'utf-8');
}

function getRoleId(db: SqliteDatabase, code: string): number {
  const row = db.prepare(`SELECT id FROM roles WHERE code = ?`).get(code) as
    | { id: number }
    | undefined;
  if (!row) throw new Error(`Rôle manquant : ${code}`);
  return row.id;
}

function syncAutoIncrement(db: SqliteDatabase): void {
  for (const table of ['hotels', 'users', 'rubriques', 'recettes_journalieres', 'objectifs']) {
    const row = db.prepare(`SELECT COALESCE(MAX(id), 0) AS m FROM ${table}`).get() as {
      m: number;
    };
    db.prepare(
      `UPDATE sqlite_sequence SET seq = ? WHERE name = ?`,
    ).run(row.m, table);
  }
}

function resetBusinessData(db: SqliteDatabase): void {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM recettes_journalieres;
    DELETE FROM objectifs;
    DELETE FROM audit_log;
    DELETE FROM logs_connexions;
    DELETE FROM users;
    DELETE FROM rubriques;
    DELETE FROM hotels;
    DELETE FROM sqlite_sequence WHERE name IN (
      'users','hotels','rubriques','recettes_journalieres','objectifs','audit_log','logs_connexions'
    );
    PRAGMA foreign_keys = ON;
  `);
}

function importHotels(db: SqliteDatabase, sql: string): number {
  const rows = rowsFromInsert(sql, 'hotels');
  const stmt = db.prepare(`
    INSERT INTO hotels (id, uuid, code, name, city, is_active, sync_status)
    VALUES (@id, @uuid, @code, @name, @city, @is_active, 'synced')
  `);

  const run = db.transaction(() => {
    for (const r of rows) {
      const id = toInt(r.id)!;
      stmt.run({
        id,
        uuid: randomUUID(),
        code: `HTL${String(id).padStart(2, '0')}`,
        name: r.nom,
        city: (r.adresse || '').split(',')[0] || r.adresse || null,
        is_active: r.actif === '0' ? 0 : 1,
      });
    }
  });
  run();
  return rows.length;
}

function importRubriques(db: SqliteDatabase, sql: string): Map<number, number> {
  const legacyRows = rowsFromInsert(sql, 'rubriques');
  const legacyToNew = new Map<number, number>();

  const insert = db.prepare(`
    INSERT INTO rubriques (id, uuid, code, label, sort_order, is_active, sync_status)
    VALUES (@id, @uuid, @code, @label, @sort_order, 1, 'synced')
  `);

  const run = db.transaction(() => {
    for (const r of legacyRows) {
      const legacyId = toInt(r.id)!;
      const typeId = r.type_id || '';
      const code = RUBRIQUE_CODE_BY_TYPE[typeId]
        ? `${RUBRIQUE_CODE_BY_TYPE[typeId]}_${legacyId}`
        : `LEGACY_${legacyId}`;

      insert.run({
        id: legacyId,
        uuid: randomUUID(),
        code,
        label: r.nom,
        sort_order: legacyId,
      });
      legacyToNew.set(legacyId, legacyId);
    }
  });
  run();
  return legacyToNew;
}

function importUsers(db: SqliteDatabase, sql: string): number {
  const rows = rowsFromInsert(sql, 'users');
  const stmt = db.prepare(`
    INSERT INTO users (
      id, uuid, email, password_hash, full_name, role_id, hotel_id, is_active,
      failed_login_attempts, must_change_password, sync_status
    ) VALUES (
      @id, @uuid, @email, @password_hash, @full_name, @role_id, @hotel_id, @is_active,
      @failed_login_attempts, @must_change_password, 'synced'
    )
  `);

  const run = db.transaction(() => {
    for (const r of rows) {
      const roleCode = LEGACY_ROLE_MAP[r.role] || 'CONTROLEUR_UNITE';
      const roleId = getRoleId(db, roleCode);
      const prenom = r.prenom?.trim() || '';
      const nom = r.nom?.trim() || '';
      const fullName = [prenom, nom].filter(Boolean).join(' ') || r.email;
      const rawPassword = legacyPasswordRawFromRow(r);

      stmt.run({
        id: toInt(r.id)!,
        uuid: randomUUID(),
        email: r.email.trim().toLowerCase(),
        password_hash: normalizeLegacyPasswordHash(rawPassword),
        must_change_password:
          !rawPassword || !/^\$2[aby]\$/.test(rawPassword) ? 1 : 0,
        full_name: fullName,
        role_id: roleId,
        hotel_id: toInt(r.hotel_id),
        is_active: r.actif === '0' ? 0 : 1,
        failed_login_attempts: toInt(r.login_attempts) ?? 0,
      });
    }
  });
  run();
  return rows.length;
}

function importObjectifs(db: SqliteDatabase, sql: string): number {
  const rows = rowsFromInsert(sql, 'objectifs');
  const stmt = db.prepare(`
    INSERT INTO objectifs (
      uuid, hotel_id, mois, annee,
      objectif_hebergement, objectif_restauration, objectif_boissons, objectif_autres,
      capacite_chambres, chambres_vendues, taux_occupation_chambres,
      capacite_nuitees, nuitees_vendues, taux_frequentation_nuitees,
      capacite_restaurant, couverts_vendus, taux_frequentation_restaurant,
      prix_moyen_chambre, revenu_par_chambre_construite, prix_moyen_couvert,
      conso_hebergement, conso_restauration, conso_boissons, conso_autres,
      sync_status
    ) VALUES (
      @uuid, @hotel_id, @mois, @annee,
      @objectif_hebergement, @objectif_restauration, @objectif_boissons, @objectif_autres,
      @capacite_chambres, @chambres_vendues, @taux_occupation_chambres,
      @capacite_nuitees, @nuitees_vendues, @taux_frequentation_nuitees,
      @capacite_restaurant, @couverts_vendus, @taux_frequentation_restaurant,
      @prix_moyen_chambre, @revenu_par_chambre_construite, @prix_moyen_couvert,
      @conso_hebergement, @conso_restauration, @conso_boissons, @conso_autres,
      'synced'
    )
  `);

  const run = db.transaction(() => {
    for (const r of rows) {
      stmt.run({
        uuid: randomUUID(),
        hotel_id: toInt(r.hotel_id)!,
        mois: toInt(r.mois)!,
        annee: toInt(r.annee)!,
        objectif_hebergement: toNumber(r.objectif_hebergement),
        objectif_restauration: toNumber(r.objectif_restauration),
        objectif_boissons: toNumber(r.objectif_boissons),
        objectif_autres: toNumber(r.objectif_autres),
        capacite_chambres: toInt(r.capacite_chambres),
        chambres_vendues: toInt(r.chambres_vendues),
        taux_occupation_chambres: toNumber(r.taux_occupation_chambres) || null,
        capacite_nuitees: toInt(r.capacite_nuitees),
        nuitees_vendues: toInt(r.nuitees_vendues),
        taux_frequentation_nuitees: toNumber(r.taux_frequentation_nuitees) || null,
        capacite_restaurant: toInt(r.capacite_restaurant),
        couverts_vendus: toInt(r.couverts_vendus),
        taux_frequentation_restaurant: toNumber(r.taux_frequentation_restaurant) || null,
        prix_moyen_chambre: toNumber(r.prix_moyen_chambre) || null,
        revenu_par_chambre_construite: toNumber(r.revenu_par_chambre_construite) || null,
        prix_moyen_couvert: toNumber(r.prix_moyen_couvert) || null,
        conso_hebergement: toNumber(r.conso_hebergement) || null,
        conso_restauration: toNumber(r.conso_restauration) || null,
        conso_boissons: toNumber(r.conso_boissons) || null,
        conso_autres: toNumber(r.conso_autres) || null,
      });
    }
  });
  run();
  return rows.length;
}

function importRecettes(
  db: SqliteDatabase,
  sql: string,
  rubriqueMap: Map<number, number>,
): number {
  const revenues = rowsFromInsert(sql, 'revenues');
  const details = rowsFromInsert(sql, 'revenue_details');

  const revenueById = new Map(
    revenues.map((r) => [
      toInt(r.id)!,
      {
        hotelId: toInt(r.hotel_id)!,
        date: r.date,
        encaissement: toNumber(r.encaissement_ht),
        chambres: toInt(r.chambres) ?? 0,
        nuitees: toInt(r.nuitees) ?? 0,
        couverts: toInt(r.couverts) ?? 0,
      },
    ]),
  );

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO recettes_journalieres (
      uuid, hotel_id, rubrique_id, date_journal, montant, statut,
      encaissement_ht, chambres, nuitees, couverts, legacy_revenue_id, sync_status
    ) VALUES (
      @uuid, @hotel_id, @rubrique_id, @date_journal, @montant, 'validated',
      @encaissement_ht, @chambres, @nuitees, @couverts, @legacy_revenue_id, 'synced'
    )
  `);

  let count = 0;
  const run = db.transaction(() => {
    for (const d of details) {
      const revId = toInt(d.revenue_id)!;
      const rev = revenueById.get(revId);
      if (!rev) continue;

      const legacyRubId = toInt(d.rubrique_id)!;
      const rubriqueId = rubriqueMap.get(legacyRubId);
      if (!rubriqueId) continue;

      const montant = toNumber(d.montant);
      if (montant === 0) continue;

      stmt.run({
        uuid: randomUUID(),
        hotel_id: rev.hotelId,
        rubrique_id: rubriqueId,
        date_journal: rev.date,
        montant,
        encaissement_ht: rev.encaissement,
        chambres: rev.chambres,
        nuitees: rev.nuitees,
        couverts: rev.couverts,
        legacy_revenue_id: revId,
      });
      count++;
    }
  });
  run();
  return count;
}

function importAuditLog(db: SqliteDatabase, sql: string): number {
  const rows = rowsFromInsert(sql, 'audit_log');
  const stmt = db.prepare(`
    INSERT INTO audit_log (
      uuid, user_id, user_email, role_code, action, module, page,
      description, ip_address, created_at, sync_status
    ) VALUES (
      @uuid, @user_id, @user_email, @role_code, @action, @module, @page,
      @description, @ip_address, @created_at, 'synced'
    )
  `);

  const run = db.transaction(() => {
    for (const r of rows) {
      const action = (r.action_type || 'ACTION').toUpperCase();
      stmt.run({
        uuid: randomUUID(),
        user_id: toInt(r.user_id),
        user_email: r.username || null,
        role_code: r.role || null,
        action: action === 'CONNEXION' ? 'LOGIN' : action,
        module: 'legacy',
        page: r.page || null,
        description: r.description || '',
        ip_address: r.ip_address || null,
        created_at: r.action_date || r.created_at || new Date().toISOString(),
      });
    }
  });
  run();
  return rows.length;
}

function importLogsConnexions(db: SqliteDatabase, sql: string): number {
  const rows = rowsFromInsert(sql, 'logs_connexions');
  if (rows.length === 0) return 0;

  const stmt = db.prepare(`
    INSERT INTO logs_connexions (uuid, user_id, email, success, ip_address, created_at)
    VALUES (@uuid, @user_id, @email, 1, @ip_address, @created_at)
  `);

  const run = db.transaction(() => {
    for (const r of rows) {
      stmt.run({
        uuid: randomUUID(),
        user_id: toInt(r.user_id),
        email: `user_${r.user_id}@import.local`,
        ip_address: r.ip_address || null,
        created_at: r.date_connexion || new Date().toISOString(),
      });
    }
  });
  run();
  return rows.length;
}

/**
 * Importe le dump MySQL/MariaDB phpMyAdmin vers SQLite locale.
 * Remplace les données métier existantes (hôtels, users, recettes, objectifs, audit).
 */
export function importLegacyDatabase(filePath: string): ImportResult {
  const db = getDatabase();
  const sql = readSqlFile(filePath);
  const stats: Record<string, number> = {};

  logger.info(`Import legacy démarré : ${filePath}`);

  try {
    resetBusinessData(db);

    stats.hotels = importHotels(db, sql);
    const rubriqueMap = importRubriques(db, sql);
    stats.rubriques = rubriqueMap.size;
    stats.users = importUsers(db, sql);
    stats.objectifs = importObjectifs(db, sql);
    stats.recettes_journalieres = importRecettes(db, sql, rubriqueMap);
    stats.audit_log = importAuditLog(db, sql);
    stats.logs_connexions = importLogsConnexions(db, sql);

    db.prepare(
      `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('legacy_import_at', datetime('now'))`,
    ).run();
    db.prepare(
      `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('legacy_import_file', ?)`,
    ).run(filePath);

    syncAutoIncrement(db);

    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    logger.info(`Import terminé — ${total} enregistrements`);

    return {
      ok: true,
      message: `Import réussi depuis ${filePath}`,
      stats,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur import';
    logger.error('Échec import legacy', err);
    return { ok: false, message: msg, stats };
  }
}
