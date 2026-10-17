import type { Bouquet, Order } from '../types';
import { bucharestDayKey } from './dailyOrderNumber';
import { formatEuro } from './money';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildInvoiceHtml(
  order: Order,
  catalog: Bouquet[],
  dailyNumber: number,
): string {
  const date = new Date(order.createdAt).toLocaleString('ro-RO');
  const rows = order.items
    .map((item) => {
      const bouquet = catalog.find((b) => b.id === item.bouquetId);
      if (!bouquet) return '';
      const lineTotal = bouquet.price * item.quantity;
      return `<tr>
        <td>${escapeHtml(bouquet.name)}</td>
        <td>${item.quantity}</td>
        <td>${escapeHtml(formatEuro(bouquet.price))}</td>
        <td>${escapeHtml(formatEuro(lineTotal))}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8" />
  <title>Factură nr. ${dailyNumber}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1f1c; margin: 2rem; }
    h1 { font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.04em; color: #4a554e; }
    .brand { font-size: 1.75rem; font-weight: 700; margin: 0 0 0.35rem; color: #6a3542; }
    .meta { color: #5c665f; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th, td { text-align: left; padding: 0.65rem 0.4rem; border-bottom: 1px solid #e2e6e3; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #6a736c; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4),
    td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: right; }
    .footer { display: flex; justify-content: space-between; border-top: 2px solid #1a1f1c; padding-top: 0.75rem; font-size: 1.1rem; }
  </style>
</head>
<body>
  <p class="brand">Florărie</p>
  <h1>Factură</h1>
  <p class="meta">Nr. ${dailyNumber}<br />Data: ${escapeHtml(date)}</p>
  <table>
    <thead>
      <tr><th>Denumire</th><th>Cant.</th><th>Preț</th><th>Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <span>Total de plată</span>
    <strong>${escapeHtml(formatEuro(order.total))}</strong>
  </div>
</body>
</html>`;
}

export function downloadInvoice(
  order: Order,
  catalog: Bouquet[],
  dailyNumber: number,
): void {
  const html = buildInvoiceHtml(order, catalog, dailyNumber);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `factura-${bucharestDayKey(order.createdAt)}-nr-${dailyNumber}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
