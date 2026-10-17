import type { Bouquet } from '../types';
import { formatEuro } from '../lib/money';
import { formatIngredient } from '../lib/ingredients';
import { BouquetImage } from './BouquetImage';
import styles from './BouquetDetail.module.css';

type Props = {
  bouquets: Bouquet[];
  onAdd: (bouquet: Bouquet) => void;
  onRemove: (bouquetId: string) => void;
};

export function BouquetDetail({ bouquets, onAdd, onRemove }: Props) {
  if (bouquets.length === 0) {
    return (
      <aside className={styles.panel}>
        <div className={styles.emptyBox}>
          <p className={styles.emptyTitle}>Alege buchete</p>
          <p className={styles.empty}>
            Apasă pe produse din catalog — fiecare rămâne aici jos cu detaliile.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <div className={styles.stack}>
      {bouquets.map((bouquet) => (
        <aside key={bouquet.id} className={styles.panel}>
          <div className={styles.top}>
            <div className={styles.photo}>
              <BouquetImage src={bouquet.image} alt={bouquet.name} />
            </div>
            <header className={styles.header}>
              <div className={styles.headerRow}>
                <p className={styles.badge}>Detalii</p>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => onRemove(bouquet.id)}
                  aria-label={`Scoate ${bouquet.name} din detalii`}
                >
                  ×
                </button>
              </div>
              <h2 className={styles.title}>{bouquet.name}</h2>
              <p className={styles.price}>{formatEuro(bouquet.price)}</p>
            </header>
          </div>

          <section className={styles.section}>
            <h3>Ingrediente</h3>
            <ul>
              {bouquet.ingredients.map((item) => (
                <li key={`${item.name}|${item.unit}|${item.quantity}`}>
                  {formatIngredient(item)}
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            className={styles.addBtn}
            onClick={() => onAdd(bouquet)}
          >
            Adaugă în coș — {formatEuro(bouquet.price)}
          </button>
        </aside>
      ))}
    </div>
  );
}
