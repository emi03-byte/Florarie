import { useMemo, useState } from 'react';
import type { Bouquet, Order } from '../types';
import {
  aggregateBouquetsToMake,
  aggregateMaterialsNeeded,
  markBouquetMade,
} from '../lib/materials';
import { BouquetImage } from './BouquetImage';
import styles from './ProductionBoard.module.css';

type Props = {
  orders: Order[];
  catalog: Bouquet[];
  onOrdersChange: (orders: Order[]) => void;
};

export function ProductionBoard({ orders, catalog, onOrdersChange }: Props) {
  const bouquets = useMemo(
    () => aggregateBouquetsToMake(orders, catalog),
    [orders, catalog],
  );
  const materials = useMemo(
    () => aggregateMaterialsNeeded(orders, catalog),
    [orders, catalog],
  );
  const [markAmounts, setMarkAmounts] = useState<Record<string, string>>({});

  function markMade(bouquetId: string, count: number) {
    if (count <= 0) return;
    onOrdersChange(markBouquetMade(orders, bouquetId, count));
  }

  return (
    <div className={styles.layout}>
      <section className={styles.panel}>
        <header className={styles.panelHead}>
          <h2>Buchete de făcut</h2>
          <p>Separate pe tip. Marchează câte ai terminat — materialele scad automat.</p>
        </header>

        {bouquets.length === 0 ? (
          <p className={styles.empty}>
            Nu ai buchete de făcut. Finalizează o comandă din Vânzare și revino aici.
          </p>
        ) : (
          <ul className={styles.bouquetList}>
            {bouquets.map((row) => {
              const amount = Number(markAmounts[row.bouquetId] ?? '1');
              return (
                <li key={row.bouquetId} className={styles.bouquetRow}>
                  <div className={styles.thumb}>
                    <BouquetImage src={row.image} alt={row.name} />
                  </div>
                  <div className={styles.bouquetInfo}>
                    <p className={styles.bouquetName}>{row.name}</p>
                    <p className={styles.bouquetMeta}>
                      Rămase <strong>{row.remaining}</strong>
                      <span>
                        {' '}
                        (făcute {row.made} din {row.ordered})
                      </span>
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" onClick={() => markMade(row.bouquetId, 1)}>
                      +1 făcut
                    </button>
                    <div className={styles.markGroup}>
                      <input
                        type="number"
                        min={1}
                        max={row.remaining}
                        value={markAmounts[row.bouquetId] ?? '1'}
                        onChange={(e) =>
                          setMarkAmounts((prev) => ({
                            ...prev,
                            [row.bouquetId]: e.target.value,
                          }))
                        }
                        aria-label={`Câte ${row.name} ai făcut`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const n = Number.isFinite(amount) ? Math.floor(amount) : 0;
                          markMade(row.bouquetId, Math.min(n, row.remaining));
                          setMarkAmounts((prev) => ({ ...prev, [row.bouquetId]: '1' }));
                        }}
                      >
                        Marchează
                      </button>
                    </div>
                    <button
                      type="button"
                      className={styles.allBtn}
                      onClick={() => markMade(row.bouquetId, row.remaining)}
                    >
                      Toate făcute
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHead}>
          <h2>Materiale de cumpărat</h2>
          <p>Total comun din toate buchetele nefăcute — nu per buchet.</p>
        </header>

        {materials.length === 0 ? (
          <p className={styles.empty}>Nu ai materiale de pregătit momentan.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Material</th>
                <th>Unitate</th>
                <th>Cantitate</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((row) => (
                <tr key={`${row.name}|${row.unit}`}>
                  <td>{row.name}</td>
                  <td>{row.unit}</td>
                  <td className={styles.qty}>{row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
