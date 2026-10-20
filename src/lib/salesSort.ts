import type { Bouquet, Order } from '../types';

export type SalesSort = 'name' | 'price-asc' | 'price-desc' | 'popular';

const MS_DAY = 24 * 60 * 60 * 1000;

/** Rolling window: always “this week’s demand” without cron jobs. */
export const POPULAR_WINDOW_DAYS = 7;

/**
 * Units ordered (sold into De făcut), not “made”.
 * Counts every order_item.quantity in the last N days.
 */
export function soldQuantities(
  orders: Order[],
  windowDays = POPULAR_WINDOW_DAYS,
): Map<string, number> {
  const cutoff = Date.now() - windowDays * MS_DAY;
  const map = new Map<string, number>();
  for (const order of orders) {
    const created = Date.parse(order.createdAt);
    if (!Number.isFinite(created) || created < cutoff) continue;
    for (const item of order.items) {
      map.set(item.bouquetId, (map.get(item.bouquetId) ?? 0) + item.quantity);
    }
  }
  return map;
}

export function sortCatalog(
  catalog: Bouquet[],
  sort: SalesSort,
  sold: Map<string, number>,
): Bouquet[] {
  const list = [...catalog];
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'ro'));
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name, 'ro'));
    case 'popular':
      return list.sort((a, b) => {
        const sa = sold.get(a.id) ?? 0;
        const sb = sold.get(b.id) ?? 0;
        return sb - sa || a.name.localeCompare(b.name, 'ro');
      });
    case 'name':
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  }
}
