import { Router } from 'express';
import { nextDailyOrderNumber } from '../dailyOrderNumber.js';
import { createId, getDb } from '../db.js';
import type { Order, OrderItem } from '../types.js';

export const ordersRouter = Router();

ordersRouter.get('/', async (_req, res) => {
  const db = await getDb();
  res.json(await db.listOrders());
});

ordersRouter.post('/', async (req, res) => {
  const itemsRaw = req.body?.items;
  const invoiceOnly = Boolean(req.body?.invoiceOnly);
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    res.status(400).json({ error: 'El pedido debe tener al menos un producto' });
    return;
  }

  const db = await getDb();
  const catalog = await db.listBouquets();
  const items: OrderItem[] = [];
  let total = 0;

  for (const raw of itemsRaw) {
    const bouquetId = String(raw?.bouquetId ?? '');
    const quantity = Number(raw?.quantity);
    if (!bouquetId || !Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ error: 'Líneas de pedido no válidas' });
      return;
    }
    const bouquet = catalog.find((b) => b.id === bouquetId);
    if (!bouquet) {
      res.status(400).json({ error: `Centro desconocido: ${bouquetId}` });
      return;
    }
    const qty = Math.floor(quantity);
    items.push({
      bouquetId,
      quantity: qty,
      // Invoice-only sales are already complete — they must not appear in Por hacer.
      madeQuantity: invoiceOnly ? qty : 0,
    });
    total += bouquet.price * qty;
  }

  const createdAt = new Date().toISOString();
  const existing = await db.listOrders();
  const order: Order = {
    id: createId('cmd'),
    items,
    createdAt,
    total,
    status: invoiceOnly ? 'done' : 'open',
    dailyNumber: nextDailyOrderNumber(existing, createdAt),
  };

  await db.createOrder(order);
  res.status(201).json(order);
});

ordersRouter.post('/mark-made', async (req, res) => {
  const bouquetId = String(req.body?.bouquetId ?? '');
  const count = Number(req.body?.count);
  if (!bouquetId || !Number.isFinite(count) || count <= 0) {
    res.status(400).json({ error: 'bouquetId y count son obligatorios' });
    return;
  }
  const db = await getDb();
  const orders = await db.markBouquetMade(bouquetId, count);
  res.json(orders);
});

ordersRouter.post('/add-to-make', async (req, res) => {
  const bouquetId = String(req.body?.bouquetId ?? '');
  const count = Number(req.body?.count);
  if (!bouquetId || !Number.isFinite(count) || count <= 0) {
    res.status(400).json({ error: 'bouquetId y count son obligatorios' });
    return;
  }
  try {
    const db = await getDb();
    const bouquet = await db.getBouquet(bouquetId);
    if (!bouquet) {
      res.status(404).json({ error: 'Centro inexistente' });
      return;
    }
    const orders = await db.addBouquetToMake(bouquetId, count);
    res.json(orders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se ha podido añadir';
    res.status(400).json({ error: message });
  }
});
