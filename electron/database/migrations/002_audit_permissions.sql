-- Permissions lecture audit pour le rôle AUDIT_INTERNE

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'AUDIT_INTERNE' AND p.code = 'audit.read';
