/**
 * Upsert catalog recipes/ingredients from catalogCentros without wiping orders.
 * Usage: SQL_CS="..." node server/scripts/sync-catalog-text.mjs
 */
import sql from 'mssql';
import { catalogCentros } from '../dist/catalogCentros.js';

const cs = process.env.SQL_CS;
if (!cs) {
  console.error('SQL_CS missing');
  process.exit(1);
}

const pool = await sql.connect(cs);
let updated = 0;

for (const b of catalogCentros) {
  const existing = await pool
    .request()
    .input('id', sql.NVarChar, b.id)
    .query('SELECT id FROM dbo.bouquets WHERE id = @id');

  if (existing.recordset.length > 0) {
    await pool
      .request()
      .input('id', sql.NVarChar, b.id)
      .input('name', sql.NVarChar, b.name)
      .input('price', sql.Decimal(10, 2), b.price)
      .input('image', sql.NVarChar, b.image)
      .input('recipe', sql.NVarChar, b.recipe)
      .query(
        'UPDATE dbo.bouquets SET name = @name, price = @price, image = @image, recipe = @recipe WHERE id = @id',
      );
    await pool
      .request()
      .input('bouquet_id', sql.NVarChar, b.id)
      .query('DELETE FROM dbo.ingredients WHERE bouquet_id = @bouquet_id');
  } else {
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
  }

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
  updated += 1;
}

console.log(`Synced ${updated} bouquets (orders untouched)`);
await pool.close();
