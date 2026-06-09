-- Synchronise toutes les permissions sur SUPERADMIN (y compris permissions ajoutées après 010)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SUPERADMIN'
  AND p.deleted_at IS NULL;
