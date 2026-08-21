// ─────────────────────────────────────────────────────────────────────────────
// API_BASE configuration for different environments:
//
//  Expo Go on real device (Codespaces):
//    Set to your Codespace forwarded URL for port 8001, e.g.:
//    https://xxx-8001.app.github.dev
//    (open Codespaces Ports tab → port 8001 → copy URL, remove trailing slash)
//
//  Android emulator (local): http://10.0.2.2
//  iOS Simulator (local):    http://localhost
//  Real device (local WiFi): http://[your-machine-IP]
// ─────────────────────────────────────────────────────────────────────────────
export const API_BASE = 'http://localhost'  // ← UPDATE THIS for real device

let _token = ''

export function setAuthToken(t: string) { _token = t }

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
        ...opts.headers,
      },
    })
    clearTimeout(timeout)
    const json = await res.json()
    if (!res.ok) throw new Error(json.title ?? json.detail ?? `HTTP ${res.status}`)
    return json.data ?? json
  } catch (e: any) {
    clearTimeout(timeout)
    if (e.name === 'AbortError' || e.message?.includes('Network') || e.message?.includes('fetch')) {
      throw new Error(
        `Backend tidak tersedia.\n\nPastikan services berjalan:\n` +
        `  cd services/station-service && npm run dev\n` +
        `  cd services/booking-service && npm run dev\n\n` +
        `Lalu update API_BASE di mobile-user/services/apiService.ts\n` +
        `dengan URL Codespace: https://[nama]-8001.app.github.dev`
      )
    }
    throw e
  }
}

export async function getToken(userId = 'USR042', role = 'user') {
  const data = await req<any>('/auth/token', { method: 'POST', body: JSON.stringify({ userId, role }) })
  _token = data.token ?? data
  return _token
}

export async function createBooking(payload: {
  stationId: string; slotId: string; startTime: string; endTime: string
}) {
  const idempKey = `mobile-${Date.now()}`
  return req<any>('/api/v1/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Idempotency-Key': idempKey },
  })
}

export async function startSession(bookingId: string, connectorId = 'CONN-1') {
  return req<any>('/api/v1/sessions/start', { method: 'POST', body: JSON.stringify({ bookingId, connectorId }) })
}

export async function stopSession(sessionId: string) {
  return req<any>(`/api/v1/sessions/${sessionId}/stop`, { method: 'POST', body: '{}' })
}

export async function payInvoice(invoiceId: string, paymentMethod: string, bookingId?: string) {
  return req<any>('/api/v1/payments', { method: 'POST', body: JSON.stringify({ invoiceId, paymentMethod, bookingId }) })
}

export async function getInvoice(invoiceId: string) {
  return req<any>(`/api/v1/invoices/${invoiceId}`)
}

export async function cancelBooking(bookingId: string) {
  return req<any>(`/api/v1/bookings/${bookingId}`, { method: 'DELETE' })
}






