import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminForm } from './components/AdminForm';
import { BouquetGrid } from './components/BouquetGrid';
import { BouquetPreview } from './components/BouquetPreview';
import { Cart } from './components/Cart';
import { Invoice } from './components/Invoice';
import { InvoiceBoard } from './components/InvoiceBoard';
import { Login } from './components/Login';
import { OrderHistory } from './components/OrderHistory';
import { ProductionBoard } from './components/ProductionBoard';
import { QuantityDialog } from './components/QuantityDialog';
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

type View =
  | 'vanzare'
  | 'cos'
  | 'facturare'
  | 'istoric'
  | 'admin'
  | 'factura'
  | 'productie';

function App() {
  const [authed, setAuthed] = useState(() => isLoggedIn());
  const [view, setView] = useState<View>('vanzare');
  const [catalog, setCatalog] = useState<Bouquet[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [invoiceReturnView, setInvoiceReturnView] = useState<'vanzare' | 'facturare'>(
    'vanzare',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [qtyAsk, setQtyAsk] = useState<Bouquet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);
  const searchRef = useRef<HTMLDivElement | null>(null);

  function goTo(next: View) {
    setMobileMoreOpen(false);
    setView(next);
  }

  function normalizeSearch(value: string) {
    return value
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();
  }

  const searchSuggestions = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    if (q.length < 3) return [];
    return catalog
      .filter((b) => normalizeSearch(b.name).includes(q))
      .slice(0, 8);
  }, [catalog, searchQuery]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const el = searchRef.current;
      if (!el || !(event.target instanceof Node) || el.contains(event.target)) return;
      setSearchOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSearchOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

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

  const previewBouquet = useMemo(
    () => catalog.find((b) => b.id === previewId) ?? null,
    [catalog, previewId],
  );

  function openPreview(bouquet: Bouquet) {
    setPreviewId(bouquet.id);
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
    }, 2800);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function askAddToCart(bouquet: Bouquet) {
    setQtyAsk(bouquet);
  }

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
        ? `Adăugat: ${bouquet.name}`
        : `Adăugat: ${addQty} × ${bouquet.name}`,
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
      await createOrder(cart);
      const nextOrders = await fetchOrders();
      setOrders(nextOrders);
      setCart([]);
      setView('productie');
      showToast('Comanda a fost adăugată la De făcut');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut finaliza comanda');
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

  const moreActive = view === 'istoric' || view === 'admin';

  return (
    <div
      className={`app${view === 'productie' || view === 'admin' || view === 'cos' || view === 'facturare' || view === 'istoric' ? ' app-fill' : ''}${mobileMoreOpen ? ' mobile-more-open' : ''}`}
    >
      <div className="bg-wash" aria-hidden="true" />

      <header className="topbar no-print">
        <button
          type="button"
          className="brand-block"
          onClick={() => goTo('vanzare')}
          aria-label="Mergi la produse"
        >
          <span className="brand">Florarie</span>
          <span className="tagline">Punct de vânzare</span>
        </button>
        <div className="topbar-search" ref={searchRef}>
          <label className="topbar-search-label" htmlFor="product-search">
            Caută produs
          </label>
          <input
            id="product-search"
            className="topbar-search-input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Caută produs…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
          />
          {searchOpen && searchQuery.trim().length >= 3 ? (
            <ul className="topbar-search-suggestions" role="listbox" aria-label="Sugestii produse">
              {searchSuggestions.length === 0 ? (
                <li className="topbar-search-empty">Niciun produs găsit</li>
              ) : (
                searchSuggestions.map((bouquet) => (
                  <li key={bouquet.id} role="option">
                    <button
                      type="button"
                      className="topbar-search-suggestion"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchOpen(false);
                        setPreviewId(bouquet.id);
                        goTo('vanzare');
                      }}
                    >
                      <span className="topbar-search-name">{bouquet.name}</span>
                      <span className="topbar-search-price">{formatEuro(bouquet.price)}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
        <nav className="nav nav-desktop" aria-label="Navigare principală">
          <button
            type="button"
            className={view === 'vanzare' || view === 'factura' ? 'active' : ''}
            onClick={() => goTo('vanzare')}
          >
            Vânzare
          </button>
          <button
            type="button"
            className={view === 'cos' ? 'active' : ''}
            onClick={() => goTo('cos')}
          >
            Coș{cartCount > 0 ? ` (${cartCount})` : ''}
          </button>
          <button
            type="button"
            className={view === 'productie' ? 'active' : ''}
            onClick={() => goTo('productie')}
          >
            De făcut{openCount > 0 ? ` (${openCount})` : ''}
          </button>
          <button
            type="button"
            className={view === 'admin' ? 'active' : ''}
            onClick={() => goTo('admin')}
          >
            Admin
          </button>
        </nav>
        {cartCount > 0 ? (
          <button
            type="button"
            className="topbar-cart-mobile"
            onClick={() => goTo('cos')}
          >
            Coș · {cartCount}
          </button>
        ) : null}
      </header>

      <nav className="nav-mobile no-print" aria-label="Navigare telefon">
        <button
          type="button"
          className={view === 'vanzare' || view === 'factura' ? 'active' : ''}
          onClick={() => goTo('vanzare')}
        >
          <span className="nav-mobile-label">Vânzare</span>
        </button>
        <button
          type="button"
          className={view === 'cos' ? 'active' : ''}
          onClick={() => goTo('cos')}
        >
          <span className="nav-mobile-label">
            Coș{cartCount > 0 ? ` ${cartCount}` : ''}
          </span>
        </button>
        <button
          type="button"
          className={view === 'facturare' ? 'active' : ''}
          onClick={() => goTo('facturare')}
        >
          <span className="nav-mobile-label">Factură</span>
        </button>
        <button
          type="button"
          className={view === 'productie' ? 'active' : ''}
          onClick={() => goTo('productie')}
        >
          <span className="nav-mobile-label">
            De făcut{openCount > 0 ? ` ${openCount}` : ''}
          </span>
        </button>
        <button
          type="button"
          className={moreActive || mobileMoreOpen ? 'active' : ''}
          aria-expanded={mobileMoreOpen}
          onClick={() => setMobileMoreOpen((open) => !open)}
        >
          <span className="nav-mobile-label">Mai mult</span>
        </button>
      </nav>

      {mobileMoreOpen ? (
        <div className="nav-more no-print">
          <button
            type="button"
            className="nav-more-backdrop"
            aria-label="Închide meniul"
            onClick={() => setMobileMoreOpen(false)}
          />
          <div className="nav-more-sheet" role="dialog" aria-label="Mai multe opțiuni">
            <button
              type="button"
              className={view === 'istoric' ? 'active' : ''}
              onClick={() => goTo('istoric')}
            >
              Istoric comenzi
            </button>
            <button
              type="button"
              className={view === 'admin' ? 'active' : ''}
              onClick={() => goTo('admin')}
            >
              Admin catalog
            </button>
            <button
              type="button"
              className="nav-more-danger"
              onClick={() => {
                setMobileMoreOpen(false);
                logout();
                setAuthed(false);
                setCatalog([]);
                setOrders([]);
                setCart([]);
              }}
            >
              Ieșire
            </button>
          </div>
        </div>
      ) : null}

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
        {loading ? <p className="app-loading no-print">Se încarcă…</p> : null}

        {view === 'vanzare' && (
          <section className="sales-shop">
            <div className="sales-main">
              <BouquetGrid
                bouquets={catalog}
                selectedIds={previewId ? [previewId] : []}
                onSelect={openPreview}
                onViewDetails={openPreview}
                onAdd={askAddToCart}
              />
            </div>
            {previewBouquet ? (
              <BouquetPreview
                bouquet={previewBouquet}
                onClose={() => setPreviewId(null)}
                onAdd={askAddToCart}
              />
            ) : null}
          </section>
        )}

        {qtyAsk ? (
          <QuantityDialog
            bouquet={qtyAsk}
            onCancel={() => setQtyAsk(null)}
            onConfirm={(quantity) => {
              addToCart(qtyAsk, quantity);
              setQtyAsk(null);
              setPreviewId(null);
            }}
          />
        ) : null}

        {view === 'cos' && (
          <section className="cart-page">
            <Cart
              items={cart}
              catalog={catalog}
              onChangeQty={changeQty}
              onRemove={(id) => setCart((prev) => prev.filter((i) => i.bouquetId !== id))}
              onCheckout={() => void checkout()}
              onContinueShopping={() => goTo('vanzare')}
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
            onDownload={() =>
              downloadInvoice(
                lastOrder,
                catalog,
                lastOrder.dailyNumber ?? getDailyOrderNumber(lastOrder, orders),
              )
            }
            onNewSale={() => goTo(invoiceReturnView)}
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

        {view === 'istoric' && (
          <section className="history-page">
            <OrderHistory
              orders={orders}
              catalog={catalog}
              onDownload={(order, dailyNumber) => {
                downloadInvoice(order, catalog, dailyNumber);
                showToast(`Factură descărcată: nr. ${dailyNumber}`);
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
                    if (exists) {
                      const saved = await updateBouquet(bouquet);
                      const next = await fetchCatalog();
                      setCatalog(
                        next.map((item) => (item.id === saved.id ? saved : item)),
                      );
                      showToast(`Salvat: ${saved.name}`);
                    } else {
                      const saved = await saveBouquet(bouquet);
                      const next = await fetchCatalog();
                      setCatalog([
                        saved,
                        ...next.filter((item) => item.id !== saved.id),
                      ]);
                      showToast(`Produsul „${saved.name}” a fost adăugat`);
                    }
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
                    setPreviewId((prev) => (prev === id ? null : prev));
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
