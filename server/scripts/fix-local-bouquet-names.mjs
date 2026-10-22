/**
 * One-shot: normalize bouquet names in local SQLite (server/data/florarie.db).
 * Does NOT touch Azure.
 *
 * Usage (from server/): node scripts/fix-local-bouquet-names.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'florarie.db');

const NAME_SEP = ' — ';
const COLOR =
  'rojas?|rojos?|blancas?|blancos?|amarillas?|amarillos?|naranjas?|verdes?|fucsias?|rosas?|jaspeados?|jaspeadas?|aqua|colorido';

function preNormalize(raw) {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bnaraja(s)?\b/gi, (_m, s) => (s ? 'naranjas' : 'naranja'));
}

function titleModel(s) {
  const lower = s.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!lower) return lower;
  if (/^centro\b/.test(lower)) return `Centro${lower.slice('centro'.length)}`;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function titleVariant(s) {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!t) return t;
  return t
    .split(' ')
    .map((p, i) => {
      const lower = p.toLowerCase();
      if (i === 0) return lower.charAt(0).toUpperCase() + lower.slice(1);
      return lower;
    })
    .join(' ');
}

function agreeColorWord(color, pluralFlower) {
  const c = color.toLowerCase();
  if (c === 'fucsia' || c === 'fucsias' || c === 'aqua' || c === 'colorido') {
    return c === 'fucsias' ? 'fucsia' : c;
  }
  const stem = /blanc/.test(c)
    ? 'blanc'
    : /roj/.test(c)
      ? 'roj'
      : /amarill/.test(c)
        ? 'amarill'
        : /naranja/.test(c)
          ? 'naranja'
          : /verd/.test(c)
            ? 'verd'
            : /jaspead/.test(c)
              ? 'jaspead'
              : /rosa/.test(c)
                ? 'rosa'
                : null;
  if (!stem) return c;
  if (stem === 'naranja') return pluralFlower ? 'naranjas' : 'naranja';
  if (stem === 'rosa') return pluralFlower ? 'rosas' : 'rosa';
  if (stem === 'verd') return pluralFlower ? 'verdes' : 'verde';
  if (stem === 'blanc') return pluralFlower ? 'blancas' : 'blanca';
  if (stem === 'roj') return pluralFlower ? 'rojas' : 'roja';
  if (stem === 'amarill') return pluralFlower ? 'amarillas' : 'amarilla';
  if (stem === 'jaspead') return pluralFlower ? 'jaspeadas' : 'jaspeada';
  return c;
}

function normalizeVariant(variant) {
  const m = variant.match(/^Rosa\s+(.+)$/i);
  if (!m) return variant;
  const color = m[1].toLowerCase();
  if (/^(rojas|blancas|amarillas|naranjas|verdes|fucsias|rosas|jaspeadas)$/.test(color)) {
    return `Rosas ${color}`;
  }
  return variant;
}

function formatBouquetDisplayName(raw) {
  let name = preNormalize(raw);
  if (!name) return name;

  const sepMatch = name.match(/\s*[—–-]\s*/);
  if (sepMatch && sepMatch.index != null && sepMatch.index > 0) {
    const model = titleModel(name.slice(0, sepMatch.index).trim());
    const variant = normalizeVariant(
      titleVariant(name.slice(sepMatch.index + sepMatch[0].length).trim()),
    );
    return variant ? `${model}${NAME_SEP}${variant}` : model;
  }

  const clavel = name.match(new RegExp(`^(centro\\b.+?)\\s+(clavel\\s+(?:${COLOR}))$`, 'i'));
  if (clavel) {
    return `${titleModel(clavel[1])}${NAME_SEP}${titleVariant(clavel[2])}`;
  }

  const counted = name.match(
    new RegExp(`^(centro\\b.+?\\b\\d+\\s+rosas?)\\s+(${COLOR})$`, 'i'),
  );
  if (counted) {
    const model = titleModel(counted[1]);
    const color = counted[2].toLowerCase();
    const plural = /\brosas\b/i.test(counted[1]);
    const flower = plural ? 'Rosas' : 'Rosa';
    return `${model}${NAME_SEP}${flower} ${agreeColorWord(color, plural)}`;
  }

  const rosas = name.match(new RegExp(`^(centro\\b.+?)\\s+(rosas?\\s+(?:${COLOR}))$`, 'i'));
  if (rosas) {
    return `${titleModel(rosas[1])}${NAME_SEP}${normalizeVariant(titleVariant(rosas[2]))}`;
  }

  const florVar = name.match(
    /^(centro\b.+?\bflor variada)\s+(rosa|roja|rojo|blanca|blanco|colorido)$/i,
  );
  if (florVar) {
    return `${titleModel(florVar[1])}${NAME_SEP}${titleVariant(florVar[2])}`;
  }

  const trailing = name.match(
    /^(centro\b.+?)\s+(rosa|roja|rojo|blanca|blanco|colorido|fucsia|amarilla|amarillo|naranja|naranjas)$/i,
  );
  if (trailing) {
    return `${titleModel(trailing[1])}${NAME_SEP}${titleVariant(trailing[2])}`;
  }

  return titleModel(name);
}

if (!fs.existsSync(dbPath)) {
  console.error('SQLite not found:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
const rows = db.prepare('SELECT id, name FROM bouquets ORDER BY name').all();
const update = db.prepare('UPDATE bouquets SET name = ? WHERE id = ?');

let changed = 0;
console.log(`DB: ${dbPath}`);
console.log(`Bouquets: ${rows.length}\n`);

const tx = db.transaction(() => {
  for (const row of rows) {
    const next = formatBouquetDisplayName(row.name);
    if (next !== row.name) {
      update.run(next, row.id);
      changed += 1;
      console.log(`- ${row.name}`);
      console.log(`+ ${next}\n`);
    }
  }
});

tx();
db.close();

console.log(`Done. Updated ${changed} name(s). Azure was not touched.`);
