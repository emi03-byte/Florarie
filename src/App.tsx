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
import { SalesSortSelect } from './components/SalesSortSelect';
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
import {
  POPULAR_WINDOW_DAYS,
  soldQuantities,
  sortCatalog,
  type SalesSort,
} from './lib/salesSort';
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
  const [qtyAsk, setQtyAsk] = useState<Bouquet | null>(null);
  const [qtyAskKey, setQtyAskKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFabVisible, setSearchFabVisible] = useState(false);
  const [floatingSearchOpen, setFloatingSearchOpen] = useState(false);
  const [salesSort, setSalesSort] = useState<SalesSort>('name');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const floatingSearchRef = useRef<HTMLDivElement | null>(null);
  const floatingSearchInputRef = useRef<HTMLInputElement | null>(null);

  function goTo(next: View) {
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

  const soldLastDays = useMemo(
    () => soldQuantities(orders, POPULAR_WINDOW_DAYS),
    [orders],
  );

  const sortedCatalog = useMemo(
    () => sortCatalog(catalog, salesSort, soldLastDays),
    [catalog, salesSort, soldLastDays],
  );

  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const topSearch = searchRef.current;
      const floatSearch = floatingSearchRef.current;
      const inTop = topSearch?.contains(target);
      const inFloat = floatSearch?.contains(target);
      if (!inTop && !inFloat) {
        setSearchOpen(false);
        setFloatingSearchOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setFloatingSearchOpen(false);
      }
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

  useEffect(() => {
    const hideFabOnPhone =
      view === 'cos' || view === 'productie' || view === 'admin';
    const mq = window.matchMedia('(max-width: 900px)');
    if (hideFabOnPhone && mq.matches) {
      setSearchFabVisible(false);
      setFloatingSearchOpen(false);
      return;
    }
    const el = searchRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const hidden = !entry.isIntersecting;
        setSearchFabVisible(hidden);
        if (!hidden) setFloatingSearchOpen(false);
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [authed, view]);

  useEffect(() => {
    if (!floatingSearchOpen) return;
    floatingSearchInputRef.current?.focus();
  }, [floatingSearchOpen]);

  function pickSearchResult(bouquet: Bouquet) {
    setSearchQuery('');
    setSearchOpen(false);
    setFloatingSearchOpen(false);
    setPreviewId(bouquet.id);
    goTo('vanzare');
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCatalog, nextOrders] = await Promise.all([fetchCatalog(), fetchOrders()]);
      setCatalog(nextCatalog);
      setOrders(nextOrders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nu am putut încărca datele';
      if (message === 'Neautentificat') {
        setAuthed(false);
        setError('Sesiunea a expirat. Intră din nou cu parola.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) void loadData();
  }, [authed, loadData]);

  // Auto-logout after 2 hours with no user interaction.
  useEffect(() => {
    if (!authed) return;

    const IDLE_MS = 2 * 60 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function clearSession() {
      logout();
      setAuthed(false);
      setCatalog([]);
      setOrders([]);
      setCart([]);
      setPreviewId(null);
      setLastOrder(null);
      setView('vanzare');
      setError('');
    }

    function resetTimer() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(clearSession, IDLE_MS);
    }

    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'scroll',
      'touchstart',
    ];
    for (const event of events) {
      window.addEventListener(event, resetTimer, { passive: true });
    }
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      for (const event of events) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [authed]);

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
    setQtyAskKey((key) => key + 1);
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

  const hideBrandSearchOnMobile =
    view === 'cos' || view === 'productie' || view === 'admin';

  return (
    <div
      className={`app${view === 'productie' || view === 'admin' || view === 'cos' || view === 'facturare' || view === 'istoric' ? ' app-fill' : ''}`}
    >
      <div className="bg-wash" aria-hidden="true" />

      <header
        className={`topbar no-print${hideBrandSearchOnMobile ? ' topbar-mobile-hide-brand' : ''}`}
      >
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
            <ul
              className="topbar-search-suggestions"
              role="listbox"
              aria-label="Sugestii produse"
            >
              {searchSuggestions.length === 0 ? (
                <li className="topbar-search-empty">Niciun produs găsit</li>
              ) : (
                searchSuggestions.map((bouquet) => (
                  <li key={bouquet.id} role="option">
                    <button
                      type="button"
                      className="topbar-search-suggestion"
                      onClick={() => pickSearchResult(bouquet)}
                    >
                      <span className="topbar-search-name">{bouquet.name}</span>
                      <span className="topbar-search-price">
                        {formatEuro(bouquet.price)}
                      </span>
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

      {!hideBrandSearchOnMobile && searchFabVisible ? (
        <div
          className={`mobile-search-fab no-print${floatingSearchOpen ? ' is-open' : ''}`}
          ref={floatingSearchRef}
        >
          {floatingSearchOpen ? (
            <div className="mobile-search-fab-panel">
              <input
                ref={floatingSearchInputRef}
                className="mobile-search-fab-input"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Caută produs…"
                value={searchQuery}
                aria-label="Caută produs"
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
              />
              {searchQuery.trim().length >= 3 ? (
                <ul className="mobile-search-fab-suggestions" role="listbox">
                  {searchSuggestions.length === 0 ? (
                    <li className="topbar-search-empty">Niciun produs găsit</li>
                  ) : (
                    searchSuggestions.map((bouquet) => (
                      <li key={bouquet.id} role="option">
                        <button
                          type="button"
                          className="topbar-search-suggestion"
                          onClick={() => pickSearchResult(bouquet)}
                        >
                          <span className="topbar-search-name">{bouquet.name}</span>
                          <span className="topbar-search-price">
                            {formatEuro(bouquet.price)}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className="mobile-search-fab-btn"
            aria-label={floatingSearchOpen ? 'Închide căutarea' : 'Caută produs'}
            aria-expanded={floatingSearchOpen}
            onClick={() => setFloatingSearchOpen((open) => !open)}
          >
            {floatingSearchOpen ? (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M18.3 5.7a1 1 0 0 0-1.4-1.4L12 9.17 7.1 4.3A1 1 0 0 0 5.7 5.7L10.59 10.6 5.7 15.49a1 1 0 1 0 1.4 1.42L12 12l4.9 4.9a1 1 0 0 0 1.4-1.4L13.41 10.6z"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M10.5 3a7.5 7.5 0 0 1 5.95 12.1l3.72 3.73a1 1 0 0 1-1.41 1.41l-3.73-3.72A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"
                />
              </svg>
            )}
          </button>
        </div>
      ) : null}

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
          className={view === 'productie' ? 'active' : ''}
          onClick={() => goTo('productie')}
        >
          <span className="nav-mobile-label">
            De făcut{openCount > 0 ? ` ${openCount}` : ''}
          </span>
        </button>
        <button
          type="button"
          className={view === 'admin' ? 'active' : ''}
          onClick={() => goTo('admin')}
        >
          <span className="nav-mobile-label">Admin</span>
        </button>
      </nav>

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
              <div className="sales-sort-bar no-print">
                <label className="sales-sort-label" htmlFor="sales-sort">
                  Sortare
                </label>
                <SalesSortSelect value={salesSort} onChange={setSalesSort} />
              </div>
              <BouquetGrid
                bouquets={sortedCatalog}
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
            key={qtyAskKey}
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
              onChangeQty={(id, quantity) => {
                if (quantity <= 0) {
                  setCart((prev) => prev.filter((i) => i.bouquetId !== id));
                  return;
                }
                setCart((prev) =>
                  prev.map((item) =>
                    item.bouquetId === id
                      ? { ...item, quantity: Math.min(99, quantity) }
                      : item,
                  ),
                );
              }}
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
              onToast={showToast}
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
