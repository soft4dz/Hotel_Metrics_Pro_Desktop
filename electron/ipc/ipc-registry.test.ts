import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const IPC_DIR = path.resolve(__dirname);
const MAIN_TS = path.resolve(__dirname, '../main.ts');

describe('Registre IPC Electron', () => {
  const ipcFiles = readdirSync(IPC_DIR).filter((f) => f.endsWith('.ipc.ts') && f !== 'ipcHelpers.ts');
  const mainSource = readFileSync(MAIN_TS, 'utf-8');

  it('enregistre un handler pour chaque fichier ipc métier', () => {
    for (const file of ipcFiles) {
      const base = file.replace('.ipc.ts', '');
      const pascal = base.replace(/(^|[-_])(\w)/g, (_, __, c: string) => c.toUpperCase());
      const registerName = `register${pascal}Ipc`;
      expect(mainSource, `main.ts doit appeler ${registerName}()`).toContain(`${registerName}()`);
    }
  });

  it('couvre au moins 30 modules IPC', () => {
    expect(ipcFiles.length).toBeGreaterThanOrEqual(30);
  });
});
