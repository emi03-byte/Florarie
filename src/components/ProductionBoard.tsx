import { useMemo, useState } from 'react';
import type { Bouquet, Order } from '../types';
import { aggregateBouquetsToMake, aggregateMaterialsNeeded } from '../lib/materials';
import type { BouquetToMake } from '../lib/materials';
import { downloadProductionList } from '../lib/productionDownload';
import { useRevealOnScroll } from '../lib/useRevealOnScroll';
import { BouquetImage } from './BouquetImage';
import { ConfirmDialog } from './ConfirmDialog';
import { QuantityDialog } from './QuantityDialog';
import styles from './ProductionBoard.module.css';

type Props = {
  orders: Order[];
  catalog: Bouquet[];
  onMarkMade: (bouquetId: string, count: number) => Promise<void>;
  onAddToMake: (bouquetId: string, count: number) => Promise<void>;
  onToast?: (message: string) => void;
};

type ModelGroup = {
  model: string;
  remaining: number;
  made: number;
  ordered: number;
  items: Array<BouquetToMake & { variant: string }>;
};

type ConfirmAsk = {
  bouquetId: string;
  variant: string;
  count: number;
  mode: 'partial' | 'all';
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
      items: [...group.items].sort((a, b) => a.variant.localeCompare(b.variant, 'ro')),
    }))
    .sort((a, b) => a.model.localeCompare(b.model, 'ro'));
}

function takeVisibleGroups(groups: ModelGroup[], visibleCount: number): ModelGroup[] {
  let left = visibleCount;
  const out: ModelGroup[] = [];
  for (const group of groups) {
    if (left <= 0) break;
    const items = group.items.slice(0, left);
    left -= items.length;
    out.push({
      ...group,
      items,
      remaining: items.reduce((s, i) => s + i.remaining, 0),
      made: items.reduce((s, i) => s + i.made, 0),
      ordered: items.reduce((s, i) => s + i.ordered, 0),
    });
  }
  return out;
}

export function ProductionBoard({
  orders,
  catalog,
  onMarkMade,
  onAddToMake,
  onToast,
}: Props) {
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

  const resetKey = bouquets.map((b) => b.bouquetId).join('|');
  const { visibleCount, sentinelRef, hasMore } = useRevealOnScroll(
    bouquets.length,
    resetKey,
  );
  const visibleGroups = useMemo(
    () => takeVisibleGroups(groups, visibleCount),
    [groups, visibleCount],
  );

  const [markAmounts, setMarkAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [addAsk, setAddAsk] = useState<BouquetToMake | null>(null);
  const [confirmAsk, setConfirmAsk] = useState<ConfirmAsk | null>(null);

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

  async function markMade(bouquetId: string, count: number, variant: string) {
    if (count <= 0) return;
    setError('');
    setBusyId(bouquetId);
    try {
      await onMarkMade(bouquetId, count);
      setMarkAmounts((prev) => ({ ...prev, [bouquetId]: '1' }));
      onToast?.(
        count === 1
          ? `Marcat ca făcut: ${variant}`
          : `Marcate ca făcute: ${count} × ${variant}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut marca buchetul');
    } finally {
      setBusyId(null);
    }
  }

  async function addToMake(bouquetId: string, count: number, name: string) {
    if (count <= 0) return;
    setError('');
    setBusyId(bouquetId);
    try {
      await onAddToMake(bouquetId, count);
      onToast?.(
        count === 1
          ? `Adăugat 1 la De făcut: ${name}`
          : `Adăugat ${count} la De făcut: ${name}`,
      );
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
            <div className={styles.headActions}>
              {bouquets.length > 0 ? (
                <p className={styles.summary}>
                  <strong>{totalRemaining}</strong> de făcut · {bouquets.length} tipuri
                </p>
              ) : null}
              <button
                type="button"
                className={styles.downloadBtn}
                disabled={bouquets.length === 0 && materials.length === 0}
                aria-label="Descarcă pentru print"
                title="Descarcă pentru print"
                onClick={() => downloadProductionList(bouquets, materials)}
              >
                <svg
                  className={styles.downloadIcon}
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="currentColor"
                    d="M6 9V3h12v6h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4H6v-4H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zm2 0h8V5H8zm0 10v2h8v-2zm-2-2h12v-4H6z"
                  />
                </svg>
              </button>
            </div>
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
              {visibleGroups.map((group) => (
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
                          <div className={styles.variantLabel}>
                            <p className={styles.variantName}>{row.variant}</p>
                            <span
                              className={styles.remainBadge}
                              title={`Făcute ${row.made} din ${row.ordered}`}
                            >
                              {row.remaining}
                            </span>
                          </div>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.btnAdd}
                              disabled={busy}
                              title="Adaugă la de făcut"
                              onClick={() => setAddAsk(row)}
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
                              onClick={() =>
                                setConfirmAsk({
                                  bouquetId: row.bouquetId,
                                  variant: row.variant,
                                  count: amount,
                                  mode: 'partial',
                                })
                              }
                            >
                              Am făcut
                            </button>
                            <button
                              type="button"
                              className={styles.btnAll}
                              disabled={!canMark || busy}
                              title={`Marchează toate cele ${row.remaining} rămase ca făcute`}
                              onClick={() =>
                                setConfirmAsk({
                                  bouquetId: row.bouquetId,
                                  variant: row.variant,
                                  count: row.remaining,
                                  mode: 'all',
                                })
                              }
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
              {hasMore ? (
                <div
                  ref={sentinelRef}
                  className={styles.revealSentinel}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          )}
        </div>
      </section>

      {addAsk ? (
        <QuantityDialog
          bouquet={{
            id: addAsk.bouquetId,
            name: addAsk.name,
            price: 0,
            image: addAsk.image,
            recipe: '',
            ingredients: [],
          }}
          showPrice={false}
          confirmLabel={(qty) =>
            qty === 1 ? 'Adaugă 1 la De făcut' : `Adaugă ${qty} la De făcut`
          }
          onCancel={() => setAddAsk(null)}
          onConfirm={(quantity) => {
            const target = addAsk;
            setAddAsk(null);
            void addToMake(target.bouquetId, quantity, target.name);
          }}
        />
      ) : null}

      {confirmAsk ? (
        <ConfirmDialog
          title="Confirmare"
          message={
            confirmAsk.mode === 'all'
              ? `Marchezi toate cele ${confirmAsk.count} rămase (${confirmAsk.variant})?`
              : confirmAsk.count === 1
                ? `Marchezi 1 × ${confirmAsk.variant} ca făcute?`
                : `Marchezi ${confirmAsk.count} × ${confirmAsk.variant} ca făcute?`
          }
          confirmLabel="Da, confirm"
          onCancel={() => setConfirmAsk(null)}
          onConfirm={() => {
            const target = confirmAsk;
            setConfirmAsk(null);
            void markMade(target.bouquetId, target.count, target.variant);
          }}
        />
      ) : null}

      <aside className={`${styles.panel} ${styles.materialsPanel}`}>
        <header className={styles.panelHead}>
          <h2>Materiales</h2>
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
