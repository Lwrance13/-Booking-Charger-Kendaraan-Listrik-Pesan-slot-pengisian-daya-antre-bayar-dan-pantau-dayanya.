import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { v4 as uuid } from 'uuid'
import bookingsRaw from './bookings.json'
import { envelope, problem, authMiddleware } from './shared'
import { query } from './db'

const app = express()
const PORT = Number(process.env.PORT ?? 8002)
const SS_URL = process.env.SS_URL ?? 'http://localhost:8001'

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'booking-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// Redis with graceful fallback: tries real Redis, falls back to in-memory mock (ADR-004)
import IORedis from 'ioredis'
import { RedisMock } from './shared'
// Global crash guard — prevent unhandled rejections from killing the process
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message ?? String(reason)
  if (msg.includes('ECONNREFUSED') || msg.includes('connect') || msg.includes('pool')) {
    console.warn('[guard] Ignored unhandled rejection (DB/Redis connection):', msg.slice(0, 80))
  } else {
    console.error('[guard] Unhandled rejection:', msg)
  }
})
process.on('uncaughtException', (err: Error) => {
  if (err.message?.includes('ECONNREFUSED') || err.message?.includes('connect')) {
    console.warn('[guard] Ignored uncaught exception (connection error):', err.message.slice(0, 80))
  } else {
    console.error('[guard] Uncaught exception:', err)
    process.exit(1)
  }
})



const redisMock = new RedisMock()
const ioredis   = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect:          false,
  connectTimeout:       2000,
  maxRetriesPerRequest: 0,
  enableOfflineQueue:   false,
})
ioredis.on('error', () => { /* suppress — we fall back to mock */ })

// redis proxy: ioredis when connected, mock otherwise
const redis = {
  set: async (k: string, v: string, ex: string, ttl: number, nx: string) => {
    try { return await ioredis.set(k, v, ex as any, ttl, nx as any) }
    catch { return redisMock.set(k, v, ex, ttl, nx) }
  },
  get: async (k: string) => {
    try { return await ioredis.get(k) }
    catch { return redisMock.get(k) }
  },
  del: async (k: string) => {
    try { return await ioredis.del(k) }
    catch { redisMock.del(k, ''); return 1 }
  },
}
let useRealRedis = false
ioredis.on('ready', () => { useRealRedis = true; console.log('[redis] Real Redis connected ✅') })
ioredis.on('error', () => { useRealRedis = false })

const mapBookingRow = (row: any) => ({
  ...row,
  booking_id: row.booking_id ?? row.id,
  user_id: row.user_id,
  station_id: row.station_id,
  slot_id: row.slot_id,
  booking_time: row.booking_time,
  scheduled_start: row.scheduled_start,
  scheduled_end: row.scheduled_end,
  status: row.status,
  qr_code: row.qr_code,
  tariff_per_kwh: row.tariff_per_kwh,
  cancel_reason: row.cancel_reason,
})

async function nextId(prefix: string) {
  const result = await query(`SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 3) AS INTEGER)), 0) + 1 AS next_id FROM bookings`, [])
  return `${prefix}${String(result.rows[0].next_id).padStart(3, '0')}`
}

setInterval(async () => {
  const result = await query("SELECT id AS booking_id, scheduled_start, status FROM bookings WHERE status = 'confirmed' AND scheduled_start < NOW() - INTERVAL '15 minutes'", [])
  for (const booking of result.rows) {
    await query("UPDATE bookings SET status = 'cancelled', cancel_reason = 'NO_SHOW_AUTO_RELEASE', updated_at = NOW() WHERE id = $1", [booking.booking_id])
    console.log(`[no-show] booking ${booking.booking_id} auto-cancelled`)
  }
}, 30_000)

app.post('/api/v1/bookings', authMiddleware, async (req, res) => {
  const idempKey = req.headers['idempotency-key'] as string
  if (idempKey) {
    const existing = await query('SELECT response_snapshot FROM idempotency_keys WHERE key = $1', [idempKey])
    if (existing.rowCount) {
      return res.status(200).json(existing.rows[0].response_snapshot)
    }
  }

  const { stationId, slotId, startTime, endTime } = req.body
  if (!stationId || !slotId || !startTime || !endTime) {
    return problem(res, 400, 'missing-fields', 'Missing Fields', 'stationId, slotId, startTime, endTime are required')
  }

  let slotInfo: any
  try {
    const { data } = await axios.get(`${SS_URL}/api/v1/slots/${slotId}/availability`)
    slotInfo = data.data
  } catch {
    return problem(res, 503, 'station-unavailable', 'Station Service Unavailable', 'Cannot verify slot availability')
  }

  if (!slotInfo.available) {
    return problem(res, 409, 'slot-unavailable', 'Slot Not Available', `Slot ${slotId} is currently ${slotInfo.status}`)
  }

  const start = new Date(startTime)
  const end = new Date(endTime)
  const requestId = uuid()
  const lockKeys: string[] = []

  for (let h = start.getHours(); h <= end.getHours(); h++) {
    const dateStr = start.toISOString().slice(0, 10)
    const key = `lock:slot:${slotId}:${dateStr}:${h}`
    const locked = await redis.set(key, requestId, 'EX', 300, 'NX')
    // null = success in ioredis, true = success in RedisMock
    if (!locked) {
      for (const keyToRelease of lockKeys) {
        const currentOwner = await redis.get(keyToRelease)
        if (currentOwner === requestId) await redis.del(keyToRelease)
      }
      return problem(res, 409, 'slot-locked', 'Slot Locked', 'Slot is being booked by another user. Try again in a moment.')
    }
    lockKeys.push(key)
  }

  const bookingId = await nextId('BK')
  const user = (req as any).user
  const qrCode = `QR-${bookingId}-${uuid().slice(0, 8).toUpperCase()}`

  await query(
    'INSERT INTO bookings (id, user_id, station_id, slot_id, booking_time, scheduled_start, scheduled_end, status, qr_code, tariff_per_kwh, cancel_reason) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, NULL)',
    [bookingId, user.userId, stationId, slotId, startTime, endTime, 'confirmed', qrCode, slotInfo.tariffPerKwh],
  )

  for (const key of lockKeys) {
    const currentOwner = await redis.get(key)
    if (currentOwner === requestId) await redis.del(key)
  }

  const payload = {
    data: { bookingId, status: 'confirmed', qrCode },
    meta: { requestId, timestamp: new Date().toISOString() },
    error: null,
  }

  if (idempKey) {
    await query('INSERT INTO idempotency_keys (key, response_snapshot) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [idempKey, payload])
  }

  return envelope(res, { bookingId, status: 'confirmed', qrCode }, 201)
})

app.get('/api/v1/bookings/:id', authMiddleware, async (req, res) => {
  const result = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id])
  if (!result.rowCount) {
    return problem(res, 404, 'not-found', 'Not Found', `Booking ${req.params.id} not found`)
  }
  return envelope(res, mapBookingRow(result.rows[0]))
})

app.patch('/api/v1/bookings/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body as { status: string }
  const result = await query(
    'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, req.params.id],
  )

  if (!result.rowCount) {
    return problem(res, 404, 'not-found', 'Not Found', `Booking ${req.params.id} not found`)
  }

  return envelope(res, mapBookingRow(result.rows[0]))
})

app.delete('/api/v1/bookings/:id', authMiddleware, async (req, res) => {
  const existing = await query('SELECT status FROM bookings WHERE id = $1', [req.params.id])
  if (!existing.rowCount) {
    return problem(res, 404, 'not-found', 'Not Found', `Booking ${req.params.id} not found`)
  }

  if (['completed', 'active'].includes(existing.rows[0].status)) {
    return problem(res, 409, 'cannot-cancel', 'Cannot Cancel', 'Active or completed bookings cannot be cancelled')
  }

  const result = await query(
    "UPDATE bookings SET status = 'cancelled', cancel_reason = 'USER_CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *",
    [req.params.id],
  )

  return envelope(res, { bookingId: req.params.id, status: 'cancelled' })
})

app.get('/api/v1/bookings', authMiddleware, async (req, res) => {
  const user = (req as any).user
  const status = req.query.status as string
  let sql = 'SELECT * FROM bookings WHERE user_id = $1'
  const params: any[] = [user.userId]

  if (status) {
    sql += ' AND status = $2'
    params.push(status)
  }

  sql += ' ORDER BY booking_time DESC'
  const result = await query(sql, params)
  const fallback = (bookingsRaw as any[]).filter(b => b.user_id === user.userId)
  return envelope(res, result.rows.length > 0 ? result.rows.map(mapBookingRow) : fallback)
})


// ── Admin: GET /api/v1/admin/bookings (all bookings) ───────────────────────
app.get('/api/v1/admin/bookings', authMiddleware, async (req, res) => {
  const { status, station_id, user_id } = req.query as Record<string, string>
  let sql = 'SELECT * FROM bookings WHERE 1=1'
  const params: any[] = []
  if (status)     { params.push(status);     sql += ` AND status = $${params.length}` }
  if (station_id) { params.push(station_id); sql += ` AND station_id = $${params.length}` }
  if (user_id)    { params.push(user_id);    sql += ` AND user_id = $${params.length}` }
  sql += ' ORDER BY booking_time DESC'
  try {
    const result = await query(sql, params)
    return envelope(res, result.rows.length > 0 ? result.rows : (bookingsRaw as any[]))
  } catch (e: any) {
    return envelope(res, bookingsRaw as any[])
  }
})

app.listen(PORT, () => console.log(`📅 booking-service running on :${PORT}`))
