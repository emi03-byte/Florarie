import { useMemo, useState } from 'react';
import type { Bouquet, CartItem } from '../types';
import { formatEuro } from '../lib/money';
import { BouquetImage } from './BouquetImage';
import styles from './InvoiceBoard.module.css';

type Props = {
  catalog: Bouquet[];
  onSubmit: (items: CartItem[]) => Promise<void>;
};

export function InvoiceBoard({ catalog, onSubmit }: Props) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const lines = useMemo(
    () =>
      items
        .map((item) => {
          const bouquet = catalog.find((b) => b.id === item.bouquetId);
          if (!bouquet) return null;
          return {
            item,
            bouquet,
            lineTotal: bouquet.price * item.quantity,
          };
        })
        .filter(Boolean) as {
        item: CartItem;
        bouquet: Bouquet;
        lineTotal: number;
      }[],
    [items, catalog],
  );

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const count = lines.reduce((sum, line) => sum + line.item.quantity, 0);

  function getQty(id: string): number {
    return quantities[id] ?? 1;
  }

  function setQty(id: string, value: number) {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, Math.min(99, value)),
    }));
  }

  function addBouquet(bouquet: Bouquet, quantity: number) {
    const addQty = Math.max(1, Math.min(99, quantity));
    setItems((prev) => {
      const existing = prev.find((item) => item.bouquetId === bouquet.id);
      if (existing) {
        return prev.map((item) =>
          item.bouquetId === bouquet.id
            ? { ...item, quantity: Math.min(99, item.quantity + addQty) }
            : item,
        );
      }
      return [...prev, { bouquetId: bouquet.id, quantity: addQty }];
    });
    setQty(bouquet.id, 1);
  }

  function changeLineQty(bouquetId: string, quantity: number) {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.bouquetId !== bouquetId));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.bouquetId === bouquetId
          ? { ...item, quantity: Math.min(99, quantity) }
          : item,
      ),
    );
  }

  async function handleSubmit() {
    if (items.length === 0 || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(items);
      setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut scoate factura');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.layout}>
      <section className={styles.catalogPanel}>
        <header className={styles.head}>
          <h2>Facturare</h2>
          <p>Selectează produse</p>
        </header>
        <div className={styles.gridScroll}>
          <div className={styles.grid}>
            {catalog.map((bouquet) => {
              const qty = getQty(bouquet.id);
              const selected = items.some((item) => item.bouquetId === bouquet.id);
              return (
                <article
                  key={bouquet.id}
                  className={`${styles.card}${selected ? ` ${styles.cardSelected}` : ''}`}
                >
                  <div className={styles.photo}>
                    <BouquetImage src={bouquet.image} alt={bouquet.name} />
                  </div>
                  <div className={styles.cardBody}>
                    <p className={styles.name}>{bouquet.name}</p>
                    <p className={styles.price}>{formatEuro(bouquet.price)}</p>
                    <div className={styles.cardActions}>
                      <div className={styles.qty}>
                        <button
                          type="button"
                          onClick={() => setQty(bouquet.id, qty - 1)}
                          disabled={qty <= 1}
                          aria-label="Scade cantitatea"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={qty}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            setQty(bouquet.id, Number.isFinite(raw) ? raw : 1);
                          }}
                          aria-label={`Cantidad ${bouquet.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => setQty(bouquet.id, qty + 1)}
                          aria-label="Crește cantitatea"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() => addBouquet(bouquet, qty)}
                      >
                        Adaugă
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <aside className={styles.billPanel}>
        <header className={styles.billHead}>
          <h3>Factură</h3>
          {count > 0 ? (
            <p className={styles.count}>Total productos: {count}</p>
          ) : null}
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        {lines.length === 0 ? (
          <p className={styles.empty}>Nu ai selectat încă produse.</p>
        ) : (
          <ul className={styles.list}>
            {lines.map(({ item, bouquet, lineTotal }) => (
              <li key={item.bouquetId} className={styles.line}>
                <div className={styles.thumb}>
                  <BouquetImage src={bouquet.image} alt={bouquet.name} />
                </div>
                <div className={styles.lineBody}>
                  <div className={styles.lineTop}>
                    <span className={styles.lineName}>{bouquet.name}</span>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => changeLineQty(item.bouquetId, 0)}
                      aria-label={`Elimină ${bouquet.name}`}
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.lineBottom}>
                    <div className={styles.qty}>
                      <button
                        type="button"
                        onClick={() =>
                          changeLineQty(item.bouquetId, item.quantity - 1)
                        }
                        aria-label="Scade cantitatea"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          changeLineQty(item.bouquetId, item.quantity + 1)
                        }
                        aria-label="Crește cantitatea"
                      >
                        +
                      </button>
                    </div>
                    <span className={styles.linePrice}>{formatEuro(lineTotal)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.footer}>
          <div className={styles.totalRow}>
            <span>Total</span>
            <strong>{formatEuro(total)}</strong>
          </div>
          <button
            type="button"
            className={styles.submit}
            disabled={lines.length === 0 || busy}
            onClick={() => void handleSubmit()}
          >
            {busy ? 'Se generează…' : 'Finalizează și scoate factura'}
          </button>
        </div>
      </aside>
    </div>
  );
}
