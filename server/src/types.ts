export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
};

export type Bouquet = {
  id: string;
  name: string;
  price: number;
  image: string;
  recipe: string;
  ingredients: Ingredient[];
};

export type OrderItem = {
  bouquetId: string;
  quantity: number;
  madeQuantity: number;
};

export type OrderStatus = 'open' | 'done';

export type Order = {
  id: string;
  items: OrderItem[];
  createdAt: string;
  total: number;
  status: OrderStatus;
  /** Invoice number for the local calendar day (Europe/Bucharest); resets at 00:00. */
  dailyNumber?: number;
};
