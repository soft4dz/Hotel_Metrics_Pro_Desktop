import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'src', 'i18n', 'source-strings.json');
const targets = process.argv.slice(2).filter((value) => value === 'en' || value === 'ar');
const languages = targets.length ? targets : ['en', 'ar'];
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const entries = Object.keys(source);
const concurrency = 6;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translate(text, target, attempt = 0) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'fr');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return payload[0].map((part) => part[0]).join('');
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(500 * (2 ** attempt));
    return translate(text, target, attempt + 1);
  }
}

for (const target of languages) {
  const outputPath = path.join(root, 'src', 'i18n', `${target}.json`);
  const output = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, 'utf8')) : {};
  const pending = entries.filter((text) => !output[text]);
  let cursor = 0;
  let completed = entries.length - pending.length;

  async function worker() {
    while (cursor < pending.length) {
      const index = cursor++;
      const text = pending[index];
      output[text] = await translate(text, target);
      completed += 1;
      if (completed % 25 === 0 || completed === entries.length) {
        fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
        console.log(`[i18n:${target}] ${completed}/${entries.length}`);
      }
      await sleep(40);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const ordered = Object.fromEntries(entries.map((text) => [text, output[text] ?? text]));
  fs.writeFileSync(outputPath, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');
  console.log(`[i18n:${target}] catalogue terminé`);
}
