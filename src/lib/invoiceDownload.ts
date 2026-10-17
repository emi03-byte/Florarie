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
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #222;
      margin: 2rem;
      font-size: 14px;
      line-height: 1.45;
    }
    h1 { font-size: 16px; font-weight: 700; margin: 0 0 0.5rem; color: #222; }
    .meta { color: #333; line-height: 1.5; margin: 0 0 1rem; }
    table { width: 100%; border-collapse: collapse; margin: 1.25rem 0; font-size: 14px; }
    th, td { text-align: left; padding: 0.55rem 0.35rem; border-bottom: 1px solid #ddd; font-weight: 400; }
    th { font-weight: 700; color: #222; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4),
    td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: right; }
    .footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #222;
      padding-top: 0.75rem;
      font-size: 14px;
    }
    .footer strong { font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
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
