import type { Bouquet, Ingredient } from './types.js';

export type CatalogItem = Bouquet & { makeQty: number };

function ing(name: string, quantity: number, unit = 'uds'): Ingredient {
  return { name, quantity, unit };
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseRecipe(recipe: string): Ingredient[] {
  return recipe
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
      if (!match) return ing(part, 1);
      const quantity = Number(match[1].replace(',', '.'));
      return ing(match[2].trim(), quantity);
    });
}

type CsvRow = {
  model: string;
  variant: string;
  makeQty: number;
  price: number;
  recipe: string;
};

/** Strict din catalogue-centre-flori.csv — nimic altceva. */
const CSV_ROWS: CsvRow[] = [
  { model: 'Centro redondo', variant: 'Clavel rosa', makeQty: 50, price: 33, recipe: '7 margaritas blancas; 10 clavel rosa; 1 lentisco; 0,5 chico; 4 paniculata' },
  { model: 'Centro redondo', variant: 'Clavel rojo', makeQty: 50, price: 33, recipe: '7 margaritas blancas; 10 clavel rojo; 1 lentisco; 0,5 chico; 4 paniculata' },
  { model: 'Centro redondo', variant: 'Clavel blanco', makeQty: 10, price: 33, recipe: '7 margaritas blancas; 10 clavel blanco; 1 lentisco; 0,5 chico; 4 paniculata' },
  { model: 'Centro redondo', variant: 'Clavel amarillo', makeQty: 10, price: 33, recipe: '7 margaritas blancas; 10 clavel amarillo; 1 lentisco; 0,5 chico; 4 paniculata' },
  { model: 'Centro redondo', variant: 'Clavel naranja', makeQty: 10, price: 33, recipe: '7 margaritas blancas; 10 clavel naranja; 1 lentisco; 0,5 chico; 4 paniculata' },
  { model: 'Centro redondo', variant: 'Clavel fucsia', makeQty: 10, price: 33, recipe: '7 margaritas blancas; 10 clavel fucsia; 1 lentisco; 0,5 chico; 4 paniculata' },
  { model: 'Centro redondo', variant: 'Clavel jaspeado', makeQty: 10, price: 33, recipe: '7 margaritas blancas; 10 clavel jaspeado; 1 lentisco; 0,5 chico; 4 paniculata' },
  { model: 'Centro de cara', variant: 'Clavel rosa', makeQty: 40, price: 33, recipe: '6 margarita blanca; 10 clavel rosa; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline' },
  { model: 'Centro de cara', variant: 'Clavel rojo', makeQty: 40, price: 33, recipe: '6 margarita blanca; 10 clavel rojo; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline' },
  { model: 'Centro de cara', variant: 'Clavel amarillo', makeQty: 5, price: 33, recipe: '6 margarita blanca; 10 clavel amarillo; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline' },
  { model: 'Centro de cara', variant: 'Clavel naranja', makeQty: 5, price: 33, recipe: '6 margarita blanca; 10 clavel naranja; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline' },
  { model: 'Centro de cara', variant: 'Clavel fucsia', makeQty: 5, price: 33, recipe: '6 margarita blanca; 10 clavel fucsia; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline' },
  { model: 'Centro de cara', variant: 'Clavel blanco', makeQty: 5, price: 33, recipe: '6 margarita blanca; 10 clavel blanco; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline' },
  { model: 'Centro redondo con gladiolo', variant: 'Clavel rosa', makeQty: 30, price: 39, recipe: '7 margaritas blancas; 10 clavel rosa; 1 lentisco; 0,5 chico; 4 paniculata; 3 gladiolo' },
  { model: 'Centro redondo con gladiolo', variant: 'Clavel rojo', makeQty: 30, price: 39, recipe: '7 margaritas blancas; 10 clavel rojo; 1 lentisco; 0,5 chico; 4 paniculata; 3 gladiolo' },
  { model: 'Centro redondo con gladiolo', variant: 'Clavel blanco', makeQty: 10, price: 39, recipe: '7 margaritas blancas; 10 clavel blanco; 1 lentisco; 0,5 chico; 4 paniculata; 3 gladiolo' },
  { model: 'Centro redondo con gladiolo', variant: 'Clavel amarillo', makeQty: 5, price: 39, recipe: '7 margaritas blancas; 10 clavel amarillo; 1 lentisco; 0,5 chico; 4 paniculata; 3 gladiolo' },
  { model: 'Centro redondo con gladiolo', variant: 'Clavel naranja', makeQty: 5, price: 39, recipe: '7 margaritas blancas; 10 clavel naranja; 1 lentisco; 0,5 chico; 4 paniculata; 3 gladiolo' },
  { model: 'Centro redondo con gladiolo', variant: 'Clavel fucsia', makeQty: 5, price: 39, recipe: '7 margaritas blancas; 10 clavel fucsia; 1 lentisco; 0,5 chico; 4 paniculata; 3 gladiolo' },
  { model: 'Centro redondo con gladiolo', variant: 'Clavel jaspeado', makeQty: 5, price: 39, recipe: '7 margaritas blancas; 10 clavel jaspeado; 1 lentisco; 0,5 chico; 4 paniculata; 3 gladiolo' },
  { model: 'Centro de cara con gladiolo', variant: 'Clavel rosa', makeQty: 50, price: 39, recipe: '6 margarita blanca; 10 clavel rosa; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline; 3 gladiolo' },
  { model: 'Centro de cara con gladiolo', variant: 'Clavel rojo', makeQty: 50, price: 39, recipe: '6 margarita blanca; 10 clavel rojo; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline; 3 gladiolo' },
  { model: 'Centro de cara con gladiolo', variant: 'Clavel blanco', makeQty: 20, price: 39, recipe: '6 margarita blanca; 10 clavel blanco; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline; 3 gladiolo' },
  { model: 'Centro de cara con gladiolo', variant: 'Clavel amarillo', makeQty: 5, price: 39, recipe: '6 margarita blanca; 10 clavel amarillo; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline; 3 gladiolo' },
  { model: 'Centro de cara con gladiolo', variant: 'Clavel naranja', makeQty: 5, price: 39, recipe: '6 margarita blanca; 10 clavel naranja; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline; 3 gladiolo' },
  { model: 'Centro de cara con gladiolo', variant: 'Clavel fucsia', makeQty: 5, price: 39, recipe: '6 margarita blanca; 10 clavel fucsia; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline; 3 gladiolo' },
  { model: 'Centro de cara con gladiolo', variant: 'Clavel jaspeado', makeQty: 5, price: 39, recipe: '6 margarita blanca; 10 clavel jaspeado; 1 lentisco; 0,5 chico; 4 paniculata; 3 cordeline; 3 gladiolo' },
  { model: 'Centro cara 12 rosas', variant: 'Rosas rojas', makeQty: 55, price: 46, recipe: '12 rosas rojas; 1 chico; 2 aspidistra; 4 paniculata; 3 cordeline' },
  { model: 'Centro cara 12 rosas', variant: 'Rosas blancas', makeQty: 45, price: 46, recipe: '12 rosas blancas; 1 chico; 2 aspidistra; 4 paniculata; 3 cordeline' },
  { model: 'Centro cara 12 rosas', variant: 'Rosas rosas', makeQty: 5, price: 46, recipe: '12 rosas rosas; 1 chico; 2 aspidistra; 4 paniculata; 3 cordeline' },
  { model: 'Centro cara 12 rosas', variant: 'Rosas fucsia', makeQty: 5, price: 46, recipe: '12 rosas fucsia; 1 chico; 2 aspidistra; 4 paniculata; 3 cordeline' },
  { model: 'Centro cara 12 rosas', variant: 'Rosas amarillas', makeQty: 5, price: 46, recipe: '12 rosas amarillas; 1 chico; 2 aspidistra; 4 paniculata; 3 cordeline' },
  { model: 'Centro cara 12 rosas', variant: 'Rosas naranjas', makeQty: 5, price: 46, recipe: '12 rosas naranjas; 1 chico; 2 aspidistra; 4 paniculata; 3 cordeline' },
  { model: 'Centro ovalado 18 rosas', variant: 'Rosa blanca', makeQty: 20, price: 70, recipe: '18 rosas blanca; 2 monstera; 2 chico; 6 paniculata; 8 aspidistra' },
  { model: 'Centro ovalado 18 rosas', variant: 'Rosa roja', makeQty: 20, price: 70, recipe: '18 rosas roja; 2 monstera; 2 chico; 6 paniculata; 8 aspidistra' },
  { model: 'Centro ovalado 18 rosas', variant: 'Rosa amarilla', makeQty: 5, price: 70, recipe: '18 rosas amarilla; 2 monstera; 2 chico; 6 paniculata; 8 aspidistra' },
  { model: 'Centro ovalado 18 rosas', variant: 'Rosa fucsia', makeQty: 3, price: 70, recipe: '18 rosas fucsia; 2 monstera; 2 chico; 6 paniculata; 8 aspidistra' },
  { model: 'Centro ovalado 18 rosas', variant: 'Rosa verde', makeQty: 2, price: 70, recipe: '18 rosas verde; 2 monstera; 2 chico; 6 paniculata; 8 aspidistra' },
  { model: 'Centro cara flor variada', variant: 'Rosa', makeQty: 50, price: 50, recipe: '3 lilium rosa; 4 margarita blanca; 4 astroemelia rosa; 4 clavel rosa; 3 gerbera rosa; 3 cordeline; 1 chico; 4 paniculata; 3 rosa aqua' },
  { model: 'Centro cara flor variada', variant: 'Rojo', makeQty: 20, price: 50, recipe: '3 lilium blanco; 4 margarita blanca; 4 astroemelia roja; 4 clavel rojo; 3 gerbera roja; 3 cordeline; 1 chico; 4 paniculata; 3 rosa roja Holanda' },
  { model: 'Centro cara flor variada', variant: 'Blanco', makeQty: 10, price: 50, recipe: '3 lilium blanco; 4 margarita blanca; 4 astroemelia blanco; 4 clavel blanco; 3 gerbera blanca; 3 cordeline; 1 chico; 4 paniculata; 3 rosa blanca' },
  { model: 'Centro cara flor variada', variant: 'Colorido', makeQty: 10, price: 50, recipe: '3 lilium naranja; 4 margarita blanca; 4 astroemelia naranja; 4 clavel rosa; 3 gerbera rosa; 3 cordeline; 1 chico; 4 paniculata; 3 rosa aqua' },
  { model: 'Centro redondo flor variada', variant: 'Rosa', makeQty: 30, price: 50, recipe: '1 lilium rosa; 7 margarita blanca; 3 rosa aqua; 4 astroemelia rosa; 4 gerbera rosa; 8 clavel rosa; 1 chico; 4 paniculata' },
  { model: 'Centro redondo flor variada', variant: 'Roja', makeQty: 15, price: 50, recipe: '1 lilium blanco; 7 margarita blanca; 3 rosa roja Holanda; 4 astroemelia roja; 4 gerbera roja; 8 clavel rojo; 1 chico; 4 paniculata' },
  { model: 'Centro redondo flor variada', variant: 'Colorido', makeQty: 20, price: 50, recipe: '1 lilium naranja; 7 margarita blanca; 3 rosa aqua; 4 astroemelia naranja; 4 gerbera rosa; 8 clavel rosa; 1 chico; 4 paniculata' },
  { model: 'Centro redondo flor variada', variant: 'Blanca', makeQty: 10, price: 50, recipe: '1 lilium blanca; 7 margarita blanca; 3 rosa blanca; 4 astroemelia blanco; 4 gerbera blanca; 8 clavel blanca; 1 chico; 4 paniculata' },
  { model: 'Centro ovalado flor variada', variant: 'Rosa', makeQty: 30, price: 65, recipe: '6 margarita blanca; 3 lilium rosa; 4 rosa aqua; 4 astroemelia rosa; 6 gerbera rosa; 8 clavel rosa; 2 monstera; 2 chico; 5 paniculata; 4 aspidistra' },
  { model: 'Centro ovalado flor variada', variant: 'Rojo', makeQty: 10, price: 65, recipe: '6 margarita blanca; 3 lilium blanco; 4 rosa roja Holanda; 4 astroemelia roja; 6 gerbera roja; 8 clavel rojo; 2 monstera; 2 chico; 5 paniculata; 4 aspidistra' },
  { model: 'Centro ovalado flor variada', variant: 'Colorido', makeQty: 10, price: 65, recipe: '6 margarita blanca; 3 lilium naranja; 4 rosa aqua; 4 astroemelia rosa; 6 gerbera rosa; 8 clavel rosa; 2 monstera; 2 chico; 5 paniculata; 4 aspidistra' },
  { model: 'Centro ovalado flor variada', variant: 'Blanca', makeQty: 10, price: 65, recipe: '6 margarita blanca; 3 lilium blanco; 4 rosa blanca; 4 astroemelia blanca; 6 gerbera blanca; 8 clavel blanca; 2 monstera; 2 chico; 5 paniculata; 4 aspidistra' },
  { model: 'Centro ovalado 24 rosas blancas', variant: 'Rosas blancas', makeQty: 5, price: 90, recipe: '24 rosa blanca; 2 chico; 6 paniculata; 2 monstera; 8 aspidistra' },
];

/** ID-uri stabile aliniate cu fișierele /bouquets/*.jpg existente. */
const MODEL_ID: Record<string, string> = {
  'Centro redondo': 'centro-redondo',
  'Centro de cara': 'centro-cara',
  'Centro redondo con gladiolo': 'centro-redondo-gladiolo',
  'Centro de cara con gladiolo': 'centro-cara-gladiolo',
  'Centro cara 12 rosas': 'centro-cara-12-rosas',
  'Centro ovalado 18 rosas': 'centro-ovalado-18-rosas',
  'Centro cara flor variada': 'centro-cara-flor-variada',
  'Centro redondo flor variada': 'centro-redondo-flor-variada',
  'Centro ovalado flor variada': 'centro-ovalado-flor-variada',
  'Centro ovalado 24 rosas blancas': 'centro-ovalado-24-rosas-blancas',
};

function variantSlug(model: string, variant: string): string {
  const modelId = MODEL_ID[model] ?? slug(model);
  if (model === 'Centro ovalado 24 rosas blancas') return modelId;
  const clavel = variant.match(/^Clavel\s+(.+)$/i);
  if (clavel) return `${modelId}-${slug(clavel[1])}`;
  const rosas = variant.match(/^Rosas?\s+(.+)$/i);
  if (rosas && !/flor variada/i.test(model)) {
    return `${modelId}-${slug(rosas[1])}`;
  }
  return `${modelId}-${slug(variant)}`;
}

function rowToItem(row: CsvRow): CatalogItem {
  const id = variantSlug(row.model, row.variant);
  const name =
    row.model === 'Centro ovalado 24 rosas blancas'
      ? row.model
      : `${row.model} — ${row.variant}`;
  return {
    id,
    name,
    price: row.price,
    image: `/bouquets/${id}.jpg`,
    recipe: row.recipe,
    ingredients: parseRecipe(row.recipe),
    makeQty: row.makeQty,
  };
}

/** Catalog complet: strict din CSV (51 produse). */
export const catalogCentros: CatalogItem[] = CSV_ROWS.map(rowToItem);
