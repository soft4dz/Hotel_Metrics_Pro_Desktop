/**
 * Migration one-way : SQLite (Electron) → PostgreSQL (NestJS API)
 *
 * Usage:
 *   cd server
 *   npx ts-node scripts/migrate-from-sqlite.ts --sqlite ../../hotel_metrics.db
 */
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

const args = process.argv.slice(2);
const sqliteArg = args.find((a) => a.startsWith('--sqlite=')) ?? args[args.indexOf('--sqlite') + 1];

if (!sqliteArg) {
  console.error('Usage: ts-node migrate-from-sqlite.ts --sqlite <path-to-db>');
  process.exit(1);
}

const sqlitePath = path.resolve(sqliteArg);
const sqlite = new Database(sqlitePath, { readonly: true });
const prisma = new PrismaClient();

async function migrate() {
  console.log(`Migration depuis: ${sqlitePath}`);

  // ── Hôtels ────────────────────────────────────────────────────────────────
  const hotels = sqlite.prepare('SELECT * FROM hotels WHERE deleted_at IS NULL').all() as any[];
  for (const h of hotels) {
    await prisma.hotel.upsert({
      where: { id: h.id },
      update: {},
      create: {
        id: h.id,
        name: h.name,
        code: h.code,
        address: h.address,
        city: h.city,
        phone: h.phone,
        email: h.email,
        active: h.active === 1,
      },
    });
  }
  console.log(`✓ Hotels: ${hotels.length}`);

  // ── Rôles ─────────────────────────────────────────────────────────────────
  const roles = sqlite.prepare('SELECT * FROM roles').all() as any[];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: {},
      create: { id: r.id, code: r.code, label: r.label, isSystem: r.is_system === 1 },
    });
  }
  console.log(`✓ Roles: ${roles.length}`);

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  const users = sqlite.prepare('SELECT * FROM users WHERE deleted_at IS NULL').all() as any[];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        passwordHash: u.password_hash,
        firstName: u.first_name,
        lastName: u.last_name,
        roleId: u.role_id,
        isActive: u.is_active === 1,
      },
    });
  }
  console.log(`✓ Users: ${users.length}`);

  // ── Clients ───────────────────────────────────────────────────────────────
  try {
    const clients = sqlite.prepare('SELECT * FROM clients_facturation WHERE deleted_at IS NULL').all() as any[];
    for (const c of clients) {
      await prisma.client.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          type: c.type ?? 'particulier',
          nom: c.nom,
          prenom: c.prenom,
          raisonSociale: c.raison_sociale,
          email: c.email,
          telephone: c.telephone,
          ville: c.ville,
          wilaya: c.wilaya,
          nif: c.nif,
          actif: c.actif === 1,
        },
      });
    }
    console.log(`✓ Clients: ${clients.length}`);
  } catch { console.warn('⚠ Table clients_facturation non trouvée, ignorée'); }

  // ── Factures ──────────────────────────────────────────────────────────────
  try {
    const factures = sqlite.prepare('SELECT * FROM factures WHERE deleted_at IS NULL').all() as any[];
    for (const f of factures) {
      await prisma.facture.upsert({
        where: { id: f.id },
        update: {},
        create: {
          id: f.id,
          hotelId: f.hotel_id,
          clientId: f.client_id,
          clientNom: f.client_nom ?? '',
          numero: f.numero,
          dateEmission: f.date_emission,
          dateEcheance: f.date_echeance,
          statut: f.statut ?? 'brouillon',
          montantHt: f.montant_ht ?? 0,
          montantTva: f.montant_tva ?? 0,
          montantTtc: f.montant_ttc ?? 0,
          montantPaye: f.montant_paye ?? 0,
        },
      });
    }
    console.log(`✓ Factures: ${factures.length}`);
  } catch { console.warn('⚠ Table factures non trouvée, ignorée'); }

  // ── Encaissements ──────────────────────────────────────────────────────────
  try {
    const encs = sqlite.prepare('SELECT * FROM encaissements WHERE deleted_at IS NULL').all() as any[];
    for (const e of encs) {
      await prisma.encaissement.upsert({
        where: { id: e.id },
        update: {},
        create: {
          id: e.id,
          hotelId: e.hotel_id,
          dateEncaissement: e.date_encaissement,
          montant: e.montant,
          mode: e.mode ?? 'especes',
          reference: e.reference,
          description: e.description,
          statut: e.statut ?? 'en_attente',
        },
      });
    }
    console.log(`✓ Encaissements: ${encs.length}`);
  } catch { console.warn('⚠ Table encaissements non trouvée, ignorée'); }

  console.log('\n✅ Migration terminée');
}

migrate()
  .catch((e) => { console.error('❌ Erreur migration:', e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); sqlite.close(); });
