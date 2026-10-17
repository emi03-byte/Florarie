import { useState } from 'react';
import type { Bouquet } from '../types';
import { formatEuro } from '../lib/money';
import { BouquetImage } from './BouquetImage';
import styles from './BouquetGrid.module.css';

type Props = {
  bouquets: Bouquet[];
  selectedIds: string[];
  onSelect: (bouquet: Bouquet) => void;
  onViewDetails: (bouquet: Bouquet) => void;
  onAdd: (bouquet: Bouquet, quantity: number) => void;
};

export function BouquetGrid({
  bouquets,
  selectedIds,
  onSelect,
  onViewDetails,
  onAdd,
}: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  function getQty(id: string): number {
    return quantities[id] ?? 1;
  }

  function setQty(id: string, value: number) {
    const next = Math.max(1, Math.min(99, value));
    setQuantities((prev) => ({ ...prev, [id]: next }));
  }

  return (
    <div className={styles.grid}>
      {bouquets.map((bouquet) => {
        const selected = selectedIds.includes(bouquet.id);
        const qty = getQty(bouquet.id);
        return (
          <article
            key={bouquet.id}
            className={`${styles.card} ${selected ? styles.selected : ''}`}
          >
            <div className={styles.photoWrap}>
              <button
                type="button"
                className={styles.photoBtn}
                onClick={() => onSelect(bouquet)}
                aria-pressed={selected}
                aria-label={bouquet.name}
              >
                <span className={styles.photo}>
                  <BouquetImage src={bouquet.image} alt="" />
                </span>
              </button>
              <button
                type="button"
                className={styles.detailLink}
                onClick={() => onViewDetails(bouquet)}
              >
                Vezi detalii
              </button>
            </div>
            <button
              type="button"
              className={styles.selectBtn}
              onClick={() => onSelect(bouquet)}
              aria-pressed={selected}
            >
              <span className={styles.body}>
                <span className={styles.name}>{bouquet.name}</span>
                <span className={styles.price}>{formatEuro(bouquet.price)}</span>
              </span>
            </button>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.detailAction}
                onClick={() => onViewDetails(bouquet)}
              >
                Vezi detalii
              </button>
              <div className={styles.qty}>
                <button
                  type="button"
                  onClick={() => setQty(bouquet.id, qty - 1)}
                  aria-label="Scade cantitatea"
                  disabled={qty <= 1}
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
                  aria-label={`Cantitate ${bouquet.name}`}
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
                onClick={() => {
                  onAdd(bouquet, qty);
                  setQty(bouquet.id, 1);
                }}
              >
                Adaugă în coș
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
