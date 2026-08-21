
// Dev: '' = relative URL proxied by Vite to each service port (8001-8004)
// Prod (Docker+Nginx): set VITE_API_URL=http://localhost
const API = (import.meta as any).env?.VITE_API_URL ?? ''

let _token = localStorage.getItem('auth_token') ?? ''
export function setToken(t: string) { _token = t; localStorage.setItem('auth_token', t) }
export function getToken() { return _token }

export async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...((_token) ? { Authorization: `Bearer ${_token}` } : {}),
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.title ?? err.detail ?? `HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? json
}

export const api = {
  // ── Auth ───────────────────────────────────────────────────────────────────
  getToken: (userId: string, role = 'admin') =>
    apiFetch('/auth/token', { method: 'POST', body: JSON.stringify({ userId, role }) }),

  // ── Stations ───────────────────────────────────────────────────────────────
  getStations:     (params = '') => apiFetch(`/api/v1/stations${params}`),
  getStation:      (id: string)  => apiFetch(`/api/v1/stations/${id}`),
  createStation:   (data: any)   => apiFetch('/api/v1/stations', { method: 'POST', body: JSON.stringify(data) }),
  updateStation:   (id: string, data: any) => apiFetch(`/api/v1/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStation:   (id: string)  => apiFetch(`/api/v1/stations/${id}`, { method: 'DELETE' }),

  // ── Slots ──────────────────────────────────────────────────────────────────
  getAdminSlots:   ()            => apiFetch('/api/v1/admin/slots'),
  createSlot:      (data: any)   => apiFetch('/api/v1/slots', { method: 'POST', body: JSON.stringify(data) }),
  updateSlot:      (id: string, data: any) => apiFetch(`/api/v1/slots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  patchSlotStatus: (id: string, status: string) => apiFetch(`/api/v1/slots/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteSlot:      (id: string)  => apiFetch(`/api/v1/slots/${id}`, { method: 'DELETE' }),

  // ── Bookings ───────────────────────────────────────────────────────────────
  getAdminBookings:(params = '') => apiFetch(`/api/v1/admin/bookings${params}`),
  cancelBooking:   (id: string)  => apiFetch(`/api/v1/bookings/${id}`, { method: 'DELETE' }),
  updateBookingStatus: (id: string, status: string) => apiFetch(`/api/v1/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ── Sessions ───────────────────────────────────────────────────────────────
  getAdminSessions:()            => apiFetch('/api/v1/admin/sessions'),

  // ── Invoices/Billing ───────────────────────────────────────────────────────
  getAdminInvoices:(params = '') => apiFetch(`/api/v1/admin/invoices${params}`),
  updateInvoiceStatus: (id: string, status: string) => apiFetch(`/api/v1/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}

// Auto-initialize admin token when web-admin loads
// Runs once; retries silently on failure (services may not be ready yet)
export async function initAdminAuth(): Promise<void> {
  if (_token) return  // already authenticated
  try {
    const res = await fetch('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'ADMIN001', role: 'admin' }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.token) { setToken(data.token); console.log('[admin] Authenticated ✅') }
    }
  } catch { /* station-service not ready */ }
}
