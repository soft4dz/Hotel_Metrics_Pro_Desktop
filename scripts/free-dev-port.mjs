/**
 * Libère le port Vite (5173) s'il est occupé par une ancienne session dev.
 */
import { execSync } from 'node:child_process';

const PORT = Number(process.env.HMP_DEV_PORT ?? 5173);

function lineUsesPort(line, port) {
  return new RegExp(`:${port}(\\s|$)`).test(line);
}

function listListeningPids(port) {
  if (process.platform === 'win32') {
    try {
      const out = execSync('netstat -ano', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line) || !lineUsesPort(line, port)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts.at(-1));
        if (Number.isFinite(pid) && pid > 0) pids.add(pid);
      }
      return [...pids];
    } catch {
      return [];
    }
  }

  try {
    const out = execSync(`lsof -ti tcp:${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out
      .split(/\r?\n/)
      .map((v) => Number(v.trim()))
      .filter((pid) => Number.isFinite(pid) && pid > 0);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

const pids = listListeningPids(PORT);
if (pids.length === 0) {
  console.log(`[dev] Port ${PORT} libre.`);
  process.exit(0);
}

console.log(`[dev] Port ${PORT} occupé — arrêt de ${pids.length} processus…`);
let killed = 0;
for (const pid of pids) {
  if (killPid(pid)) {
    killed += 1;
    console.log(`[dev]   PID ${pid} arrêté.`);
  }
}

if (killed === 0) {
  console.error(`[dev] Impossible de libérer le port ${PORT}. Fermez l'ancienne fenêtre Electron.`);
  process.exit(1);
}

console.log(`[dev] Port ${PORT} libéré.`);
