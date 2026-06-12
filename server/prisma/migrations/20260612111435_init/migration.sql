-- CreateTable
CREATE TABLE "hotels" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo_path" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_hotels" (
    "user_id" INTEGER NOT NULL,
    "hotel_id" INTEGER NOT NULL,

    CONSTRAINT "user_hotels_pkey" PRIMARY KEY ("user_id","hotel_id")
);

-- CreateTable
CREATE TABLE "rubriques" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "parent_id" INTEGER,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rubriques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recettes_journalieres" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "date_journal" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "created_by" INTEGER,
    "validated_by" INTEGER,
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recettes_journalieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recette_lignes" (
    "id" SERIAL NOT NULL,
    "recette_id" INTEGER NOT NULL,
    "rubrique_id" INTEGER NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observation" TEXT,
    "couverts" INTEGER,

    CONSTRAINT "recette_lignes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objectifs" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "rubrique_id" INTEGER,
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objectifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comptes_bancaires" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "intitule" TEXT NOT NULL,
    "banque" TEXT NOT NULL DEFAULT '',
    "numero_compte" TEXT,
    "solde_initial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comptes_bancaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encaissements" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "date_encaissement" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'especes',
    "reference" TEXT,
    "description" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "compte_bancaire_id" INTEGER,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "encaissements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_caisse" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "date_operation" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "entree" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortie" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "journal_caisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients_facturation" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'particulier',
    "civilite" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "raison_sociale" TEXT,
    "forme_juridique" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "mobile" TEXT,
    "fax" TEXT,
    "site_web" TEXT,
    "adresse" TEXT,
    "adresse_ligne1" TEXT,
    "adresse_ligne2" TEXT,
    "ville" TEXT,
    "wilaya" TEXT,
    "code_postal" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'Algérie',
    "nif" TEXT,
    "date_expiration_nif" TEXT,
    "rc" TEXT,
    "date_expiration_nrc" TEXT,
    "nis" TEXT,
    "ai" TEXT,
    "date_creation_entreprise" TEXT,
    "numero_agrement" TEXT,
    "assujetti_tva" BOOLEAN NOT NULL DEFAULT false,
    "numero_tva" TEXT,
    "regime_imposition" TEXT,
    "banque_client" TEXT,
    "agence_bancaire" TEXT,
    "rib" TEXT,
    "notes_internes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_facturation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients_contacts" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'autre',
    "nom" TEXT NOT NULL,
    "titre" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "client_id" INTEGER,
    "client_nom" TEXT NOT NULL DEFAULT '',
    "numero" TEXT NOT NULL,
    "date_emission" TEXT NOT NULL,
    "date_echeance" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "montant_ht" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montant_tva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montant_ttc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montant_paye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_facture" (
    "id" SERIAL NOT NULL,
    "facture_id" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "prix_unitaire" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taux_tva" DOUBLE PRECISION NOT NULL DEFAULT 19,
    "montant_ht" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montant_tva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montant_ttc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lignes_facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_facture" (
    "id" SERIAL NOT NULL,
    "facture_id" INTEGER NOT NULL,
    "date_paiement" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'especes',
    "reference" TEXT,
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "paiements_facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER,
    "user_email" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "hash" TEXT NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "label" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_events" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotels_uuid_key" ON "hotels"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_code_key" ON "hotels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rubriques_uuid_key" ON "rubriques"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "rubriques_code_key" ON "rubriques"("code");

-- CreateIndex
CREATE UNIQUE INDEX "recettes_journalieres_uuid_key" ON "recettes_journalieres"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "recettes_journalieres_hotel_id_date_journal_key" ON "recettes_journalieres"("hotel_id", "date_journal");

-- CreateIndex
CREATE UNIQUE INDEX "objectifs_hotel_id_annee_mois_rubrique_id_key" ON "objectifs"("hotel_id", "annee", "mois", "rubrique_id");

-- CreateIndex
CREATE UNIQUE INDEX "encaissements_uuid_key" ON "encaissements"("uuid");

-- CreateIndex
CREATE INDEX "encaissements_hotel_id_date_encaissement_idx" ON "encaissements"("hotel_id", "date_encaissement");

-- CreateIndex
CREATE INDEX "encaissements_statut_idx" ON "encaissements"("statut");

-- CreateIndex
CREATE INDEX "journal_caisse_hotel_id_date_operation_idx" ON "journal_caisse"("hotel_id", "date_operation");

-- CreateIndex
CREATE UNIQUE INDEX "clients_facturation_uuid_key" ON "clients_facturation"("uuid");

-- CreateIndex
CREATE INDEX "clients_contacts_client_id_idx" ON "clients_contacts"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "factures_uuid_key" ON "factures"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "factures_numero_key" ON "factures"("numero");

-- CreateIndex
CREATE INDEX "factures_hotel_id_idx" ON "factures"("hotel_id");

-- CreateIndex
CREATE INDEX "factures_statut_idx" ON "factures"("statut");

-- CreateIndex
CREATE INDEX "factures_client_id_idx" ON "factures"("client_id");

-- CreateIndex
CREATE INDEX "audit_logs_module_action_idx" ON "audit_logs"("module", "action");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_id_key" ON "devices"("device_id");

-- CreateIndex
CREATE INDEX "sync_events_device_id_idx" ON "sync_events"("device_id");

-- CreateIndex
CREATE INDEX "sync_events_created_at_idx" ON "sync_events"("created_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hotels" ADD CONSTRAINT "user_hotels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hotels" ADD CONSTRAINT "user_hotels_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubriques" ADD CONSTRAINT "rubriques_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "rubriques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recettes_journalieres" ADD CONSTRAINT "recettes_journalieres_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recette_lignes" ADD CONSTRAINT "recette_lignes_recette_id_fkey" FOREIGN KEY ("recette_id") REFERENCES "recettes_journalieres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recette_lignes" ADD CONSTRAINT "recette_lignes_rubrique_id_fkey" FOREIGN KEY ("rubrique_id") REFERENCES "rubriques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectifs" ADD CONSTRAINT "objectifs_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comptes_bancaires" ADD CONSTRAINT "comptes_bancaires_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encaissements" ADD CONSTRAINT "encaissements_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encaissements" ADD CONSTRAINT "encaissements_compte_bancaire_id_fkey" FOREIGN KEY ("compte_bancaire_id") REFERENCES "comptes_bancaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_caisse" ADD CONSTRAINT "journal_caisse_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients_contacts" ADD CONSTRAINT "clients_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients_facturation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients_facturation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_facture" ADD CONSTRAINT "lignes_facture_facture_id_fkey" FOREIGN KEY ("facture_id") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_facture" ADD CONSTRAINT "paiements_facture_facture_id_fkey" FOREIGN KEY ("facture_id") REFERENCES "factures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE RESTRICT ON UPDATE CASCADE;
