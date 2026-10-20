import { Router } from 'express';
import { createId, runDb } from '../db.js';
import type { Bouquet, Ingredient } from '../types.js';

export const bouquetsRouter = Router();

function parseIngredients(raw: unknown): Ingredient[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const ingredients: Ingredient[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const name = String((item as Ingredient).name ?? '').trim();
    const unit = String((item as Ingredient).unit ?? 'uds').trim() || 'uds';
    const quantity = Number((item as Ingredient).quantity);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;
    ingredients.push({ name, unit, quantity });
  }
  return ingredients;
}

bouquetsRouter.get('/', async (_req, res) => {
  res.json(await runDb((db) => db.listBouquets()));
});

bouquetsRouter.post('/', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const price = Number(req.body?.price);
  const image = String(req.body?.image ?? '').trim() || '/bouquets/placeholder.svg';
  const recipe = String(req.body?.recipe ?? '').trim();
  const ingredients = parseIngredients(req.body?.ingredients);
  const id = String(req.body?.id ?? '').trim() || createId('buc');

  if (!name || !Number.isFinite(price) || price < 0 || !ingredients) {
    res.status(400).json({ error: 'Date buchet invalide' });
    return;
  }

  const bouquet: Bouquet = { id, name, price, image, recipe, ingredients };
  res.status(201).json(await runDb((db) => db.upsertBouquet(bouquet)));
});

bouquetsRouter.put('/:id', async (req, res) => {
  const id = req.params.id;
  const name = String(req.body?.name ?? '').trim();
  const price = Number(req.body?.price);
  const image = String(req.body?.image ?? '').trim() || '/bouquets/placeholder.svg';
  const recipe = String(req.body?.recipe ?? '').trim();
  const ingredients = parseIngredients(req.body?.ingredients);

  if (!name || !Number.isFinite(price) || price < 0 || !ingredients) {
    res.status(400).json({ error: 'Date buchet invalide' });
    return;
  }

  const existing = await runDb((db) => db.getBouquet(id));
  if (!existing) {
    res.status(404).json({ error: 'Buchet inexistent' });
    return;
  }

  const bouquet: Bouquet = { id, name, price, image, recipe, ingredients };
  res.json(await runDb((db) => db.upsertBouquet(bouquet)));
});

bouquetsRouter.delete('/:id', async (req, res) => {
  const ok = await runDb((db) => db.deleteBouquet(req.params.id));
  if (!ok) {
    res.status(404).json({ error: 'Buchet inexistent' });
    return;
  }
  res.status(204).end();
});
