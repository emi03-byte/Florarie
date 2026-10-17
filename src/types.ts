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

export type CartItem = {
  bouquetId: string;
  quantity: number;
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
  /** Número de factura del día (se reinicia a las 00:00). */
  dailyNumber?: number;
};
