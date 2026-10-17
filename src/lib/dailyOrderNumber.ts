import type { Order } from '../types';

/** Calendar day in Europe/Bucharest (YYYY-MM-DD). Resets at local midnight. */
export function bucharestDayKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Prefer stored dailyNumber; otherwise derive among numbered sales of that day. */
export function getDailyOrderNumber(order: Order, allOrders: Order[]): number {
  if (order.dailyNumber && order.dailyNumber > 0) return order.dailyNumber;

  const day = bucharestDayKey(order.createdAt);
  const sameDay = allOrders
    .filter((o) => bucharestDayKey(o.createdAt) === day && o.dailyNumber && o.dailyNumber > 0)
    .sort((a, b) => {
      const byTime = a.createdAt.localeCompare(b.createdAt);
      if (byTime !== 0) return byTime;
      return a.id.localeCompare(b.id);
    });
  const index = sameDay.findIndex((o) => o.id === order.id);
  if (index >= 0) return index + 1;

  // Legacy order without dailyNumber: position among all orders that day.
  const legacy = allOrders
    .filter((o) => bucharestDayKey(o.createdAt) === day)
    .sort((a, b) => {
      const byTime = a.createdAt.localeCompare(b.createdAt);
      if (byTime !== 0) return byTime;
      return a.id.localeCompare(b.id);
    });
  const legacyIndex = legacy.findIndex((o) => o.id === order.id);
  return legacyIndex >= 0 ? legacyIndex + 1 : 1;
}
