import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminForm } from './components/AdminForm';
import { BouquetDetail } from './components/BouquetDetail';
import { BouquetGrid } from './components/BouquetGrid';
import { Cart } from './components/Cart';
import { Invoice } from './components/Invoice';
import { Login } from './components/Login';
import { ProductionBoard } from './components/ProductionBoard';
import {
  createOrder,
  deleteBouquet,
  fetchCatalog,
  fetchOrders,
  isLoggedIn,
  logout,
  markBouquetMade,
  saveBouquet,
  updateBouquet,
} from './lib/api';
import { getOpenOrders } from './lib/materials';
import type { Bouquet, CartItem, Order } from './types';
import './App.css';

type View = 'vanzare' | 'admin' | 'factura' | 'productie';

function App() {
  const [authed, setAuthed] = useState(() => isLoggedIn());
  const [view, setView] = useState<View>('vanzare');
  const [catalog, setCatalog] = useState<Bouquet[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCatalog, nextOrders] = await Promise.all([fetchCatalog(), fetchOrders()]);
      setCatalog(nextCatalog);
      setOrders(nextOrders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nu am putut încărca datele';
      setError(message);
      if (message === 'Neautentificat') setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) void loadData();
  }, [authed, loadData]);

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

  async function checkout() {
    if (cart.length === 0) return;
    setError('');
    try {
      const order = await createOrder(cart);
      setOrders(await fetchOrders());
      setLastOrder(order);
      setCart([]);
      setSelectedId(null);
      setView('factura');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut finaliza comanda');
    }
  }

  if (!authed) {
    return (
      <div className="app">
        <div className="bg-wash" aria-hidden="true" />
        <Login onSuccess={() => setAuthed(true)} />
      </div>
    );
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
          <button
            type="button"
            onClick={() => {
              logout();
              setAuthed(false);
              setCatalog([]);
              setOrders([]);
              setCart([]);
            }}
          >
            Ieșire
          </button>
        </nav>
      </header>

      <main className="main">
        {error ? <p className="app-error no-print">{error}</p> : null}
        {loading ? <p className="app-loading no-print">Se încarcă…</p> : null}

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
                onCheckout={() => void checkout()}
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
              onMarkMade={async (bouquetId, count) => {
                const next = await markBouquetMade(bouquetId, count);
                setOrders(next);
              }}
            />
          </section>
        )}

        {view === 'admin' && (
          <section>
            <div className="section-head">
              <h1>Administrare catalog</h1>
              <p>
                Adaugă, editează sau șterge buchete. Modificările se salvează în baza de date.
              </p>
            </div>
            <AdminForm
              bouquets={catalog}
              onSave={(bouquet) => {
                void (async () => {
                  try {
                    const exists = catalog.some((b) => b.id === bouquet.id);
                    if (exists) await updateBouquet(bouquet);
                    else await saveBouquet(bouquet);
                    setCatalog(await fetchCatalog());
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Salvare eșuată');
                  }
                })();
              }}
              onDelete={(id) => {
                void (async () => {
                  try {
                    await deleteBouquet(id);
                    setCatalog(await fetchCatalog());
                    if (selectedId === id) setSelectedId(null);
                    setCart((prev) => prev.filter((item) => item.bouquetId !== id));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Ștergere eșuată');
                  }
                })();
              }}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
