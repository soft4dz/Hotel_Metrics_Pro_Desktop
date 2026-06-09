<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$token = $_GET['token'] ?? '';
if ($token !== 'DAT6ImBJmvUF3geFhNJmMqYhetcZhCpJMQrsQMz4ZWc=') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}
require __DIR__ . '/lib/bootstrap.php';
$db = hmp_db();
$sqlFile = __DIR__ . '/schema.sql';
if (!is_file($sqlFile)) {
    echo json_encode(['error' => 'schema.sql missing']);
    exit;
}
$raw = file_get_contents($sqlFile);
$statements = array_filter(array_map('trim', preg_split('/;\s*\n/', preg_replace('/--[^\n]*/', '', $raw))));
$done = 0;
foreach ($statements as $sql) {
    if ($sql === '' || stripos($sql, 'SET ') === 0) {
        continue;
    }
    $db->exec($sql);
    $done++;
}
@unlink(__FILE__);
@unlink($sqlFile);
echo json_encode(['ok' => true, 'tables' => $done]);
