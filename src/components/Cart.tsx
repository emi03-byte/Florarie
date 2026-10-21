import type { Bouquet, CartItem } from '../types';
import { formatIngredient } from '../lib/ingredients';
import { formatEuro } from '../lib/money';
import { BouquetImage } from './BouquetImage';
import styles from './Cart.module.css';

type Props = {
  items: CartItem[];
  catalog: Bouquet[];
  onRemove: (bouquetId: string) => void;
  onCheckout: () => void;
  onContinueShopping?: () => void;
};

export function Cart({
  items,
  catalog,
  onRemove,
  onCheckout,
  onContinueShopping,
}: Props) {
  const lines = items
    .map((item) => {
      const bouquet = catalog.find((b) => b.id === item.bouquetId);
      if (!bouquet) return null;
      return { item, bouquet, lineTotal: bouquet.price * item.quantity };
    })
    .filter(Boolean) as { item: CartItem; bouquet: Bouquet; lineTotal: number }[];

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const count = lines.reduce((sum, line) => sum + line.item.quantity, 0);

  return (
    <aside className={`${styles.cart} ${styles.cartPage}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Coș {count > 0 ? <span className={styles.count}>{count}</span> : null}
        </h2>
        {onContinueShopping ? (
          <button
            type="button"
            className={styles.continue}
            onClick={onContinueShopping}
          >
            Continuă cumpărăturile
          </button>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <p className={styles.empty}>
          Coșul e gol. Continuă cumpărăturile și adaugă buchete.
        </p>
      ) : (
        <ul className={styles.list}>
          {lines.map(({ item, bouquet, lineTotal }) => (
            <li key={item.bouquetId} className={styles.line}>
              <div className={styles.thumb}>
                <BouquetImage src={bouquet.image} alt={bouquet.name} />
              </div>
              <div className={styles.lineBody}>
                <div className={styles.lineTop}>
                  <span className={styles.name}>
                    {bouquet.name}
                    <span className={styles.qtyInline}> × {item.quantity}</span>
                  </span>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => onRemove(item.bouquetId)}
                    aria-label={`Elimină ${bouquet.name}`}
                  >
                    ×
                  </button>
                </div>
                <div className={styles.lineBottom}>
                  <p className={styles.needs}>
                    {bouquet.ingredients
                      .map((ing) =>
                        formatIngredient({
                          ...ing,
                          quantity: ing.quantity * item.quantity,
                        }),
                      )
                      .join(', ')}
                  </p>
                  <span className={styles.linePrice}>{formatEuro(lineTotal)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.footer}>
        <div className={styles.totalRow}>
          <span>Total de plată</span>
          <strong>{formatEuro(total)}</strong>
        </div>
        <button
          type="button"
          className={styles.checkout}
          disabled={lines.length === 0}
          onClick={onCheckout}
        >
          Finalizează comanda
        </button>
      </div>
    </aside>
  );
}
