import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** bcryptjs (CJS) — chargé via require pour compatibilité ESM Electron + Vite */
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const bcrypt = require('bcryptjs') as typeof import('bcryptjs');
