/**
 * Parse les blocs INSERT INTO `table` (...) VALUES (...) du dump phpMyAdmin.
 */

export function extractInsertBlocks(sql: string, tableName: string): string[] {
  const blocks: string[] = [];
  const marker = `INSERT INTO \`${tableName}\``;
  let pos = 0;

  while (true) {
    const start = sql.indexOf(marker, pos);
    if (start === -1) break;

    const semi = sql.indexOf(';\n', start);
    const end = semi === -1 ? sql.indexOf(';', start) : semi + 1;
    if (end === -1) break;

    blocks.push(sql.slice(start, end + 1));
    pos = end + 1;
  }

  return blocks;
}

export function parseInsertColumns(block: string): string[] {
  const match = block.match(/INSERT INTO `[^`]+`\s*\(([^)]+)\)/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((c) => c.trim().replace(/`/g, ''));
}

/** Parse une liste de tuples MySQL : (a,b), (c,d) */
export function parseValueTuples(valuesSection: string): string[][] {
  const tuples: string[][] = [];
  let i = 0;
  const s = valuesSection.trim();

  while (i < s.length) {
    if (s[i] !== '(') {
      i++;
      continue;
    }
    i++;
    const fields: string[] = [];
    let current = '';
    let inString = false;
    let escape = false;

    while (i < s.length) {
      const ch = s[i];

      if (escape) {
        current += ch;
        escape = false;
        i++;
        continue;
      }

      if (ch === '\\' && inString) {
        escape = true;
        i++;
        continue;
      }

      if (ch === "'" && !escape) {
        inString = !inString;
        current += ch;
        i++;
        continue;
      }

      if (!inString && ch === ',') {
        fields.push(normalizeField(current.trim()));
        current = '';
        i++;
        continue;
      }

      if (!inString && ch === ')') {
        fields.push(normalizeField(current.trim()));
        tuples.push(fields);
        i++;
        break;
      }

      current += ch;
      i++;
    }
  }

  return tuples;
}

function normalizeField(raw: string): string {
  if (raw.toUpperCase() === 'NULL') return '';
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw
      .slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');
  }
  return raw;
}

export function rowsFromInsert(
  sql: string,
  tableName: string,
): Array<Record<string, string>> {
  const blocks = extractInsertBlocks(sql, tableName);
  const rows: Array<Record<string, string>> = [];

  for (const block of blocks) {
    const columns = parseInsertColumns(block);
    if (columns.length === 0) continue;

    const valuesIdx = block.toUpperCase().indexOf('VALUES');
    if (valuesIdx === -1) continue;
    const valuesPart = block.slice(valuesIdx + 6).replace(/;\s*$/, '');
    const tuples = parseValueTuples(valuesPart);

    for (const tuple of tuples) {
      const row: Record<string, string> = {};
      columns.forEach((col, idx) => {
        row[col] = tuple[idx] ?? '';
      });
      rows.push(row);
    }
  }

  return rows;
}

export function toNumber(val: string): number {
  if (!val || val.toUpperCase() === 'NULL') return 0;
  const n = parseFloat(val.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function toInt(val: string): number | null {
  if (!val || val.toUpperCase() === 'NULL') return null;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
}
