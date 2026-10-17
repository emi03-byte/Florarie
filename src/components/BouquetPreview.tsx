import { useEffect, useState } from 'react';
import type { Bouquet } from '../types';
import { formatEuro } from '../lib/money';
import { formatIngredient } from '../lib/ingredients';
import { BouquetImage } from './BouquetImage';
import styles from './BouquetPreview.module.css';

type Props = {
  bouquet: Bouquet;
  onClose: () => void;
  onAdd: (bouquet: Bouquet, quantity: number) => void;
};

export function BouquetPreview({ bouquet, onClose, onAdd }: Props) {
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [bouquet.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function changeQty(value: number) {
    setQty(Math.max(1, Math.min(99, value)));
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bouquet-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Închide"
        >
          ×
        </button>

        <div className={styles.photo}>
          <BouquetImage src={bouquet.image} alt={bouquet.name} />
        </div>

        <div className={styles.body}>
          <p className={styles.badge}>Detalii</p>
          <h2 id="bouquet-preview-title" className={styles.title}>
            {bouquet.name}
          </h2>
          <p className={styles.price}>{formatEuro(bouquet.price)}</p>

          <h3 className={styles.sectionTitle}>Ingrediente</h3>
          <ul className={styles.list}>
            {bouquet.ingredients.map((item) => (
              <li key={`${item.name}|${item.unit}|${item.quantity}`}>
                {formatIngredient(item)}
              </li>
            ))}
          </ul>

          <div className={styles.addRow}>
            <div className={styles.qty}>
              <button
                type="button"
                onClick={() => changeQty(qty - 1)}
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
                  changeQty(Number.isFinite(raw) ? raw : 1);
                }}
                aria-label={`Cantitate ${bouquet.name}`}
              />
              <button
                type="button"
                onClick={() => changeQty(qty + 1)}
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
                onClose();
              }}
            >
              Adaugă în coș
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
