/**
 * Upload des fichiers hmp-api via cPanel Fileman UAPI.
 * Usage: node server/deploy/scripts/cpanel-upload.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const deployRoot = join(__dirname, '..');
const phpRoot = join(deployRoot, 'php');

const CPANEL_USER = process.env.CPANEL_USER ?? 'softdzco';
const CPANEL_PASS = process.env.CPANEL_PASS ?? '';
const CPANEL_HOST = process.env.CPANEL_HOST ?? 'https://soft4dz.com:2083';
const MYSQL_PASS = process.env.HMP_MYSQL_PASS ?? '';
const API_KEY = process.env.HMP_SYNC_API_KEY ?? 'DAT6ImBJmvUF3geFhNJmMqYhetcZhCpJMQrsQMz4ZWc=';

if (!CPANEL_PASS || !MYSQL_PASS) {
  console.error('Variables CPANEL_PASS et HMP_MYSQL_PASS requises.');
  process.exit(1);
}

const cookieJar = new Map();

function parseSetCookie(header) {
  if (!header) return;
  for (const part of header.split(/,(?=\s*\w+=)/)) {
    const [pair] = part.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) cookieJar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function cpanelFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${CPANEL_HOST}${path}`, {
    method,
    headers: {
      Cookie: cookieHeader(),
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
    redirect: 'manual',
  });
  parseSetCookie(res.headers.get('set-cookie'));
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: res.status };
  }
}

async function login() {
  const body = new URLSearchParams({ user: CPANEL_USER, pass: CPANEL_PASS });
  const json = await cpanelFetch('/login/?login_only=1', { method: 'POST', body });
  if (json.status !== 1 || !json.security_token) {
    throw new Error(`Login cPanel échoué: ${JSON.stringify(json)}`);
  }
  return json.security_token;
}

async function uapi(sess, module, func, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `${sess}/execute/${module}/${func}${qs ? `?${qs}` : ''}`;
  const json = await cpanelFetch(path);
  if (json.status !== 1) {
    throw new Error(`${module}::${func} → ${JSON.stringify(json.errors ?? json)}`);
  }
  return json;
}

async function uapiPost(sess, module, func, params) {
  const body = new URLSearchParams(params);
  const json = await cpanelFetch(`${sess}/execute/${module}/${func}`, { method: 'POST', body });
  if (json.status !== 1) {
    throw new Error(`${module}::${func} → ${JSON.stringify(json.errors ?? json)}`);
  }
  return json;
}

async function saveFile(sess, dir, file, content) {
  await uapiPost(sess, 'Fileman', 'save_file_content', {
    dir,
    file,
    content,
    charset: 'utf-8',
  });
  console.log(`  ✓ ${dir}/${file}`);
}

async function ensureDir(sess, parent, name) {
  try {
    await uapi(sess, 'Fileman', 'create_directory', { dir: parent, name });
    console.log(`  ✓ dossier ${parent}/${name}`);
  } catch (err) {
    if (String(err).includes('already exists') || String(err).includes('File exists')) {
      console.log(`  · dossier ${parent}/${name} (existe)`);
      return;
    }
    // cPanel renvoie parfois une erreur même si le dossier existe
    console.log(`  · dossier ${parent}/${name} (${err.message?.slice(0, 80) ?? 'skip'})`);
  }
}

function configPhp() {
  return `<?php
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'softdzco_hmp_sync',
        'user' => 'softdzco_hmp_user',
        'pass' => '${MYSQL_PASS}',
        'charset' => 'utf8mb4',
    ],
    'api_key' => '${API_KEY}',
    'max_payload_bytes' => 5000000,
    'pull_limit' => 200,
];
`;
}

function installSchemaPhp() {
  const sql = readFileSync(join(deployRoot, 'mysql', '001_central_schema.sql'), 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.replace(/--[^\n]*/g, '').trim())
    .filter((s) => s.length > 0 && !/^SET /i.test(s));

  const escaped = JSON.stringify(statements);
  return `<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$token = $_GET['token'] ?? '';
if ($token !== '${API_KEY}') { http_response_code(403); echo json_encode(['error'=>'Forbidden']); exit; }
require __DIR__ . '/lib/bootstrap.php';
$db = hmp_db();
$statements = ${escaped};
$done = 0;
foreach ($statements as $sql) {
    $db->exec($sql);
    $done++;
}
@unlink(__FILE__);
echo json_encode(['ok'=>true,'tables'=>$done]);
`;
}

async function main() {
  console.log('Connexion cPanel…');
  const sess = await login();

  console.log('Création dossiers…');
  await ensureDir(sess, 'public_html', 'hmp-api');
  await ensureDir(sess, 'public_html/hmp-api', 'lib');

  console.log('Upload fichiers…');
  await saveFile(sess, 'public_html/hmp-api', '.htaccess', readFileSync(join(phpRoot, '.htaccess'), 'utf8'));
  await saveFile(sess, 'public_html/hmp-api', 'index.php', readFileSync(join(phpRoot, 'index.php'), 'utf8'));
  await saveFile(sess, 'public_html/hmp-api', 'config.php', configPhp());
  await saveFile(sess, 'public_html/hmp-api/lib', 'bootstrap.php', readFileSync(join(phpRoot, 'lib', 'bootstrap.php'), 'utf8'));
  await saveFile(sess, 'public_html/hmp-api', 'install_schema.php', installSchemaPhp());

  console.log('Terminé.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
