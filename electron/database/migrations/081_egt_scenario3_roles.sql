-- Migration 081 : Rôles système du Scénario 3 (rapport organisation cible EGT Sidi Fredj, Mai 2026)
-- PDG conserve les fonctions régaliennes (existant) ; le DGA coordonne les directions
-- fonctionnelles ; la Direction des Unités touristiques devient le pivot opérationnel des 5 sites.
-- Le catalogue de permissions reste volontairement celui existant (8 codes) : ces rôles sont
-- éditables via Administration > Rôles si le RBAC est enrichi plus tard.
--
-- NB : 'audit.read', 'sync.full' et 'reports.export' ne sont normalement seedés qu'une fois par
-- electron/database/seed.ts, qui ne s'exécute que sur une base neuve et APRÈS les migrations.
-- On les sème donc ici aussi (idempotent, mêmes libellés/module que seed.ts) pour garantir que
-- les octrois de permissions ci-dessous fonctionnent aussi bien sur une base neuve que sur une
-- base existante, quel que soit l'ordre réel d'exécution.

INSERT OR IGNORE INTO permissions (uuid, code, label, module)
VALUES
  (lower(hex(randomblob(16))), 'audit.read', 'Consulter audit', 'audit'),
  (lower(hex(randomblob(16))), 'sync.full', 'Synchronisation complète', 'sync'),
  (lower(hex(randomblob(16))), 'reports.export', 'Exporter rapports', 'rapports');

INSERT OR IGNORE INTO roles (uuid, code, label, description)
VALUES
  (lower(hex(randomblob(16))), 'DGA', 'Directeur Général Adjoint', 'Coordination des directions fonctionnelles (Finance, RH, Commerce, Maintenance, Qualité, SI) — Scénario 3'),
  (lower(hex(randomblob(16))), 'DIRECTEUR_UNITES_TOURISTIQUES', 'Directeur des Unités touristiques', 'Pilotage transversal des 5 unités touristiques, pivot entre le DGA et les directeurs de site'),
  (lower(hex(randomblob(16))), 'DIRECTEUR_QUALITE', 'Directeur Qualité', 'Standards de service, écoute client, audits qualité, hygiène et conformité'),
  (lower(hex(randomblob(16))), 'DIRECTEUR_COMMERCIAL', 'Directeur Commerce & Marketing', 'Stratégie commerciale, marketing, communication digitale et partenariats'),
  (lower(hex(randomblob(16))), 'DIRECTEUR_MAINTENANCE', 'Directeur Équipement & Maintenance', 'Planification maintenance, travaux et investissements, contrôle technique'),
  (lower(hex(randomblob(16))), 'DIRECTEUR_SI', 'Directeur Informatique (DSI)', 'Schéma directeur informatique, cybersécurité, support et digitalisation'),
  (lower(hex(randomblob(16))), 'RESPONSABLE_SECURITE', 'Responsable Sécurité', 'Sécurité des personnes et des biens, cartographie des risques, coordination sécurité'),
  (lower(hex(randomblob(16))), 'RESPONSABLE_JURIDIQUE', 'Responsable Juridique', 'Contrats, contentieux, conformité et protection des données personnelles'),
  (lower(hex(randomblob(16))), 'RESPONSABLE_ACHATS', 'Responsable Achats', 'Stratégie d''achat, appels d''offres, négociation et suivi fournisseurs'),
  (lower(hex(randomblob(16))), 'CONTROLEUR_GESTION', 'Contrôleur de Gestion', 'Budget consolidé, analyse des écarts, tableaux de bord multi-sites');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DGA' AND p.code IN ('recettes.validate', 'audit.read', 'reports.export', 'reports.create', 'rh.manage', 'sync.full');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DIRECTEUR_UNITES_TOURISTIQUES' AND p.code IN ('recettes.validate', 'reports.export', 'reports.create');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DIRECTEUR_QUALITE' AND p.code IN ('reports.export', 'reports.create');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DIRECTEUR_COMMERCIAL' AND p.code IN ('reports.export', 'reports.create');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DIRECTEUR_MAINTENANCE' AND p.code IN ('reports.export', 'reports.create');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DIRECTEUR_SI' AND p.code IN ('sync.full', 'reports.export');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'RESPONSABLE_SECURITE' AND p.code = 'reports.export';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'RESPONSABLE_JURIDIQUE' AND p.code = 'reports.export';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'RESPONSABLE_ACHATS' AND p.code = 'reports.export';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'CONTROLEUR_GESTION' AND p.code IN ('audit.read', 'reports.export', 'reports.create');

-- Le DGA et le Directeur des Unités touristiques supervisent l'ensemble des sites, pas un hôtel unique.
UPDATE users SET hotel_scope = 'all'
WHERE role_id IN (SELECT id FROM roles WHERE code IN ('DGA', 'DIRECTEUR_UNITES_TOURISTIQUES'));
