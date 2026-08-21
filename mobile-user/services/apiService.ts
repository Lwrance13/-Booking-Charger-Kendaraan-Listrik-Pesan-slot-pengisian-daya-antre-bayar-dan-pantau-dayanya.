// API base URL — update this for real device testing
// Codespaces tunnel: change to your tunnel URL
// Android emulator: use http://10.0.2.2
export const API_BASE = 'http://localhost'

let _token = ''

export function setAuthToken(t: string) { _token = t }

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...opts.headers,
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.title ?? json.detail ?? `HTTP ${res.status}`)
  return json.data ?? json
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






