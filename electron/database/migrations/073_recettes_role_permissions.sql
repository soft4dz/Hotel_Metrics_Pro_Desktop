-- Permissions recettes (saisie / validation) — alignement registre rôles
INSERT OR IGNORE INTO permissions (uuid, code, label, module)
VALUES
  (lower(hex(randomblob(16))), 'recettes.saisie', 'Saisir les recettes', 'recettes'),
  (lower(hex(randomblob(16))), 'recettes.validate', 'Valider les recettes', 'recettes');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'DIRECTEUR_UNITE' AND p.code = 'recettes.validate';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'CONTROLEUR_UNITE' AND p.code = 'recettes.saisie';
