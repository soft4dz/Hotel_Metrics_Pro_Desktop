-- Mot de passe initial obligatoire à changer + profil utilisateur

ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

