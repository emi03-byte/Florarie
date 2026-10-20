import type { Ingredient } from '../types';

/** Best-effort parse for legacy free-text lines like "11 rosas rojas". */
export function parseIngredientLine(line: string): Ingredient {
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d+[.,]?\d*)\s+(.+)$/);
  if (match) {
    const quantity = Number(match[1].replace(',', '.'));
    const rest = match[2].trim();
    const unitMatch = rest.match(
      /^(uds|tallos|ramas|frunze|buc|set|manojo|manojos|fire|crenguțe|crengute|bucăți|bucati|legătură|legatura|legături|legaturi)\s+(.+)$/i,
    );
    if (unitMatch) {
      return {
        quantity: Number.isFinite(quantity) ? quantity : 1,
        unit: unitMatch[1].toLowerCase(),
        name: unitMatch[2].trim(),
      };
    }
    return {
      quantity: Number.isFinite(quantity) ? quantity : 1,
      unit: 'uds',
      name: rest,
    };
  }
  return { quantity: 1, unit: 'uds', name: trimmed || 'material' };
}

export function normalizeIngredient(raw: unknown): Ingredient | null {
  if (typeof raw === 'string') {
    return parseIngredientLine(raw);
  }
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<Ingredient>;
  const name = String(item.name ?? '').trim();
  const unit = String(item.unit ?? 'uds').trim() || 'uds';
  const quantity = Number(item.quantity);
  if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;
  return { name, unit, quantity };
}

export function formatIngredient(ingredient: Ingredient): string {
  // Quantity + name only — skip units like "fire" / "uds" in the UI.
  return `${ingredient.quantity} ${ingredient.name}`;
}

/** Flower stems that take feminine color adjectives in Spanish. */
const FEMININE_FLOWERS = new Set([
  'rosa',
  'rosas',
  'margarita',
  'margaritas',
  'gerbera',
  'gerberas',
  'astroemelia',
  'astroemelias',
  'alstroemeria',
  'alstroemerias',
]);

const FLOWER_BASE: Record<string, string> = {
  rosas: 'rosa',
  margaritas: 'margarita',
  claveles: 'clavel',
  gerberas: 'gerbera',
  astroemelias: 'astroemelia',
  alstroemerias: 'alstroemeria',
  liliums: 'lilium',
};

/** Color adjective → stem used only for matching (gender/number ignored). */
const COLOR_TO_STEM: Array<{ re: RegExp; stem: string }> = [
  { re: /^(blancos?|blancas?)$/i, stem: 'blanc' },
  { re: /^(rojos?|rojas?)$/i, stem: 'roj' },
  { re: /^(amarillos?|amarillas?)$/i, stem: 'amarill' },
  { re: /^(naranjas?)$/i, stem: 'naranja' },
  { re: /^(verdes?)$/i, stem: 'verd' },
  { re: /^(fucsias?)$/i, stem: 'fucsia' },
  { re: /^(jaspeados?|jaspeadas?)$/i, stem: 'jaspead' },
  { re: /^(rosas?)$/i, stem: 'rosa' },
];

function colorStem(word: string): string | null {
  for (const { re, stem } of COLOR_TO_STEM) {
    if (re.test(word)) return stem;
  }
  return null;
}

function flowerBase(word: string): string {
  const lower = word.toLowerCase();
  return FLOWER_BASE[lower] ?? lower;
}

/**
 * Key for totals: same flower + same color (any gender/number) merge.
 * e.g. "clavel blanco" and "clavel blanca" → same key.
 */
export function materialMatchKey(name: string, unit: string): string {
  const tokens = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return `|${unit.trim().toLowerCase()}`;
  }
  const base = flowerBase(tokens[0]);
  const rest = tokens.slice(1).map((t) => colorStem(t) ?? t).join(' ');
  return `${base}${rest ? ` ${rest}` : ''}|${unit.trim().toLowerCase()}`;
}

/** Prefer a single display form after merge (correct gender for the flower). */
export function canonicalMaterialName(name: string): string {
  const trimmed = name.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return trimmed;

  const flower = tokens[0];
  const base = flowerBase(flower);
  const feminine = FEMININE_FLOWERS.has(flower.toLowerCase()) || FEMININE_FLOWERS.has(base);
  const plural = /s$/i.test(flower) && !/^lilium$/i.test(flower);

  const agree = (word: string): string => {
    const stem = colorStem(word);
    if (!stem) return word;
    if (stem === 'naranja' || stem === 'fucsia') return stem; // invariable
    if (stem === 'rosa') return plural ? 'rosas' : 'rosa';
    if (stem === 'verd') return plural ? 'verdes' : 'verde';
    if (stem === 'blanc') {
      if (feminine) return plural ? 'blancas' : 'blanca';
      return plural ? 'blancos' : 'blanco';
    }
    if (stem === 'roj') {
      if (feminine) return plural ? 'rojas' : 'roja';
      return plural ? 'rojos' : 'rojo';
    }
    if (stem === 'amarill') {
      if (feminine) return plural ? 'amarillas' : 'amarilla';
      return plural ? 'amarillos' : 'amarillo';
    }
    if (stem === 'jaspead') {
      if (feminine) return plural ? 'jaspeadas' : 'jaspeada';
      return plural ? 'jaspeados' : 'jaspeado';
    }
    return word;
  };

  return [flower, ...tokens.slice(1).map(agree)].join(' ');
}

/** @deprecated Prefer materialMatchKey for totals (gender-insensitive). */
export function materialKey(name: string, unit: string): string {
  return materialMatchKey(name, unit);
}
