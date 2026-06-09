<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route = $_GET['route'] ?? '';

if ($method === 'GET' && $route === 'health') {
    hmp_json(200, [
        'ok' => true,
        'service' => 'hotel-metrics-api',
        'version' => '0.8.0',
    ]);
}

hmp_require_api_key();
$db = hmp_db();

if ($method === 'POST' && $route === 'sync/push') {
    $data = hmp_read_json_body();
    $deviceId = isset($data['deviceId']) ? trim((string) $data['deviceId']) : '';
    $items = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];

    if ($deviceId === '' || strlen($deviceId) > 36) {
        hmp_json(400, ['error' => 'deviceId requis']);
    }

    hmp_touch_device($db, $deviceId);

    $accepted = 0;
    $db->beginTransaction();
    try {
        $insertInbox = $db->prepare(
            'INSERT IGNORE INTO hmp_sync_inbox
             (uuid, device_id, entity_type, entity_id, action, payload_json)
             VALUES (:uuid, :device_id, :entity_type, :entity_id, :action, :payload_json)'
        );
        $insertChange = $db->prepare(
            'INSERT IGNORE INTO hmp_sync_changes
             (uuid, source_device_id, entity_type, entity_id, action, payload_json)
             VALUES (:uuid, :source_device_id, :entity_type, :entity_id, :action, :payload_json)'
        );

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $uuid = isset($item['uuid']) ? trim((string) $item['uuid']) : '';
            $entityType = isset($item['entityType']) ? trim((string) $item['entityType']) : '';
            $action = isset($item['action']) ? trim((string) $item['action']) : '';
            $entityId = isset($item['entityId']) && $item['entityId'] !== null
                ? (int) $item['entityId']
                : null;
            $payload = isset($item['payload']) && is_array($item['payload']) ? $item['payload'] : [];

            if ($uuid === '' || $entityType === '' || $action === '') {
                continue;
            }

            $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($payloadJson === false) {
                continue;
            }

            $insertInbox->execute([
                'uuid' => $uuid,
                'device_id' => $deviceId,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'action' => $action,
                'payload_json' => $payloadJson,
            ]);

            if ($insertInbox->rowCount() > 0) {
                $insertChange->execute([
                    'uuid' => $uuid,
                    'source_device_id' => $deviceId,
                    'entity_type' => $entityType,
                    'entity_id' => $entityId,
                    'action' => $action,
                    'payload_json' => $payloadJson,
                ]);
                $accepted++;
            }
        }

        $db->commit();
        hmp_log($db, 'push', $deviceId, 'ok', null, $accepted);
        hmp_json(200, ['accepted' => $accepted, 'totalStored' => $accepted]);
    } catch (Throwable $e) {
        $db->rollBack();
        hmp_log($db, 'push', $deviceId, 'error', $e->getMessage(), 0);
        hmp_json(500, ['error' => 'Erreur serveur']);
    }
}

if ($method === 'GET' && $route === 'sync/pull') {
    $deviceId = isset($_GET['deviceId']) ? trim((string) $_GET['deviceId']) : '';
    if ($deviceId === '') {
        hmp_json(400, ['error' => 'deviceId requis']);
    }

    hmp_touch_device($db, $deviceId);

    $cursorStmt = $db->prepare(
        'SELECT last_pull_at FROM hmp_sync_cursors WHERE device_id = :device_id'
    );
    $cursorStmt->execute(['device_id' => $deviceId]);
    $cursor = $cursorStmt->fetch();
    $lastPull = $cursor['last_pull_at'] ?? '1970-01-01 00:00:00';

    $limit = (int) (hmp_config()['pull_limit'] ?? 200);
    $changesStmt = $db->prepare(
        'SELECT uuid, entity_type, entity_id, action, payload_json, source_device_id, created_at
         FROM hmp_sync_changes
         WHERE created_at > :last_pull
           AND source_device_id <> :device_id
         ORDER BY id ASC
         LIMIT ' . max(1, min($limit, 500))
    );
    $changesStmt->execute([
        'last_pull' => $lastPull,
        'device_id' => $deviceId,
    ]);
    $rows = $changesStmt->fetchAll();

    $changes = [];
    $maxCreated = $lastPull;
    foreach ($rows as $row) {
        $payload = json_decode((string) $row['payload_json'], true);
        if (!is_array($payload)) {
            $payload = [];
        }
        $changes[] = [
            'uuid' => $row['uuid'],
            'entityType' => $row['entity_type'],
            'entityId' => $row['entity_id'] !== null ? (int) $row['entity_id'] : null,
            'action' => $row['action'],
            'payload' => $payload,
            'sourceDeviceId' => $row['source_device_id'],
            'createdAt' => $row['created_at'],
        ];
        if ($row['created_at'] > $maxCreated) {
            $maxCreated = $row['created_at'];
        }
    }

    if (count($changes) > 0) {
        $upsert = $db->prepare(
            'INSERT INTO hmp_sync_cursors (device_id, last_pull_at)
             VALUES (:device_id, :last_pull_at)
             ON DUPLICATE KEY UPDATE last_pull_at = VALUES(last_pull_at)'
        );
        $upsert->execute([
            'device_id' => $deviceId,
            'last_pull_at' => $maxCreated,
        ]);
    }

    hmp_log($db, 'pull', $deviceId, 'ok', null, count($changes));
    hmp_json(200, ['changes' => $changes]);
}

hmp_json(404, ['error' => 'Not found']);
