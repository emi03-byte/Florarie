/**
 * Load the published centro catalog + production order into local SQLite.
 * Usage (from repo root): node server/scripts/load-centros-sqlite.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { catalogCentros } from '../dist/catalogCentros.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.SQLITE_PATH || path.join(dataDir, 'florarie.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS bouquets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    image TEXT NOT NULL,
    recipe TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bouquet_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    FOREIGN KEY (bouquet_id) REFERENCES bouquets(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    bouquet_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    made_quantity INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
`);

db.exec(`
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM ingredients;
  DELETE FROM bouquets;
`);

const insertBouquet = db.prepare(
  'INSERT INTO bouquets (id, name, price, image, recipe) VALUES (?, ?, ?, ?, ?)',
);
const insertIng = db.prepare(
  'INSERT INTO ingredients (bouquet_id, name, quantity, unit) VALUES (?, ?, ?, ?)',
);

const loadAll = db.transaction(() => {
  for (const b of catalogCentros) {
    insertBouquet.run(b.id, b.name, b.price, b.image, b.recipe);
    for (const ing of b.ingredients) {
      insertIng.run(b.id, ing.name, ing.quantity, ing.unit);
    }
  }

  const orderId = `cmd-prod-local`;
  const total = catalogCentros.reduce((sum, b) => sum + b.price * b.makeQty, 0);
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO orders (id, created_at, total, status) VALUES (?, ?, ?, ?)',
  ).run(orderId, createdAt, total, 'open');

  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, bouquet_id, quantity, made_quantity) VALUES (?, ?, ?, 0)',
  );
  for (const b of catalogCentros) {
    insertItem.run(orderId, b.id, b.makeQty);
  }
});

loadAll();

const counts = {
  bouquets: db.prepare('SELECT COUNT(*) AS c FROM bouquets').get().c,
  ingredients: db.prepare('SELECT COUNT(*) AS c FROM ingredients').get().c,
  order_items: db.prepare('SELECT COUNT(*) AS c FROM order_items').get().c,
  makeQty: catalogCentros.reduce((s, b) => s + b.makeQty, 0),
};
console.log(`SQLite loaded at ${dbPath}`);
console.log(counts);
db.close();
