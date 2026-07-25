-- Préférences interface par utilisateur (profil layout, sidebar, thème)

ALTER TABLE users ADD COLUMN ui_preferences_json TEXT;
