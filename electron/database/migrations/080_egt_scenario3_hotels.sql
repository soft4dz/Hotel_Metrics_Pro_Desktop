-- Migration 080 : Fiches hôtel réelles pour les 5 unités EGT Sidi Fredj (Scénario 3)
-- Le référentiel RH (migration 054) ne référence ces unités qu'en texte ; cette migration
-- crée les vraies fiches `hotels` nécessaires au multi-hôtel (recettes, PMS, scoping par site).
-- Le Port de plaisance reste hors `hotels` (référentiel PortMaster dédié).

INSERT OR IGNORE INTO hotels (uuid, code, name, city)
VALUES
  (lower(hex(randomblob(16))), 'EL-MARSA', 'Hôtel El Marsa', 'Sidi Fredj'),
  (lower(hex(randomblob(16))), 'EL-RIADH', 'Hôtel El Riadh', 'Sidi Fredj'),
  (lower(hex(randomblob(16))), 'EL-MANAR', 'Hôtel El Manar', 'Sidi Fredj'),
  (lower(hex(randomblob(16))), 'CT-MARINA', 'Centre Touristique & Résidence Marina', 'Sidi Fredj'),
  (lower(hex(randomblob(16))), 'AZUR-PLAGE', 'Club de Vacances Azur Plage', 'Sidi Fredj');
