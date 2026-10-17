import { useEffect, useMemo, useState } from 'react';
import { AdminForm } from './components/AdminForm';
import { BouquetDetail } from './components/BouquetDetail';
import { BouquetGrid } from './components/BouquetGrid';
import { Cart } from './components/Cart';
import { Invoice } from './components/Invoice';
import { ProductionBoard } from './components/ProductionBoard';
import {
  createId,
  loadCatalog,
  loadOrders,
  saveCatalog,
  saveOrder,
  saveOrders,
} from './lib/storage';
import { getOpenOrders } from './lib/materials';
import type { Bouquet, CartItem, Order } from './types';
import './App.css';

type View = 'vanzare' | 'admin' | 'factura' | 'productie';

function App() {
  const [view, setView] = useState<View>('vanzare');
  const [catalog, setCatalog] = useState<Bouquet[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  useEffect(() => {
    setCatalog(loadCatalog());
    setOrders(loadOrders());
  }, []);

  const selected = useMemo(
    () => catalog.find((b) => b.id === selectedId) ?? null,
    [catalog, selectedId],
  );

  const openCount = useMemo(
    () =>
      getOpenOrders(orders).reduce(
        (sum, order) =>
          sum +
          order.items.reduce(
            (lineSum, item) => lineSum + Math.max(0, item.quantity - item.madeQuantity),
            0,
          ),
        0,
      ),
    [orders],
  );

  function persistCatalog(next: Bouquet[]) {
    setCatalog(next);
    saveCatalog(next);
  }

  function persistOrders(next: Order[]) {
    setOrders(next);
    saveOrders(next);
  }

  function addToCart(bouquet: Bouquet) {
    setCart((prev) => {
      const existing = prev.find((item) => item.bouquetId === bouquet.id);
      if (existing) {
        return prev.map((item) =>
          item.bouquetId === bouquet.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { bouquetId: bouquet.id, quantity: 1 }];
    });
  }

  function changeQty(bouquetId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.bouquetId !== bouquetId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.bouquetId === bouquetId ? { ...item, quantity } : item)),
    );
  }

  function checkout() {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => {
      const bouquet = catalog.find((b) => b.id === item.bouquetId);
      return sum + (bouquet ? bouquet.price * item.quantity : 0);
    }, 0);

    const order: Order = {
      id: createId('cmd'),
      items: cart.map((item) => ({
        bouquetId: item.bouquetId,
        quantity: item.quantity,
        madeQuantity: 0,
      })),
      createdAt: new Date().toISOString(),
      total,
      status: 'open',
    };

    saveOrder(order);
    setOrders(loadOrders());
    setLastOrder(order);
    setCart([]);
    setSelectedId(null);
    setView('factura');
  }

  return (
    <div className="app">
      <div className="bg-wash" aria-hidden="true" />

      <header className="topbar no-print">
        <div className="nav-spacer" aria-hidden="true" />
        <div className="brand-block">
          <p className="brand">Florărie</p>
          <p className="tagline">Punct de vânzare</p>
        </div>
        <nav className="nav">
          <button
            type="button"
            className={view === 'vanzare' || view === 'factura' ? 'active' : ''}
            onClick={() => setView('vanzare')}
          >
            Vânzare
          </button>
          <button
            type="button"
            className={view === 'productie' ? 'active' : ''}
            onClick={() => setView('productie')}
          >
            De făcut{openCount > 0 ? ` (${openCount})` : ''}
          </button>
          <button
            type="button"
            className={view === 'admin' ? 'active' : ''}
            onClick={() => setView('admin')}
          >
            Admin
          </button>
        </nav>
      </header>

      <main className="main">
        {view === 'vanzare' && (
          <section className="sales-shop">
            <div className="sales-layout">
              <div className="sales-main">
                <BouquetGrid
                  bouquets={catalog}
                  selectedId={selectedId}
                  onSelect={(b) => setSelectedId(b.id)}
                />
                <BouquetDetail bouquet={selected} onAdd={addToCart} />
              </div>
              <Cart
                items={cart}
                catalog={catalog}
                onChangeQty={changeQty}
                onRemove={(id) => setCart((prev) => prev.filter((i) => i.bouquetId !== id))}
                onCheckout={checkout}
              />
            </div>
          </section>
        )}

        {view === 'factura' && lastOrder && (
          <Invoice
            order={lastOrder}
            catalog={catalog}
            onPrint={() => window.print()}
            onNewSale={() => setView('vanzare')}
          />
        )}

        {view === 'productie' && (
          <section>
            <div className="section-head">
              <h1>De făcut</h1>
              <p>
                Buchetele pe tipuri separat; firele și florile — total comun pentru ce mai e
                de făcut.
              </p>
            </div>
            <ProductionBoard
              orders={orders}
              catalog={catalog}
              onOrdersChange={persistOrders}
            />
          </section>
        )}

        {view === 'admin' && (
          <section>
            <div className="section-head">
              <h1>Administrare catalog</h1>
              <p>
                Adaugă, editează sau șterge buchete. Ingredientele cu cantitate se folosesc la
                totalul de materiale.
              </p>
            </div>
            <AdminForm
              bouquets={catalog}
              onSave={(bouquet) => {
                const exists = catalog.some((b) => b.id === bouquet.id);
                persistCatalog(
                  exists
                    ? catalog.map((b) => (b.id === bouquet.id ? bouquet : b))
                    : [...catalog, bouquet],
                );
              }}
              onDelete={(id) => {
                persistCatalog(catalog.filter((b) => b.id !== id));
                if (selectedId === id) setSelectedId(null);
                setCart((prev) => prev.filter((item) => item.bouquetId !== id));
              }}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
