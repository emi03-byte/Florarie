import { canonicalMaterialName, materialMatchKey } from './ingredients';
import type { Bouquet, Order, OrderItem } from '../types';

export type BouquetToMake = {
  bouquetId: string;
  name: string;
  image: string;
  price: number;
  remaining: number;
  ordered: number;
  made: number;
};

export type MaterialNeed = {
  name: string;
  unit: string;
  quantity: number;
};

function remainingOf(item: OrderItem): number {
  return Math.max(0, item.quantity - item.madeQuantity);
}

export function getOpenOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.status === 'open');
}

/** Aggregate remaining bouquets by type across all open orders. */
export function aggregateBouquetsToMake(
  orders: Order[],
  catalog: Bouquet[],
): BouquetToMake[] {
  const map = new Map<string, BouquetToMake>();

  for (const order of getOpenOrders(orders)) {
    for (const item of order.items) {
      const remaining = remainingOf(item);
      const bouquet = catalog.find((b) => b.id === item.bouquetId);
      const existing = map.get(item.bouquetId);
      if (existing) {
        existing.remaining += remaining;
        existing.ordered += item.quantity;
        existing.made += item.madeQuantity;
      } else {
        map.set(item.bouquetId, {
          bouquetId: item.bouquetId,
          name: bouquet?.name ?? 'Buchet necunoscut',
          image: bouquet?.image ?? '/bouquets/placeholder.svg',
          price: bouquet?.price ?? 0,
          remaining,
          ordered: item.quantity,
          made: item.madeQuantity,
        });
      }
    }
  }

  return Array.from(map.values())
    .filter((row) => row.remaining > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'));
}

/** Total materials needed for all unfinished bouquets (not per bouquet). */
export function aggregateMaterialsNeeded(
  orders: Order[],
  catalog: Bouquet[],
): MaterialNeed[] {
  const map = new Map<string, MaterialNeed>();

  for (const order of getOpenOrders(orders)) {
    for (const item of order.items) {
      const remaining = remainingOf(item);
      if (remaining <= 0) continue;
      const bouquet = catalog.find((b) => b.id === item.bouquetId);
      if (!bouquet) continue;

      for (const ingredient of bouquet.ingredients) {
        const key = materialMatchKey(ingredient.name, ingredient.unit);
        const add = ingredient.quantity * remaining;
        const existing = map.get(key);
        if (existing) {
          existing.quantity += add;
        } else {
          map.set(key, {
            name: canonicalMaterialName(ingredient.name),
            unit: ingredient.unit,
            quantity: add,
          });
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ro'));
}

/**
 * Mark `count` more units of `bouquetId` as made across open orders (FIFO).
 */
export function markBouquetMade(
  orders: Order[],
  bouquetId: string,
  count: number,
): Order[] {
  let left = Math.max(0, Math.floor(count));
  if (left <= 0) return orders;

  return orders.map((order) => {
    if (order.status !== 'open' || left <= 0) return order;

    const items = order.items.map((item) => {
      if (item.bouquetId !== bouquetId || left <= 0) return item;
      const canMake = item.quantity - item.madeQuantity;
      if (canMake <= 0) return item;
      const apply = Math.min(canMake, left);
      left -= apply;
      return { ...item, madeQuantity: item.madeQuantity + apply };
    });

    const done = items.every((item) => item.madeQuantity >= item.quantity);
    return { ...order, items, status: done ? ('done' as const) : ('open' as const) };
  });
}
