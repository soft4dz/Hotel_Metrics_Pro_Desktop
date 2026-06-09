-- Rôle Super Administrateur — priorité absolue sur ADMIN_DEC
INSERT OR IGNORE INTO roles (uuid, code, label, description)
VALUES (
  'sa000000-0000-4000-8000-000000000001',
  'SUPERADMIN',
  'Super Administrateur',
  'Accès total — priorité absolue, non modifiable par les autres rôles'
);

-- Attribue toutes les permissions existantes au SUPERADMIN
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'SUPERADMIN'
  AND p.deleted_at IS NULL;
