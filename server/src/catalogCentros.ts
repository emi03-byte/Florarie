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

type ColorRun = { color: string; qty: number };

function clavelVariants(
  modelId: string,
  modelName: string,
  price: number,
  recipe: string,
  base: Ingredient[],
  colors: ColorRun[],
): CatalogItem[] {
  return colors.map(({ color, qty }) => {
    const id = `${modelId}-${slug(color)}`;
    const ingredients: Ingredient[] = base.map((row) =>
      row.name === 'clavel' ? { ...row, name: `clavel ${color}` } : row,
    );
    return {
      id,
      name: `${modelName} — Clavel ${color}`,
      price,
      image: `/bouquets/${id}.jpg`,
      recipe: `${recipe} Los claveles son ${color}.`,
      ingredients,
      makeQty: qty,
    };
  });
}

function rosaVariants(
  modelId: string,
  modelName: string,
  price: number,
  recipe: string,
  base: Ingredient[],
  colors: ColorRun[],
  rosaCount: number,
): CatalogItem[] {
  return colors.map(({ color, qty }) => {
    const id = `${modelId}-${slug(color)}`;
    const ingredients: Ingredient[] = base.map((row) =>
      row.name === 'rosas' ? { ...row, name: `rosas ${color}`, quantity: rosaCount } : row,
    );
    return {
      id,
      name: `${modelName} — Rosa ${color}`,
      price,
      image: `/bouquets/${id}.jpg`,
      recipe: `${recipe} Las rosas son ${color}.`,
      ingredients,
      makeQty: qty,
    };
  });
}

const redondoBase: Ingredient[] = [
  ing('margaritas blancas', 7),
  ing('clavel', 10),
  ing('lentisco', 1),
  ing('chico', 0.5),
  ing('paniculata', 4),
];

const caraBase: Ingredient[] = [
  ing('margarita blanca', 6),
  ing('clavel', 10),
  ing('lentisco', 1),
  ing('chico', 0.5),
  ing('paniculata', 4),
  ing('cordeline', 3),
];

const redondoGladioloBase: Ingredient[] = [
  ...redondoBase,
  ing('gladiolo', 3),
];

const caraGladioloBase: Ingredient[] = [
  ...caraBase,
  ing('gladiolo', 3),
];

const cara12RosasBase: Ingredient[] = [
  ing('rosas', 12),
  ing('chico', 1),
  ing('aspidistra', 2),
  ing('paniculata', 4),
  ing('cordeline', 3),
];

const ovalado18RosasBase: Ingredient[] = [
  ing('rosas', 18),
  ing('monstera', 2),
  ing('chico', 2),
  ing('paniculata', 6),
  ing('aspidistra', 8),
];

export const catalogCentros: CatalogItem[] = [
  ...clavelVariants(
    'centro-redondo',
    'Centro redondo',
    33,
    'Centro redondo: margaritas blancas, clavel, lentisco, chico y paniculata.',
    redondoBase,
    [
      { color: 'rosa', qty: 50 },
      { color: 'rojo', qty: 50 },
      { color: 'blanco', qty: 10 },
      { color: 'amarillo', qty: 10 },
      { color: 'naranja', qty: 10 },
      { color: 'fucsia', qty: 10 },
      { color: 'jaspeado', qty: 10 },
    ],
  ),
  ...clavelVariants(
    'centro-cara',
    'Centro de cara',
    33,
    'Centro de cara: margarita blanca, clavel, lentisco, chico, paniculata y cordeline.',
    caraBase,
    [
      { color: 'rosa', qty: 40 },
      { color: 'rojo', qty: 40 },
      { color: 'amarillo', qty: 5 },
      { color: 'naranja', qty: 5 },
      { color: 'fucsia', qty: 5 },
      { color: 'blanco', qty: 5 },
    ],
  ),
  ...clavelVariants(
    'centro-redondo-gladiolo',
    'Centro redondo con gladiolo',
    39,
    'Centro redondo con gladiolo: margaritas, clavel, lentisco, chico, paniculata y 3 gladiolo.',
    redondoGladioloBase,
    [
      { color: 'rosa', qty: 30 },
      { color: 'rojo', qty: 30 },
      { color: 'blanco', qty: 10 },
      { color: 'amarillo', qty: 5 },
      { color: 'naranja', qty: 5 },
      { color: 'fucsia', qty: 5 },
      { color: 'jaspeado', qty: 5 },
    ],
  ),
  ...clavelVariants(
    'centro-cara-gladiolo',
    'Centro de cara con gladiolo',
    39,
    'Centro de cara con gladiolo: margarita, clavel, lentisco, chico, paniculata, cordeline y 3 gladiolo.',
    caraGladioloBase,
    [
      { color: 'rosa', qty: 50 },
      { color: 'rojo', qty: 50 },
      { color: 'blanco', qty: 20 },
      { color: 'amarillo', qty: 5 },
      { color: 'naranja', qty: 5 },
      { color: 'fucsia', qty: 5 },
      { color: 'jaspeado', qty: 5 },
    ],
  ),
  ...rosaVariants(
    'centro-cara-12-rosas',
    'Centro cara 12 rosas',
    46,
    'Centro cara con 12 rosas, chico, aspidistra, paniculata y cordeline.',
    cara12RosasBase,
    [
      { color: 'rojas', qty: 55 },
      { color: 'blancas', qty: 45 },
      { color: 'rosas', qty: 5 },
      { color: 'fucsia', qty: 5 },
      { color: 'amarillas', qty: 5 },
      { color: 'naranjas', qty: 5 },
    ],
    12,
  ),
  ...rosaVariants(
    'centro-ovalado-18-rosas',
    'Centro ovalado 18 rosas',
    70,
    'Centro ovalado con 18 rosas, monstera, chico, paniculata y aspidistra.',
    ovalado18RosasBase,
    [
      { color: 'blanca', qty: 20 },
      { color: 'roja', qty: 20 },
      { color: 'amarilla', qty: 5 },
      { color: 'fucsia', qty: 3 },
      { color: 'verde', qty: 2 },
    ],
    18,
  ),
];
