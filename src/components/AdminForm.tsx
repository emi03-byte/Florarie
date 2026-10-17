import { useEffect, useState, type FormEvent } from 'react';
import type { Bouquet, Ingredient } from '../types';
import { createId } from '../lib/id';
import { formatEuro } from '../lib/money';
import { BouquetImage } from './BouquetImage';
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
      name: existing.name,
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

  function updateIngredient(index: number, patch: Partial<IngredientRow>) {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    const price = Number(form.price.replace(',', '.'));
    const image = form.image.trim() || '/bouquets/placeholder.svg';
    const recipe = form.recipe.trim();

    const ingredients: Ingredient[] = [];
    for (const row of form.ingredients) {
      const ingName = row.name.trim();
      const quantity = Number(row.quantity.replace(',', '.'));
      if (!ingName && !row.quantity.trim()) continue;
      if (!ingName || !Number.isFinite(quantity) || quantity <= 0) {
        setError('Cada ingrediente debe tener nombre y cantidad válidos.');
        return;
      }
      ingredients.push({ name: ingName, quantity, unit: 'uds' });
    }

    if (!name) {
      setError('Completa el nombre del centro.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('El precio debe ser un número válido.');
      return;
    }
    if (!recipe) {
      setError('Completa la receta / pasos de elaboración.');
      return;
    }
    if (ingredients.length === 0) {
      setError('Añade al menos un ingrediente.');
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

    setEditingId(null);
    setForm(createEmptyForm());
  }

  return (
    <div className={styles.layout}>
      <section className={styles.panel}>
        <header className={styles.panelHead}>
          <div className={styles.headText}>
            <h2>{editingId ? 'Editar centro' : 'Añadir centro'}</h2>
            <p className={styles.hint}>
              Aquí gestionas el catálogo: nombre, precio, foto, ingredientes y receta.
            </p>
          </div>
          <p className={styles.summary}>{bouquets.length} en el catálogo</p>
        </header>

        <form className={`${styles.form} ${styles.panelScroll}`} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.caption}>Nombre</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ej. Centro redondo — Clavel rosa"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.caption}>Precio (€)</span>
            <input
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              inputMode="decimal"
              placeholder="ej. 33"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.caption}>Foto (ruta o URL)</span>
            <input
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="/bouquets/centro-redondo-rosa.jpg"
            />
          </label>
          {form.image ? (
            <div className={styles.preview}>
              <BouquetImage src={form.image} alt="Vista previa" />
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
                aria-label="Cantidad"
              />
              <input
                value={row.name}
                onChange={(e) => updateIngredient(index, { name: e.target.value })}
                placeholder="clavel rosa"
                aria-label="Nombre del material"
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
                  aria-label="Eliminar ingrediente"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.ingAdd}
              onClick={() =>
                setForm((f) => ({ ...f, ingredients: [...f.ingredients, emptyIngredient()] }))
              }
            >
              + Añadir ingrediente
            </button>
          </div>

          <label className={styles.field}>
            <span className={styles.caption}>Cómo se elabora</span>
            <textarea
              rows={4}
              value={form.recipe}
              onChange={(e) => setForm((f) => ({ ...f, recipe: e.target.value }))}
              placeholder="Pasos de elaboración..."
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.formActions}>
            <button type="submit" className={styles.save}>
              {editingId ? 'Guardar' : 'Añadir al catálogo'}
            </button>
            {editingId ? (
              <button
                type="button"
                className={styles.cancel}
                onClick={() => {
                  setEditingId(null);
                  setForm(createEmptyForm());
                  setError('');
                }}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <aside className={styles.panel}>
        <header className={styles.panelHead}>
          <h2>Catálogo</h2>
          <p className={styles.summary}>{bouquets.length} tipos</p>
        </header>

        <div className={styles.panelScroll}>
          {bouquets.length === 0 ? (
            <p className={styles.empty}>Aún no hay centros en el catálogo.</p>
          ) : (
            <ul className={styles.list}>
              {bouquets.map((bouquet) => (
                <li
                  key={bouquet.id}
                  className={`${styles.item}${editingId === bouquet.id ? ` ${styles.itemActive}` : ''}`}
                >
                  <div className={styles.itemThumb}>
                    <BouquetImage src={bouquet.image} alt={bouquet.name} />
                  </div>
                  <p className={styles.itemName}>{bouquet.name}</p>
                  <span className={styles.itemPrice}>{formatEuro(bouquet.price)}</span>
                  <div className={styles.itemActions}>
                    <button type="button" onClick={() => setEditingId(bouquet.id)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className={styles.delete}
                      onClick={() => {
                        if (window.confirm(`¿Eliminar «${bouquet.name}»?`)) {
                          onDelete(bouquet.id);
                          if (editingId === bouquet.id) setEditingId(null);
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
