import { seedBouquets } from '../data/seedBouquets';
import { normalizeIngredient } from './ingredients';
import type { Bouquet, Ingredient, Order, OrderItem } from '../types';

const CATALOG_KEY = 'florarie.catalog';
const ORDERS_KEY = 'florarie.orders';
const PLACEHOLDER_IMAGE = '/bouquets/placeholder.svg';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeIngredients(raw: unknown): Ingredient[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeIngredient(item))
    .filter((item): item is Ingredient => item !== null);
}

function hasLegacyStringIngredients(raw: unknown): boolean {
  return Array.isArray(raw) && raw.some((item) => typeof item === 'string');
}

function normalizeBouquet(bouquet: Bouquet): Bouquet {
  const seed = seedBouquets.find((item) => item.id === bouquet.id);
  // Prefer seed structured ingredients when upgrading from old free-text catalog.
  const ingredients =
    seed && hasLegacyStringIngredients(bouquet.ingredients)
      ? seed.ingredients
      : normalizeIngredients(bouquet.ingredients);
  return {
    ...bouquet,
    image: bouquet.image || seed?.image || PLACEHOLDER_IMAGE,
    ingredients: ingredients.length > 0 ? ingredients : seed?.ingredients ?? [],
    recipe: bouquet.recipe || '',
  };
}

function isOrderComplete(items: OrderItem[]): boolean {
  return items.length > 0 && items.every((item) => item.madeQuantity >= item.quantity);
}

function normalizeOrderItem(raw: unknown): OrderItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<OrderItem>;
  const bouquetId = String(item.bouquetId ?? '');
  const quantity = Number(item.quantity);
  const madeQuantity = Number(item.madeQuantity ?? 0);
  if (!bouquetId || !Number.isFinite(quantity) || quantity <= 0) return null;
  return {
    bouquetId,
    quantity,
    madeQuantity: Number.isFinite(madeQuantity)
      ? Math.max(0, Math.min(quantity, madeQuantity))
      : 0,
  };
}

function normalizeOrder(raw: unknown): Order | null {
  if (!raw || typeof raw !== 'object') return null;
  const order = raw as Partial<Order> & { items?: unknown[] };
  const id = String(order.id ?? '');
  const createdAt = String(order.createdAt ?? new Date().toISOString());
  const total = Number(order.total ?? 0);
  const items = Array.isArray(order.items)
    ? order.items.map(normalizeOrderItem).filter((item): item is OrderItem => item !== null)
    : [];
  if (!id || items.length === 0) return null;

  const status =
    order.status === 'done' || order.status === 'open'
      ? order.status
      : isOrderComplete(items)
        ? 'done'
        : 'open';

  const dailyNumber = Number(order.dailyNumber);
  return {
    id,
    createdAt,
    total: Number.isFinite(total) ? total : 0,
    items,
    status: isOrderComplete(items) ? 'done' : status === 'done' ? 'done' : 'open',
    dailyNumber:
      Number.isFinite(dailyNumber) && dailyNumber > 0 ? dailyNumber : undefined,
  };
}

export function loadCatalog(): Bouquet[] {
  const stored = safeParse<Bouquet[] | null>(localStorage.getItem(CATALOG_KEY), null);
  if (!stored || stored.length === 0) {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(seedBouquets));
    return [...seedBouquets];
  }

  const normalized = stored.map(normalizeBouquet);
  localStorage.setItem(CATALOG_KEY, JSON.stringify(normalized));
  return normalized;
}

export function saveCatalog(bouquets: Bouquet[]): void {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(bouquets.map(normalizeBouquet)));
}

export function loadOrders(): Order[] {
  const stored = safeParse<unknown[]>(localStorage.getItem(ORDERS_KEY), []);
  const normalized = stored
    .map(normalizeOrder)
    .filter((order): order is Order => order !== null);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function saveOrders(orders: Order[]): void {
  const normalized = orders
    .map(normalizeOrder)
    .filter((order): order is Order => order !== null)
    .slice(0, 100);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(normalized));
}

export function saveOrder(order: Order): void {
  const orders = loadOrders();
  orders.unshift(order);
  saveOrders(orders);
}

export function updateOrders(updater: (orders: Order[]) => Order[]): Order[] {
  const next = updater(loadOrders());
  saveOrders(next);
  return next;
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
