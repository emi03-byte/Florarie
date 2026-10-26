import type { Bouquet, Order } from '../types';

function resolveApiUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  // Explicit empty / "same" = same-origin (Azure serves UI + API together).
  if (fromEnv === '' || fromEnv === 'same') return '';
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // Vite dev only — never bake localhost into production builds.
  if (import.meta.env.DEV) return 'http://localhost:4000';
  return '';
}

const API_URL = resolveApiUrl();

const TOKEN_KEY = 'florarie.token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

async function requestOnce<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    if (response.status === 401) setToken(null);
    let message =
      response.status === 401 ? 'Neautentificat' : `Eroare ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore non-JSON bodies (e.g. IIS default 401 page) */
    }
    if (response.status === 503) {
      throw Object.assign(new Error(message), { retryable: true });
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await requestOnce<T>(path, init);
  } catch (err) {
    // One automatic retry after SQL wake / brief outage.
    if (!(err as { retryable?: boolean })?.retryable) throw err;
    await new Promise((r) => setTimeout(r, 2500));
    return requestOnce<T>(path, init);
  }
}

export async function login(username: string, password: string): Promise<void> {
  const data = await request<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
}

/** Authenticated ping to wake Azure SQL after login (retries on 503). */
export async function wakeDatabase(): Promise<void> {
  await Promise.all([fetchCatalog(), fetchOrders()]);
}

export function logout(): void {
  setToken(null);
}

export function fetchCatalog(): Promise<Bouquet[]> {
  return request<Bouquet[]>('/api/bouquets');
}

export function saveBouquet(bouquet: Bouquet): Promise<Bouquet> {
  const method = 'POST';
  return request<Bouquet>('/api/bouquets', {
    method,
    body: JSON.stringify(bouquet),
  });
}

export function updateBouquet(bouquet: Bouquet): Promise<Bouquet> {
  return request<Bouquet>(`/api/bouquets/${encodeURIComponent(bouquet.id)}`, {
    method: 'PUT',
    body: JSON.stringify(bouquet),
  });
}

export function deleteBouquet(id: string): Promise<void> {
  return request<void>(`/api/bouquets/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchOrders(): Promise<Order[]> {
  return request<Order[]>('/api/orders');
}

export function createOrder(
  items: { bouquetId: string; quantity: number }[],
  options?: { invoiceOnly?: boolean },
): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      items,
      invoiceOnly: Boolean(options?.invoiceOnly),
    }),
  });
}

export function markBouquetMade(bouquetId: string, count: number): Promise<Order[]> {
  return request<Order[]>('/api/orders/mark-made', {
    method: 'POST',
    body: JSON.stringify({ bouquetId, count }),
  });
}

export function addBouquetToMake(bouquetId: string, count: number): Promise<Order[]> {
  return request<Order[]>('/api/orders/add-to-make', {
    method: 'POST',
    body: JSON.stringify({ bouquetId, count }),
  });
}

export function removeBouquetFromMake(
  bouquetId: string,
  count: number,
): Promise<Order[]> {
  return request<Order[]>('/api/orders/remove-from-make', {
    method: 'POST',
    body: JSON.stringify({ bouquetId, count }),
  });
}
