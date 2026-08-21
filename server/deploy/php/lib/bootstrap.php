<?php
declare(strict_types=1);

function hmp_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $path = dirname(__DIR__) . '/config.php';
    if (!is_file($path)) {
        hmp_json(500, ['error' => 'config.php manquant — copiez config.sample.php']);
    }

    $config = require $path;
    return $config;
}

function hmp_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = hmp_config()['db'];
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $cfg['host'],
        $cfg['name'],
        $cfg['charset'] ?? 'utf8mb4'
    );

    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function hmp_json(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function hmp_require_api_key(): string
{
    $header = $_SERVER['HTTP_X_HMP_API_KEY'] ?? '';
    if (!is_string($header) || $header === '') {
        hmp_json(401, ['error' => 'Unauthorized']);
    }
    $keys = hmp_config()['organization_keys'] ?? [];
    if (!is_array($keys) || count($keys) === 0) {
        hmp_json(500, ['error' => 'organization_keys non configurées']);
    }
    foreach ($keys as $organizationCode => $expected) {
        $code = strtoupper(trim((string) $organizationCode));
        if (preg_match('/^[A-Z0-9][A-Z0-9_-]{2,63}$/', $code) !== 1) {
            continue;
        }
        if (is_string($expected) && strlen($expected) >= 32 && hash_equals($expected, $header)) {
            return $code;
        }
    }
    hmp_json(401, ['error' => 'Unauthorized']);
}

function hmp_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $max = (int) (hmp_config()['max_payload_bytes'] ?? 5_000_000);
    if (strlen($raw) > $max) {
        hmp_json(413, ['error' => 'Payload too large']);
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        hmp_json(400, ['error' => 'Invalid JSON']);
    }

    return $data;
}

function hmp_touch_device(PDO $db, string $organizationCode, string $deviceId): void
{
    $stmt = $db->prepare(
        'INSERT INTO hmp_devices (organization_code, device_id) VALUES (:organization_code, :device_id)
         ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute(['organization_code' => $organizationCode, 'device_id' => $deviceId]);
}

function hmp_log(PDO $db, string $direction, ?string $organizationCode, ?string $deviceId, string $status, ?string $message, int $count): void
{
    $stmt = $db->prepare(
        'INSERT INTO hmp_sync_log (direction, organization_code, device_id, status, message, items_count)
         VALUES (:direction, :organization_code, :device_id, :status, :message, :items_count)'
    );
    $stmt->execute([
        'direction' => $direction,
        'organization_code' => $organizationCode,
        'device_id' => $deviceId,
        'status' => $status,
        'message' => $message,
        'items_count' => $count,
    ]);
}
