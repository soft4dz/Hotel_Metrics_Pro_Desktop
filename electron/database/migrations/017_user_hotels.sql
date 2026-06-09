-- Association utilisateur ↔ unités (multi-hôtels)

ALTER TABLE users ADD COLUMN hotel_scope TEXT NOT NULL DEFAULT 'assigned';

CREATE TABLE IF NOT EXISTS user_hotels (
  user_id INTEGER NOT NULL,
  hotel_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, hotel_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (hotel_id) REFERENCES hotels(id)
);

CREATE INDEX IF NOT EXISTS idx_user_hotels_hotel ON user_hotels(hotel_id);

INSERT OR IGNORE INTO user_hotels (user_id, hotel_id)
SELECT id, hotel_id FROM users WHERE hotel_id IS NOT NULL AND deleted_at IS NULL;

UPDATE users SET hotel_scope = 'all'
WHERE role_id IN (SELECT id FROM roles WHERE code IN ('SUPERADMIN', 'ADMIN_DEC', 'PDG'));
