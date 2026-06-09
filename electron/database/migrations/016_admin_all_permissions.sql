-- Toutes les permissions pour ADMIN_DEC (comme SUPERADMIN en 015)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'ADMIN_DEC'
  AND p.deleted_at IS NULL;
