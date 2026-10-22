import type { Bouquet } from '../types';
import { formatEuro } from '../lib/money';
import { useRevealOnScroll } from '../lib/useRevealOnScroll';
import { BouquetImage } from './BouquetImage';
import { SeraIcon } from './SeraIcon';
import styles from './BouquetGrid.module.css';

type Props = {
  bouquets: Bouquet[];
  selectedIds: string[];
  onSelect: (bouquet: Bouquet) => void;
  onViewDetails: (bouquet: Bouquet) => void;
  onAdd: (bouquet: Bouquet) => void;
  /** Display only: how many of each bouquet are already in the cart. */
  cartQuantities?: Record<string, number>;
};

export function BouquetGrid({
  bouquets,
  selectedIds,
  onSelect,
  onViewDetails,
  onAdd,
  cartQuantities,
}: Props) {
  const resetKey = bouquets.map((b) => b.id).join('|');
  const { visibleCount, sentinelRef, hasMore } = useRevealOnScroll(
    bouquets.length,
    resetKey,
  );
  const visible = bouquets.slice(0, visibleCount);

  return (
    <div className={styles.grid}>
      {visible.map((bouquet) => {
        const selected = selectedIds.includes(bouquet.id);
        const inCart = cartQuantities?.[bouquet.id] ?? 0;
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
                aria-label={`Vezi detalii: ${bouquet.name}`}
              >
                <span className={styles.photo}>
                  <BouquetImage src={bouquet.image} alt="" />
                </span>
                <span className={styles.peek} aria-hidden="true">
                  <span className={styles.peekPill}>
                    <SeraIcon name="eye" size={18} strokeWidth={2} />
                    Vezi detalii
                  </span>
                </span>
              </button>
              <button
                type="button"
                className={`${styles.fab} ${inCart > 0 ? styles.fabQty : ''}`}
                onClick={() => onAdd(bouquet)}
                aria-label={
                  inCart > 0
                    ? `${bouquet.name}: ${inCart} în coș. Adaugă încă`
                    : `Adaugă în coș: ${bouquet.name}`
                }
                title="Adaugă în coș"
              >
                {inCart > 0 ? (
                  <span key={inCart} className={styles.fabCount}>
                    {inCart}
                  </span>
                ) : (
                  <SeraIcon name="plus" size={26} strokeWidth={2.4} />
                )}
              </button>
            </div>
            <button
              type="button"
              className={styles.selectBtn}
              onClick={() => onViewDetails(bouquet)}
            >
              <span className={styles.body}>
                <span className={styles.name}>{bouquet.name}</span>
                <span className={styles.price}>{formatEuro(bouquet.price)}</span>
              </span>
            </button>
          </article>
        );
      })}
      {hasMore ? (
        <div
          ref={sentinelRef}
          className={styles.revealSentinel}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
