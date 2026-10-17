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
  unit: string;
};

const emptyIngredient = (): IngredientRow => ({
  name: '',
  quantity: '1',
  unit: 'fire',
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
              unit: ing.unit,
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
      const unit = row.unit.trim() || 'buc';
      const quantity = Number(row.quantity.replace(',', '.'));
      if (!ingName && !row.quantity.trim()) continue;
      if (!ingName || !Number.isFinite(quantity) || quantity <= 0) {
        setError('Fiecare ingredient trebuie să aibă denumire și cantitate validă.');
        return;
      }
      ingredients.push({ name: ingName, quantity, unit });
    }

    if (!name) {
      setError('Completează denumirea buchetului.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Prețul trebuie să fie un număr valid.');
      return;
    }
    if (!recipe) {
      setError('Adaugă detaliile de realizare.');
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

    setEditingId(null);
    setForm(createEmptyForm());
  }

  return (
    <div className={styles.layout}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>{editingId ? 'Editează buchet' : 'Adaugă buchet'}</h2>

        <label>
          Denumire
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="ex. Buchet Trandafiri"
          />
        </label>

        <label>
          Preț (€)
          <input
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            inputMode="decimal"
            placeholder="ex. 150"
          />
        </label>

        <label>
          Poză (cale sau URL)
          <input
            value={form.image}
            onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
            placeholder="/bouquets/trandafiri-rosii.jpg"
          />
        </label>
        {form.image ? (
          <div className={styles.preview}>
            <BouquetImage src={form.image} alt="Previzualizare" />
          </div>
        ) : null}

        <div className={styles.ingBlock}>
          <p className={styles.ingLabel}>Ingrediente (cantitate + unitate + denumire)</p>
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
                value={row.unit}
                onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                placeholder="fire"
                aria-label="Unitate"
              />
              <input
                value={row.name}
                onChange={(e) => updateIngredient(index, { name: e.target.value })}
                placeholder="trandafiri roșii"
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
              setForm((f) => ({ ...f, ingredients: [...f.ingredients, emptyIngredient()] }))
            }
          >
            + Adaugă ingredient
          </button>
        </div>

        <label>
          Cum se realizează
          <textarea
            rows={5}
            value={form.recipe}
            onChange={(e) => setForm((f) => ({ ...f, recipe: e.target.value }))}
            placeholder="Pașii de realizare pentru vânzător..."
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.formActions}>
          <button type="submit" className={styles.save}>
            {editingId ? 'Salvează modificările' : 'Adaugă în catalog'}
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
              Anulează
            </button>
          ) : null}
        </div>
      </form>

      <div className={styles.listWrap}>
        <h2>Catalog ({bouquets.length})</h2>
        <ul className={styles.list}>
          {bouquets.map((bouquet) => (
            <li key={bouquet.id} className={styles.item}>
              <div className={styles.itemMain}>
                <div className={styles.itemThumb}>
                  <BouquetImage src={bouquet.image} alt={bouquet.name} />
                </div>
                <div>
                  <p className={styles.itemName}>{bouquet.name}</p>
                  <p className={styles.itemPrice}>{formatEuro(bouquet.price)}</p>
                </div>
              </div>
              <div className={styles.itemActions}>
                <button type="button" onClick={() => setEditingId(bouquet.id)}>
                  Editează
                </button>
                <button
                  type="button"
                  className={styles.delete}
                  onClick={() => {
                    if (window.confirm(`Ștergi „${bouquet.name}”?`)) {
                      onDelete(bouquet.id);
                      if (editingId === bouquet.id) setEditingId(null);
                    }
                  }}
                >
                  Șterge
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
