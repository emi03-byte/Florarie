import { useMemo } from 'react';
import type { Bouquet, Order } from '../types';
import { getDailyOrderNumber } from '../lib/dailyOrderNumber';
import { formatEuro } from '../lib/money';
import styles from './OrderHistory.module.css';

type Props = {
  orders: Order[];
  catalog: Bouquet[];
  onDownload: (order: Order, dailyNumber: number) => void;
};

type HistoryLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export function OrderHistory({ orders, catalog, onDownload }: Props) {
  const rows = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const byTime = b.createdAt.localeCompare(a.createdAt);
        if (byTime !== 0) return byTime;
        return b.id.localeCompare(a.id);
      })
      .map((order) => {
        const dailyNumber = getDailyOrderNumber(order, orders);
        const lines = order.items
          .map((item) => {
            const bouquet = catalog.find((b) => b.id === item.bouquetId);
            if (!bouquet) {
              return {
                name: `Produs (${item.bouquetId})`,
                quantity: item.quantity,
                unitPrice: 0,
                lineTotal: 0,
              } satisfies HistoryLine;
            }
            return {
              name: bouquet.name,
              quantity: item.quantity,
              unitPrice: bouquet.price,
              lineTotal: bouquet.price * item.quantity,
            } satisfies HistoryLine;
          });
        return { order, dailyNumber, lines };
      });
  }, [orders, catalog]);

  return (
    <div className={styles.panel}>
      <header className={styles.head}>
        <div>
          <h2>Istoric comenzi</h2>
          <p className={styles.hint}>
            Toate comenzile cu produse, cantități și total. Poți descărca factura oricând.
          </p>
        </div>
        {rows.length > 0 ? (
          <p className={styles.count}>{rows.length} comenzi</p>
        ) : null}
      </header>

      <div className={styles.scroll}>
        {rows.length === 0 ? (
          <p className={styles.empty}>Nu există comenzi încă.</p>
        ) : (
          <ul className={styles.list}>
            {rows.map(({ order, dailyNumber, lines }) => (
              <li key={order.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <p className={styles.orderTitle}>Comanda nr. {dailyNumber}</p>
                    <p className={styles.meta}>
                      {new Date(order.createdAt).toLocaleString('ro-RO')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.download}
                    onClick={() => onDownload(order, dailyNumber)}
                  >
                    Descarcă factura
                  </button>
                </div>

                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Produs</th>
                      <th>Cant.</th>
                      <th>Preț</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={`${order.id}-${line.name}-${index}`}>
                        <td>{line.name}</td>
                        <td>{line.quantity}</td>
                        <td>{formatEuro(line.unitPrice)}</td>
                        <td>{formatEuro(line.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className={styles.totalRow}>
                  <span>Total</span>
                  <strong>{formatEuro(order.total)}</strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
