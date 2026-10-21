import { useEffect, useState } from 'react';
import type { Bouquet } from '../types';
import { formatEuro } from '../lib/money';
import styles from './QuantityDialog.module.css';

type Props = {
  bouquet: Bouquet;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
  /** Override confirm button text. Receives the chosen quantity. */
  confirmLabel?: (quantity: number) => string;
  showPrice?: boolean;
};

export function QuantityDialog({
  bouquet,
  onConfirm,
  onCancel,
  confirmLabel,
  showPrice = true,
}: Props) {
  const [qty, setQty] = useState(1);

  // Quantity to add — always starts at 1 (not the amount already in cart).
  useEffect(() => {
    setQty(1);
  }, [bouquet.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function changeQty(value: number) {
    setQty(Math.max(1, Math.min(99, value)));
  }

  return (
    <div className={styles.backdrop} role="presentation" onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qty-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.label}>Câte bucăți?</p>
        <h2 id="qty-dialog-title" className={styles.title}>
          {bouquet.name}
        </h2>
        {showPrice ? (
          <p className={styles.price}>{formatEuro(bouquet.price)} / buc</p>
        ) : null}

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
            autoFocus
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

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Anulează
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={() => onConfirm(qty)}
          >
            {confirmLabel
              ? confirmLabel(qty)
              : `Adaugă ${qty > 1 ? `${qty} × ` : ''}în coș`}
          </button>
        </div>
      </div>
    </div>
  );
}
