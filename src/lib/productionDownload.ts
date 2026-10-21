import type { BouquetToMake, MaterialNeed } from './materials';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Same mark as the app tab (`public/favicon.svg`), inlined for offline HTML. */
const APP_FAVICON_DATA_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#6a3542"/><circle cx="32" cy="28" r="10" fill="#f2d6dc"/><circle cx="22" cy="24" r="7" fill="#d6a0af"/><circle cx="42" cy="24" r="7" fill="#d6a0af"/><circle cx="26" cy="34" r="7" fill="#c47a8c"/><circle cx="38" cy="34" r="7" fill="#c47a8c"/><circle cx="32" cy="28" r="4.5" fill="#f7eef1"/><path d="M32 38c0 8-3 14-3 18h6c0-4-3-10-3-18Z" fill="#7a9a84"/><path d="M32 44c-6 1-10 5-12 8 4-1 9-2 12-2" stroke="#8fb39a" stroke-width="2" stroke-linecap="round"/></svg>`,
  );

export function buildProductionHtml(
  bouquets: BouquetToMake[],
  materials: MaterialNeed[],
): string {
  const totalRemaining = bouquets.reduce((sum, row) => sum + row.remaining, 0);

  const bouquetRows = bouquets
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.remaining}</td>
      </tr>`,
    )
    .join('');

  const materialRows = materials
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(formatQty(row.quantity))}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8" />
  <link rel="icon" type="image/svg+xml" href="${APP_FAVICON_DATA_URI}" />
  <title>De făcut — ${dayKey()}</title>
  <style>
    @page { margin: 1.2cm; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #222;
      margin: 1.5rem;
      font-size: 13px;
      line-height: 1.45;
    }
    h1 { font-size: 18px; font-weight: 700; margin: 0 0 0.75rem; }
    h2 { font-size: 14px; font-weight: 700; margin: 1.5rem 0 0.5rem; }
    .summary {
      margin: 0 0 1rem;
      padding: 0.65rem 0.75rem;
      border: 1px solid #ddd;
      background: #fafafa;
    }
    table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; }
    th, td {
      text-align: left;
      padding: 0.45rem 0.35rem;
      border-bottom: 1px solid #ddd;
      vertical-align: top;
    }
    th { font-weight: 700; border-bottom: 1px solid #222; }
    th:nth-child(n+2), td:nth-child(n+2) { text-align: right; white-space: nowrap; }
    .empty { color: #777; font-style: italic; }
    @media print {
      body { margin: 0; }
      .summary { break-inside: avoid; }
      table { break-inside: auto; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>De făcut</h1>
  <p class="summary">
    <strong>${totalRemaining}</strong> aranjamente de făcut ·
    <strong>${bouquets.length}</strong> tipuri ·
    <strong>${materials.length}</strong> materiale
  </p>

  <h2>Aranjamente</h2>
  ${
    bouquets.length === 0
      ? '<p class="empty">Nu există aranjamente de făcut.</p>'
      : `<table>
    <thead>
      <tr><th>Denumire</th><th>De făcut</th></tr>
    </thead>
    <tbody>${bouquetRows}</tbody>
  </table>`
  }

  <h2>Materiale necesare</h2>
  ${
    materials.length === 0
      ? '<p class="empty">Nu există materiale de pregătit.</p>'
      : `<table>
    <thead>
      <tr><th>Material</th><th>Cantitate</th></tr>
    </thead>
    <tbody>${materialRows}</tbody>
  </table>`
  }
</body>
</html>`;
}

export function downloadProductionList(
  bouquets: BouquetToMake[],
  materials: MaterialNeed[],
): void {
  const html = buildProductionHtml(bouquets, materials);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `de-facut-${dayKey()}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
