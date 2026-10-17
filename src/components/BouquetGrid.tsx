import type { Bouquet } from '../types';
import { formatRon } from '../lib/money';
import { BouquetImage } from './BouquetImage';
import styles from './BouquetGrid.module.css';

type Props = {
  bouquets: Bouquet[];
  selectedId: string | null;
  onSelect: (bouquet: Bouquet) => void;
};

export function BouquetGrid({ bouquets, selectedId, onSelect }: Props) {
  return (
    <div className={styles.grid}>
      {bouquets.map((bouquet) => {
        const selected = selectedId === bouquet.id;
        return (
          <button
            key={bouquet.id}
            type="button"
            className={`${styles.card} ${selected ? styles.selected : ''}`}
            onClick={() => onSelect(bouquet)}
            aria-pressed={selected}
          >
            <span className={styles.photo}>
              <BouquetImage src={bouquet.image} alt={bouquet.name} />
            </span>
            <span className={styles.body}>
              <span className={styles.name}>{bouquet.name}</span>
              <span className={styles.price}>{formatRon(bouquet.price)}</span>
              <span className={styles.hint}>{selected ? 'Selectat' : 'Vezi detalii'}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
