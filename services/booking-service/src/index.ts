import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { v4 as uuid } from 'uuid'
import { envelope, problem, authMiddleware, RedisMock } from './shared'
import bookingsRaw from './bookings.json'

const app    = express()
const PORT   = process.env.PORT   ?? 8002
const SS_URL = process.env.SS_URL ?? 'http://localhost:8001' // station-service

app.use(cors())
app.use(express.json())

const bookings: any[]   = [...(bookingsRaw as any[])]
const idempotencyCache  = new Map<string, any>() // key → response snapshot
const redis             = new RedisMock()

// Clean up Redis expired keys every minute
setInterval(() => redis.gc(), 60_000)

// No-show cron: auto-cancel bookings 15 min after scheduled_start if still CONFIRMED
setInterval(() => {
  const now = Date.now()
  bookings.forEach(b => {
    if (b.status !== 'confirmed') return
    const startMs = new Date(b.scheduled_start).getTime()
    if (now > startMs + 15 * 60 * 1000) {
      b.status = 'cancelled'
      b.cancelReason = 'NO_SHOW_AUTO_RELEASE'
      console.log(`[no-show] booking ${b.booking_id} auto-cancelled`)
    }
  })
}, 30_000) // check every 30s

// ── POST /api/v1/bookings ────────────────────────────────────────────────
app.post('/api/v1/bookings', authMiddleware, async (req, res) => {
  const idempKey = req.headers['idempotency-key'] as string
  if (idempKey && idempotencyCache.has(idempKey)) {
    return res.status(200).json(idempotencyCache.get(idempKey)) // replay cached response
  }

  const { stationId, slotId, startTime, endTime } = req.body
  if (!stationId || !slotId || !startTime || !endTime)
    return problem(res, 400, 'missing-fields', 'Missing Fields', 'stationId, slotId, startTime, endTime are required')

  // 1. Check slot availability via station-service
  let slotInfo: any
  try {
    const { data } = await axios.get(`${SS_URL}/api/v1/slots/${slotId}/availability`)
    slotInfo = data.data
  } catch {
    return problem(res, 503, 'station-unavailable', 'Station Service Unavailable', 'Cannot verify slot availability')
  }

  if (!slotInfo.available)
    return problem(res, 409, 'slot-unavailable', 'Slot Not Available', `Slot ${slotId} is currently ${slotInfo.status}`)

  // 2. Redis SETNX slot lock (ADR-004) — lock per slot per hour block
  const start = new Date(startTime)
  const end   = new Date(endTime)
  const requestId = uuid()
  const lockKeys: string[] = []

  for (let h = start.getHours(); h <= end.getHours(); h++) {
    const dateStr = start.toISOString().slice(0, 10)
    const key = `lock:slot:${slotId}:${dateStr}:${h}`
    if (!redis.setnx(key, requestId, 300)) {
      // Release any locks already acquired
      lockKeys.forEach(k => redis.del(k, requestId))
      return problem(res, 409, 'slot-locked', 'Slot Locked', 'Slot is being booked by another user. Try again in a moment.')
    }
    lockKeys.push(key)
  }

  // 3. Create booking record
  const bookingId = `BK${String(bookings.length + 1).padStart(3, '0')}`
  const user = (req as any).user
  const newBooking = {
    booking_id: bookingId,
    user_id: user.userId,
    station_id: stationId,
    slot_id: slotId,
    booking_time: new Date().toISOString(),
    scheduled_start: startTime,
    scheduled_end: endTime,
    status: 'confirmed',
    qr_code: `QR-${bookingId}-${uuid().slice(0,8).toUpperCase()}`,
    tariff_per_kwh: slotInfo.tariffPerKwh,
  }
  bookings.push(newBooking)

  // 4. Release Redis locks (booking saved to DB)
  lockKeys.forEach(k => redis.del(k, requestId))

  const response = envelope(res, { bookingId, status: 'confirmed', qrCode: newBooking.qr_code }, 201)

  // Cache for idempotency
  if (idempKey) idempotencyCache.set(idempKey, {
    data: { bookingId, status: 'confirmed', qrCode: newBooking.qr_code },
    meta: { requestId, timestamp: new Date().toISOString() }, error: null
  })

  return response
})

// ── GET /api/v1/bookings/:id ─────────────────────────────────────────────
app.get('/api/v1/bookings/:id', authMiddleware, (req, res) => {
  const booking = bookings.find(b => b.booking_id === req.params.id)
  if (!booking) return problem(res, 404, 'not-found', 'Not Found', `Booking ${req.params.id} not found`)
  return envelope(res, booking)
})

// ── PATCH /api/v1/bookings/:id/status ───────────────────────────────────
app.patch('/api/v1/bookings/:id/status', authMiddleware, (req, res) => {
  const idx = bookings.findIndex(b => b.booking_id === req.params.id)
  if (idx === -1) return problem(res, 404, 'not-found', 'Not Found', `Booking ${req.params.id} not found`)
  const { status } = req.body as { status: string }
  bookings[idx].status = status
  bookings[idx].updatedAt = new Date().toISOString()
  return envelope(res, bookings[idx])
})

// ── DELETE /api/v1/bookings/:id (cancel) ────────────────────────────────
app.delete('/api/v1/bookings/:id', authMiddleware, (req, res) => {
  const idx = bookings.findIndex(b => b.booking_id === req.params.id)
  if (idx === -1) return problem(res, 404, 'not-found', 'Not Found', `Booking ${req.params.id} not found`)
  if (['completed','active'].includes(bookings[idx].status))
    return problem(res, 409, 'cannot-cancel', 'Cannot Cancel', 'Active or completed bookings cannot be cancelled')
  bookings[idx].status = 'cancelled'
  bookings[idx].cancelledAt = new Date().toISOString()
  return envelope(res, { bookingId: req.params.id, status: 'cancelled' })
})

// ── GET /api/v1/bookings (list user bookings) ────────────────────────────
app.get('/api/v1/bookings', authMiddleware, (req, res) => {
  const user   = (req as any).user
  const status = req.query.status as string
  let list = bookings.filter(b => b.user_id === user.userId)
  if (status) list = list.filter(b => b.status === status)
  return envelope(res, list)
})

app.listen(PORT, () => console.log(`📅 booking-service running on :${PORT}`))
