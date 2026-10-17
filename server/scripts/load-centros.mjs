import sql from 'mssql';
import { catalogCentros } from '../dist/catalogCentros.js';

const cs = process.env.SQL_CS;
if (!cs) {
  console.error('SQL_CS missing');
  process.exit(1);
}

const pool = await sql.connect(cs);

await pool.request().query(`
  DELETE FROM dbo.order_items;
  DELETE FROM dbo.orders;
  DELETE FROM dbo.ingredients;
  DELETE FROM dbo.bouquets;
`);

for (const b of catalogCentros) {
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

const orderId = `cmd-prod-${Date.now().toString(36)}`;
const total = catalogCentros.reduce((sum, b) => sum + b.price * b.makeQty, 0);
const createdAt = new Date().toISOString();

await pool
  .request()
  .input('id', sql.NVarChar, orderId)
  .input('created_at', sql.DateTime2, createdAt)
  .input('total', sql.Decimal(10, 2), total)
  .input('status', sql.NVarChar, 'open')
  .query(
    'INSERT INTO dbo.orders (id, created_at, total, status) VALUES (@id, @created_at, @total, @status)',
  );

for (const b of catalogCentros) {
  await pool
    .request()
    .input('order_id', sql.NVarChar, orderId)
    .input('bouquet_id', sql.NVarChar, b.id)
    .input('quantity', sql.Int, b.makeQty)
    .input('made_quantity', sql.Int, 0)
    .query(
      'INSERT INTO dbo.order_items (order_id, bouquet_id, quantity, made_quantity) VALUES (@order_id, @bouquet_id, @quantity, @made_quantity)',
    );
}

const counts = await pool.request().query(`
  SELECT 'bouquets' AS t, COUNT(*) AS c FROM dbo.bouquets
  UNION ALL SELECT 'ingredients', COUNT(*) FROM dbo.ingredients
  UNION ALL SELECT 'order_items', COUNT(*) FROM dbo.order_items
`);
for (const r of counts.recordset) console.log(`${r.t}: ${r.c}`);
console.log(`order: ${orderId} total=${total} makeQtySum=${catalogCentros.reduce((s, b) => s + b.makeQty, 0)}`);
await pool.close();
