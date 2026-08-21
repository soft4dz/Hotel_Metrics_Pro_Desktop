<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route = $_GET['route'] ?? '';

function hmp_valid_uuid(mixed $value): bool
{
    return is_string($value)
        && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $value) === 1;
}

function hmp_valid_sync_item(mixed $item): bool
{
    if (!is_array($item) || !hmp_valid_uuid($item['uuid'] ?? null)) return false;
    if (!in_array($item['entityType'] ?? null, ['port_mouvement', 'port_relance'], true)) return false;
    if (!in_array($item['action'] ?? null, ['create', 'update', 'delete'], true)) return false;
    $payload = $item['payload'] ?? null;
    if (!is_array($payload) || !hmp_valid_uuid($payload['uuid'] ?? null)) return false;
    $updatedAt = $payload['updatedAt'] ?? null;
    return is_string($updatedAt) && strlen($updatedAt) <= 40 && strtotime($updatedAt) !== false;
}

if ($method === 'GET' && $route === 'health') {
    hmp_json(200, [
        'ok' => true,
        'service' => 'hotel-metrics-api',
        'version' => '0.9.0',
    ]);
}

$organizationCode = hmp_require_api_key();
$db = hmp_db();

if ($method === 'POST' && $route === 'sync/push') {
    $data = hmp_read_json_body();
    $deviceId = isset($data['deviceId']) ? trim((string) $data['deviceId']) : '';
    $items = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];

    if (!hmp_valid_uuid($deviceId) || count($items) > 100) {
        hmp_json(400, ['error' => 'Enveloppe de synchronisation invalide']);
    }

    hmp_touch_device($db, $organizationCode, $deviceId);

    $accepted = 0;
    $acceptedUuids = [];
    $rejected = [];
    $db->beginTransaction();
    try {
        $insertInbox = $db->prepare(
            'INSERT IGNORE INTO hmp_sync_inbox
             (uuid, organization_code, device_id, entity_type, entity_id, action, payload_json)
             VALUES (:uuid, :organization_code, :device_id, :entity_type, :entity_id, :action, :payload_json)'
        );
        $insertChange = $db->prepare(
            'INSERT IGNORE INTO hmp_sync_changes
             (uuid, organization_code, source_device_id, entity_type, entity_id, action, payload_json)
             VALUES (:uuid, :organization_code, :source_device_id, :entity_type, :entity_id, :action, :payload_json)'
        );

        foreach ($items as $item) {
            if (!hmp_valid_sync_item($item)) {
                $rejected[] = is_array($item) ? ($item['uuid'] ?? null) : null;
                continue;
            }

            $uuid = isset($item['uuid']) ? trim((string) $item['uuid']) : '';
            $entityType = isset($item['entityType']) ? trim((string) $item['entityType']) : '';
            $action = isset($item['action']) ? trim((string) $item['action']) : '';
            $entityId = isset($item['entityId']) && $item['entityId'] !== null
                ? (int) $item['entityId']
                : null;
            $payload = isset($item['payload']) && is_array($item['payload']) ? $item['payload'] : [];

            $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($payloadJson === false) {
                $rejected[] = $uuid;
                continue;
            }

            $insertInbox->execute([
                'uuid' => $uuid,
                'organization_code' => $organizationCode,
                'device_id' => $deviceId,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'action' => $action,
                'payload_json' => $payloadJson,
            ]);

            if ($insertInbox->rowCount() > 0) {
                $insertChange->execute([
                    'uuid' => $uuid,
                    'organization_code' => $organizationCode,
                    'source_device_id' => $deviceId,
                    'entity_type' => $entityType,
                    'entity_id' => $entityId,
                    'action' => $action,
                    'payload_json' => $payloadJson,
                ]);
            }
            // Les doublons idempotents sont acceptés eux aussi : le poste peut alors
            // retirer définitivement l'élément de sa file locale.
            $accepted++;
            $acceptedUuids[] = $uuid;
        }

        $db->commit();
        hmp_log($db, 'push', $organizationCode, $deviceId, 'ok', null, $accepted);
        hmp_json(200, [
            'accepted' => $accepted,
            'acceptedUuids' => $acceptedUuids,
            'rejected' => $rejected,
        ]);
    } catch (Throwable $e) {
        $db->rollBack();
        hmp_log($db, 'push', $organizationCode, $deviceId, 'error', $e->getMessage(), 0);
        hmp_json(500, ['error' => 'Erreur serveur']);
    }
}

if ($method === 'GET' && $route === 'sync/pull') {
    $deviceId = isset($_GET['deviceId']) ? trim((string) $_GET['deviceId']) : '';
    $cursor = filter_var($_GET['cursor'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
    if (!hmp_valid_uuid($deviceId) || $cursor === false) {
        hmp_json(400, ['error' => 'Curseur de synchronisation invalide']);
    }

    hmp_touch_device($db, $organizationCode, $deviceId);

    $limit = (int) (hmp_config()['pull_limit'] ?? 200);
    $changesStmt = $db->prepare(
        'SELECT id, uuid, entity_type, entity_id, action, payload_json, source_device_id, created_at
         FROM hmp_sync_changes
         WHERE organization_code = :organization_code
           AND id > :cursor
           AND source_device_id <> :device_id
         ORDER BY id ASC
         LIMIT ' . max(1, min($limit, 500))
    );
    $changesStmt->execute([
        'organization_code' => $organizationCode,
        'cursor' => $cursor,
        'device_id' => $deviceId,
    ]);
    $rows = $changesStmt->fetchAll();

    $changes = [];
    $nextCursor = (int) $cursor;
    foreach ($rows as $row) {
        $payload = json_decode((string) $row['payload_json'], true);
        if (!is_array($payload)) {
            $payload = [];
        }
        $changes[] = [
            'changeUuid' => $row['uuid'],
            'sourceDeviceId' => $row['source_device_id'],
            'entityType' => $row['entity_type'],
            'entityUuid' => $payload['uuid'] ?? '',
            'action' => $row['action'],
            'updatedAt' => $payload['updatedAt'] ?? $row['created_at'],
            'payload' => $payload,
        ];
        $nextCursor = max($nextCursor, (int) $row['id']);
    }

    $upsert = $db->prepare(
        'INSERT INTO hmp_sync_cursors (organization_code, device_id, last_change_id)
         VALUES (:organization_code, :device_id, :last_change_id)
         ON DUPLICATE KEY UPDATE last_change_id = GREATEST(last_change_id, VALUES(last_change_id))'
    );
    $upsert->execute([
        'organization_code' => $organizationCode,
        'device_id' => $deviceId,
        'last_change_id' => $nextCursor,
    ]);

    $hasMoreStmt = $db->prepare(
        'SELECT 1 FROM hmp_sync_changes
         WHERE organization_code=:organization_code AND id>:cursor AND source_device_id<>:device_id LIMIT 1'
    );
    $hasMoreStmt->execute(['organization_code' => $organizationCode, 'cursor' => $nextCursor, 'device_id' => $deviceId]);
    hmp_log($db, 'pull', $organizationCode, $deviceId, 'ok', null, count($changes));
    hmp_json(200, ['changes' => $changes, 'nextCursor' => $nextCursor, 'hasMore' => (bool) $hasMoreStmt->fetchColumn()]);
}

hmp_json(404, ['error' => 'Not found']);
