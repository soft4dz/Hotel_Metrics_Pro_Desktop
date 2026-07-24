-- Phase 5 — Chaîne réception BC → stock → TVA achats
ALTER TABLE bons_commande ADD COLUMN date_livraison_effective TEXT;

CREATE INDEX IF NOT EXISTS idx_bc_lignes_bon ON bons_commande_lignes(bon_id);
