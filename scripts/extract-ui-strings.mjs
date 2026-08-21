import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default;
const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const outputPath = path.join(sourceRoot, 'i18n', 'source-strings.json');
const extensions = new Set(['.ts', '.tsx']);
const translatedAttributes = new Set(['alt', 'aria-label', 'placeholder', 'title']);
const translatedProperties = new Set([
  'description', 'emptyMessage', 'header', 'label', 'placeholder', 'subtitle', 'title',
]);
const translatedCalls = new Set(['alert', 'confirm', 'notify', 'setError', 'setMessage']);
const ignored = /^(?:[\d\W_]+|[A-Z0-9_./:@-]+|https?:\S+|#[0-9a-f]+)$/;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return extensions.has(path.extname(entry.name)) ? [absolute] : [];
  });
}

function normalize(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function shouldKeep(value) {
  const text = normalize(value);
  if (text.length <= 1 || !/[A-Za-zÀ-ÿ]/.test(text) || ignored.test(text)) return false;
  if (/^(?:\.[a-z0-9]+|[\w.-]+@[\w.-]+|[A-Z0-9_]{2,}|[a-z]+(?:[A-Z][a-z0-9]*)+)$/.test(text)) return false;
  if (/^(?:npm |node |https?:|url\(|[\w./-]+\.(?:ts|tsx|js|mjs|json|md|csv|zip|sql|env))/.test(text)) return false;

  const tokens = text.split(/\s+/);
  const technicalTokens = tokens.filter((token) =>
    /^(?:-?[a-z]+(?:-[a-z0-9[\]./]+)+|(?:sm|md|lg|xl|2xl):|[a-z]+-\d|[hw]-\[|px-|py-|mt-|mb-|mr-|ml-|bg-|text-|border-|rounded-|flex$|grid$)/.test(token),
  );
  if (tokens.length >= 2 && technicalTokens.length / tokens.length >= 0.6) return false;
  return true;
}

const found = new Set();
const add = (value) => {
  const text = normalize(value);
  if (shouldKeep(text)) found.add(text);
};

for (const file of walk(sourceRoot)) {
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  } catch (error) {
    console.warn(`[i18n] fichier ignoré: ${path.relative(root, file)} (${error.message})`);
    continue;
  }

  traverse(ast, {
    JSXText(nodePath) {
      add(nodePath.node.value);
    },
    JSXAttribute(nodePath) {
      const name = nodePath.node.name.name;
      const value = nodePath.node.value;
      if (typeof name === 'string' && translatedAttributes.has(name) && value?.type === 'StringLiteral') {
        add(value.value);
      }
    },
    ObjectProperty(nodePath) {
      const key = nodePath.node.key;
      const value = nodePath.node.value;
      const name = key.type === 'Identifier' ? key.name : key.type === 'StringLiteral' ? key.value : '';
      if (translatedProperties.has(name) && value.type === 'StringLiteral') add(value.value);
    },
    CallExpression(nodePath) {
      const callee = nodePath.node.callee;
      const name = callee.type === 'Identifier'
        ? callee.name
        : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
          ? callee.property.name
          : '';
      const first = nodePath.node.arguments[0];
      if (translatedCalls.has(name) && first?.type === 'StringLiteral') add(first.value);
    },
    StringLiteral(nodePath) {
      const jsxExpression = nodePath.findParent((parent) => parent.isJSXExpressionContainer());
      if (!jsxExpression) return;
      const attribute = nodePath.findParent((parent) => parent.isJSXAttribute());
      const attributeName = attribute?.node?.name?.name;
      if (attributeName === 'className' || attributeName === 'to' || attributeName === 'href') return;
      add(nodePath.node.value);
    },
    TemplateElement(nodePath) {
      if (nodePath.findParent((parent) => parent.isJSXExpressionContainer())) {
        add(nodePath.node.value.cooked ?? nodePath.node.value.raw);
      }
    },
  });
}

const catalog = Object.fromEntries([...found].sort((a, b) => a.localeCompare(b, 'fr')).map((text) => [text, text]));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`[i18n] ${found.size} textes extraits vers ${path.relative(root, outputPath)}`);
