import type { Bouquet } from '../types';
import { formatEuro } from '../lib/money';
import { formatIngredient } from '../lib/ingredients';
import { BouquetImage } from './BouquetImage';
import styles from './BouquetDetail.module.css';

type Props = {
  bouquet: Bouquet | null;
  onAdd: (bouquet: Bouquet) => void;
};

export function BouquetDetail({ bouquet, onAdd }: Props) {
  if (!bouquet) {
    return (
      <aside className={styles.panel}>
        <div className={styles.emptyBox}>
          <p className={styles.emptyTitle}>Alege un buchet</p>
          <p className={styles.empty}>
            Apasă pe o poză din catalog ca să vezi ingredientele și pașii de realizare.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.top}>
        <div className={styles.photo}>
          <BouquetImage src={bouquet.image} alt={bouquet.name} />
        </div>
        <header className={styles.header}>
          <p className={styles.badge}>Detalii pentru vânzător</p>
          <h2 className={styles.title}>{bouquet.name}</h2>
          <p className={styles.price}>{formatEuro(bouquet.price)}</p>
        </header>
      </div>

      <section className={styles.section}>
        <h3>Ce trebuie (ingrediente)</h3>
        <ul>
          {bouquet.ingredients.map((item) => (
            <li key={`${item.name}|${item.unit}|${item.quantity}`}>
              {formatIngredient(item)}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h3>Cum se realizează</h3>
        <p className={styles.recipe}>{bouquet.recipe}</p>
      </section>

      <button type="button" className={styles.addBtn} onClick={() => onAdd(bouquet)}>
        Adaugă în coș — {formatEuro(bouquet.price)}
      </button>
    </aside>
  );
}
