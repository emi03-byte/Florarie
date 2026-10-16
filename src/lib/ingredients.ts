import type { Ingredient } from '../types';

/** Best-effort parse for legacy free-text lines like "11 trandafiri roșii". */
export function parseIngredientLine(line: string): Ingredient {
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d+[.,]?\d*)\s+(.+)$/);
  if (match) {
    const quantity = Number(match[1].replace(',', '.'));
    const rest = match[2].trim();
    const unitMatch = rest.match(/^(fire|crenguțe|crengute|frunze|buc|bucăți|bucati|set|legătură|legatura|legături|legaturi)\s+(.+)$/i);
    if (unitMatch) {
      return {
        quantity: Number.isFinite(quantity) ? quantity : 1,
        unit: unitMatch[1].toLowerCase(),
        name: unitMatch[2].trim(),
      };
    }
    return {
      quantity: Number.isFinite(quantity) ? quantity : 1,
      unit: 'buc',
      name: rest,
    };
  }
  return { quantity: 1, unit: 'buc', name: trimmed || 'material' };
}

export function normalizeIngredient(raw: unknown): Ingredient | null {
  if (typeof raw === 'string') {
    return parseIngredientLine(raw);
  }
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<Ingredient>;
  const name = String(item.name ?? '').trim();
  const unit = String(item.unit ?? 'buc').trim() || 'buc';
  const quantity = Number(item.quantity);
  if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;
  return { name, unit, quantity };
}

export function formatIngredient(ingredient: Ingredient): string {
  return `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`;
}

export function materialKey(name: string, unit: string): string {
  return `${name.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;
}
