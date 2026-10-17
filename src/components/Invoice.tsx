import type { Bouquet, Order } from '../types';
import { formatEuro } from '../lib/money';
import styles from './Invoice.module.css';

type Props = {
  order: Order;
  catalog: Bouquet[];
  dailyNumber: number;
  onPrint: () => void;
  onNewSale: () => void;
};

export function Invoice({ order, catalog, dailyNumber, onPrint, onNewSale }: Props) {
  const lines = order.items
    .map((item) => {
      const bouquet = catalog.find((b) => b.id === item.bouquetId);
      if (!bouquet) return null;
      return {
        name: bouquet.name,
        quantity: item.quantity,
        unitPrice: bouquet.price,
        lineTotal: bouquet.price * item.quantity,
      };
    })
    .filter(Boolean) as {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];

  const date = new Date(order.createdAt);

  return (
    <section className={styles.wrap}>
      <div className={`${styles.actions} no-print`}>
        <button type="button" className={styles.primary} onClick={onPrint}>
          Imprimir
        </button>
        <button type="button" className={styles.secondary} onClick={onNewSale}>
          Nuevo pedido
        </button>
      </div>

      <article className={styles.invoice} id="invoice-print">
        <header className={styles.header}>
          <h1>Factura</h1>
          <p className={styles.meta}>
            N.º {dailyNumber}
            <br />
            Fecha: {date.toLocaleString('es-ES')}
          </p>
        </header>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.name + line.quantity}>
                <td>{line.name}</td>
                <td>{line.quantity}</td>
                <td>{formatEuro(line.unitPrice)}</td>
                <td>{formatEuro(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className={styles.footer}>
          <span>Total a pagar</span>
          <strong>{formatEuro(order.total)}</strong>
        </footer>
      </article>
    </section>
  );
}
