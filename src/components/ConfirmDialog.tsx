import { useEffect } from 'react';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';
import styles from './QuantityDialog.module.css';

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual only: red confirm button for destructive actions. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmă',
  cancelLabel = 'Anulează',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  useBodyScrollLock(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className={styles.backdrop} role="presentation" onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.label}>{title}</p>
        <h2 id="confirm-dialog-title" className={styles.title}>
          {message}
        </h2>
        <div className={styles.actions} style={{ marginTop: '1.25rem' }}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={`${styles.confirm}${danger ? ` ${styles.danger}` : ''}`}
            onClick={onConfirm}
            autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
