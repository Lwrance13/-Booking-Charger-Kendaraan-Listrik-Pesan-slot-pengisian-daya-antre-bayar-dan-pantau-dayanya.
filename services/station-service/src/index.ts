import express from 'express'
import cors from 'cors'
import { envelope, authMiddleware } from './shared'

import stationsRaw from './stations.json'
import slotsRaw    from './slots.json'

const app  = express()
const PORT = process.env.PORT ?? 8001

app.use(cors())
app.use(express.json())

// In-memory store (Data & Persistence Engineer will replace with PostgreSQL)
export const stations: any[] = [...(stationsRaw as any[])]
export const slots:    any[] = [...(slotsRaw    as any[])]

// Tariffs derived from slots (in real system: own Tariff table)
const TARIFFS: Record<string,number> = { CCS2:2500, 'Type 2':1500, CHAdeMO:1650 }

// ── GET /api/v1/stations ────────────────────────────────────────────────
app.get('/api/v1/stations', (_req, res) => {
  const { available, city, lat, lng } = _req.query as Record<string,string>
  let list = stations

  if (city) list = list.filter(s => s.city?.toLowerCase().includes(city.toLowerCase()))

  if (available === 'true') {
    list = list.filter(s => {
      const stSlots = slots.filter(sl => sl.station_id === s.station_id)
      return stSlots.some(sl => sl.slot_status === 'available')
    })
  }

  // Enrich with slot summary
  const enriched = list.slice(0, 50).map(s => {
    const stSlots = slots.filter(sl => sl.station_id === s.station_id)
    return {
      ...s,
      availableSlots: stSlots.filter(sl => sl.slot_status === 'available').length,
      totalSlots: stSlots.length,
      tariffPerKwh: TARIFFS['CCS2'],
    }
  })

  return envelope(res, enriched)
})

// ── GET /api/v1/stations/:id ────────────────────────────────────────────
app.get('/api/v1/stations/:id', (req, res) => {
  const station = stations.find(s => s.station_id === req.params.id)
  if (!station) return res.status(404).json({ type:'/errors/not-found', title:'Not Found', status:404, detail:'Station not found' })
  const stSlots = slots.filter(sl => sl.station_id === req.params.id)
  return envelope(res, { ...station, slots: stSlots })
})

// ── GET /api/v1/slots/:id/availability ──────────────────────────────────
app.get('/api/v1/slots/:id/availability', (req, res) => {
  const slot = slots.find(s => s.slot_id === req.params.id)
  if (!slot) return res.status(404).json({ type:'/errors/not-found', title:'Not Found', status:404, detail:'Slot not found' })
  return envelope(res, {
    available: slot.slot_status === 'available',
    slotId: slot.slot_id,
    connectorType: slot.connector_type,
    powerKw: slot.power_kw,
    status: slot.slot_status,
    tariffPerKwh: TARIFFS[slot.connector_type] ?? 2000,
  })
})

// ── PATCH /api/v1/slots/:id/status ──────────────────────────────────────
app.patch('/api/v1/slots/:id/status', authMiddleware, (req, res) => {
  const idx = slots.findIndex(s => s.slot_id === req.params.id)
  if (idx === -1) return res.status(404).json({ type:'/errors/not-found', title:'Not Found', status:404, detail:'Slot not found' })
  const { status } = req.body as { status: string }
  const valid = ['AVAILABLE','OCCUPIED','FAULT','available','occupied','fault','reserved']
  if (!valid.includes(status)) return res.status(400).json({ type:'/errors/invalid-status', title:'Invalid Status', status:400, detail:`Status must be one of ${valid.join(', ')}` })
  slots[idx].slot_status = status.toLowerCase()
  return envelope(res, slots[idx])
})

// ── GET /api/v1/tariffs/:slotId ─────────────────────────────────────────
app.get('/api/v1/tariffs/:slotId', (req, res) => {
  const slot = slots.find(s => s.slot_id === req.params.slotId)
  if (!slot) return res.status(404).json({ type:'/errors/not-found', title:'Not Found', status:404, detail:'Slot not found' })
  return envelope(res, {
    slotId: slot.slot_id,
    connectorType: slot.connector_type,
    tariffPerKwh: TARIFFS[slot.connector_type] ?? 2000,
    currency: 'IDR',
    effectiveFrom: '2026-01-01T00:00:00Z',
  })
})

// ── Auth token endpoint (demo — skip in production) ──────────────────────
import { generateToken } from './shared'
app.post('/auth/token', (req, res) => {
  const { userId, role } = req.body as { userId:string; role?:'user'|'admin' }
  if (!userId) return res.status(400).json({ error: 'userId required' })
  return res.json({ token: generateToken(userId, role ?? 'user'), expiresIn: '24h' })
})

app.listen(PORT, () => console.log(`🔌 station-service running on :${PORT}`))
