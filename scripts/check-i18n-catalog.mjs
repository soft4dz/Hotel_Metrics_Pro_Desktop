import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'src', 'i18n', name), 'utf8'));
const source = read('source-strings.json');
const sourceKeys = Object.keys(source);
let failed = false;

for (const locale of ['en', 'ar']) {
  const catalog = read(`${locale}.json`);
  const missing = sourceKeys.filter((key) => typeof catalog[key] !== 'string' || !catalog[key].trim());
  const obsolete = Object.keys(catalog).filter((key) => !(key in source));

  console.log(`[i18n:${locale}] ${sourceKeys.length - missing.length}/${sourceKeys.length} textes couverts`);
  if (missing.length) {
    failed = true;
    console.error(`[i18n:${locale}] clés manquantes:\n${missing.join('\n')}`);
  }
  if (obsolete.length) console.warn(`[i18n:${locale}] ${obsolete.length} clés obsolètes`);
}

if (failed) process.exit(1);
console.log('[i18n] couverture complète');
