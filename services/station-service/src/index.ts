import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { envelope, problem, authMiddleware } from './shared'
import stationsRaw from './stations.json'
import slotsRaw from './slots.json'
import { query } from './db'

const app = express()
const PORT = Number(process.env.PORT ?? 8001)

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'station-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

const TARIFFS: Record<string, number> = { CCS2: 2500, 'Type 2': 1500, CHAdeMO: 1650 }

const mapStationRow = (row: any) => ({
  ...row,
  station_id: row.station_id ?? row.id,
  station_name: row.station_name ?? row.name,
})

const mapSlotRow = (row: any) => ({
  ...row,
  slot_id: row.slot_id ?? row.id,
  station_id: row.station_id,
  connector_type: row.connector_type,
  power_kw: row.power_kw,
  slot_status: row.slot_status,
})

app.get('/api/v1/stations', async (_req, res) => {
  const { available, city } = _req.query as Record<string, string>
  let sql = `SELECT s.id AS station_id, s.name AS station_name, s.location, s.city, s.province, s.latitude, s.longitude, s.status, s.operator_id, s.total_slots FROM stations s`
  const params: any[] = []

  if (city) {
    sql += ' WHERE LOWER(s.city) LIKE LOWER($1)'
    params.push(`%${city}%`)
  }

  sql += ' ORDER BY s.id LIMIT 50'

  const stationResult = await query(sql, params)
  // Fallback to JSON seed data when PostgreSQL is not running
  const rawList = stationResult.rows.length > 0
    ? stationResult.rows.map(mapStationRow)
    : (stationsRaw as any[]).map(s => ({ ...s, station_id: s.station_id, station_name: s.station_name }))
  let list = rawList

  if (available === 'true') {
    const slotResult = await query('SELECT id AS slot_id, station_id, connector_type, power_kw, slot_status FROM slots WHERE slot_status = $1 ORDER BY station_id, id', ['available'])
    const availableStationIds = new Set(slotResult.rows.map((row: any) => row.station_id))
    list = list.filter((station: any) => availableStationIds.has(station.station_id))
  }

  const stationIds = list.map((station: any) => station.station_id)
  let slotRows: any[] = []
  if (stationIds.length) {
    const slotResult = await query('SELECT id AS slot_id, station_id, connector_type, power_kw, slot_status FROM slots WHERE station_id = ANY($1) ORDER BY station_id, id', [stationIds])
    // Fallback to JSON slots when DB empty
    slotRows = slotResult.rows.length > 0
      ? slotResult.rows.map(mapSlotRow)
      : (slotsRaw as any[]).filter((s: any) => stationIds.includes(s.station_id))
  }

  const slotsByStation = new Map<string, any[]>()
  for (const slot of slotRows) {
    if (!slotsByStation.has(slot.station_id)) slotsByStation.set(slot.station_id, [])
    slotsByStation.get(slot.station_id)!.push(slot)
  }

  const enriched = list.map((station: any) => {
    const stSlots = slotsByStation.get(station.station_id) ?? []
    return {
      ...station,
      availableSlots: stSlots.filter((slot: any) => slot.slot_status === 'available').length,
      totalSlots: stSlots.length,
      tariffPerKwh: TARIFFS.CCS2 ?? 2500,
    }
  })

  return envelope(res, enriched)
})

app.get('/api/v1/stations/:id', async (req, res) => {
  const stationResult = await query(
    'SELECT id AS station_id, name AS station_name, location, city, province, latitude, longitude, status, operator_id, total_slots FROM stations WHERE id = $1',
    [req.params.id],
  )

  if (!stationResult.rowCount) {
    return res.status(404).json({ type: '/errors/not-found', title: 'Not Found', status: 404, detail: 'Station not found' })
  }

  const station = mapStationRow(stationResult.rows[0])
  const slotResult = await query('SELECT id AS slot_id, station_id, connector_type, power_kw, slot_status FROM slots WHERE station_id = $1 ORDER BY id', [req.params.id])

  return envelope(res, { ...station, slots: slotResult.rows.map(mapSlotRow) })
})

app.get('/api/v1/slots/:id/availability', async (req, res) => {
  const slotResult = await query('SELECT id AS slot_id, station_id, connector_type, power_kw, slot_status FROM slots WHERE id = $1', [req.params.id])
  if (!slotResult.rowCount) {
    return res.status(404).json({ type: '/errors/not-found', title: 'Not Found', status: 404, detail: 'Slot not found' })
  }

  const slot = mapSlotRow(slotResult.rows[0])
  const tariffResult = await query('SELECT price_per_kwh FROM tariffs WHERE slot_id = $1 ORDER BY effective_from DESC LIMIT 1', [slot.slot_id])
  const tariffPerKwh = tariffResult.rowCount ? tariffResult.rows[0].price_per_kwh : (TARIFFS[slot.connector_type] ?? 2000)

  return envelope(res, {
    available: slot.slot_status === 'available',
    slotId: slot.slot_id,
    connectorType: slot.connector_type,
    powerKw: slot.power_kw,
    status: slot.slot_status,
    tariffPerKwh,
  })
})

app.patch('/api/v1/slots/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body as { status: string }
  const valid = ['AVAILABLE', 'OCCUPIED', 'FAULT', 'available', 'occupied', 'fault', 'reserved']
  if (!valid.includes(status)) {
    return res.status(400).json({ type: '/errors/invalid-status', title: 'Invalid Status', status: 400, detail: `Status must be one of ${valid.join(', ')}` })
  }

  const normalized = status.toLowerCase()
  const result = await query(
    'UPDATE slots SET slot_status = $1, updated_at = NOW() WHERE id = $2 RETURNING id AS slot_id, station_id, connector_type, power_kw, slot_status, created_at, updated_at',
    [normalized, req.params.id],
  )

  if (!result.rowCount) {
    return res.status(404).json({ type: '/errors/not-found', title: 'Not Found', status: 404, detail: 'Slot not found' })
  }

  return envelope(res, mapSlotRow(result.rows[0]))
})

app.get('/api/v1/tariffs/:slotId', async (req, res) => {
  const slotResult = await query('SELECT id AS slot_id, connector_type FROM slots WHERE id = $1', [req.params.slotId])
  if (!slotResult.rowCount) {
    return res.status(404).json({ type: '/errors/not-found', title: 'Not Found', status: 404, detail: 'Slot not found' })
  }

  const slot = mapSlotRow(slotResult.rows[0])
  const tariffResult = await query('SELECT price_per_kwh, currency, effective_from FROM tariffs WHERE slot_id = $1 ORDER BY effective_from DESC LIMIT 1', [slot.slot_id])
  const tariff = tariffResult.rowCount ? tariffResult.rows[0] : { price_per_kwh: TARIFFS[slot.connector_type] ?? 2000, currency: 'IDR', effective_from: '2026-01-01T00:00:00Z' }

  return envelope(res, {
    slotId: slot.slot_id,
    connectorType: slot.connector_type,
    tariffPerKwh: tariff.price_per_kwh,
    currency: tariff.currency,
    effectiveFrom: tariff.effective_from,
  })
})

import { generateToken } from './shared'
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


app.post('/auth/token', (req, res) => {
  const { userId, role } = req.body as { userId: string; role?: 'user' | 'admin' }
  if (!userId) return res.status(400).json({ error: 'userId required' })
  return res.json({ token: generateToken(userId, role ?? 'user'), expiresIn: '24h' })
})


// ── Admin CRUD: POST /api/v1/stations ───────────────────────────────────────
app.post('/api/v1/stations', authMiddleware, async (req, res) => {
  const { station_id, station_name, location, city, province, latitude, longitude, status } = req.body
  if (!station_id || !station_name)
    return problem(res, 400, 'missing-fields', 'Missing Fields', 'station_id and station_name are required')
  try {
    const result = await query(
      `INSERT INTO stations (id, name, location, city, province, latitude, longitude, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [station_id, station_name, location ?? '', city ?? '', province ?? '', latitude ?? 0, longitude ?? 0, status ?? 'active']
    )
    return envelope(res, result.rows[0], 201)
  } catch (e: any) {
    if (e.code === '23505') return problem(res, 409, 'duplicate', 'Duplicate', `Station ${station_id} already exists`)
    return problem(res, 500, 'db-error', 'DB Error', e.message)
  }
})

// ── Admin CRUD: PUT /api/v1/stations/:id ─────────────────────────────────────
app.put('/api/v1/stations/:id', authMiddleware, async (req, res) => {
  const { station_name, location, city, province, latitude, longitude, status } = req.body
  try {
    const result = await query(
      `UPDATE stations SET name=COALESCE($1,name), location=COALESCE($2,location),
       city=COALESCE($3,city), province=COALESCE($4,province),
       latitude=COALESCE($5,latitude), longitude=COALESCE($6,longitude),
       status=COALESCE($7,status), updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [station_name, location, city, province, latitude, longitude, status, req.params.id]
    )
    if (result.rowCount === 0) return problem(res, 404, 'not-found', 'Not Found', `Station ${req.params.id} not found`)
    return envelope(res, result.rows[0])
  } catch (e: any) { return problem(res, 500, 'db-error', 'DB Error', e.message) }
})

// ── Admin CRUD: DELETE /api/v1/stations/:id ──────────────────────────────────
app.delete('/api/v1/stations/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM stations WHERE id=$1 RETURNING id', [req.params.id])
    if (result.rowCount === 0) return problem(res, 404, 'not-found', 'Not Found', `Station ${req.params.id} not found`)
    return envelope(res, { deleted: result.rows[0].id })
  } catch (e: any) { return problem(res, 500, 'db-error', 'DB Error', e.message) }
})

// ── Admin CRUD: POST /api/v1/slots ───────────────────────────────────────────
app.post('/api/v1/slots', authMiddleware, async (req, res) => {
  const { slot_id, station_id, connector_type, power_kw } = req.body
  if (!slot_id || !station_id || !connector_type || !power_kw)
    return problem(res, 400, 'missing-fields', 'Missing Fields', 'slot_id, station_id, connector_type, power_kw required')
  try {
    const result = await query(
      `INSERT INTO slots (id, station_id, connector_type, power_kw, slot_status)
       VALUES ($1,$2,$3,$4,'available') RETURNING *`,
      [slot_id, station_id, connector_type, Number(power_kw)]
    )
    return envelope(res, result.rows[0], 201)
  } catch (e: any) {
    if (e.code === '23505') return problem(res, 409, 'duplicate', 'Duplicate', `Slot ${slot_id} already exists`)
    return problem(res, 500, 'db-error', 'DB Error', e.message)
  }
})

// ── Admin CRUD: PUT /api/v1/slots/:id ────────────────────────────────────────
app.put('/api/v1/slots/:id', authMiddleware, async (req, res) => {
  const { connector_type, power_kw, slot_status } = req.body
  try {
    const result = await query(
      `UPDATE slots SET connector_type=COALESCE($1,connector_type),
       power_kw=COALESCE($2,power_kw), slot_status=COALESCE($3,slot_status), updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [connector_type, power_kw, slot_status, req.params.id]
    )
    if (result.rowCount === 0) return problem(res, 404, 'not-found', 'Not Found', `Slot ${req.params.id} not found`)
    return envelope(res, result.rows[0])
  } catch (e: any) { return problem(res, 500, 'db-error', 'DB Error', e.message) }
})

// ── Admin CRUD: DELETE /api/v1/slots/:id ─────────────────────────────────────
app.delete('/api/v1/slots/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('DELETE FROM slots WHERE id=$1 RETURNING id', [req.params.id])
    if (result.rowCount === 0) return problem(res, 404, 'not-found', 'Not Found', `Slot ${req.params.id} not found`)
    return envelope(res, { deleted: result.rows[0].id })
  } catch (e: any) { return problem(res, 500, 'db-error', 'DB Error', e.message) }
})

// ── Admin: GET /api/v1/admin/slots (all slots with meter data) ───────────────
app.get('/api/v1/admin/slots', authMiddleware, async (_req, res) => {
  try {
    const result = await query('SELECT * FROM slots ORDER BY station_id, id')
    return envelope(res, result.rows.length > 0 ? result.rows : (stationsRaw as any[]))
  } catch (e: any) { return problem(res, 500, 'db-error', 'DB Error', e.message) }
})

app.listen(PORT, () => console.log(`🔌 station-service running on :${PORT}`))
