import type { Bouquet } from './types.js';

export const seedBouquets: Bouquet[] = [
  {
    id: 'buc-trandafiri-rosii',
    name: 'Buchet Trandafiri Roșii',
    price: 180,
    image: '/bouquets/trandafiri-rosii.jpg',
    recipe:
      'Aranjează 11 trandafiri roșii în spirală, cu unghi egal. Adaugă eucalipt între flori. Leagă ferm cu raffia, taie tulpinile la aceeași lungime, pulverizează ușor cu apă și învelește în hârtie kraft.',
    ingredients: [
      { name: 'trandafiri roșii', quantity: 11, unit: 'fire' },
      { name: 'eucalipt', quantity: 5, unit: 'crenguțe' },
      { name: 'raffia naturală', quantity: 1, unit: 'buc' },
      { name: 'hârtie kraft + panglică satin', quantity: 1, unit: 'set' },
    ],
  },
  {
    id: 'buc-primavara',
    name: 'Buchet de Primăvară',
    price: 120,
    image: '/bouquets/primavara.jpg',
    recipe:
      'Combină lalele, frezii și gypsophila. Ține florile mai înalte în centru, cele scurte la exterior. Umezește tulpinile, leagă cu sfoară și wrap pe bază de hârtie pastel.',
    ingredients: [
      { name: 'lalele mixte', quantity: 7, unit: 'fire' },
      { name: 'frezii albe', quantity: 5, unit: 'fire' },
      { name: 'gypsophila', quantity: 1, unit: 'legătură' },
      { name: 'sfoară + hârtie pastel', quantity: 1, unit: 'set' },
    ],
  },
  {
    id: 'buc-elegant-alb',
    name: 'Buchet Elegant Alb',
    price: 220,
    image: '/bouquets/elegant-alb.jpg',
    recipe:
      'Folosește trandafiri albi și lisianthus. Formează un con compact, tip bridal. Adaugă frunze de ruscus pentru structură. Finish cu panglică ivory și pin floral discret.',
    ingredients: [
      { name: 'trandafiri albi', quantity: 9, unit: 'fire' },
      { name: 'lisianthus albi', quantity: 6, unit: 'fire' },
      { name: 'ruscus', quantity: 4, unit: 'crenguțe' },
      { name: 'panglică ivory', quantity: 1, unit: 'buc' },
    ],
  },
  {
    id: 'buc-campestre',
    name: 'Buchet Campestre',
    price: 95,
    image: '/bouquets/campestre.jpg',
    recipe:
      'Aranjament liber, tip câmp: margarete, crizanteme mici și verdeață. Nu forța simetria — lasă volum natural. Leagă lejer și wrap în hârtie reciclabilă.',
    ingredients: [
      { name: 'margarete', quantity: 8, unit: 'fire' },
      { name: 'crizanteme mici', quantity: 6, unit: 'fire' },
      { name: 'verdeață amestec', quantity: 1, unit: 'legătură' },
      { name: 'hârtie reciclabilă', quantity: 1, unit: 'buc' },
    ],
  },
  {
    id: 'buc-romantic-roz',
    name: 'Buchet Romantic Roz',
    price: 160,
    image: '/bouquets/romantic-roz.jpg',
    recipe:
      'Trandafiri roz + peonii (sau bujori de sezon). Centrează peonii, înconjoară cu trandafiri. Adaugă un strop de eucalipt argintiu. Wrap roz pudrat și panglică mată.',
    ingredients: [
      { name: 'peoni / bujori roz', quantity: 5, unit: 'fire' },
      { name: 'trandafiri roz', quantity: 7, unit: 'fire' },
      { name: 'eucalipt argintiu', quantity: 3, unit: 'crenguțe' },
      { name: 'hârtie roz pudrat', quantity: 1, unit: 'buc' },
    ],
  },
  {
    id: 'buc-corporate',
    name: 'Buchet Corporate Verde',
    price: 140,
    image: '/bouquets/corporate-verde.jpg',
    recipe:
      'Stil modern, vertical: anturium sau anthurium verde + monstera mică + crenguțe de salal. Aspect curat, fără exces de wrap. Leagă cu bandă neagră mată.',
    ingredients: [
      { name: 'anthurium verde', quantity: 3, unit: 'fire' },
      { name: 'monstera mici', quantity: 2, unit: 'frunze' },
      { name: 'salal / frunziș', quantity: 4, unit: 'crenguțe' },
      { name: 'bandă neagră mată', quantity: 1, unit: 'buc' },
    ],
  },
];
