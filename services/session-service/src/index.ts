import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import axios from 'axios'
import { v4 as uuid } from 'uuid'
import { envelope, problem, authMiddleware } from './shared'
import { query } from './db'

const app = express()
const PORT = Number(process.env.PORT ?? 8003)
const BS_URL = process.env.BS_URL ?? 'http://localhost:8002'
const SS_URL = process.env.SS_URL ?? 'http://localhost:8001'
const BL_URL = process.env.BL_URL ?? 'http://localhost:8004'
const WS_PATH_PREFIX = '/ws'

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'session-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

const server = createServer(app)
const wss = new WebSocketServer({ server })
const activeClients = new Map<string, WebSocket[]>()
const bookingSessionMap = new Map<string, string>()

const mapSessionRow = (row: any) => ({
  ...row,
  session_id: row.session_id ?? row.id,
  booking_id: row.booking_id,
  user_id: row.user_id,
  slot_id: row.slot_id,
  station_id: row.station_id,
  connector_id: row.connector_id,
  startedAt: row.started_at ?? row.startedAt,
  endedAt: row.ended_at ?? row.endedAt,
  meterStart: row.meter_start ?? row.meterStart,
  meterEnd: row.meter_end ?? row.meterEnd,
  kwhUsed: row.kwh_used ?? row.kwhUsed,
  durationMin: row.duration_min ?? row.durationMin,
  status: row.status,
  tariffPerKwh: row.tariff_per_kwh ?? row.tariffPerKwh,
  powerKw: row.power_kw ?? row.powerKw,
})

wss.on('connection', (ws, req) => {
  const requestPath = req.url?.split('?')[0] ?? ''
  if (!(requestPath === WS_PATH_PREFIX || requestPath.startsWith(`${WS_PATH_PREFIX}/`))) {
    ws.close(1008, 'Invalid WebSocket path')
    return
  }

  const sessionId = requestPath.startsWith(`${WS_PATH_PREFIX}/`)
    ? requestPath.slice(`${WS_PATH_PREFIX}/`.length)
    : ''

  if (!activeClients.has(sessionId)) activeClients.set(sessionId, [])
  activeClients.get(sessionId)!.push(ws)

  ws.on('close', () => {
    const list = activeClients.get(sessionId)?.filter((client) => client !== ws) ?? []
    activeClients.set(sessionId, list)
  })

  ws.send(JSON.stringify({ type: 'connected', sessionId }))
})

setInterval(async () => {
  const active = await query("SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at", [])
  for (const session of active.rows) {
    const row = mapSessionRow(session)
    const elapsed = (Date.now() - new Date(row.startedAt).getTime()) / 60000
    const currentKwh = parseFloat(((row.meterStart ?? 0) + ((row.powerKw ?? 22) * elapsed / 60)).toFixed(3))
    const durationMin = Math.round(elapsed)
    const estimatedCost = Math.round(currentKwh * (row.tariffPerKwh ?? 2500))

    const payload = JSON.stringify({ type: 'power.update', sessionId: row.session_id, currentKwh, durationMin, estimatedCost })
    activeClients.get(row.session_id)?.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload)
    })
  }
}, 30_000)

async function nextSessionId() {
  const result = await query("SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 3) AS INTEGER)), 0) + 1 AS next_id FROM sessions", [])
  return `CS${String(result.rows[0].next_id).padStart(3, '0')}`
}

app.post('/api/v1/sessions/start', authMiddleware, async (req, res) => {
  const { bookingId, connectorId } = req.body
  if (!bookingId) return problem(res, 400, 'missing-fields', 'Missing Fields', 'bookingId is required')

  if (bookingSessionMap.has(bookingId)) {
    const existing = await query('SELECT * FROM sessions WHERE id = $1', [bookingSessionMap.get(bookingId)])
    if (existing.rowCount) return envelope(res, mapSessionRow(existing.rows[0]))
  }

  let booking: any
  try {
    const token = req.headers.authorization!
    const { data } = await axios.get(`${BS_URL}/api/v1/bookings/${bookingId}`, { headers: { Authorization: token } })
    booking = data.data
  } catch {
    return problem(res, 503, 'booking-unavailable', 'Booking Service Unavailable', 'Cannot verify booking')
  }

  if (!['confirmed', 'active'].includes(booking.status)) {
    return problem(res, 409, 'booking-not-active', 'Booking Not Active', `Booking status is ${booking.status}`)
  }

  try {
    const token = req.headers.authorization!
    await axios.patch(`${SS_URL}/api/v1/slots/${booking.slot_id}/status`, { status: 'OCCUPIED' }, { headers: { Authorization: token } })
  } catch {}

  const sessionId = await nextSessionId()
  const startedAt = new Date().toISOString()
  const meterStart = Math.random() * 5000 + 1000
  const tariffPerKwh = booking.tariff_per_kwh ?? 2500

  await query(
    'INSERT INTO sessions (id, booking_id, user_id, slot_id, station_id, connector_id, started_at, meter_start, status, tariff_per_kwh, power_kw) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
    [sessionId, bookingId, booking.user_id, booking.slot_id, booking.station_id, connectorId ?? null, startedAt, meterStart, 'active', tariffPerKwh, 22],
  )

  bookingSessionMap.set(bookingId, sessionId)

  try {
    const token = req.headers.authorization!
    await axios.patch(`${BS_URL}/api/v1/bookings/${bookingId}/status`, { status: 'active' }, { headers: { Authorization: token } })
  } catch {}

  return envelope(res, {
    sessionId,
    startedAt,
    status: 'active',
    meterStart,
    wsUrl: `ws://localhost:${PORT}/ws/${sessionId}`,
  }, 201)
})

app.get('/api/v1/sessions/:id', authMiddleware, async (req, res) => {
  const result = await query('SELECT * FROM sessions WHERE id = $1', [req.params.id])
  if (!result.rowCount) {
    return problem(res, 404, 'not-found', 'Not Found', `Session ${req.params.id} not found`)
  }
  return envelope(res, mapSessionRow(result.rows[0]))
})

app.post('/api/v1/sessions/:id/stop', authMiddleware, async (req, res) => {
  const sessionResult = await query('SELECT * FROM sessions WHERE id = $1', [req.params.id])
  if (!sessionResult.rowCount) {
    return problem(res, 404, 'not-found', 'Not Found', `Session ${req.params.id} not found`)
  }

  const session = mapSessionRow(sessionResult.rows[0])
  if (session.status !== 'active') {
    return problem(res, 409, 'session-not-active', 'Session Not Active', 'Session is already stopped')
  }

  const endedAt = new Date().toISOString()
  const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 3600000
  const kwhUsed = parseFloat(((session.powerKw ?? 22) * elapsed).toFixed(3))
  const meterEnd = (session.meterStart ?? 0) + kwhUsed

  await query(
    'UPDATE sessions SET ended_at = $1, meter_end = $2, kwh_used = $3, duration_min = $4, status = $5 WHERE id = $6',
    [endedAt, meterEnd, kwhUsed, Math.round(elapsed * 60), 'completed', session.session_id],
  )

  const token = req.headers.authorization!

  let tariffPerKwh = session.tariffPerKwh ?? 2500
  try {
    const { data } = await axios.get(`${SS_URL}/api/v1/tariffs/${session.slot_id}`)
    tariffPerKwh = data.data.tariffPerKwh
  } catch {}

  try {
    await axios.patch(`${SS_URL}/api/v1/slots/${session.slot_id}/status`, { status: 'AVAILABLE' }, { headers: { Authorization: token } })
  } catch {}

  let invoiceId = null
  try {
    const { data } = await axios.post(`${BL_URL}/api/v1/invoices`, {
      sessionId: session.session_id,
      userId: session.user_id,
      kwhUsed,
      tariffPerKwh,
    }, { headers: { Authorization: token } })
    invoiceId = data.data.invoiceId
  } catch {}

  activeClients.get(session.session_id)?.forEach((ws) => ws.close())
  activeClients.delete(session.session_id)

  return envelope(res, { sessionId: session.session_id, status: 'completed', kwhUsed, meterEnd, invoiceId })
})


// ── Admin: GET /api/v1/admin/sessions (all sessions) ──────────────────────
app.get('/api/v1/admin/sessions', authMiddleware, async (_req, res) => {
  try {
    const result = await query('SELECT * FROM sessions ORDER BY started_at DESC LIMIT 100')
    return envelope(res, result.rows)
  } catch (e: any) {
    console.error('[admin/sessions] DB error:', e.message)
    return envelope(res, [])
  }
})

server.listen(PORT, () => console.log(`⚡ session-service running on :${PORT} (WebSocket: ws://localhost:${PORT}/ws/:sessionId)`))
