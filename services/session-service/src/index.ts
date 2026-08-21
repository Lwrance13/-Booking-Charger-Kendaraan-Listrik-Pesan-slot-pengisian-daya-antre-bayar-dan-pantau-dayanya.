import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import axios from 'axios'
import { v4 as uuid } from 'uuid'
import { envelope, problem, authMiddleware } from './shared'
import sessionsRaw from './charging_sessions.json'

const app    = express()
const PORT   = Number(process.env.PORT   ?? 8003)
const BS_URL = process.env.BS_URL ?? 'http://localhost:8002' // booking-service
const SS_URL = process.env.SS_URL ?? 'http://localhost:8001' // station-service
const BL_URL = process.env.BL_URL ?? 'http://localhost:8004' // billing-service

app.use(cors())
app.use(express.json())

const server = createServer(app)
const wss    = new WebSocketServer({ server, path: '/ws' })

const sessions: any[]                             = [...(sessionsRaw as any[])]
const activeClients = new Map<string, WebSocket[]>() // sessionId → [ws clients]
const bookingSessionMap = new Map<string, string>()  // bookingId → sessionId (idempotency)

// ── WebSocket: clients subscribe to session.{sessionId}.power ─────────
wss.on('connection', (ws, req) => {
  const sessionId = req.url?.split('/').pop() ?? ''
  if (!activeClients.has(sessionId)) activeClients.set(sessionId, [])
  activeClients.get(sessionId)!.push(ws)

  ws.on('close', () => {
    const list = activeClients.get(sessionId)?.filter(c => c !== ws) ?? []
    activeClients.set(sessionId, list)
  })

  ws.send(JSON.stringify({ type: 'connected', sessionId }))
})

// Push meter readings to all subscribers every 30s
setInterval(() => {
  const active = sessions.filter(s => s.status === 'active')
  active.forEach(session => {
    const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 60000
    const currentKwh = parseFloat((session.meterStart + (session.powerKw ?? 22) * elapsed / 60).toFixed(3))
    const durationMin = Math.round(elapsed)
    const estimatedCost = Math.round(currentKwh * (session.tariffPerKwh ?? 2500))

    session.currentKwh = currentKwh

    const payload = JSON.stringify({ type:'power.update', sessionId:session.session_id, currentKwh, durationMin, estimatedCost })
    activeClients.get(session.session_id)?.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload)
    })
  })
}, 30_000)

// ── POST /api/v1/sessions/start ──────────────────────────────────────────
app.post('/api/v1/sessions/start', authMiddleware, async (req, res) => {
  const { bookingId, connectorId } = req.body
  if (!bookingId) return problem(res, 400, 'missing-fields', 'Missing Fields', 'bookingId is required')

  // Idempotency: return existing session if bookingId already has a session
  if (bookingSessionMap.has(bookingId)) {
    const existing = sessions.find(s => s.session_id === bookingSessionMap.get(bookingId))
    return envelope(res, existing)
  }

  // 1. Validate booking via booking-service
  let booking: any
  try {
    const token = req.headers.authorization!
    const { data } = await axios.get(`${BS_URL}/api/v1/bookings/${bookingId}`, { headers: { Authorization: token } })
    booking = data.data
  } catch {
    return problem(res, 503, 'booking-unavailable', 'Booking Service Unavailable', 'Cannot verify booking')
  }

  if (!['confirmed', 'active'].includes(booking.status))
    return problem(res, 409, 'booking-not-active', 'Booking Not Active', `Booking status is ${booking.status}`)

  // 2. Mark slot as OCCUPIED in station-service
  try {
    const token = req.headers.authorization!
    await axios.patch(`${SS_URL}/api/v1/slots/${booking.slot_id}/status`,
      { status: 'OCCUPIED' }, { headers: { Authorization: token } })
  } catch { /* station-service update failed, proceed anyway */ }

  // 3. Create session
  const sessionId = `CS${String(sessions.length + 1).padStart(3, '0')}`
  const startedAt = new Date().toISOString()
  const newSession = {
    session_id: sessionId,
    booking_id: bookingId,
    user_id: booking.user_id,
    slot_id: booking.slot_id,
    station_id: booking.station_id,
    connector_id: connectorId,
    startedAt,
    status: 'active',
    meterStart: Math.random() * 5000 + 1000, // simulated meter reading kWh
    currentKwh: 0,
    powerKw: 22,
    tariffPerKwh: booking.tariff_per_kwh ?? 2500,
  }
  sessions.push(newSession)
  bookingSessionMap.set(bookingId, sessionId)

  // 4. Update booking status to ACTIVE
  try {
    const token = req.headers.authorization!
    await axios.patch(`${BS_URL}/api/v1/bookings/${bookingId}/status`,
      { status: 'active' }, { headers: { Authorization: token } })
  } catch {}

  return envelope(res, {
    sessionId, startedAt, status: 'active',
    meterStart: newSession.meterStart,
    wsUrl: `ws://localhost:${PORT}/ws/${sessionId}`,
  }, 201)
})

// ── GET /api/v1/sessions/:id ─────────────────────────────────────────────
app.get('/api/v1/sessions/:id', authMiddleware, (req, res) => {
  const session = sessions.find(s => s.session_id === req.params.id)
  if (!session) return problem(res, 404, 'not-found', 'Not Found', `Session ${req.params.id} not found`)
  return envelope(res, session)
})

// ── POST /api/v1/sessions/:id/stop ──────────────────────────────────────
app.post('/api/v1/sessions/:id/stop', authMiddleware, async (req, res) => {
  const idx = sessions.findIndex(s => s.session_id === req.params.id)
  if (idx === -1) return problem(res, 404, 'not-found', 'Not Found', `Session ${req.params.id} not found`)

  const session = sessions[idx]
  if (session.status !== 'active')
    return problem(res, 409, 'session-not-active', 'Session Not Active', 'Session is already stopped')

  const endedAt  = new Date().toISOString()
  const elapsed  = (Date.now() - new Date(session.startedAt).getTime()) / 3600000
  const kwhUsed  = parseFloat((session.powerKw * elapsed).toFixed(3))
  const meterEnd = session.meterStart + kwhUsed

  sessions[idx] = { ...session, status:'completed', endedAt, kwhUsed, meterEnd, durationMin: Math.round(elapsed*60) }

  const token = req.headers.authorization!

  // 1. Get tariff from station-service
  let tariffPerKwh = session.tariffPerKwh ?? 2500
  try {
    const { data } = await axios.get(`${SS_URL}/api/v1/tariffs/${session.slot_id}`)
    tariffPerKwh = data.data.tariffPerKwh
  } catch {}

  // 2. Release slot back to AVAILABLE
  try {
    await axios.patch(`${SS_URL}/api/v1/slots/${session.slot_id}/status`,
      { status: 'AVAILABLE' }, { headers: { Authorization: token } })
  } catch {}

  // 3. Create invoice via billing-service
  let invoiceId = null
  try {
    const { data } = await axios.post(`${BL_URL}/api/v1/invoices`, {
      sessionId: session.session_id,
      userId: session.user_id,
      kwhUsed, tariffPerKwh,
    }, { headers: { Authorization: token } })
    invoiceId = data.data.invoiceId
  } catch {}

  // Close WebSocket connections for this session
  activeClients.get(session.session_id)?.forEach(ws => ws.close())
  activeClients.delete(session.session_id)

  return envelope(res, { sessionId: session.session_id, status:'completed', kwhUsed, meterEnd, invoiceId })
})

server.listen(PORT, () => console.log(`⚡ session-service running on :${PORT} (WebSocket: ws://localhost:${PORT}/ws/:sessionId)`))
