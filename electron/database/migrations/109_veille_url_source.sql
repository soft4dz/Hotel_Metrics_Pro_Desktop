-- ============================================================
-- Migration 109 — Veille réglementaire : lien source externe
-- Permet de coller un lien (ex: JORADP) vers le texte officiel
-- sans tenter d'automatiser sa récupération.
-- ============================================================

ALTER TABLE veille_reglementaire ADD COLUMN url_source TEXT;
