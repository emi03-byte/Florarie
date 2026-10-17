import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminForm } from './components/AdminForm';
import { BouquetDetail } from './components/BouquetDetail';
import { BouquetGrid } from './components/BouquetGrid';
import { BouquetPreview } from './components/BouquetPreview';
import { Cart } from './components/Cart';
import { Invoice } from './components/Invoice';
import { InvoiceBoard } from './components/InvoiceBoard';
import { Login } from './components/Login';
import { ProductionBoard } from './components/ProductionBoard';
import {
  createOrder,
  deleteBouquet,
  fetchCatalog,
  fetchOrders,
  isLoggedIn,
  logout,
  addBouquetToMake,
  markBouquetMade,
  saveBouquet,
  updateBouquet,
} from './lib/api';
import { getDailyOrderNumber } from './lib/dailyOrderNumber';
import { downloadInvoice } from './lib/invoiceDownload';
import { getOpenOrders } from './lib/materials';
import { formatEuro } from './lib/money';
import type { Bouquet, CartItem, Order } from './types';
import './App.css';

type View = 'vanzare' | 'cos' | 'facturare' | 'admin' | 'factura' | 'productie';

function App() {
  const [authed, setAuthed] = useState(() => isLoggedIn());
  const [view, setView] = useState<View>('vanzare');
  const [catalog, setCatalog] = useState<Bouquet[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [invoiceReturnView, setInvoiceReturnView] = useState<'vanzare' | 'facturare'>(
    'vanzare',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCatalog, nextOrders] = await Promise.all([fetchCatalog(), fetchOrders()]);
      setCatalog(nextCatalog);
      setOrders(nextOrders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se han podido cargar los datos';
      setError(message);
      if (message === 'No autenticado') setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) void loadData();
  }, [authed, loadData]);

  const selectedBouquets = useMemo(
    () =>
      selectedIds
        .map((id) => catalog.find((b) => b.id === id))
        .filter((b): b is Bouquet => Boolean(b)),
    [catalog, selectedIds],
  );

  const previewBouquet = useMemo(
    () => catalog.find((b) => b.id === previewId) ?? null,
    [catalog, previewId],
  );

  function toggleSelect(bouquet: Bouquet) {
    setSelectedIds((prev) =>
      prev.includes(bouquet.id) ? prev : [...prev, bouquet.id],
    );
  }

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

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastId.current += 1;
    const id = toastId.current;
    setToast({ id, message });
    toastTimer.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 1800);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function addToCart(bouquet: Bouquet, quantity = 1) {
    const addQty = Math.max(1, Math.min(99, quantity));
    setCart((prev) => {
      const existing = prev.find((item) => item.bouquetId === bouquet.id);
      if (existing) {
        return prev.map((item) =>
          item.bouquetId === bouquet.id
            ? { ...item, quantity: item.quantity + addQty }
            : item,
        );
      }
      return [...prev, { bouquetId: bouquet.id, quantity: addQty }];
    });
    showToast(
      addQty === 1
        ? `Añadido: ${bouquet.name}`
        : `Añadido: ${addQty} × ${bouquet.name}`,
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => {
    const bouquet = catalog.find((b) => b.id === item.bouquetId);
    return sum + (bouquet ? bouquet.price * item.quantity : 0);
  }, 0);

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
      const nextOrders = await fetchOrders();
      setOrders(nextOrders);
      setLastOrder(order);
      setCart([]);
      setSelectedIds([]);
      setInvoiceReturnView('vanzare');
      downloadInvoice(
        order,
        catalog,
        order.dailyNumber ?? getDailyOrderNumber(order, nextOrders),
      );
      setView('factura');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido completar el pedido');
    }
  }

  async function checkoutInvoiceOnly(items: CartItem[]) {
    if (items.length === 0) return;
    setError('');
    const order = await createOrder(items, { invoiceOnly: true });
    const nextOrders = await fetchOrders();
    setOrders(nextOrders);
    setLastOrder(order);
    setInvoiceReturnView('facturare');
    downloadInvoice(
      order,
      catalog,
      order.dailyNumber ?? getDailyOrderNumber(order, nextOrders),
    );
    setView('factura');
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
    <div
      className={`app${view === 'productie' || view === 'admin' || view === 'cos' || view === 'facturare' ? ' app-fill' : ''}`}
    >
      <div className="bg-wash" aria-hidden="true" />

      <header className="topbar no-print">
        <button
          type="button"
          className="brand-block"
          onClick={() => setView('vanzare')}
          aria-label="Ir a productos"
        >
          <span className="brand">Florarie</span>
          <span className="tagline">Punto de venta</span>
        </button>
        <nav className="nav">
          <button
            type="button"
            className={view === 'vanzare' || view === 'factura' ? 'active' : ''}
            onClick={() => setView('vanzare')}
          >
            Venta
          </button>
          <button
            type="button"
            className={view === 'cos' ? 'active' : ''}
            onClick={() => setView('cos')}
          >
            Carrito{cartCount > 0 ? ` (${cartCount})` : ''}
          </button>
          <button
            type="button"
            className={view === 'facturare' ? 'active' : ''}
            onClick={() => setView('facturare')}
          >
            Facturación
          </button>
          <button
            type="button"
            className={view === 'productie' ? 'active' : ''}
            onClick={() => setView('productie')}
          >
            Por hacer{openCount > 0 ? ` (${openCount})` : ''}
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
            Salir
          </button>
        </nav>
      </header>

      {toast ? (
        <div
          key={toast.id}
          className="app-toast no-print"
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}

      <main className="main">
        {error ? <p className="app-error no-print">{error}</p> : null}
        {loading ? <p className="app-loading no-print">Cargando…</p> : null}

        {view === 'vanzare' && (
          <section className="sales-shop">
            <div className="sales-main">
              <BouquetGrid
                bouquets={catalog}
                selectedIds={selectedIds}
                onSelect={toggleSelect}
                onViewDetails={(b) => setPreviewId(b.id)}
                onAdd={addToCart}
              />
              <BouquetDetail
                bouquets={selectedBouquets}
                onAdd={(bouquet) => addToCart(bouquet, 1)}
                onRemove={(id) =>
                  setSelectedIds((prev) => prev.filter((item) => item !== id))
                }
              />
            </div>
            {cartCount > 0 ? (
              <div className="sales-checkout-bar no-print">
                <p>
                  <strong>{cartCount}</strong> en el carrito · {formatEuro(cartTotal)}
                </p>
                <button
                  type="button"
                  className="sales-checkout-btn"
                  onClick={() => setView('cos')}
                >
                  Ver carrito
                </button>
              </div>
            ) : null}
            {previewBouquet ? (
              <BouquetPreview
                bouquet={previewBouquet}
                onClose={() => setPreviewId(null)}
                onAdd={addToCart}
              />
            ) : null}
          </section>
        )}

        {view === 'cos' && (
          <section className="cart-page">
            <Cart
              items={cart}
              catalog={catalog}
              onChangeQty={changeQty}
              onRemove={(id) => setCart((prev) => prev.filter((i) => i.bouquetId !== id))}
              onCheckout={() => void checkout()}
              onContinueShopping={() => setView('vanzare')}
            />
          </section>
        )}

        {view === 'facturare' && (
          <section className="invoice-board-page">
            <InvoiceBoard catalog={catalog} onSubmit={checkoutInvoiceOnly} />
          </section>
        )}

        {view === 'factura' && lastOrder && (
          <Invoice
            order={lastOrder}
            catalog={catalog}
            dailyNumber={
              lastOrder.dailyNumber ?? getDailyOrderNumber(lastOrder, orders)
            }
            onPrint={() => window.print()}
            onNewSale={() => setView(invoiceReturnView)}
          />
        )}

        {view === 'productie' && (
          <section className="production-page">
            <ProductionBoard
              orders={orders}
              catalog={catalog}
              onMarkMade={async (bouquetId, count) => {
                const next = await markBouquetMade(bouquetId, count);
                setOrders(next);
              }}
              onAddToMake={async (bouquetId, count) => {
                const next = await addBouquetToMake(bouquetId, count);
                setOrders(next);
              }}
            />
          </section>
        )}

        {view === 'admin' && (
          <section className="admin-page">
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
                    setError(err instanceof Error ? err.message : 'Error al guardar');
                  }
                })();
              }}
              onDelete={(id) => {
                void (async () => {
                  try {
                    await deleteBouquet(id);
                    setCatalog(await fetchCatalog());
                    setSelectedIds((prev) => prev.filter((item) => item !== id));
                    setCart((prev) => prev.filter((item) => item.bouquetId !== id));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Error al eliminar');
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
