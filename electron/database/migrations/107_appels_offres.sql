-- ============================================================
-- Migration 107 — Module Appels d'offres et Consultations
-- Cycle complet : dossier multi-lots, documents, fournisseurs
-- invités, offres, ouverture des plis, évaluation, attribution.
-- Connecté à Achats uniquement à l'attribution (bon de commande).
-- ============================================================

CREATE TABLE IF NOT EXISTS appels_offres (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid                TEXT    NOT NULL UNIQUE,
  numero              TEXT    NOT NULL,
  hotel_id            INTEGER NOT NULL REFERENCES hotels(id),
  objet               TEXT    NOT NULL,
  regime              TEXT    NOT NULL DEFAULT 'consultation_restreinte'
                        CHECK(regime IN ('consultation_restreinte','appel_offres')),
  statut              TEXT    NOT NULL DEFAULT 'brouillon'
                        CHECK(statut IN ('brouillon','publie','ouvert','evaluation','attribue','annule')),
  date_lancement      TEXT,
  date_limite_depot   TEXT,
  date_ouverture      TEXT,
  cree_par            INTEGER REFERENCES users(id),
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appels_offres_hotel ON appels_offres(hotel_id, statut);

-- ── Rattachement à une ou plusieurs demandes d'achat approuvées ──
CREATE TABLE IF NOT EXISTS appel_offres_demandes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  appel_offres_id  INTEGER NOT NULL REFERENCES appels_offres(id) ON DELETE CASCADE,
  demande_id       INTEGER NOT NULL REFERENCES demandes_achat(id),
  UNIQUE(appel_offres_id, demande_id)
);

-- ── Lots ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appel_offres_lots (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  appel_offres_id       INTEGER NOT NULL REFERENCES appels_offres(id) ON DELETE CASCADE,
  numero_lot            TEXT    NOT NULL,
  designation           TEXT    NOT NULL,
  montant_estime        REAL    NOT NULL DEFAULT 0,
  statut                TEXT    NOT NULL DEFAULT 'ouvert'
                          CHECK(statut IN ('ouvert','attribue','infructueux','annule')),
  attribution_offre_id  INTEGER,
  bon_commande_id       INTEGER REFERENCES bons_commande(id),
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(appel_offres_id, numero_lot)
);

-- ── Documents attachés (dossier ou lot) ────────────────────
CREATE TABLE IF NOT EXISTS appel_offres_documents (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  appel_offres_id  INTEGER NOT NULL REFERENCES appels_offres(id) ON DELETE CASCADE,
  lot_id           INTEGER REFERENCES appel_offres_lots(id) ON DELETE CASCADE,
  type_document    TEXT    NOT NULL DEFAULT 'autre'
                     CHECK(type_document IN ('cahier_charges','reglement_consultation','autre')),
  titre            TEXT    NOT NULL,
  nom_fichier      TEXT    NOT NULL,
  chemin           TEXT    NOT NULL,
  taille_octets    INTEGER,
  uploaded_by      INTEGER REFERENCES users(id),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Fournisseurs invités ────────────────────────────────────
CREATE TABLE IF NOT EXISTS appel_offres_fournisseurs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  appel_offres_id  INTEGER NOT NULL REFERENCES appels_offres(id) ON DELETE CASCADE,
  fournisseur_id   INTEGER NOT NULL REFERENCES fournisseurs(id),
  statut           TEXT    NOT NULL DEFAULT 'invite'
                     CHECK(statut IN ('invite','a_repondu','decline')),
  invited_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  reponse_at       TEXT,
  UNIQUE(appel_offres_id, fournisseur_id)
);

-- ── Offres (par lot × fournisseur) ──────────────────────────
CREATE TABLE IF NOT EXISTS appel_offres_offres (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  appel_offres_id         INTEGER NOT NULL REFERENCES appels_offres(id) ON DELETE CASCADE,
  lot_id                  INTEGER NOT NULL REFERENCES appel_offres_lots(id) ON DELETE CASCADE,
  fournisseur_id          INTEGER NOT NULL REFERENCES fournisseurs(id),
  reference               TEXT,
  montant_ht              REAL    NOT NULL DEFAULT 0,
  montant_tva             REAL    NOT NULL DEFAULT 0,
  montant_ttc             REAL    NOT NULL DEFAULT 0,
  delai_livraison_jours   INTEGER NOT NULL DEFAULT 0,
  conditions_paiement     TEXT,
  conforme_administrativement INTEGER NOT NULL DEFAULT 1,
  retenue                 INTEGER NOT NULL DEFAULT 0,
  created_by              INTEGER REFERENCES users(id),
  created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(lot_id, fournisseur_id)
);

-- ── Commission d'ouverture des plis ─────────────────────────
CREATE TABLE IF NOT EXISTS appel_offres_commission (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  appel_offres_id  INTEGER NOT NULL REFERENCES appels_offres(id) ON DELETE CASCADE,
  nom              TEXT    NOT NULL,
  fonction         TEXT,
  role             TEXT    NOT NULL DEFAULT 'membre' CHECK(role IN ('president','membre','rapporteur'))
);

-- ── Procès-verbaux (ouverture, attribution) ────────────────
CREATE TABLE IF NOT EXISTS appel_offres_pv (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  appel_offres_id  INTEGER NOT NULL REFERENCES appels_offres(id) ON DELETE CASCADE,
  lot_id           INTEGER REFERENCES appel_offres_lots(id),
  type_pv          TEXT    NOT NULL CHECK(type_pv IN ('ouverture','attribution')),
  contenu_json     TEXT    NOT NULL,
  date_seance      TEXT    NOT NULL,
  cree_par         INTEGER REFERENCES users(id),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Grille d'évaluation (critères pondérés) ────────────────
CREATE TABLE IF NOT EXISTS appel_offres_criteres (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  appel_offres_id  INTEGER NOT NULL REFERENCES appels_offres(id) ON DELETE CASCADE,
  libelle          TEXT    NOT NULL,
  type_critere     TEXT    NOT NULL DEFAULT 'technique' CHECK(type_critere IN ('prix','technique','delai','autre')),
  ponderation_pct  REAL    NOT NULL DEFAULT 0
);

-- ── Notes d'évaluation (par offre × critère) ───────────────
CREATE TABLE IF NOT EXISTS appel_offres_notes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  offre_id         INTEGER NOT NULL REFERENCES appel_offres_offres(id) ON DELETE CASCADE,
  critere_id       INTEGER NOT NULL REFERENCES appel_offres_criteres(id) ON DELETE CASCADE,
  note             REAL    NOT NULL DEFAULT 0,
  commentaire      TEXT,
  noted_by         INTEGER REFERENCES users(id),
  noted_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(offre_id, critere_id)
);

INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'appels-offres.gerer','Créer et piloter les dossiers d''appel d''offres','appels-offres');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'appels-offres.commission','Participer à l''ouverture des plis','appels-offres');
INSERT OR IGNORE INTO permissions(uuid,code,label,module) VALUES(lower(hex(randomblob(16))),'appels-offres.attribuer','Attribuer un lot d''appel d''offres','appels-offres');

INSERT OR IGNORE INTO modules_config(module_id) VALUES('appels-offres');
