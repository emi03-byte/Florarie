import type { Bouquet, CartItem } from '../types';
import { formatRon } from '../lib/money';
import { BouquetImage } from './BouquetImage';
import styles from './Cart.module.css';

type Props = {
  items: CartItem[];
  catalog: Bouquet[];
  onChangeQty: (bouquetId: string, quantity: number) => void;
  onRemove: (bouquetId: string) => void;
  onCheckout: () => void;
};

export function Cart({ items, catalog, onChangeQty, onRemove, onCheckout }: Props) {
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
    <aside className={styles.cart}>
      <h2 className={styles.title}>
        Coș {count > 0 ? <span className={styles.count}>{count}</span> : null}
      </h2>

      {lines.length === 0 ? (
        <p className={styles.empty}>
          Coșul e gol. Selectează un buchet și apasă „Adaugă în coș”.
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
                  <span className={styles.name}>{bouquet.name}</span>
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
                  <div className={styles.qty}>
                    <button
                      type="button"
                      onClick={() => onChangeQty(item.bouquetId, item.quantity - 1)}
                      aria-label="Scade cantitatea"
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onChangeQty(item.bouquetId, item.quantity + 1)}
                      aria-label="Crește cantitatea"
                    >
                      +
                    </button>
                  </div>
                  <span className={styles.linePrice}>{formatRon(lineTotal)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.footer}>
        <div className={styles.totalRow}>
          <span>Total de plată</span>
          <strong>{formatRon(total)}</strong>
        </div>
        <button
          type="button"
          className={styles.checkout}
          disabled={lines.length === 0}
          onClick={onCheckout}
        >
          Finalizează și scoate factura
        </button>
      </div>
    </aside>
  );
}
