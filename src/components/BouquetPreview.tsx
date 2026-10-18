import { useEffect } from 'react';
import type { Bouquet } from '../types';
import { formatEuro } from '../lib/money';
import { formatIngredient } from '../lib/ingredients';
import { BouquetImage } from './BouquetImage';
import styles from './BouquetPreview.module.css';

type Props = {
  bouquet: Bouquet;
  onClose: () => void;
  onAdd: (bouquet: Bouquet) => void;
};

export function BouquetPreview({ bouquet, onClose, onAdd }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => onAdd(bouquet)}
            >
              Adaugă în coș
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
