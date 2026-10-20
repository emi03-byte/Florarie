import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogCentros } from './catalogCentros.js';
import { seedBouquets } from './seedData.js';
import type { Bouquet, Ingredient, Order, OrderItem, OrderStatus } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type DbDriver = {
  listBouquets(): Promise<Bouquet[]>;
  getBouquet(id: string): Promise<Bouquet | null>;
  upsertBouquet(bouquet: Bouquet): Promise<Bouquet>;
  deleteBouquet(id: string): Promise<boolean>;
  listOrders(): Promise<Order[]>;
  createOrder(order: Order): Promise<Order>;
  markBouquetMade(bouquetId: string, count: number): Promise<Order[]>;
  /** Increase how many of this bouquet still need to be made. */
  addBouquetToMake(bouquetId: string, count: number): Promise<Order[]>;
};

let driver: DbDriver | null = null;
let mssqlPool: { close: () => Promise<void> } | null = null;

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Azure SQL serverless often times out while waking from auto-pause. */
export function isTransientDbError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: string; message?: string };
  const msg = String(e.message ?? '').toLowerCase();
  return (
    e.name === 'TimeoutError' ||
    e.code === 'ETIMEOUT' ||
    e.code === 'ESOCKET' ||
    e.code === 'ECONNCLOSED' ||
    e.code === 'ECONNRESET' ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('connection is closed') ||
    msg.includes('failed to connect')
  );
}

export async function resetDb(): Promise<void> {
  driver = null;
  const pool = mssqlPool;
  mssqlPool = null;
  if (pool) {
    try {
      await pool.close();
    } catch {
      /* ignore close errors */
    }
  }
}

/** Run a DB call; on SQL wake/timeout, reconnect once and retry. */
export async function runDb<T>(fn: (db: DbDriver) => Promise<T>): Promise<T> {
  try {
    return await fn(await getDb());
  } catch (err) {
    if (!isTransientDbError(err)) throw err;
    console.warn('Transient DB error — reconnecting once', err);
    await resetDb();
    return await fn(await getDb());
  }
}

/* ---------------- SQLite (local default) ---------------- */

async function initSqlite(): Promise<DbDriver> {
  const { default: Database } = await import('better-sqlite3');
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
      status TEXT NOT NULL,
      daily_number INTEGER
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

  const orderCols = db.prepare('PRAGMA table_info(orders)').all() as { name: string }[];
  if (!orderCols.some((col) => col.name === 'daily_number')) {
    db.exec('ALTER TABLE orders ADD COLUMN daily_number INTEGER');
  }

  const count = db.prepare('SELECT COUNT(*) AS c FROM bouquets').get() as { c: number };
  if (count.c === 0) {
    const insertBouquet = db.prepare(
      'INSERT INTO bouquets (id, name, price, image, recipe) VALUES (?, ?, ?, ?, ?)',
    );
    const insertIng = db.prepare(
      'INSERT INTO ingredients (bouquet_id, name, quantity, unit) VALUES (?, ?, ?, ?)',
    );
    const insertOrder = db.prepare(
      'INSERT INTO orders (id, created_at, total, status) VALUES (?, ?, ?, ?)',
    );
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, bouquet_id, quantity, made_quantity) VALUES (?, ?, ?, 0)',
    );
    const tx = db.transaction(() => {
      // Same catalog as the published Azure shop (centros).
      for (const b of catalogCentros) {
        insertBouquet.run(b.id, b.name, b.price, b.image, b.recipe);
        for (const ing of b.ingredients) {
          insertIng.run(b.id, ing.name, ing.quantity, ing.unit);
        }
      }
      const orderId = 'cmd-prod-local';
      const total = catalogCentros.reduce((sum, b) => sum + b.price * b.makeQty, 0);
      insertOrder.run(orderId, new Date().toISOString(), total, 'open');
      for (const b of catalogCentros) {
        insertItem.run(orderId, b.id, b.makeQty);
      }
    });
    tx();
    console.log(`SQLite seeded with centros catalog at ${dbPath}`);
  }

  function loadIngredients(bouquetId: string): Ingredient[] {
    return (
      db
        .prepare(
          'SELECT name, quantity, unit FROM ingredients WHERE bouquet_id = ? ORDER BY id',
        )
        .all(bouquetId) as Ingredient[]
    ).map((row) => ({
      name: row.name,
      quantity: Number(row.quantity),
      unit: row.unit,
    }));
  }

  function mapBouquet(row: {
    id: string;
    name: string;
    price: number;
    image: string;
    recipe: string;
  }): Bouquet {
    return {
      id: row.id,
      name: row.name,
      price: Number(row.price),
      image: row.image,
      recipe: row.recipe,
      ingredients: loadIngredients(row.id),
    };
  }

  function mapOrder(row: {
    id: string;
    created_at: string;
    total: number;
    status: string;
    daily_number?: number | null;
  }): Order {
    const items = db
      .prepare(
        'SELECT bouquet_id, quantity, made_quantity FROM order_items WHERE order_id = ? ORDER BY id',
      )
      .all(row.id) as {
      bouquet_id: string;
      quantity: number;
      made_quantity: number;
    }[];

    const dailyNumber = Number(row.daily_number);
    return {
      id: row.id,
      createdAt: row.created_at,
      total: Number(row.total),
      status: row.status as OrderStatus,
      dailyNumber: Number.isFinite(dailyNumber) && dailyNumber > 0 ? dailyNumber : undefined,
      items: items.map((item) => ({
        bouquetId: item.bouquet_id,
        quantity: Number(item.quantity),
        madeQuantity: Number(item.made_quantity),
      })),
    };
  }

  function listOrdersSqlite(): Order[] {
    const rows = db
      .prepare('SELECT * FROM orders ORDER BY created_at DESC')
      .all() as {
      id: string;
      created_at: string;
      total: number;
      status: string;
      daily_number?: number | null;
    }[];
    return rows.map(mapOrder);
  }

  return {
    async listBouquets() {
      // Newest inserts first (SQLite rowid); keeps freshly added products on top.
      const rows = db.prepare('SELECT * FROM bouquets ORDER BY rowid DESC').all() as {
        id: string;
        name: string;
        price: number;
        image: string;
        recipe: string;
      }[];
      return rows.map(mapBouquet);
    },
    async getBouquet(id) {
      const row = db.prepare('SELECT * FROM bouquets WHERE id = ?').get(id) as
        | {
            id: string;
            name: string;
            price: number;
            image: string;
            recipe: string;
          }
        | undefined;
      return row ? mapBouquet(row) : null;
    },
    async upsertBouquet(bouquet) {
      const exists = db.prepare('SELECT id FROM bouquets WHERE id = ?').get(bouquet.id);
      const tx = db.transaction(() => {
        if (exists) {
          db.prepare(
            'UPDATE bouquets SET name = ?, price = ?, image = ?, recipe = ? WHERE id = ?',
          ).run(bouquet.name, bouquet.price, bouquet.image, bouquet.recipe, bouquet.id);
          db.prepare('DELETE FROM ingredients WHERE bouquet_id = ?').run(bouquet.id);
        } else {
          db.prepare(
            'INSERT INTO bouquets (id, name, price, image, recipe) VALUES (?, ?, ?, ?, ?)',
          ).run(bouquet.id, bouquet.name, bouquet.price, bouquet.image, bouquet.recipe);
        }
        const insertIng = db.prepare(
          'INSERT INTO ingredients (bouquet_id, name, quantity, unit) VALUES (?, ?, ?, ?)',
        );
        for (const ing of bouquet.ingredients) {
          insertIng.run(bouquet.id, ing.name, ing.quantity, ing.unit);
        }
      });
      tx();
      const row = db.prepare('SELECT * FROM bouquets WHERE id = ?').get(bouquet.id) as {
        id: string;
        name: string;
        price: number;
        image: string;
        recipe: string;
      };
      return mapBouquet(row);
    },
    async deleteBouquet(id) {
      const result = db.prepare('DELETE FROM bouquets WHERE id = ?').run(id);
      return result.changes > 0;
    },
    async listOrders() {
      return listOrdersSqlite();
    },
    async createOrder(order) {
      const tx = db.transaction(() => {
        db.prepare(
          'INSERT INTO orders (id, created_at, total, status, daily_number) VALUES (?, ?, ?, ?, ?)',
        ).run(
          order.id,
          order.createdAt,
          order.total,
          order.status,
          order.dailyNumber ?? null,
        );
        const insertItem = db.prepare(
          'INSERT INTO order_items (order_id, bouquet_id, quantity, made_quantity) VALUES (?, ?, ?, ?)',
        );
        for (const item of order.items) {
          insertItem.run(order.id, item.bouquetId, item.quantity, item.madeQuantity);
        }
      });
      tx();
      return order;
    },
    async markBouquetMade(bouquetId, count) {
      let left = Math.max(0, Math.floor(count));
      if (left <= 0) return listOrdersSqlite();

      const openOrders = db
        .prepare(
          `SELECT o.id FROM orders o
           WHERE o.status = 'open'
           ORDER BY o.created_at ASC`,
        )
        .all() as { id: string }[];

      const tx = db.transaction(() => {
        for (const { id: orderId } of openOrders) {
          if (left <= 0) break;
          const items = db
            .prepare(
              `SELECT id, bouquet_id, quantity, made_quantity
               FROM order_items WHERE order_id = ? ORDER BY id`,
            )
            .all(orderId) as {
            id: number;
            bouquet_id: string;
            quantity: number;
            made_quantity: number;
          }[];

          for (const item of items) {
            if (item.bouquet_id !== bouquetId || left <= 0) continue;
            const canMake = item.quantity - item.made_quantity;
            if (canMake <= 0) continue;
            const apply = Math.min(canMake, left);
            left -= apply;
            db.prepare('UPDATE order_items SET made_quantity = ? WHERE id = ?').run(
              item.made_quantity + apply,
              item.id,
            );
          }

          const remaining = db
            .prepare(
              `SELECT COUNT(*) AS c FROM order_items
               WHERE order_id = ? AND made_quantity < quantity`,
            )
            .get(orderId) as { c: number };
          if (remaining.c === 0) {
            db.prepare(`UPDATE orders SET status = 'done' WHERE id = ?`).run(orderId);
          }
        }
      });
      tx();
      return listOrdersSqlite();
    },
    async addBouquetToMake(bouquetId, count) {
      const add = Math.max(0, Math.floor(count));
      if (add <= 0) return listOrdersSqlite();

      const bouquet = db.prepare('SELECT price FROM bouquets WHERE id = ?').get(bouquetId) as
        | { price: number }
        | undefined;
      if (!bouquet) throw new Error('Buchet inexistent');

      const tx = db.transaction(() => {
        const existing = db
          .prepare(
            `SELECT oi.id AS item_id, oi.order_id, oi.quantity, o.total
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE o.status = 'open' AND oi.bouquet_id = ?
             ORDER BY o.created_at DESC, oi.id DESC
             LIMIT 1`,
          )
          .get(bouquetId) as
          | { item_id: number; order_id: string; quantity: number; total: number }
          | undefined;

        if (existing) {
          db.prepare('UPDATE order_items SET quantity = ? WHERE id = ?').run(
            existing.quantity + add,
            existing.item_id,
          );
          db.prepare('UPDATE orders SET total = ? WHERE id = ?').run(
            Number(existing.total) + Number(bouquet.price) * add,
            existing.order_id,
          );
          return;
        }

        let order = db
          .prepare(
            `SELECT id, total FROM orders WHERE status = 'open' ORDER BY created_at DESC LIMIT 1`,
          )
          .get() as { id: string; total: number } | undefined;

        if (!order) {
          const orderId = createId('cmd');
          const total = Number(bouquet.price) * add;
          db.prepare(
            'INSERT INTO orders (id, created_at, total, status) VALUES (?, ?, ?, ?)',
          ).run(orderId, new Date().toISOString(), total, 'open');
          db.prepare(
            'INSERT INTO order_items (order_id, bouquet_id, quantity, made_quantity) VALUES (?, ?, ?, 0)',
          ).run(orderId, bouquetId, add);
          return;
        }

        db.prepare(
          'INSERT INTO order_items (order_id, bouquet_id, quantity, made_quantity) VALUES (?, ?, ?, 0)',
        ).run(order.id, bouquetId, add);
        db.prepare('UPDATE orders SET total = ? WHERE id = ?').run(
          Number(order.total) + Number(bouquet.price) * add,
          order.id,
        );
      });
      tx();
      return listOrdersSqlite();
    },
  };
}

/* ---------------- Azure SQL / mssql ---------------- */

async function initMssql(connectionString: string): Promise<DbDriver> {
  const sql = (await import('mssql')).default;
  // Longer timeouts: Azure SQL serverless can take 30–60s to wake after auto-pause.
  // Pass ADO connection string directly (object form without `server` breaks tedious).
  let cs = connectionString.trim();
  if (!/Connection Timeout=/i.test(cs)) {
    cs = `${cs.replace(/;?\s*$/, '')};Connection Timeout=90`;
  }
  const pool = new sql.ConnectionPool(cs);
  pool.on('error', (err: Error) => {
    console.error('mssql pool error', err);
  });
  await pool.connect();
  mssqlPool = pool;

  async function ensureSchema() {
    await pool.request().query(`
      IF OBJECT_ID('dbo.bouquets', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.bouquets (
          id NVARCHAR(64) NOT NULL PRIMARY KEY,
          name NVARCHAR(200) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          image NVARCHAR(500) NOT NULL,
          recipe NVARCHAR(MAX) NOT NULL
        );
        CREATE TABLE dbo.ingredients (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          bouquet_id NVARCHAR(64) NOT NULL,
          name NVARCHAR(200) NOT NULL,
          quantity DECIMAL(10, 2) NOT NULL,
          unit NVARCHAR(50) NOT NULL,
          CONSTRAINT FK_ingredients_bouquet FOREIGN KEY (bouquet_id) REFERENCES dbo.bouquets(id) ON DELETE CASCADE
        );
        CREATE TABLE dbo.orders (
          id NVARCHAR(64) NOT NULL PRIMARY KEY,
          created_at DATETIME2 NOT NULL,
          total DECIMAL(10, 2) NOT NULL,
          status NVARCHAR(20) NOT NULL,
          daily_number INT NULL
        );
        CREATE TABLE dbo.order_items (
          id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
          order_id NVARCHAR(64) NOT NULL,
          bouquet_id NVARCHAR(64) NOT NULL,
          quantity INT NOT NULL,
          made_quantity INT NOT NULL CONSTRAINT DF_made DEFAULT (0),
          CONSTRAINT FK_order_items_order FOREIGN KEY (order_id) REFERENCES dbo.orders(id) ON DELETE CASCADE
        );
      END

      IF COL_LENGTH('dbo.orders', 'daily_number') IS NULL
      BEGIN
        ALTER TABLE dbo.orders ADD daily_number INT NULL;
      END
    `);

    // Never auto-fill Azure SQL — leave empty for real catalog unless SEED_DEMO=true.
    if (process.env.SEED_DEMO === 'true') {
      const countResult = await pool.request().query('SELECT COUNT(*) AS c FROM dbo.bouquets');
      const c = Number(countResult.recordset[0].c);
      if (c === 0) {
        for (const b of seedBouquets) {
          await pool
            .request()
            .input('id', sql.NVarChar, b.id)
            .input('name', sql.NVarChar, b.name)
            .input('price', sql.Decimal(10, 2), b.price)
            .input('image', sql.NVarChar, b.image)
            .input('recipe', sql.NVarChar, b.recipe)
            .query(
              'INSERT INTO dbo.bouquets (id, name, price, image, recipe) VALUES (@id, @name, @price, @image, @recipe)',
            );
          for (const ing of b.ingredients) {
            await pool
              .request()
              .input('bouquet_id', sql.NVarChar, b.id)
              .input('name', sql.NVarChar, ing.name)
              .input('quantity', sql.Decimal(10, 2), ing.quantity)
              .input('unit', sql.NVarChar, ing.unit)
              .query(
                'INSERT INTO dbo.ingredients (bouquet_id, name, quantity, unit) VALUES (@bouquet_id, @name, @quantity, @unit)',
              );
          }
        }
        console.log('Azure SQL seeded (SEED_DEMO)');
      }
    }
  }

  await ensureSchema();

  async function loadIngredients(bouquetId: string): Promise<Ingredient[]> {
    const result = await pool
      .request()
      .input('bouquet_id', sql.NVarChar, bouquetId)
      .query(
        'SELECT name, quantity, unit FROM dbo.ingredients WHERE bouquet_id = @bouquet_id ORDER BY id',
      );
    return result.recordset.map((row) => ({
      name: String(row.name),
      quantity: Number(row.quantity),
      unit: String(row.unit),
    }));
  }

  async function mapBouquet(row: {
    id: string;
    name: string;
    price: number;
    image: string;
    recipe: string;
  }): Promise<Bouquet> {
    return {
      id: row.id,
      name: row.name,
      price: Number(row.price),
      image: row.image,
      recipe: row.recipe,
      ingredients: await loadIngredients(row.id),
    };
  }

  async function mapOrder(row: {
    id: string;
    created_at: Date | string;
    total: number;
    status: string;
    daily_number?: number | null;
  }): Promise<Order> {
    const itemsResult = await pool
      .request()
      .input('order_id', sql.NVarChar, row.id)
      .query(
        'SELECT bouquet_id, quantity, made_quantity FROM dbo.order_items WHERE order_id = @order_id ORDER BY id',
      );
    const createdAt =
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString();

    const dailyNumber = Number(row.daily_number);
    return {
      id: row.id,
      createdAt,
      total: Number(row.total),
      status: row.status as OrderStatus,
      dailyNumber: Number.isFinite(dailyNumber) && dailyNumber > 0 ? dailyNumber : undefined,
      items: itemsResult.recordset.map((item) => ({
        bouquetId: String(item.bouquet_id),
        quantity: Number(item.quantity),
        madeQuantity: Number(item.made_quantity),
      })),
    };
  }

  async function listOrdersMssql(): Promise<Order[]> {
    const result = await pool
      .request()
      .query('SELECT * FROM dbo.orders ORDER BY created_at DESC');
    return Promise.all(result.recordset.map((row) => mapOrder(row)));
  }

  return {
    async listBouquets() {
      // Custom adds (buc-*) first; then Vechi catalog, then Nou, then the rest.
      const result = await pool.request().query(`
        SELECT * FROM dbo.bouquets
        ORDER BY
          CASE WHEN id LIKE N'buc-%' THEN 0 ELSE 1 END,
          CASE WHEN id LIKE N'buc-%' THEN id ELSE NULL END DESC,
          CASE
            WHEN name LIKE N'Vechi ·%' THEN 0
            WHEN name LIKE N'Nou ·%' THEN 1
            ELSE 2
          END,
          name
      `);
      return Promise.all(result.recordset.map((row) => mapBouquet(row)));
    },
    async getBouquet(id) {
      const result = await pool
        .request()
        .input('id', sql.NVarChar, id)
        .query('SELECT * FROM dbo.bouquets WHERE id = @id');
      const row = result.recordset[0];
      return row ? mapBouquet(row) : null;
    },
    async upsertBouquet(bouquet) {
      const existing = await pool
        .request()
        .input('id', sql.NVarChar, bouquet.id)
        .query('SELECT id FROM dbo.bouquets WHERE id = @id');

      if (existing.recordset.length > 0) {
        await pool
          .request()
          .input('id', sql.NVarChar, bouquet.id)
          .input('name', sql.NVarChar, bouquet.name)
          .input('price', sql.Decimal(10, 2), bouquet.price)
          .input('image', sql.NVarChar, bouquet.image)
          .input('recipe', sql.NVarChar, bouquet.recipe)
          .query(
            'UPDATE dbo.bouquets SET name = @name, price = @price, image = @image, recipe = @recipe WHERE id = @id',
          );
        await pool
          .request()
          .input('bouquet_id', sql.NVarChar, bouquet.id)
          .query('DELETE FROM dbo.ingredients WHERE bouquet_id = @bouquet_id');
      } else {
        await pool
          .request()
          .input('id', sql.NVarChar, bouquet.id)
          .input('name', sql.NVarChar, bouquet.name)
          .input('price', sql.Decimal(10, 2), bouquet.price)
          .input('image', sql.NVarChar, bouquet.image)
          .input('recipe', sql.NVarChar, bouquet.recipe)
          .query(
            'INSERT INTO dbo.bouquets (id, name, price, image, recipe) VALUES (@id, @name, @price, @image, @recipe)',
          );
      }

      for (const ing of bouquet.ingredients) {
        await pool
          .request()
          .input('bouquet_id', sql.NVarChar, bouquet.id)
          .input('name', sql.NVarChar, ing.name)
          .input('quantity', sql.Decimal(10, 2), ing.quantity)
          .input('unit', sql.NVarChar, ing.unit)
          .query(
            'INSERT INTO dbo.ingredients (bouquet_id, name, quantity, unit) VALUES (@bouquet_id, @name, @quantity, @unit)',
          );
      }
      const rowResult = await pool
        .request()
        .input('id', sql.NVarChar, bouquet.id)
        .query('SELECT * FROM dbo.bouquets WHERE id = @id');
      return mapBouquet(rowResult.recordset[0]);
    },
    async deleteBouquet(id) {
      const result = await pool
        .request()
        .input('id', sql.NVarChar, id)
        .query('DELETE FROM dbo.bouquets WHERE id = @id');
      return (result.rowsAffected[0] ?? 0) > 0;
    },
    async listOrders() {
      return listOrdersMssql();
    },
    async createOrder(order) {
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        await new sql.Request(transaction)
          .input('id', sql.NVarChar, order.id)
          .input('created_at', sql.DateTime2, new Date(order.createdAt))
          .input('total', sql.Decimal(10, 2), order.total)
          .input('status', sql.NVarChar, order.status)
          .input('daily_number', sql.Int, order.dailyNumber ?? null)
          .query(
            'INSERT INTO dbo.orders (id, created_at, total, status, daily_number) VALUES (@id, @created_at, @total, @status, @daily_number)',
          );
        for (const item of order.items) {
          await new sql.Request(transaction)
            .input('order_id', sql.NVarChar, order.id)
            .input('bouquet_id', sql.NVarChar, item.bouquetId)
            .input('quantity', sql.Int, item.quantity)
            .input('made_quantity', sql.Int, item.madeQuantity)
            .query(
              'INSERT INTO dbo.order_items (order_id, bouquet_id, quantity, made_quantity) VALUES (@order_id, @bouquet_id, @quantity, @made_quantity)',
            );
        }
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      return order;
    },
    async markBouquetMade(bouquetId, count) {
      let left = Math.max(0, Math.floor(count));
      if (left <= 0) return listOrdersMssql();

      const open = await pool
        .request()
        .query(
          `SELECT id FROM dbo.orders WHERE status = 'open' ORDER BY created_at ASC`,
        );

      for (const orderRow of open.recordset) {
        if (left <= 0) break;
        const orderId = String(orderRow.id);
        const items = await pool
          .request()
          .input('order_id', sql.NVarChar, orderId)
          .query(
            `SELECT id, bouquet_id, quantity, made_quantity FROM dbo.order_items WHERE order_id = @order_id ORDER BY id`,
          );

        for (const item of items.recordset) {
          if (String(item.bouquet_id) !== bouquetId || left <= 0) continue;
          const canMake = Number(item.quantity) - Number(item.made_quantity);
          if (canMake <= 0) continue;
          const apply = Math.min(canMake, left);
          left -= apply;
          await pool
            .request()
            .input('made', sql.Int, Number(item.made_quantity) + apply)
            .input('id', sql.Int, item.id)
            .query('UPDATE dbo.order_items SET made_quantity = @made WHERE id = @id');
        }

        const remaining = await pool
          .request()
          .input('order_id', sql.NVarChar, orderId)
          .query(
            `SELECT COUNT(*) AS c FROM dbo.order_items WHERE order_id = @order_id AND made_quantity < quantity`,
          );
        if (Number(remaining.recordset[0].c) === 0) {
          await pool
            .request()
            .input('order_id', sql.NVarChar, orderId)
            .query(`UPDATE dbo.orders SET status = 'done' WHERE id = @order_id`);
        }
      }

      return listOrdersMssql();
    },
    async addBouquetToMake(bouquetId, count) {
      const add = Math.max(0, Math.floor(count));
      if (add <= 0) return listOrdersMssql();

      const bouquetResult = await pool
        .request()
        .input('id', sql.NVarChar, bouquetId)
        .query('SELECT price FROM dbo.bouquets WHERE id = @id');
      if (!bouquetResult.recordset[0]) throw new Error('Buchet inexistent');
      const price = Number(bouquetResult.recordset[0].price);

      const existing = await pool.request().input('bouquet_id', sql.NVarChar, bouquetId).query(`
          SELECT TOP 1 oi.id AS item_id, oi.order_id, oi.quantity, o.total
          FROM dbo.order_items oi
          JOIN dbo.orders o ON o.id = oi.order_id
          WHERE o.status = N'open' AND oi.bouquet_id = @bouquet_id
          ORDER BY o.created_at DESC, oi.id DESC
        `);

      if (existing.recordset[0]) {
        const row = existing.recordset[0];
        await pool
          .request()
          .input('quantity', sql.Int, Number(row.quantity) + add)
          .input('id', sql.Int, row.item_id)
          .query('UPDATE dbo.order_items SET quantity = @quantity WHERE id = @id');
        await pool
          .request()
          .input('total', sql.Decimal(10, 2), Number(row.total) + price * add)
          .input('order_id', sql.NVarChar, String(row.order_id))
          .query('UPDATE dbo.orders SET total = @total WHERE id = @order_id');
        return listOrdersMssql();
      }

      const open = await pool
        .request()
        .query(
          `SELECT TOP 1 id, total FROM dbo.orders WHERE status = N'open' ORDER BY created_at DESC`,
        );

      if (!open.recordset[0]) {
        const orderId = createId('cmd');
        const total = price * add;
        await pool
          .request()
          .input('id', sql.NVarChar, orderId)
          .input('created_at', sql.DateTime2, new Date())
          .input('total', sql.Decimal(10, 2), total)
          .input('status', sql.NVarChar, 'open')
          .query(
            'INSERT INTO dbo.orders (id, created_at, total, status) VALUES (@id, @created_at, @total, @status)',
          );
        await pool
          .request()
          .input('order_id', sql.NVarChar, orderId)
          .input('bouquet_id', sql.NVarChar, bouquetId)
          .input('quantity', sql.Int, add)
          .input('made_quantity', sql.Int, 0)
          .query(
            'INSERT INTO dbo.order_items (order_id, bouquet_id, quantity, made_quantity) VALUES (@order_id, @bouquet_id, @quantity, @made_quantity)',
          );
        return listOrdersMssql();
      }

      const orderId = String(open.recordset[0].id);
      const orderTotal = Number(open.recordset[0].total);
      await pool
        .request()
        .input('order_id', sql.NVarChar, orderId)
        .input('bouquet_id', sql.NVarChar, bouquetId)
        .input('quantity', sql.Int, add)
        .input('made_quantity', sql.Int, 0)
        .query(
          'INSERT INTO dbo.order_items (order_id, bouquet_id, quantity, made_quantity) VALUES (@order_id, @bouquet_id, @quantity, @made_quantity)',
        );
      await pool
        .request()
        .input('total', sql.Decimal(10, 2), orderTotal + price * add)
        .input('order_id', sql.NVarChar, orderId)
        .query('UPDATE dbo.orders SET total = @total WHERE id = @order_id');

      return listOrdersMssql();
    },
  };
}

export async function getDb(): Promise<DbDriver> {
  if (driver) return driver;
  const connectionString = process.env.SQL_CONNECTION_STRING?.trim();
  if (connectionString) {
    console.log('Using Azure SQL / mssql');
    driver = await initMssql(connectionString);
  } else {
    console.log('Using local SQLite (set SQL_CONNECTION_STRING for Azure SQL)');
    driver = await initSqlite();
  }
  return driver;
}

export { createId };
