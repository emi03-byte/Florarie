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
  onAddToMake: (bouquetId: string, count: number) => Promise<void>;
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

export function ProductionBoard({ orders, catalog, onMarkMade, onAddToMake }: Props) {
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

  const [markAmounts, setMarkAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function getAmount(bouquetId: string, remaining: number): number {
    if (remaining <= 0) return 1;
    const raw = markAmounts[bouquetId];
    const n = raw === undefined ? 1 : Number(raw);
    if (!Number.isFinite(n)) return 1;
    return Math.min(Math.max(1, Math.floor(n)), remaining);
  }

  function setAmount(bouquetId: string, value: number, remaining: number) {
    if (remaining <= 0) return;
    const next = Math.min(Math.max(1, value), remaining);
    setMarkAmounts((prev) => ({ ...prev, [bouquetId]: String(next) }));
  }

  async function markMade(bouquetId: string, count: number) {
    if (count <= 0) return;
    setError('');
    setBusyId(bouquetId);
    try {
      await onMarkMade(bouquetId, count);
      setMarkAmounts((prev) => ({ ...prev, [bouquetId]: '1' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut marca buchetul');
    } finally {
      setBusyId(null);
    }
  }

  async function addToMake(bouquetId: string, count: number) {
    if (count <= 0) return;
    setError('');
    setBusyId(bouquetId);
    try {
      await onAddToMake(bouquetId, count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut adăuga');
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

        <div className={styles.panelScroll}>
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
                      <span className={styles.groupBadge} title="Rămase de făcut">
                        {group.remaining}
                      </span>
                      <span className={styles.groupProgress} title="Făcute din total">
                        <span className={styles.metaMade}>{group.made}</span>
                        <span className={styles.metaSep}>/</span>
                        <span className={styles.metaTotal}>{group.ordered}</span>
                      </span>
                    </div>
                  </header>
                  <ul className={styles.variantList}>
                    {group.items.map((row) => {
                      const busy = busyId === row.bouquetId;
                      const amount = getAmount(row.bouquetId, row.remaining);
                      const canMark = row.remaining > 0;
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
                              className={styles.btnAdd}
                              disabled={busy}
                              title="Adaugă încă 1 la de făcut"
                              onClick={() => addToMake(row.bouquetId, 1)}
                            >
                              + Adaugă
                            </button>
                            <div className={styles.qtyGroup}>
                              <button
                                type="button"
                                className={styles.btnIcon}
                                disabled={!canMark || busy || amount <= 1}
                                aria-label="Scade cantitatea făcută"
                                onClick={() =>
                                  setAmount(row.bouquetId, amount - 1, row.remaining)
                                }
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={Math.max(1, row.remaining)}
                                value={markAmounts[row.bouquetId] ?? '1'}
                                disabled={!canMark || busy}
                                aria-label={`Câte ${row.variant} am făcut`}
                                onChange={(e) =>
                                  setMarkAmounts((prev) => ({
                                    ...prev,
                                    [row.bouquetId]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                className={styles.btnIcon}
                                disabled={!canMark || busy || amount >= row.remaining}
                                aria-label="Crește cantitatea făcută"
                                onClick={() =>
                                  setAmount(row.bouquetId, amount + 1, row.remaining)
                                }
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className={styles.btnConfirm}
                              disabled={!canMark || busy}
                              onClick={() => markMade(row.bouquetId, amount)}
                            >
                              Am făcut
                            </button>
                            <button
                              type="button"
                              className={styles.btnAll}
                              disabled={!canMark || busy}
                              title={`Marchează toate cele ${row.remaining} rămase ca făcute`}
                              onClick={() => markMade(row.bouquetId, row.remaining)}
                            >
                              Am făcut toate
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
        </div>
      </section>

      <aside className={`${styles.panel} ${styles.materialsPanel}`}>
        <header className={styles.panelHead}>
          <h2>Materiale</h2>
        </header>

        <div className={styles.panelScroll}>
          {materials.length === 0 ? (
            <p className={styles.empty}>Nu ai materiale de pregătit momentan.</p>
          ) : (
            <ul className={styles.materialList}>
              {materials.map((row) => (
                <li key={`${row.name}|${row.unit}`} className={styles.materialChip}>
                  <span className={styles.materialName}>{row.name}</span>
                  <span className={styles.materialQty}>{row.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
