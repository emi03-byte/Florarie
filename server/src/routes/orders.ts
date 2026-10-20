import { Router } from 'express';
import { nextDailyOrderNumber } from '../dailyOrderNumber.js';
import { createId, runDb } from '../db.js';
import type { Order, OrderItem } from '../types.js';

export const ordersRouter = Router();

ordersRouter.get('/', async (_req, res) => {
  res.json(await runDb((db) => db.listOrders()));
});

ordersRouter.post('/', async (req, res) => {
  const itemsRaw = req.body?.items;
  const invoiceOnly = Boolean(req.body?.invoiceOnly);
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    res.status(400).json({ error: 'Comanda trebuie să aibă cel puțin un produs' });
    return;
  }

  const order = await runDb(async (db) => {
    const catalog = await db.listBouquets();
    const items: OrderItem[] = [];
    let total = 0;

    for (const raw of itemsRaw) {
      const bouquetId = String(raw?.bouquetId ?? '');
      const quantity = Number(raw?.quantity);
      if (!bouquetId || !Number.isFinite(quantity) || quantity <= 0) {
        throw Object.assign(new Error('Linii comandă invalide'), { status: 400 });
      }
      const bouquet = catalog.find((b) => b.id === bouquetId);
      if (!bouquet) {
        throw Object.assign(new Error(`Buchet necunoscut: ${bouquetId}`), { status: 400 });
      }
      const qty = Math.floor(quantity);
      items.push({
        bouquetId,
        quantity: qty,
        // Invoice-only sales are already complete — they must not appear in De făcut.
        madeQuantity: invoiceOnly ? qty : 0,
      });
      total += bouquet.price * qty;
    }

    const createdAt = new Date().toISOString();
    const existing = await db.listOrders();
    const next: Order = {
      id: createId('cmd'),
      items,
      createdAt,
      total,
      status: invoiceOnly ? 'done' : 'open',
      dailyNumber: nextDailyOrderNumber(existing, createdAt),
    };

    await db.createOrder(next);
    return next;
  });

  res.status(201).json(order);
});

ordersRouter.post('/mark-made', async (req, res) => {
  const bouquetId = String(req.body?.bouquetId ?? '');
  const count = Number(req.body?.count);
  if (!bouquetId || !Number.isFinite(count) || count <= 0) {
    res.status(400).json({ error: 'bouquetId și count sunt obligatorii' });
    return;
  }
  const orders = await runDb((db) => db.markBouquetMade(bouquetId, count));
  res.json(orders);
});

ordersRouter.post('/add-to-make', async (req, res) => {
  const bouquetId = String(req.body?.bouquetId ?? '');
  const count = Number(req.body?.count);
  if (!bouquetId || !Number.isFinite(count) || count <= 0) {
    res.status(400).json({ error: 'bouquetId și count sunt obligatorii' });
    return;
  }
  try {
    const orders = await runDb(async (db) => {
      const bouquet = await db.getBouquet(bouquetId);
      if (!bouquet) {
        throw Object.assign(new Error('Buchet inexistent'), { status: 404 });
      }
      return db.addBouquetToMake(bouquetId, count);
    });
    res.json(orders);
  } catch (error) {
    const status = Number((error as { status?: number })?.status);
    if (status === 404) {
      res.status(404).json({ error: 'Buchet inexistent' });
      return;
    }
    if (status === 400) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Nu am putut adăuga',
      });
      return;
    }
    throw error;
  }
});
