import { useMemo, useState } from 'react';
import type { Bouquet, Order } from '../types';
import { aggregateBouquetsToMake, aggregateMaterialsNeeded } from '../lib/materials';
import type { BouquetToMake } from '../lib/materials';
import { BouquetImage } from './BouquetImage';
import styles from './ProductionBoard.module.css';

type Props = {
  orders: Order[];
  catalog: Bouquet[];
  onMarkMade: (bouquetId: string, count: number) => Promise<void>;
};

type ModelGroup = {
  model: string;
  remaining: number;
  made: number;
  ordered: number;
  items: Array<BouquetToMake & { variant: string }>;
};

function parseName(name: string): { model: string; variant: string } {
  const sep = ' — ';
  const idx = name.indexOf(sep);
  if (idx === -1) return { model: name, variant: name };
  return {
    model: name.slice(0, idx).trim(),
    variant: name.slice(idx + sep.length).trim() || name,
  };
}

function groupByModel(rows: BouquetToMake[]): ModelGroup[] {
  const map = new Map<string, ModelGroup>();

  for (const row of rows) {
    const { model, variant } = parseName(row.name);
    const existing = map.get(model);
    if (existing) {
      existing.remaining += row.remaining;
      existing.made += row.made;
      existing.ordered += row.ordered;
      existing.items.push({ ...row, variant });
    } else {
      map.set(model, {
        model,
        remaining: row.remaining,
        made: row.made,
        ordered: row.ordered,
        items: [{ ...row, variant }],
      });
    }
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => a.variant.localeCompare(b.variant, 'es')),
    }))
    .sort((a, b) => a.model.localeCompare(b.model, 'es'));
}

export function ProductionBoard({ orders, catalog, onMarkMade }: Props) {
  const bouquets = useMemo(
    () => aggregateBouquetsToMake(orders, catalog),
    [orders, catalog],
  );
  const materials = useMemo(
    () => aggregateMaterialsNeeded(orders, catalog),
    [orders, catalog],
  );
  const groups = useMemo(() => groupByModel(bouquets), [bouquets]);
  const totalRemaining = useMemo(
    () => bouquets.reduce((sum, row) => sum + row.remaining, 0),
    [bouquets],
  );

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function markMade(bouquetId: string, count: number) {
    if (count <= 0) return;
    setError('');
    setBusyId(bouquetId);
    try {
      await onMarkMade(bouquetId, count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut marca buchetul');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.layout}>
      <section className={styles.panel}>
        <header className={styles.panelHead}>
          <div className={styles.headRow}>
            <h2>Buchete de făcut</h2>
            {bouquets.length > 0 ? (
              <p className={styles.summary}>
                <strong>{totalRemaining}</strong> de făcut · {bouquets.length} tipuri
              </p>
            ) : null}
          </div>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        {bouquets.length === 0 ? (
          <p className={styles.empty}>
            Nu ai buchete de făcut. Finalizează o comandă din Vânzare și revino aici.
          </p>
        ) : (
          <div className={styles.groups}>
            {groups.map((group) => (
              <article key={group.model} className={styles.group}>
                <header className={styles.groupHead}>
                  <h3 className={styles.groupTitle}>{group.model}</h3>
                  <div className={styles.groupMeta}>
                    <span className={styles.groupBadge}>{group.remaining}</span>
                    <span className={styles.groupProgress}>
                      {group.made}/{group.ordered}
                    </span>
                  </div>
                </header>
                <ul className={styles.variantList}>
                  {group.items.map((row) => {
                    const busy = busyId === row.bouquetId;
                    return (
                      <li key={row.bouquetId} className={styles.variantRow}>
                        <div className={styles.thumb}>
                          <BouquetImage src={row.image} alt={row.name} />
                        </div>
                        <p className={styles.variantName}>{row.variant}</p>
                        <span
                          className={styles.remainBadge}
                          title={`Făcute ${row.made} din ${row.ordered}`}
                        >
                          {row.remaining}
                        </span>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.btnSoft}
                            disabled={busy}
                            onClick={() => markMade(row.bouquetId, 1)}
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            className={styles.btnAll}
                            disabled={busy}
                            onClick={() => markMade(row.bouquetId, row.remaining)}
                          >
                            Toate
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className={`${styles.panel} ${styles.materialsPanel}`}>
        <header className={styles.panelHead}>
          <h2>Materiale</h2>
        </header>

        {materials.length === 0 ? (
          <p className={styles.empty}>Nu ai materiale de pregătit momentan.</p>
        ) : (
          <ul className={styles.materialList}>
            {materials.map((row) => (
              <li key={`${row.name}|${row.unit}`} className={styles.materialChip}>
                <span className={styles.materialName}>
                  {row.name}
                  <span className={styles.materialUnit}> · {row.unit}</span>
                </span>
                <span className={styles.materialQty}>{row.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
