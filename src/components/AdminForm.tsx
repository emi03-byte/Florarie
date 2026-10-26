import { useEffect, useState, type FormEvent } from 'react';
import type { Bouquet, Ingredient } from '../types';
import { formatBouquetDisplayName } from '../lib/bouquetName';
import { createId } from '../lib/id';
import { formatEuro } from '../lib/money';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';
import { useRevealOnScroll } from '../lib/useRevealOnScroll';
import { BouquetImage } from './BouquetImage';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './AdminForm.module.css';

type Props = {
  bouquets: Bouquet[];
  onSave: (bouquet: Bouquet) => void;
  onDelete: (id: string) => void;
};

type IngredientRow = {
  name: string;
  quantity: string;
};

const emptyIngredient = (): IngredientRow => ({
  name: '',
  quantity: '1',
});

function createEmptyForm() {
  return {
    name: '',
    price: '',
    image: '',
    recipe: '',
    ingredients: [emptyIngredient()],
  };
}

export function AdminForm({ bouquets, onSave, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(createEmptyForm);
  const [error, setError] = useState('');
  const [deleteAsk, setDeleteAsk] = useState<Bouquet | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [isPhone, setIsPhone] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 900px)').matches,
  );
  const resetKey = bouquets.map((b) => b.id).join('|');
  const { visibleCount, sentinelRef, hasMore } = useRevealOnScroll(
    bouquets.length,
    resetKey,
  );
  const visibleBouquets = bouquets.slice(0, visibleCount);

  useEffect(() => {
    if (!editingId) {
      setForm(createEmptyForm());
      return;
    }
    const existing = bouquets.find((b) => b.id === editingId);
    if (!existing) {
      setEditingId(null);
      return;
    }
    setForm({
      name: formatBouquetDisplayName(existing.name),
      price: String(existing.price),
      image: existing.image,
      recipe: existing.recipe,
      ingredients:
        existing.ingredients.length > 0
          ? existing.ingredients.map((ing) => ({
              name: ing.name,
              quantity: String(ing.quantity),
            }))
          : [emptyIngredient()],
    });
  }, [editingId, bouquets]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    function onChange() {
      setIsPhone(mq.matches);
      if (!mq.matches) setCatalogOpen(false);
    }
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useBodyScrollLock(catalogOpen);

  useEffect(() => {
    if (!catalogOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setCatalogOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [catalogOpen]);

  function updateIngredient(index: number, patch: Partial<IngredientRow>) {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(createEmptyForm());
    setError('');
  }

  function openEdit(id: string) {
    setEditingId(id);
    setError('');
    setCatalogOpen(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const name = formatBouquetDisplayName(form.name);
    const price = Number(form.price.replace(',', '.'));
    const image = form.image.trim() || '/bouquets/placeholder.svg';
    const recipe = form.recipe.trim();

    const ingredients: Ingredient[] = [];
    for (const row of form.ingredients) {
      const ingName = row.name.trim();
      const quantity = Number(row.quantity.replace(',', '.'));
      if (!ingName && !row.quantity.trim()) continue;
      if (!ingName || !Number.isFinite(quantity) || quantity <= 0) {
        setError('Fiecare ingredient trebuie să aibă denumire și cantitate validă.');
        return;
      }
      ingredients.push({ name: ingName, quantity, unit: 'uds' });
    }

    if (!name) {
      setError('Completează denumirea buchetului.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Prețul trebuie să fie un număr valid.');
      return;
    }
    if (ingredients.length === 0) {
      setError('Adaugă cel puțin un ingredient.');
      return;
    }

    onSave({
      id: editingId ?? createId('buc'),
      name,
      price,
      image,
      recipe,
      ingredients,
    });

    resetForm();
  }

  return (
    <div className={styles.layout}>
      <section className={styles.panel}>
        <header className={styles.panelHead}>
          <div className={styles.headRow}>
            <h2>{editingId ? 'Editează aranjament' : 'Adaugă aranjament'}</h2>
            <p className={styles.summary}>
              <strong>{bouquets.length}</strong> în catalog
            </p>
          </div>
        </header>

        <form className={`${styles.form} ${styles.panelScroll}`} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.caption}>Denumire</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ej. Centro redondo — Clavel rosa"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.caption}>Preț (€)</span>
            <input
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              inputMode="decimal"
              placeholder="ej. 33"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.caption}>Poză (cale sau URL)</span>
            <input
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="/bouquets/centro-redondo-rosa.jpg"
            />
          </label>
          {form.image ? (
            <div className={styles.preview}>
              <BouquetImage src={form.image} alt="Previzualizare" />
            </div>
          ) : null}

          <div className={styles.ingBlock}>
            <p className={styles.ingLabel}>Ingredientes</p>
            {form.ingredients.map((row, index) => (
              <div key={index} className={styles.ingRow}>
                <input
                  value={row.quantity}
                  onChange={(e) => updateIngredient(index, { quantity: e.target.value })}
                  placeholder="11"
                  inputMode="decimal"
                  aria-label="Cantitate"
                />
                <input
                  value={row.name}
                  onChange={(e) => updateIngredient(index, { name: e.target.value })}
                  placeholder="clavel rosa"
                  aria-label="Denumire material"
                />
                <button
                  type="button"
                  className={styles.ingRemove}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      ingredients:
                        f.ingredients.length > 1
                          ? f.ingredients.filter((_, i) => i !== index)
                          : [emptyIngredient()],
                    }))
                  }
                  aria-label="Șterge ingredient"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.ingAdd}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  ingredients: [...f.ingredients, emptyIngredient()],
                }))
              }
            >
              + Adaugă ingredient
            </button>
          </div>

          <label className={styles.field}>
            <span className={styles.caption}>Cum se realizează (opțional)</span>
            <textarea
              rows={4}
              value={form.recipe}
              onChange={(e) => setForm((f) => ({ ...f, recipe: e.target.value }))}
              placeholder="Pașii de realizare (opțional)..."
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.formActions}>
            <button type="submit" className={styles.save}>
              {editingId ? 'Salvează' : 'Adaugă în catalog'}
            </button>
            {editingId ? (
              <button type="button" className={styles.cancel} onClick={resetForm}>
                Anulează
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <aside className={`${styles.panel} ${styles.catalogDesktop}`}>
        <header className={styles.panelHead}>
          <div className={styles.headRow}>
            <h2>Catalog</h2>
            <p className={styles.summary}>
              <strong>{bouquets.length}</strong> tipuri
            </p>
          </div>
        </header>
        <div className={styles.panelScroll}>
          {bouquets.length === 0 ? (
            <p className={styles.empty}>Nu ai încă buchete în catalog.</p>
          ) : (
            <ul className={styles.list}>
              {visibleBouquets.map((bouquet) => (
                <li
                  key={bouquet.id}
                  className={`${styles.item}${editingId === bouquet.id ? ` ${styles.itemActive}` : ''}`}
                >
                  <div className={styles.itemThumb}>
                    <BouquetImage src={bouquet.image} alt={bouquet.name} />
                  </div>
                  <span className={styles.itemName}>
                    {formatBouquetDisplayName(bouquet.name)}
                    <span className={styles.priceInline}> · {formatEuro(bouquet.price)}</span>
                  </span>
                  <div className={styles.itemActions}>
                    <button type="button" onClick={() => openEdit(bouquet.id)}>
                      Editează
                    </button>
                    <button
                      type="button"
                      className={styles.delete}
                      onClick={() => setDeleteAsk(bouquet)}
                    >
                      Șterge
                    </button>
                  </div>
                </li>
              ))}
              {hasMore && !isPhone ? (
                <li className={styles.revealSentinel} aria-hidden="true">
                  <div ref={sentinelRef} />
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </aside>

      <button
        type="button"
        className={`${styles.formBackdrop}${catalogOpen ? ` ${styles.formBackdropOpen}` : ''}`}
        tabIndex={catalogOpen ? 0 : -1}
        aria-label="Coboară catalogul"
        aria-hidden={!catalogOpen}
        onClick={() => setCatalogOpen(false)}
      />

      <aside
        id="admin-catalog-sheet"
        className={`${styles.formSheet}${catalogOpen ? ` ${styles.formSheetOpen}` : ''}`}
        role="dialog"
        aria-modal={catalogOpen}
        aria-label="Catalog"
      >
        <button
          type="button"
          className={styles.formPull}
          aria-expanded={catalogOpen}
          aria-controls="admin-catalog-sheet"
          aria-label={catalogOpen ? 'Coboară catalogul' : 'Deschide catalogul'}
          onClick={() => setCatalogOpen((open) => !open)}
        >
          <span className={styles.formArrow} aria-hidden="true">
            {catalogOpen ? (
              <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
                <path
                  fill="currentColor"
                  d="M12 16.5 18.5 10a1 1 0 0 0-1.4-1.4L12 13.7 6.9 8.6A1 1 0 0 0 5.5 10z"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
                <path
                  fill="currentColor"
                  d="M12 7.5 5.5 14a1 1 0 0 0 1.4 1.4L12 10.3l5.1 5.1a1 1 0 0 0 1.4-1.4z"
                />
              </svg>
            )}
          </span>
          <span className={styles.formPullLabel}>
            Catalog
            {bouquets.length > 0 ? (
              <span className={styles.formPullCount}>{bouquets.length}</span>
            ) : null}
          </span>
        </button>

        <div className={styles.catalogSheetBody}>
          {bouquets.length === 0 ? (
            <p className={styles.empty}>Nu ai încă buchete în catalog.</p>
          ) : (
            <ul className={styles.list}>
              {visibleBouquets.map((bouquet) => (
                <li
                  key={`sheet-${bouquet.id}`}
                  className={`${styles.item}${editingId === bouquet.id ? ` ${styles.itemActive}` : ''}`}
                >
                  <div className={styles.itemThumb}>
                    <BouquetImage src={bouquet.image} alt={bouquet.name} />
                  </div>
                  <span className={styles.itemName}>
                    {formatBouquetDisplayName(bouquet.name)}
                    <span className={styles.priceInline}> · {formatEuro(bouquet.price)}</span>
                  </span>
                  <div className={styles.itemActions}>
                    <button type="button" onClick={() => openEdit(bouquet.id)}>
                      Editează
                    </button>
                    <button
                      type="button"
                      className={styles.delete}
                      onClick={() => setDeleteAsk(bouquet)}
                    >
                      Șterge
                    </button>
                  </div>
                </li>
              ))}
              {hasMore && isPhone ? (
                <li className={styles.revealSentinel} aria-hidden="true">
                  <div ref={sentinelRef} />
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </aside>

      {deleteAsk ? (
        <ConfirmDialog
          title="Ștergere produs"
          message={`Ești sigur că vrei să ștergi „${deleteAsk.name}”?`}
          confirmLabel="Șterge"
          cancelLabel="Anulează"
          danger
          onCancel={() => setDeleteAsk(null)}
          onConfirm={() => {
            const id = deleteAsk.id;
            onDelete(id);
            if (editingId === id) resetForm();
            setDeleteAsk(null);
          }}
        />
      ) : null}
    </div>
  );
}
