-- Migration 082 : Alignement du référentiel RH sur le Scénario 3 (organisation cible EGT Sidi Fredj)
-- Additive uniquement : ne modifie pas les données de la migration 054.
-- Ajoute les structures introduites par le Scénario 3 (DGA, Contrôle de Gestion en staff PDG,
-- Direction des Unités touristiques comme pivot transversal) et annote la Direction de
-- l'Exploitation et du Contrôle (DEC) comme remplacée par ce scénario.

PRAGMA foreign_keys = ON;

-- ── Nouvelle direction DGA ────────────────────────────────────────────────────

INSERT OR IGNORE INTO rh_directions (nom, code, description) VALUES
  ('Direction Générale Adjointe', 'DGA', 'Coordination des directions fonctionnelles (Finance, RH, Commerce, Maintenance, Qualité, SI) — Scénario 3');

-- ── Départements additionnels ─────────────────────────────────────────────────

WITH deps(nom, direction_code, description) AS (
  VALUES
    ('Cabinet DGA', 'DGA', 'Coordination générale et appui du DGA auprès des directions fonctionnelles'),
    ('Contrôle de Gestion', 'PDG', 'Cellule Contrôle de Gestion en staff auprès du PDG — budget consolidé, écarts, tableaux de bord multi-sites (option privilégiée du rapport)'),
    ('Direction des Unités touristiques', 'DUNITES', 'Pilotage transversal des 5 unités touristiques, pivot entre le DGA et les directeurs de site')
)
INSERT OR IGNORE INTO rh_departements (nom, direction_id, description)
SELECT deps.nom, dir.id, deps.description
FROM deps
JOIN rh_directions dir ON dir.code = deps.direction_code;

-- ── Postes additionnels ───────────────────────────────────────────────────────

WITH postes(nom, departement_nom, role_system_associe, description) AS (
  VALUES
    ('Directeur Général Adjoint', 'Cabinet DGA', 'DGA', 'Coordination des directions fonctionnelles et appui au PDG dans le pilotage opérationnel'),
    ('Directeur des Unités touristiques', 'Direction des Unités touristiques', 'DIRECTEUR_UNITES_TOURISTIQUES', 'Pilotage transversal des 5 unités, supervision des directeurs de site'),
    ('Contrôleur de gestion siège', 'Contrôle de Gestion', 'CONTROLEUR_GESTION', 'Construction du budget consolidé, analyse des écarts, animation du réseau des CDG des unités')
)
INSERT OR IGNORE INTO rh_postes (nom, departement_id, salaire_min, salaire_max, role_system_associe, description)
SELECT postes.nom, d.id, NULL, NULL, postes.role_system_associe, postes.description
FROM postes
JOIN rh_departements d ON d.nom = postes.departement_nom;

-- ── Annotation de la Direction de l'Exploitation et du Contrôle (DEC) ────────
-- Le rapport Scénario 3 recommande la suppression de cette direction hybride : ses missions
-- sont redistribuées vers la Direction Commerce & Marketing (performance commerciale) et le
-- Contrôle de Gestion (suivi budgétaire). Annotation uniquement : les départements/postes
-- existants sous DEC sont conservés pour l'historique.

UPDATE rh_directions
SET description = 'Historique (organisation actuelle) — remplacée par le Scénario 3 : performance commerciale transférée à la Direction Commerce & Marketing (DCM), suivi budgétaire transféré au Contrôle de Gestion (staff PDG)'
WHERE code = 'DEC';
