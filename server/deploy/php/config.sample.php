<?php
/**
 * Copier ce fichier en config.php et renseigner les valeurs cPanel.
 */
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'VOTRE_PREFIXE_hmp_sync',
        'user' => 'VOTRE_PREFIXE_hmp_user',
        'pass' => 'VOTRE_MOT_DE_PASSE_MYSQL',
        'charset' => 'utf8mb4',
    ],
    // Une clé distincte par organisation empêche toute lecture inter-sociétés.
    'organization_keys' => [
        'EGT-SIDI-FREDJ' => 'GENERER_UNE_CLE_SECRETE_LONGUE_ET_UNIQUE',
    ],
    'max_payload_bytes' => 5_000_000,
    'pull_limit' => 200,
];
