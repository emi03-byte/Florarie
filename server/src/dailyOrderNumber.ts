import type { Order } from './types.js';

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

/** Next sales invoice number for today (only counts orders that already have dailyNumber). */
export function nextDailyOrderNumber(orders: Order[], at: Date | string = new Date()): number {
  const day = bucharestDayKey(at);
  let max = 0;
  for (const order of orders) {
    if (!order.dailyNumber || order.dailyNumber <= 0) continue;
    if (bucharestDayKey(order.createdAt) !== day) continue;
    if (order.dailyNumber > max) max = order.dailyNumber;
  }
  return max + 1;
}
