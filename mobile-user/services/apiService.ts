// ─────────────────────────────────────────────────────────────────────────────
// Ubah satu baris ini untuk berganti environment:
//   Codespaces: https://[nama]-8001.app.github.dev
//   Android emulator: http://10.0.2.2
//   iOS Simulator: http://localhost
// ─────────────────────────────────────────────────────────────────────────────
export const API_BASE = 'https://curly-giggle-699v7x5p666j3444p-8001.app.github.dev'

// Derive semua service URLs dari API_BASE (hanya ganti port)
const B8002 = API_BASE.replace('-8001.', '-8002.')  // booking-service
const B8003 = API_BASE.replace('-8001.', '-8003.')  // session-service
const B8004 = API_BASE.replace('-8001.', '-8004.')  // billing-service

let _token = ''

export function setAuthToken(t: string) { _token = t }

async function req<T>(baseUrl: string, path: string, opts: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${baseUrl}${path}`, {
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
        `Tidak bisa terhubung ke backend.\n\n` +
        `Pastikan services jalan (./start.sh)\n` +
        `dan API_BASE di apiService.ts sudah benar:\n${baseUrl}`
      )
    }
    throw e
  }
}

export async function getToken(userId = 'USR042', role = 'user') {
  const data = await req<any>(API_BASE, '/auth/token', { method: 'POST', body: JSON.stringify({ userId, role }) })
  _token = data.token ?? data
  return _token
}

export async function createBooking(payload: {
  stationId: string; slotId: string; startTime: string; endTime: string
}) {
  const idempKey = `mobile-${Date.now()}`
  return req<any>(B8002, '/api/v1/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Idempotency-Key': idempKey },
  })
}

export async function startSession(bookingId: string, connectorId = 'CONN-1') {
  return req<any>(B8003, '/api/v1/sessions/start', { method: 'POST', body: JSON.stringify({ bookingId, connectorId }) })
}

export async function stopSession(sessionId: string) {
  return req<any>(B8003, `/api/v1/sessions/${sessionId}/stop`, { method: 'POST', body: '{}' })
}

export async function payInvoice(invoiceId: string, paymentMethod: string, bookingId?: string) {
  return req<any>(B8004, '/api/v1/payments', { method: 'POST', body: JSON.stringify({ invoiceId, paymentMethod, bookingId }) })
}

export async function getInvoice(invoiceId: string) {
  return req<any>(B8004, `/api/v1/invoices/${invoiceId}`)
}

export async function cancelBooking(bookingId: string) {
  return req<any>(B8002, `/api/v1/bookings/${bookingId}`, { method: 'DELETE' })
}







// ── Read functions — fetches live data from backend API ──────────────────────
export async function getStations() {
  return req<any[]>(API_BASE, '/api/v1/stations?available=true')
}

export async function getMyBookings() {
  await getToken()
  return req<any[]>(B8002, '/api/v1/bookings')
}

export async function getMyInvoiceHistory() {
  await getToken()
  return req<any[]>(B8004, `/api/v1/payments/history/USR042`)
}

export async function getSlotAvailability(slotId: string) {
  return req<any>(API_BASE, `/api/v1/slots/${slotId}/availability`)
}
