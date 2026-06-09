/**
 * Chargement CJS de better-sqlite3 depuis le process principal ESM (Electron + Vite).
 */
import { createRequire } from 'node:module';
import type BetterSqlite3 from 'better-sqlite3';

const require = createRequire(import.meta.url);

const Database = require('better-sqlite3') as typeof BetterSqlite3;

export default Database;
export type SqliteDatabase = BetterSqlite3.Database;
