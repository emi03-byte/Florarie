import type { Bouquet } from '../types';
import { formatEuro } from '../lib/money';
import { useRevealOnScroll } from '../lib/useRevealOnScroll';
import { BouquetImage } from './BouquetImage';
import styles from './BouquetGrid.module.css';

type Props = {
  bouquets: Bouquet[];
  selectedIds: string[];
  onSelect: (bouquet: Bouquet) => void;
  onViewDetails: (bouquet: Bouquet) => void;
  onAdd: (bouquet: Bouquet) => void;
};

export function BouquetGrid({
  bouquets,
  selectedIds,
  onSelect,
  onViewDetails,
  onAdd,
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
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => onAdd(bouquet)}
              >
                Adaugă în coș
              </button>
            </div>
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
