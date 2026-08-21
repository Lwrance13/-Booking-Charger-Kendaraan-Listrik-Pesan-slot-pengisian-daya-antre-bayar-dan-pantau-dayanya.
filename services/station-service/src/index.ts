import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { envelope, authMiddleware } from './shared'
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
  let list = stationResult.rows.map(mapStationRow)

  if (available === 'true') {
    const slotResult = await query('SELECT id AS slot_id, station_id, connector_type, power_kw, slot_status FROM slots WHERE slot_status = $1 ORDER BY station_id, id', ['available'])
    const availableStationIds = new Set(slotResult.rows.map((row: any) => row.station_id))
    list = list.filter((station: any) => availableStationIds.has(station.station_id))
  }

  const stationIds = list.map((station: any) => station.station_id)
  let slotRows: any[] = []
  if (stationIds.length) {
    const slotResult = await query('SELECT id AS slot_id, station_id, connector_type, power_kw, slot_status FROM slots WHERE station_id = ANY($1) ORDER BY station_id, id', [stationIds])
    slotRows = slotResult.rows.map(mapSlotRow)
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
app.post('/auth/token', (req, res) => {
  const { userId, role } = req.body as { userId: string; role?: 'user' | 'admin' }
  if (!userId) return res.status(400).json({ error: 'userId required' })
  return res.json({ token: generateToken(userId, role ?? 'user'), expiresIn: '24h' })
})

app.listen(PORT, () => console.log(`🔌 station-service running on :${PORT}`))
