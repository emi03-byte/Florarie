import type { Bouquet } from '../types';

export const seedBouquets: Bouquet[] = [
  {
    id: 'buc-trandafiri-rosii',
    name: 'Ramo de rosas rojas',
    price: 180,
    image: '/bouquets/trandafiri-rosii.jpg',
    recipe:
      'Coloca 11 rosas rojas en espiral, con el mismo ángulo. Añade eucalipto entre las flores. Ata bien con rafia, corta los tallos a la misma longitud, pulveriza ligeramente con agua y envuelve en papel kraft.',
    ingredients: [
      { name: 'rosas rojas', quantity: 11, unit: 'uds' },
      { name: 'eucalipto', quantity: 5, unit: 'ramas' },
      { name: 'rafia natural', quantity: 1, unit: 'uds' },
      { name: 'papel kraft + cinta de satén', quantity: 1, unit: 'set' },
    ],
  },
  {
    id: 'buc-primavara',
    name: 'Ramo de primavera',
    price: 120,
    image: '/bouquets/primavara.jpg',
    recipe:
      'Combina tulipanes, fresias y gypsophila. Mantén las flores más altas en el centro y las cortas en el exterior. Humedece los tallos, ata con cuerda y envuelve con papel pastel.',
    ingredients: [
      { name: 'tulipanes mixtos', quantity: 7, unit: 'uds' },
      { name: 'fresias blancas', quantity: 5, unit: 'uds' },
      { name: 'gypsophila', quantity: 1, unit: 'manojo' },
      { name: 'cuerda + papel pastel', quantity: 1, unit: 'set' },
    ],
  },
  {
    id: 'buc-elegant-alb',
    name: 'Ramo elegante blanco',
    price: 220,
    image: '/bouquets/elegant-alb.jpg',
    recipe:
      'Usa rosas blancas y lisianthus. Forma un cono compacto, estilo bridal. Añade hojas de ruscus para estructura. Acaba con cinta ivory y pin floral discreto.',
    ingredients: [
      { name: 'rosas blancas', quantity: 9, unit: 'uds' },
      { name: 'lisianthus blancos', quantity: 6, unit: 'uds' },
      { name: 'ruscus', quantity: 4, unit: 'ramas' },
      { name: 'cinta ivory', quantity: 1, unit: 'uds' },
    ],
  },
  {
    id: 'buc-campestre',
    name: 'Ramo campestre',
    price: 95,
    image: '/bouquets/campestre.jpg',
    recipe:
      'Arreglo libre, estilo campo: margaritas, crisantemos pequeños y verdor. No fuerces la simetría: deja volumen natural. Ata con soltura y envuelve en papel reciclable.',
    ingredients: [
      { name: 'margaritas', quantity: 8, unit: 'uds' },
      { name: 'crisantemos pequeños', quantity: 6, unit: 'uds' },
      { name: 'verdor mezclado', quantity: 1, unit: 'manojo' },
      { name: 'papel reciclable', quantity: 1, unit: 'uds' },
    ],
  },
  {
    id: 'buc-romantic-roz',
    name: 'Ramo romántico rosa',
    price: 160,
    image: '/bouquets/romantic-roz.jpg',
    recipe:
      'Rosas rosa + peonías (o peonías de temporada). Centra las peonías y rodea con rosas. Añade un toque de eucalipto plateado. Envuelve en papel rosa empolvado y cinta mate.',
    ingredients: [
      { name: 'peonías / peonías rosa', quantity: 5, unit: 'uds' },
      { name: 'rosas rosa', quantity: 7, unit: 'uds' },
      { name: 'eucalipto plateado', quantity: 3, unit: 'ramas' },
      { name: 'papel rosa empolvado', quantity: 1, unit: 'uds' },
    ],
  },
  {
    id: 'buc-corporate',
    name: 'Ramo corporativo verde',
    price: 140,
    image: '/bouquets/corporate-verde.jpg',
    recipe:
      'Estilo moderno, vertical: anturio verde + monstera pequeña + ramas de salal. Aspecto limpio, sin exceso de envoltorio. Ata con cinta negra mate.',
    ingredients: [
      { name: 'anturio verde', quantity: 3, unit: 'uds' },
      { name: 'monsteras pequeñas', quantity: 2, unit: 'hojas' },
      { name: 'salal / follaje', quantity: 4, unit: 'ramas' },
      { name: 'cinta negra mate', quantity: 1, unit: 'uds' },
    ],
  },
];
