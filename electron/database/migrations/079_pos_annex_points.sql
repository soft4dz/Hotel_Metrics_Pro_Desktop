-- Points de vente annexes : plage, piscine et parking

INSERT OR IGNORE INTO pos_points_vente (hotel_id, code, nom, type)
SELECT id, 'PLAGE', 'Plage', 'plage' FROM hotels;

INSERT OR IGNORE INTO pos_points_vente (hotel_id, code, nom, type)
SELECT id, 'PISCINE', 'Piscine', 'piscine' FROM hotels;

INSERT OR IGNORE INTO pos_points_vente (hotel_id, code, nom, type)
SELECT id, 'PARKING', 'Parking', 'parking' FROM hotels;

INSERT OR IGNORE INTO pos_factions (point_vente_id, code, nom, heure_debut, heure_fin, ordre)
SELECT pv.id, 'JOUR', 'Service journée', '00:00', '23:59', 1
FROM pos_points_vente pv
WHERE pv.type IN ('plage', 'piscine', 'parking')
  AND NOT EXISTS (
    SELECT 1 FROM pos_factions f WHERE f.point_vente_id = pv.id AND f.code = 'JOUR'
  );
