import { useEffect, useState } from 'react';
import type { Bouquet } from '../types';
import { formatEuro } from '../lib/money';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';
import styles from './QuantityDialog.module.css';

type Props = {
  bouquet: Bouquet;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
  /** Override confirm button text. Receives the chosen quantity. */
  confirmLabel?: (quantity: number) => string;
  showPrice?: boolean;
  /** Upper bound for quantity (default 99). */
  max?: number;
};

export function QuantityDialog({
  bouquet,
  onConfirm,
  onCancel,
  confirmLabel,
  showPrice = true,
  max = 99,
}: Props) {
  /** String so the user can clear the field and type freely. */
  const [qtyText, setQtyText] = useState('1');
  const maxQty = Math.max(1, Math.floor(max));
  useBodyScrollLock(true);

  const parsed = Number(qtyText);
  const qtyValid =
    qtyText.trim() !== '' &&
    Number.isFinite(parsed) &&
    Number.isInteger(parsed) &&
    parsed >= 1 &&
    parsed <= maxQty;
  const qty = qtyValid ? parsed : 0;

  useEffect(() => {
    setQtyText('1');
  }, [bouquet.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function changeQty(value: number) {
    const next = Math.max(1, Math.min(maxQty, value));
    setQtyText(String(next));
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
            onClick={() => changeQty((qtyValid ? qty : 1) - 1)}
            aria-label="Scade cantitatea"
            disabled={!qtyValid || qty <= 1}
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={qtyText}
            autoFocus
            onChange={(e) => {
              // Allow empty / partial typing; clamp only when a number is present.
              const raw = e.target.value;
              if (raw.trim() === '') {
                setQtyText('');
                return;
              }
              if (!/^\d+$/.test(raw.trim())) {
                return;
              }
              const n = Number(raw);
              if (!Number.isFinite(n)) return;
              setQtyText(String(Math.min(maxQty, Math.max(0, Math.floor(n)))));
            }}
            onBlur={() => {
              if (!qtyValid) return;
              setQtyText(String(qty));
            }}
            aria-label={`Cantitate ${bouquet.name}`}
          />
          <button
            type="button"
            onClick={() => changeQty((qtyValid ? qty : 0) + 1)}
            aria-label="Crește cantitatea"
            disabled={qtyValid ? qty >= maxQty : false}
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
            disabled={!qtyValid}
            onClick={() => {
              if (!qtyValid) return;
              onConfirm(qty);
            }}
          >
            {confirmLabel
              ? confirmLabel(qtyValid ? qty : 1)
              : `Adaugă ${qtyValid && qty > 1 ? `${qty} × ` : ''}în coș`}
          </button>
        </div>
      </div>
    </div>
  );
}
