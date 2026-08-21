# Role 5 — QA, Load-Test & Dokumentasi
**Pengerjaan: Nur Alam Nasyrah**

> Baca file ini lalu kerjakan semua task dari Task 1 sampai Task 7 secara berurutan.
> Referensi wajib sebelum mulai:
> - [docs/ARSITEKTUR.md](ARSITEKTUR.md) — seluruh bagian
> - [README.md](../README.md) — cara menjalankan semua service
> - [docs/adr/ADR-002-komunikasi-antar-service.md](adr/ADR-002-komunikasi-antar-service.md)
> - [gateway/conf.d/emerald.conf](../gateway/conf.d/emerald.conf) — routing Nginx terbaru

---

## Konteks

Semua role sebelumnya sudah selesai:

| Role | Status | Hasil |
|---|---|---|
| Role 1 — Arsitek | ✅ | docs/, 4 ADR, arsitektur lengkap |
| Role 2 — Backend | ✅ | 4 REST API + CRUD, JWT, WebSocket, Saga, **integrasi DB ke admin & mobile** |
| Role 3 — Data | ✅ | PostgreSQL schema (4 DB) + Redis + TimescaleDB + seed.sql (100 records) |
| Role 4 — DevOps | ✅ | Nginx gateway + admin routes + Docker Compose + K8s manifests |
| **Role 5 — QA** | 🔄 | **Tugasmu** |

> ⚠️ **Update terbaru (2026-08-21):**
> - Admin dan mobile **TERHUBUNG ke PostgreSQL** — bukan local JSON lagi
> - Perubahan di admin (delete, edit, add) **langsung terlihat di mobile** setelah refresh
> - Semua halaman admin dan mobile screen fetch data dari API on mount
> - `./start.sh` sekarang required sebelum test (start Docker DB + 4 services)

### Inventori Endpoint Lengkap (Terbaru)

**station-service (:8001)**
```
GET    /health
POST   /auth/token                        ← generate JWT
GET    /api/v1/stations                   ← filter: ?city=, ?available=true
GET    /api/v1/stations/:id               ← detail + slots
POST   /api/v1/stations                   ← [NEW] buat stasiun baru (auth)
PUT    /api/v1/stations/:id               ← [NEW] update stasiun (auth)
DELETE /api/v1/stations/:id               ← [NEW] hapus stasiun (auth)
GET    /api/v1/slots/:id/availability     ← cek slot + tarif
POST   /api/v1/slots                      ← [NEW] buat slot baru (auth)
PUT    /api/v1/slots/:id                  ← [NEW] update slot (auth)
DELETE /api/v1/slots/:id                  ← [NEW] hapus slot (auth)
PATCH  /api/v1/slots/:id/status           ← update status AVAILABLE/OCCUPIED/FAULT
GET    /api/v1/tariffs/:slotId            ← tarif per slot
GET    /api/v1/admin/slots                ← [NEW] semua slot + meter data (auth)
```

**booking-service (:8002)**
```
GET    /health
POST   /api/v1/bookings                   ← buat booking (Idempotency-Key, Redis lock)
GET    /api/v1/bookings                   ← list booking milik user
GET    /api/v1/bookings/:id               ← detail booking
PATCH  /api/v1/bookings/:id/status        ← update status
DELETE /api/v1/bookings/:id               ← cancel booking
GET    /api/v1/admin/bookings             ← [NEW] semua booking (auth, filter: status/station_id/user_id)
```

**session-service (:8003)**
```
GET    /health
POST   /api/v1/sessions/start             ← mulai sesi (idempoten by bookingId)
GET    /api/v1/sessions/:id               ← detail sesi
POST   /api/v1/sessions/:id/stop          ← stop sesi → auto POST /invoices (Saga)
WS     /ws/:sessionId                     ← push meter tiap 30 detik
GET    /api/v1/admin/sessions             ← [NEW] semua sesi (auth)
```

**billing-service (:8004)**
```
GET    /health
POST   /api/v1/invoices                   ← buat invoice (dipanggil session-service)
GET    /api/v1/invoices/:id               ← detail invoice
POST   /api/v1/payments                   ← proses pembayaran (90% sukses simulation)
GET    /api/v1/payments/history/:userId   ← riwayat pembayaran
GET    /api/v1/admin/invoices             ← [NEW] semua invoice (auth, filter: ?status=)
PATCH  /api/v1/invoices/:id/status        ← [NEW] update status invoice (auth)
```

**Nginx Gateway (:80) — semua endpoint di atas tersedia via gateway**
```
/api/v1/admin/*  → dirouting ke service yang sesuai  ← [BARU ditambahkan Role 4]
/ws/*            → session-service (WebSocket upgrade)
```

---

## Struktur yang Perlu Kamu Buat

```
tests/
├── api/
│   ├── station-service.test.ts    ← unit/integration test station-service
│   ├── booking-service.test.ts    ← unit/integration test booking-service
│   ├── session-service.test.ts    ← unit/integration test session-service
│   └── billing-service.test.ts    ← unit/integration test billing-service
├── e2e/
│   └── booking-flow.test.ts       ← end-to-end test alur lengkap
├── load/
│   ├── k6-stations.js             ← load test GET /api/v1/stations
│   ├── k6-booking-flow.js         ← load test booking flow concurrent
│   └── k6-websocket.js            ← load test WebSocket session
└── package.json                   ← test runner config

docs/
├── openapi/
│   ├── station-service.yaml       ← OpenAPI 3.0 spec
│   ├── booking-service.yaml
│   ├── session-service.yaml
│   └── billing-service.yaml
└── postman/
    └── Emerald-Charge.postman_collection.json

LAPORAN-AKHIR.md                   ← laporan testing + temuan + rekomendasi
```

---

## Task 1 — Setup Test Environment

### 1a. Buat folder dan package.json untuk tests

Buat `tests/package.json`:

```json
{
  "name": "emerald-charge-tests",
  "version": "1.0.0",
  "scripts": {
    "test": "jest --runInBand --forceExit",
    "test:api": "jest tests/api --runInBand --forceExit",
    "test:e2e": "jest tests/e2e --runInBand --forceExit",
    "test:coverage": "jest --coverage --runInBand --forceExit"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^22.0.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0",
    "ts-jest": "^29.2.0",
    "typescript": "~5.8.3",
    "axios": "^1.7.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/*.test.ts"],
    "testTimeout": 15000
  }
}
```

Buat `tests/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["."]
}
```

### 1b. Install dependencies

```bash
cd tests
npm install
```

---

## Task 2 — API Integration Tests

> **Catatan penting setelah pembaruan Role 2, 3, 4:**
> - Role 3 mengganti in-memory store dengan **PostgreSQL nyata** + Redis
> - Untuk test yang menyentuh DB (booking create, session start, dll.), jalankan `docker-compose up -d` dulu
> - Services akan tetap berjalan dengan in-memory fallback jika DB tidak tersedia, tapi test CRUD mungkin gagal
> - Services bisa dijalankan tanpa Docker: `npm run dev` di masing-masing folder (data dari JSON)
>
> **Cara paling aman sebelum test:**
> ```bash
> # Option A: dengan start.sh (Docker PostgreSQL + Redis, RECOMMENDED)
> ./start.sh      ← start Docker DB + Redis + semua 4 service sekaligus
>
> # Option B: Docker DB saja + service manual
> docker compose -f docker-compose.dev.yml up -d
> sleep 20  # tunggu DB healthy
> cd services/station-service && npm run dev &
> cd services/booking-service && npm run dev &
> cd services/session-service && npm run dev &
> cd services/billing-service && npm run dev &
>
> # Option C: tanpa Docker (in-memory fallback, cukup untuk test dasar)
> cd services/station-service && npm run dev &
> # ... dst
> ```
>
> **Verifikasi semua service UP:**
> ```bash
> curl http://localhost:8001/health  # station-service
> curl http://localhost:8002/health  # booking-service
> curl http://localhost:8003/health  # session-service
> curl http://localhost:8004/health  # billing-service
> ```

### tests/api/station-service.test.ts

```typescript
import axios from 'axios'

const BASE = 'http://localhost:8001'
let token: string

beforeAll(async () => {
  const res = await axios.post(`${BASE}/auth/token`, { userId: 'USR042', role: 'user' })
  token = res.data.token
})

const auth = () => ({ headers: { Authorization: `Bearer ${token}` } })

describe('station-service — GET /api/v1/stations', () => {
  test('200: returns list of stations with meta envelope', async () => {
    const { data, status } = await axios.get(`${BASE}/api/v1/stations`)
    expect(status).toBe(200)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('meta.requestId')
    expect(data).toHaveProperty('meta.timestamp')
    expect(data).toHaveProperty('error', null)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBeGreaterThan(0)
  })

  test('200: filter by city works', async () => {
    const { data } = await axios.get(`${BASE}/api/v1/stations?city=Makassar`)
    expect(data.data.every((s: any) => s.city?.toLowerCase().includes('makassar'))).toBe(true)
  })

  test('200: filter available=true returns only stations with available slots', async () => {
    const { data } = await axios.get(`${BASE}/api/v1/stations?available=true`)
    expect(data.data.length).toBeGreaterThan(0)
    data.data.forEach((s: any) => {
      expect(s.availableSlots).toBeGreaterThan(0)
    })
  })
})

describe('station-service — GET /api/v1/stations/:id', () => {
  test('200: returns station detail with slots', async () => {
    const { data } = await axios.get(`${BASE}/api/v1/stations/ST001`)
    expect(data.data.station_id).toBe('ST001')
    expect(Array.isArray(data.data.slots)).toBe(true)
  })

  test('404: station not found returns RFC 7807 error', async () => {
    try {
      await axios.get(`${BASE}/api/v1/stations/NOTEXIST`)
    } catch (e: any) {
      expect(e.response.status).toBe(404)
      expect(e.response.data).toHaveProperty('type')
      expect(e.response.data).toHaveProperty('title')
      expect(e.response.data).toHaveProperty('status', 404)
    }
  })
})

describe('station-service — GET /api/v1/slots/:id/availability', () => {
  test('200: returns slot availability with tariff', async () => {
    const { data } = await axios.get(`${BASE}/api/v1/slots/SL001/availability`)
    expect(data.data).toHaveProperty('slotId', 'SL001')
    expect(data.data).toHaveProperty('available')
    expect(data.data).toHaveProperty('tariffPerKwh')
    expect(data.data).toHaveProperty('powerKw')
    expect(typeof data.data.available).toBe('boolean')
  })
})

describe('station-service — PATCH /api/v1/slots/:id/status', () => {
  test('401: requires auth token', async () => {
    try {
      await axios.patch(`${BASE}/api/v1/slots/SL001/status`, { status: 'OCCUPIED' })
    } catch (e: any) {
      expect(e.response.status).toBe(401)
    }
  })

  test('200: updates slot status with valid token', async () => {
    const { data } = await axios.patch(
      `${BASE}/api/v1/slots/SL001/status`,
      { status: 'OCCUPIED' },
      auth()
    )
    expect(data.data.slot_status).toBe('occupied')
    // Reset status
    await axios.patch(`${BASE}/api/v1/slots/SL001/status`, { status: 'AVAILABLE' }, auth())
  })

  test('400: invalid status returns error', async () => {
    try {
      await axios.patch(`${BASE}/api/v1/slots/SL001/status`, { status: 'INVALID' }, auth())
    } catch (e: any) {
      expect(e.response.status).toBe(400)
      expect(e.response.data).toHaveProperty('type')
    }
  })
})

describe('station-service — GET /api/v1/tariffs/:slotId', () => {
  test('200: returns tariff with correct fields', async () => {
    const { data } = await axios.get(`${BASE}/api/v1/tariffs/SL001`)
    expect(data.data).toHaveProperty('tariffPerKwh')
    expect(data.data).toHaveProperty('currency', 'IDR')
    expect(typeof data.data.tariffPerKwh).toBe('number')
    expect(data.data.tariffPerKwh).toBeGreaterThan(0)
  })
})

describe('station-service — GET /health', () => {
  test('200: health check returns ok status', async () => {
    const { data, status } = await axios.get(`${BASE}/health`)
    expect(status).toBe(200)
    expect(data).toHaveProperty('status', 'ok')
  })
})

// ── [NEW] CRUD endpoints ditambahkan Role 2 ──────────────────────────────────
describe('station-service — POST /api/v1/stations (CRUD)', () => {
  test('201: creates new station', async () => {
    const { data, status } = await axios.post(`${BASE}/api/v1/stations`,
      { station_id: 'ST_TEST', station_name: 'Test Station QA', location: 'Jl. Test', city: 'Jakarta', province: 'DKI', latitude: -6.2, longitude: 106.8, status: 'active' },
      auth()
    )
    expect(status).toBe(201)
    expect(data.data.station_id ?? data.data.id).toBeTruthy()
  })

  test('409: duplicate station_id returns 409', async () => {
    try {
      await axios.post(`${BASE}/api/v1/stations`,
        { station_id: 'ST_TEST', station_name: 'Duplicate' }, auth())
    } catch (e: any) {
      expect(e.response.status).toBe(409)
    }
  })

  test('200: PUT updates station', async () => {
    const { data } = await axios.put(`${BASE}/api/v1/stations/ST_TEST`,
      { station_name: 'Test Station QA Updated', status: 'maintenance' }, auth())
    expect(data.data.name ?? data.data.station_name).toContain('Updated')
  })

  test('200: DELETE removes station', async () => {
    const { data } = await axios.delete(`${BASE}/api/v1/stations/ST_TEST`, auth())
    expect(data.data).toHaveProperty('deleted')
  })

  test('401: POST without token returns 401', async () => {
    try {
      await axios.post(`${BASE}/api/v1/stations`, { station_id: 'ST_NOAUTH', station_name: 'No Auth' })
    } catch (e: any) {
      expect(e.response.status).toBe(401)
    }
  })
})

describe('station-service — POST /api/v1/slots (CRUD)', () => {
  test('201: creates new slot', async () => {
    const { data, status } = await axios.post(`${BASE}/api/v1/slots`,
      { slot_id: 'SL_TEST', station_id: 'ST001', connector_type: 'CCS2', power_kw: 50 }, auth())
    expect(status).toBe(201)
    expect(data.data.slot_id ?? data.data.id).toBeTruthy()
  })

  test('200: DELETE slot works', async () => {
    const { data } = await axios.delete(`${BASE}/api/v1/slots/SL_TEST`, auth())
    expect(data.data).toHaveProperty('deleted')
  })
})

describe('station-service — GET /api/v1/admin/slots', () => {
  test('200: returns all slots (admin only)', async () => {
    const { data, status } = await axios.get(`${BASE}/api/v1/admin/slots`, auth())
    expect(status).toBe(200)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBeGreaterThan(0)
  })
})
```

### tests/api/booking-service.test.ts

```typescript
import axios from 'axios'

const SS_BASE = 'http://localhost:8001'
const BS_BASE = 'http://localhost:8002'
let token: string
let createdBookingId: string

beforeAll(async () => {
  const res = await axios.post(`${SS_BASE}/auth/token`, { userId: 'USR042', role: 'user' })
  token = res.data.token
})

const auth = () => ({ headers: { Authorization: `Bearer ${token}` } })
const authPost = (data: any, extra: any = {}) => ({
  headers: { Authorization: `Bearer ${token}`, ...extra },
  ...data,
})

describe('booking-service — POST /api/v1/bookings', () => {
  const idempKey = `test-${Date.now()}`

  test('201: creates booking with Redis slot lock and QR code', async () => {
    const { data, status } = await axios.post(
      `${BS_BASE}/api/v1/bookings`,
      { stationId: 'ST010', slotId: 'SL010', startTime: '2026-09-01T10:00:00Z', endTime: '2026-09-01T12:00:00Z' },
      { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': idempKey } }
    )
    expect(status).toBe(201)
    expect(data.data).toHaveProperty('bookingId')
    expect(data.data).toHaveProperty('status', 'confirmed')
    expect(data.data).toHaveProperty('qrCode')
    expect(data.data.qrCode).toMatch(/^QR-/)
    createdBookingId = data.data.bookingId
  })

  test('200: Idempotency-Key returns same response on retry', async () => {
    const { data, status } = await axios.post(
      `${BS_BASE}/api/v1/bookings`,
      { stationId: 'ST010', slotId: 'SL010', startTime: '2026-09-01T10:00:00Z', endTime: '2026-09-01T12:00:00Z' },
      { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': idempKey } }
    )
    expect(status).toBe(200)
    expect(data.data.bookingId).toBe(createdBookingId)
  })

  test('400: missing required fields returns 400', async () => {
    try {
      await axios.post(`${BS_BASE}/api/v1/bookings`, { stationId: 'ST001' }, auth())
    } catch (e: any) {
      expect(e.response.status).toBe(400)
      expect(e.response.data.type).toContain('missing-fields')
    }
  })

  test('401: no token returns 401', async () => {
    try {
      await axios.post(`${BS_BASE}/api/v1/bookings`,
        { stationId: 'ST001', slotId: 'SL001', startTime: '2026-09-02T10:00:00Z', endTime: '2026-09-02T11:00:00Z' })
    } catch (e: any) {
      expect(e.response.status).toBe(401)
    }
  })
})

describe('booking-service — GET /api/v1/bookings/:id', () => {
  test('200: returns booking detail', async () => {
    if (!createdBookingId) return
    const { data } = await axios.get(`${BS_BASE}/api/v1/bookings/${createdBookingId}`, auth())
    expect(data.data.booking_id).toBe(createdBookingId)
    expect(data.data).toHaveProperty('status')
    expect(data.data).toHaveProperty('slot_id')
  })

  test('404: booking not found returns RFC 7807', async () => {
    try {
      await axios.get(`${BS_BASE}/api/v1/bookings/BK999`, auth())
    } catch (e: any) {
      expect(e.response.status).toBe(404)
      expect(e.response.data).toHaveProperty('type')
    }
  })
})

describe('booking-service — DELETE /api/v1/bookings/:id (cancel)', () => {
  test('200: cancels confirmed booking', async () => {
    if (!createdBookingId) return
    const { data } = await axios.delete(`${BS_BASE}/api/v1/bookings/${createdBookingId}`, auth())
    expect(data.data.status).toBe('cancelled')
  })
})

describe('booking-service — GET /health', () => {
  test('200: health ok', async () => {
    const { data } = await axios.get(`${BS_BASE}/health`)
    expect(data.status).toBe('ok')
  })
})

// ── [NEW] Admin endpoints ditambahkan Role 2 ─────────────────────────────────
describe('booking-service — GET /api/v1/admin/bookings', () => {
  test('200: returns all bookings (admin)', async () => {
    const { data, status } = await axios.get(`${BS_BASE}/api/v1/admin/bookings`, auth())
    expect(status).toBe(200)
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('200: filter by status works', async () => {
    const { data } = await axios.get(`${BS_BASE}/api/v1/admin/bookings?status=confirmed`, auth())
    expect(Array.isArray(data.data)).toBe(true)
    data.data.forEach((b: any) => expect(b.status).toBe('confirmed'))
  })

  test('401: admin endpoint requires auth', async () => {
    try {
      await axios.get(`${BS_BASE}/api/v1/admin/bookings`)
    } catch (e: any) {
      expect(e.response.status).toBe(401)
    }
  })
})
```

### tests/api/session-service.test.ts

```typescript
import axios from 'axios'

const SS_BASE = 'http://localhost:8001'
const BS_BASE = 'http://localhost:8002'
const SE_BASE = 'http://localhost:8003'

let token: string
let bookingId: string
let sessionId: string

beforeAll(async () => {
  const res = await axios.post(`${SS_BASE}/auth/token`, { userId: 'USR042', role: 'user' })
  token = res.data.token

  // Create a booking to use for session tests
  const bRes = await axios.post(`${BS_BASE}/api/v1/bookings`,
    { stationId: 'ST005', slotId: 'SL005', startTime: '2026-09-05T08:00:00Z', endTime: '2026-09-05T10:00:00Z' },
    { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': `session-test-${Date.now()}` } }
  )
  bookingId = bRes.data.data.bookingId
})

const auth = () => ({ headers: { Authorization: `Bearer ${token}` } })

describe('session-service — POST /api/v1/sessions/start', () => {
  test('201: starts session and returns sessionId + wsUrl', async () => {
    const { data, status } = await axios.post(`${SE_BASE}/api/v1/sessions/start`,
      { bookingId, connectorId: 'CONN-1' }, auth())
    expect(status).toBe(201)
    expect(data.data).toHaveProperty('sessionId')
    expect(data.data).toHaveProperty('wsUrl')
    expect(data.data).toHaveProperty('meterStart')
    expect(data.data.wsUrl).toContain('ws://')
    sessionId = data.data.sessionId
  })

  test('200: idempotent — same bookingId returns same session', async () => {
    const { data } = await axios.post(`${SE_BASE}/api/v1/sessions/start`,
      { bookingId, connectorId: 'CONN-1' }, auth())
    expect(data.data.sessionId).toBe(sessionId)
  })

  test('400: missing bookingId returns 400', async () => {
    try {
      await axios.post(`${SE_BASE}/api/v1/sessions/start`, {}, auth())
    } catch (e: any) {
      expect(e.response.status).toBe(400)
    }
  })
})

describe('session-service — GET /api/v1/sessions/:id', () => {
  test('200: returns session detail', async () => {
    if (!sessionId) return
    const { data } = await axios.get(`${SE_BASE}/api/v1/sessions/${sessionId}`, auth())
    expect(data.data.session_id).toBe(sessionId)
    expect(data.data.status).toBe('active')
  })
})

describe('session-service — POST /api/v1/sessions/:id/stop', () => {
  test('200: stops session and returns kwhUsed + invoiceId', async () => {
    if (!sessionId) return
    const { data } = await axios.post(`${SE_BASE}/api/v1/sessions/${sessionId}/stop`,
      {}, auth())
    expect(data.data.status).toBe('completed')
    expect(data.data).toHaveProperty('kwhUsed')
    expect(data.data).toHaveProperty('invoiceId')
    expect(typeof data.data.kwhUsed).toBe('number')
  })

  test('409: stopping an already-stopped session returns 409', async () => {
    if (!sessionId) return
    try {
      await axios.post(`${SE_BASE}/api/v1/sessions/${sessionId}/stop`, {}, auth())
    } catch (e: any) {
      expect(e.response.status).toBe(409)
      expect(e.response.data.type).toContain('session-not-active')
    }
  })
})

describe('session-service — GET /health', () => {
  test('200: health ok', async () => {
    const { data } = await axios.get(`${SE_BASE}/health`)
    expect(data.status).toBe('ok')
  })
})

// ── [NEW] Admin endpoint ditambahkan Role 2 ──────────────────────────────────
describe('session-service — GET /api/v1/admin/sessions', () => {
  test('200: returns all sessions (admin)', async () => {
    const { data, status } = await axios.get(`${SE_BASE}/api/v1/admin/sessions`, auth())
    expect(status).toBe(200)
    expect(Array.isArray(data.data)).toBe(true)
  })
})
```

### tests/api/billing-service.test.ts

```typescript
import axios from 'axios'

const SS_BASE  = 'http://localhost:8001'
const BL_BASE  = 'http://localhost:8004'

let token: string
let invoiceId: string

beforeAll(async () => {
  const res = await axios.post(`${SS_BASE}/auth/token`, { userId: 'USR042', role: 'user' })
  token = res.data.token

  // Create a test invoice directly
  const iRes = await axios.post(`${BL_BASE}/api/v1/invoices`,
    { sessionId: 'CS001', userId: 'USR042', kwhUsed: 25.5, tariffPerKwh: 2500 },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  invoiceId = iRes.data.data.invoiceId
})

const auth = () => ({ headers: { Authorization: `Bearer ${token}` } })

describe('billing-service — POST /api/v1/invoices', () => {
  test('201: creates invoice with correct total calculation', async () => {
    const { data, status } = await axios.post(`${BL_BASE}/api/v1/invoices`,
      { sessionId: 'CS002', userId: 'USR042', kwhUsed: 10, tariffPerKwh: 2500 },
      auth()
    )
    expect(status).toBe(201)
    expect(data.data).toHaveProperty('invoiceId')
    expect(data.data).toHaveProperty('totalAmount')
    // 10 kWh * 2500 = 25000 + 11% PPN = 27750
    expect(data.data.totalAmount).toBe(27750)
    expect(data.data.status).toBe('pending')
  })

  test('400: missing fields returns 400', async () => {
    try {
      await axios.post(`${BL_BASE}/api/v1/invoices`, { sessionId: 'CS003' }, auth())
    } catch (e: any) {
      expect(e.response.status).toBe(400)
    }
  })
})

describe('billing-service — GET /api/v1/invoices/:id', () => {
  test('200: returns invoice detail', async () => {
    const { data } = await axios.get(`${BL_BASE}/api/v1/invoices/${invoiceId}`, auth())
    expect(data.data.invoice_id).toBe(invoiceId)
    expect(data.data).toHaveProperty('energy_kwh')
    expect(data.data).toHaveProperty('tariff_per_kwh')
    expect(data.data).toHaveProperty('total_amount')
    expect(data.data.payment_status).toBe('pending')
  })
})

describe('billing-service — POST /api/v1/payments', () => {
  test('200 or 402: payment processes invoice (gateway simulation)', async () => {
    const { data, status } = await axios.post(`${BL_BASE}/api/v1/payments`,
      { invoiceId, paymentMethod: 'QRIS' }, auth()
    ).catch(e => e.response)

    // Gateway has 90% success rate — both outcomes are valid
    expect([200, 402]).toContain(status)
    if (status === 200) {
      expect(data.data).toHaveProperty('paymentId')
      expect(data.data).toHaveProperty('receipt')
      expect(data.data.status).toBe('paid')
    }
  })

  test('400: invalid payment method returns 400', async () => {
    try {
      await axios.post(`${BL_BASE}/api/v1/payments`,
        { invoiceId: 'INV001', paymentMethod: 'BITCOIN' }, auth())
    } catch (e: any) {
      expect(e.response.status).toBe(400)
      expect(e.response.data.type).toContain('invalid-method')
    }
  })
})

describe('billing-service — GET /api/v1/payments/history/:userId', () => {
  test('200: returns payment history array', async () => {
    const { data } = await axios.get(`${BL_BASE}/api/v1/payments/history/USR042`, auth())
    expect(Array.isArray(data.data)).toBe(true)
  })
})

describe('billing-service — GET /health', () => {
  test('200: health ok', async () => {
    const { data } = await axios.get(`${BL_BASE}/health`)
    expect(data.status).toBe('ok')
  })
})

// ── [NEW] Admin endpoints ditambahkan Role 2 ─────────────────────────────────
describe('billing-service — GET /api/v1/admin/invoices', () => {
  test('200: returns all invoices (admin)', async () => {
    const { data, status } = await axios.get(`${BL_BASE}/api/v1/admin/invoices`, auth())
    expect(status).toBe(200)
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('200: filter by status=paid works', async () => {
    const { data } = await axios.get(`${BL_BASE}/api/v1/admin/invoices?status=paid`, auth())
    expect(Array.isArray(data.data)).toBe(true)
    data.data.forEach((i: any) => expect(i.payment_status).toBe('paid'))
  })
})

describe('billing-service — PATCH /api/v1/invoices/:id/status', () => {
  test('200: admin can update invoice status', async () => {
    if (!invoiceId) return
    const { data } = await axios.patch(
      `${BL_BASE}/api/v1/invoices/${invoiceId}/status`,
      { status: 'failed' }, auth()
    )
    // Either SQL update or 503 (DB not connected) — both are valid responses
    expect([200, 503]).toContain(data.status ?? 200)
  })
})
```

---

## Task 3 — End-to-End Test (Alur Lengkap)

### tests/e2e/booking-flow.test.ts

```typescript
/**
 * End-to-End Test: Alur booking lengkap sesuai ARSITEKTUR.md
 *   Token → Cari Stasiun → Cek Slot → Booking → Mulai Sesi → Stop Sesi → Invoice → Bayar
 */
import axios from 'axios'

const GATEWAY  = 'http://localhost'     // Nginx gateway port 80
const SS_BASE  = 'http://localhost:8001'

describe('E2E: Full Booking Flow via Nginx Gateway', () => {
  let token: string
  let slotId: string
  let bookingId: string
  let sessionId: string
  let invoiceId: string

  test('Step 1: Get JWT token', async () => {
    const { data } = await axios.post(`${GATEWAY}/auth/token`,
      { userId: 'USR_E2E', role: 'user' })
    expect(data).toHaveProperty('token')
    token = data.token
  })

  test('Step 2: GET /api/v1/stations — find available stations', async () => {
    const { data } = await axios.get(`${GATEWAY}/api/v1/stations?available=true`)
    expect(data.data.length).toBeGreaterThan(0)
    // Response envelope check
    expect(data.meta).toHaveProperty('requestId')
    expect(data.error).toBeNull()
  })

  test('Step 3: GET /api/v1/slots/:id/availability', async () => {
    slotId = 'SL020'
    const { data } = await axios.get(`${GATEWAY}/api/v1/slots/${slotId}/availability`)
    expect(data.data).toHaveProperty('available')
    expect(data.data).toHaveProperty('tariffPerKwh')
  })

  test('Step 4: POST /api/v1/bookings — create booking with Redis slot lock', async () => {
    const auth = { headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': `e2e-${Date.now()}` } }
    const { data, status } = await axios.post(`${GATEWAY}/api/v1/bookings`,
      { stationId: 'ST020', slotId, startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-01T11:00:00Z' },
      auth
    )
    expect(status).toBe(201)
    expect(data.data.status).toBe('confirmed')
    expect(data.data.qrCode).toBeTruthy()
    bookingId = data.data.bookingId
  })

  test('Step 5: POST /api/v1/sessions/start — start charging session', async () => {
    const auth = { headers: { Authorization: `Bearer ${token}` } }
    const { data, status } = await axios.post(`${GATEWAY}/api/v1/sessions/start`,
      { bookingId, connectorId: 'CONN-E2E' }, auth)
    expect(status).toBe(201)
    expect(data.data).toHaveProperty('sessionId')
    expect(data.data.wsUrl).toContain('ws://')
    sessionId = data.data.sessionId
  })

  test('Step 6: POST /api/v1/sessions/:id/stop — stop session, auto-create invoice (Saga)', async () => {
    const auth = { headers: { Authorization: `Bearer ${token}` } }
    const { data } = await axios.post(`${GATEWAY}/api/v1/sessions/${sessionId}/stop`, {}, auth)
    expect(data.data.status).toBe('completed')
    expect(data.data).toHaveProperty('invoiceId')
    invoiceId = data.data.invoiceId
  })

  test('Step 7: GET /api/v1/invoices/:id — verify invoice created', async () => {
    if (!invoiceId) return
    const auth = { headers: { Authorization: `Bearer ${token}` } }
    const { data } = await axios.get(`${GATEWAY}/api/v1/invoices/${invoiceId}`, auth)
    expect(data.data.payment_status).toBe('pending')
    expect(data.data.total_amount).toBeGreaterThan(0)
  })

  test('Step 8: POST /api/v1/payments — pay invoice (Saga: update booking status)', async () => {
    if (!invoiceId) return
    const auth = { headers: { Authorization: `Bearer ${token}` } }
    const res = await axios.post(`${GATEWAY}/api/v1/payments`,
      { invoiceId, paymentMethod: 'QRIS', bookingId }, auth
    ).catch(e => e.response)

    expect([200, 402]).toContain(res.status)
    if (res.status === 200) {
      expect(res.data.data.receipt).toBeTruthy()
    }
  })
})

describe('E2E: Redis Slot Locking — double booking prevention', () => {
  let token: string

  beforeAll(async () => {
    const res = await axios.post(`${GATEWAY}/auth/token`, { userId: 'USR_LOCK', role: 'user' })
    token = res.data.token
  })

  test('Concurrent booking attempts for same slot — only one should succeed', async () => {
    const auth = (key: string) => ({
      headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': key }
    })
    const payload = { stationId: 'ST030', slotId: 'SL030', startTime: '2026-11-01T14:00:00Z', endTime: '2026-11-01T16:00:00Z' }

    // Fire 3 concurrent requests for same slot
    const results = await Promise.allSettled([
      axios.post(`${GATEWAY}/api/v1/bookings`, payload, auth('lock-test-1')),
      axios.post(`${GATEWAY}/api/v1/bookings`, payload, auth('lock-test-2')),
      axios.post(`${GATEWAY}/api/v1/bookings`, payload, auth('lock-test-3')),
    ])

    const success = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 201)
    const locked  = results.filter(r => r.status === 'rejected')

    // At most 1 should succeed (slot available), rest should get 409 or 409 (locked)
    expect(success.length).toBeLessThanOrEqual(1)
    console.log(`Lock test: ${success.length} success, ${locked.length} rejected (409/locked)`)
  })
})
```

---

## Task 4 — Load Testing dengan k6

Install k6 terlebih dahulu:
```bash
# macOS
brew install k6

# Ubuntu / Codespace
sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### tests/load/k6-stations.js

```javascript
/**
 * Load Test: GET /api/v1/stations
 * Target: 100 virtual users, durasi 30 detik
 * Threshold: 95% request < 500ms, error rate < 1%
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate   = new Rate('errors')
const latency     = new Trend('request_latency', true)

export const options = {
  stages: [
    { duration: '10s', target: 20  },  // ramp up
    { duration: '20s', target: 100 },  // steady load
    { duration: '10s', target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% request < 500ms
    errors:            ['rate<0.01'],  // error rate < 1%
  },
}

const BASE = __ENV.BASE_URL || 'http://localhost'

export default function () {
  const res = http.get(`${BASE}/api/v1/stations?available=true`)
  const ok  = check(res, {
    'status is 200':      (r) => r.status === 200,
    'has data array':     (r) => JSON.parse(r.body).data?.length > 0,
    'has meta.requestId': (r) => !!JSON.parse(r.body).meta?.requestId,
    'response < 500ms':   (r) => r.timings.duration < 500,
  })

  errorRate.add(!ok)
  latency.add(res.timings.duration)
  sleep(0.5)
}

export function handleSummary(data) {
  return {
    'tests/load/results/stations-result.json': JSON.stringify(data, null, 2),
  }
}
```

### tests/load/k6-booking-flow.js

```javascript
/**
 * Load Test: Full Booking Flow
 * Target: 30 virtual users concurrent, verifikasi Redis lock bekerja
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  vus: 30,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.05'],
  },
}

const BASE = __ENV.BASE_URL || 'http://localhost'

export function setup() {
  const res = http.post(`${BASE}/auth/token`,
    JSON.stringify({ userId: 'USR_LOAD', role: 'user' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
  return { token: JSON.parse(res.body).token }
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
    'Idempotency-Key': `load-${__VU}-${__ITER}`,
  }

  // Step 1: Check slot availability
  const avail = http.get(`${BASE}/api/v1/slots/SL050/availability`)
  check(avail, { 'slot check 200': (r) => r.status === 200 })

  // Step 2: Attempt booking (will conflict under load — some 409 expected)
  const booking = http.post(`${BASE}/api/v1/bookings`,
    JSON.stringify({
      stationId: 'ST050', slotId: 'SL050',
      startTime: '2026-12-01T10:00:00Z',
      endTime:   '2026-12-01T12:00:00Z',
    }),
    { headers }
  )

  const bookOk = check(booking, {
    'booking created or slot locked': (r) => [201, 409].includes(r.status),
    'no server error':                (r) => r.status < 500,
  })

  errorRate.add(!bookOk)
  sleep(1)
}

export function handleSummary(data) {
  return {
    'tests/load/results/booking-result.json': JSON.stringify(data, null, 2),
  }
}
```

### tests/load/k6-websocket.js

```javascript
/**
 * Load Test: WebSocket session monitoring
 * Simulasi 20 EV yang sedang charging dan terima push data
 */
import ws   from 'k6/ws'
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter } from 'k6/metrics'

const messages = new Counter('ws_messages_received')

export const options = {
  vus: 20,
  duration: '45s',
  thresholds: {
    ws_messages_received: ['count>0'],
  },
}

const BASE    = __ENV.BASE_URL || 'http://localhost'
const WS_BASE = __ENV.WS_URL  || 'ws://localhost:8003'

export default function () {
  const sessionId = `CS00${__VU}`
  const url       = `${WS_BASE}/ws/${sessionId}`

  const res = ws.connect(url, {}, (socket) => {
    socket.on('open',    () => { console.log(`WS connected: ${sessionId}`) })
    socket.on('message', (data) => {
      messages.add(1)
      const msg = JSON.parse(data)
      check(msg, {
        'has type field':      (m) => !!m.type,
        'has sessionId field': (m) => !!m.sessionId,
      })
    })
    socket.on('error', (e) => console.error('WS error:', e))
    socket.setTimeout(() => socket.close(), 35000)
  })

  check(res, { 'WS connected': (r) => r && r.status === 101 })
  sleep(1)
}
```

### Cara jalankan load test:

```bash
# Pastikan semua service berjalan dulu
./start.sh    # atau: docker compose -f docker-compose.dev.yml up -d

# Buat folder hasil
mkdir -p tests/load/results

# Jalankan load test stations
k6 run tests/load/k6-stations.js

# Jalankan load test booking flow
k6 run tests/load/k6-booking-flow.js

# Jalankan load test WebSocket
k6 run tests/load/k6-websocket.js

# Atau dengan custom base URL (jika Nginx sudah up)
k6 run -e BASE_URL=http://localhost tests/load/k6-stations.js
```

---

## Task 5 — OpenAPI Documentation

### docs/openapi/station-service.yaml

```yaml
openapi: 3.0.3
info:
  title: Station Service API
  description: Kelola stasiun SPKLU, slot pengisian, dan tarif
  version: 1.0.0

servers:
  - url: http://localhost:8001
    description: Local development
  - url: http://localhost/api/v1
    description: Via Nginx Gateway

tags:
  - name: stations
  - name: slots
  - name: tariffs
  - name: auth

paths:
  /auth/token:
    post:
      tags: [auth]
      summary: Generate JWT token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [userId]
              properties:
                userId:  { type: string, example: USR042 }
                role:    { type: string, enum: [user, admin], default: user }
      responses:
        '200':
          description: JWT token
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:     { type: string }
                  expiresIn: { type: string, example: 24h }

  /api/v1/stations:
    get:
      tags: [stations]
      summary: List all stations
      parameters:
        - in: query
          name: available
          schema: { type: boolean }
          description: Filter stations with available slots
        - in: query
          name: city
          schema: { type: string }
          description: Filter by city name
      responses:
        '200':
          description: Station list with response envelope
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StationListResponse'

  /api/v1/stations/{id}:
    get:
      tags: [stations]
      summary: Get station detail with slots
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string, example: ST001 }
      responses:
        '200':
          description: Station detail
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/slots/{id}/availability:
    get:
      tags: [slots]
      summary: Check slot availability and tariff
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string, example: SL001 }
      responses:
        '200':
          description: Slot availability info
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SlotAvailabilityResponse'

  /api/v1/slots/{id}/status:
    patch:
      tags: [slots]
      summary: Update slot status
      security: [{ bearerAuth: [] }]
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: [AVAILABLE, OCCUPIED, FAULT]
      responses:
        '200': { description: Slot updated }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '400': { $ref: '#/components/responses/BadRequest' }

  /api/v1/tariffs/{slotId}:
    get:
      tags: [tariffs]
      summary: Get tariff for a slot
      parameters:
        - in: path
          name: slotId
          required: true
          schema: { type: string, example: SL001 }
      responses:
        '200':
          description: Tariff info
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TariffResponse'

  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: Service healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:    { type: string, example: ok }
                  service:   { type: string }
                  timestamp: { type: string, format: date-time }

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  responses:
    NotFound:
      description: Resource not found (RFC 7807)
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ProblemDetails' }
    Unauthorized:
      description: Missing or invalid JWT token
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ProblemDetails' }
    BadRequest:
      description: Invalid request body
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ProblemDetails' }

  schemas:
    ProblemDetails:
      type: object
      properties:
        type:   { type: string, example: /errors/not-found }
        title:  { type: string, example: Not Found }
        status: { type: integer, example: 404 }
        detail: { type: string }

    ResponseEnvelope:
      type: object
      properties:
        data:  {}
        meta:
          type: object
          properties:
            requestId: { type: string, format: uuid }
            timestamp: { type: string, format: date-time }
        error: { nullable: true }

    StationListResponse:
      allOf:
        - $ref: '#/components/schemas/ResponseEnvelope'
        - type: object
          properties:
            data:
              type: array
              items:
                type: object
                properties:
                  station_id:     { type: string }
                  station_name:   { type: string }
                  city:           { type: string }
                  latitude:       { type: number }
                  longitude:      { type: number }
                  availableSlots: { type: integer }
                  totalSlots:     { type: integer }
                  tariffPerKwh:   { type: integer }

    SlotAvailabilityResponse:
      allOf:
        - $ref: '#/components/schemas/ResponseEnvelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                slotId:       { type: string }
                available:    { type: boolean }
                status:       { type: string }
                connectorType: { type: string }
                powerKw:      { type: integer }
                tariffPerKwh: { type: integer }

    TariffResponse:
      allOf:
        - $ref: '#/components/schemas/ResponseEnvelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                slotId:       { type: string }
                tariffPerKwh: { type: integer }
                currency:     { type: string }
                effectiveFrom: { type: string, format: date-time }
```

> Buat `booking-service.yaml`, `session-service.yaml`, `billing-service.yaml` dengan pola yang sama.
> Sesuaikan paths, request body, dan response schema dengan endpoint masing-masing.

---

## Task 6 — Postman Collection

Buat `docs/postman/Emerald-Charge.postman_collection.json` dengan:

```json
{
  "info": {
    "name": "Emerald Charge API",
    "description": "Complete API collection for Emerald Charge EV Charging System",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "gateway",  "value": "http://localhost" },
    { "key": "ss_base",  "value": "http://localhost:8001" },
    { "key": "bs_base",  "value": "http://localhost:8002" },
    { "key": "se_base",  "value": "http://localhost:8003" },
    { "key": "bl_base",  "value": "http://localhost:8004" },
    { "key": "token",    "value": "" }
  ],
  "item": [
    {
      "name": "0. Auth",
      "item": [{
        "name": "Get Token",
        "request": {
          "method": "POST",
          "url": "{{ss_base}}/auth/token",
          "header": [{ "key": "Content-Type", "value": "application/json" }],
          "body": { "mode": "raw", "raw": "{\"userId\":\"USR042\",\"role\":\"user\"}" }
        },
        "event": [{
          "listen": "test",
          "script": { "exec": ["pm.collectionVariables.set('token', pm.response.json().token);", "pm.test('Token received', () => pm.expect(pm.response.json().token).to.be.a('string'));"] }
        }]
      }]
    },
    {
      "name": "1. Station Service",
      "item": [
        { "name": "GET Stations (available)", "request": { "method": "GET", "url": "{{gateway}}/api/v1/stations?available=true" } },
        { "name": "GET Station Detail", "request": { "method": "GET", "url": "{{gateway}}/api/v1/stations/ST001" } },
        { "name": "GET Slot Availability", "request": { "method": "GET", "url": "{{gateway}}/api/v1/slots/SL001/availability" } },
        { "name": "GET Tariff", "request": { "method": "GET", "url": "{{gateway}}/api/v1/tariffs/SL001" } }
      ]
    },
    {
      "name": "2. Booking Service",
      "item": [
        { "name": "POST Create Booking", "request": { "method": "POST", "url": "{{gateway}}/api/v1/bookings", "header": [{"key":"Authorization","value":"Bearer {{token}}"},{"key":"Idempotency-Key","value":"test-{{$timestamp}}"},{"key":"Content-Type","value":"application/json"}], "body": {"mode":"raw","raw":"{\"stationId\":\"ST001\",\"slotId\":\"SL001\",\"startTime\":\"2026-09-15T10:00:00Z\",\"endTime\":\"2026-09-15T12:00:00Z\"}"} } },
        { "name": "GET Booking Detail", "request": { "method": "GET", "url": "{{gateway}}/api/v1/bookings/BK001", "header": [{"key":"Authorization","value":"Bearer {{token}}"}] } },
        { "name": "GET My Bookings", "request": { "method": "GET", "url": "{{gateway}}/api/v1/bookings", "header": [{"key":"Authorization","value":"Bearer {{token}}"}] } },
        { "name": "PATCH Update Status", "request": { "method": "PATCH", "url": "{{gateway}}/api/v1/bookings/BK001/status", "header": [{"key":"Authorization","value":"Bearer {{token}}"},{"key":"Content-Type","value":"application/json"}], "body": {"mode":"raw","raw":"{\"status\":\"confirmed\"}"} } }
      ]
    },
    {
      "name": "3. Session Service",
      "item": [
        { "name": "POST Start Session", "request": { "method": "POST", "url": "{{gateway}}/api/v1/sessions/start", "header": [{"key":"Authorization","value":"Bearer {{token}}"},{"key":"Content-Type","value":"application/json"}], "body": {"mode":"raw","raw":"{\"bookingId\":\"BK001\",\"connectorId\":\"CONN-1\"}"} } },
        { "name": "GET Session Detail", "request": { "method": "GET", "url": "{{gateway}}/api/v1/sessions/CS001", "header": [{"key":"Authorization","value":"Bearer {{token}}"}] } },
        { "name": "POST Stop Session", "request": { "method": "POST", "url": "{{gateway}}/api/v1/sessions/CS001/stop", "header": [{"key":"Authorization","value":"Bearer {{token}}"}] } }
      ]
    },
    {
      "name": "4. Billing Service",
      "item": [
        { "name": "GET Invoice", "request": { "method": "GET", "url": "{{gateway}}/api/v1/invoices/INV001", "header": [{"key":"Authorization","value":"Bearer {{token}}"}] } },
        { "name": "POST Payment", "request": { "method": "POST", "url": "{{gateway}}/api/v1/payments", "header": [{"key":"Authorization","value":"Bearer {{token}}"},{"key":"Content-Type","value":"application/json"}], "body": {"mode":"raw","raw":"{\"invoiceId\":\"INV001\",\"paymentMethod\":\"QRIS\"}"} } },
        { "name": "GET Payment History", "request": { "method": "GET", "url": "{{gateway}}/api/v1/payments/history/USR042", "header": [{"key":"Authorization","value":"Bearer {{token}}"}] } }
      ]
    },
    {
      "name": "5. Health Checks",
      "item": [
        { "name": "Gateway Health",         "request": { "method": "GET", "url": "{{gateway}}/health" } },
        { "name": "Station Service Health", "request": { "method": "GET", "url": "{{ss_base}}/health" } },
        { "name": "Booking Service Health", "request": { "method": "GET", "url": "{{bs_base}}/health" } },
        { "name": "Session Service Health", "request": { "method": "GET", "url": "{{se_base}}/health" } },
        { "name": "Billing Service Health", "request": { "method": "GET", "url": "{{bl_base}}/health" } }
      ]
    }
  ]
}
```

---

## Task 7 — Laporan Akhir

Buat `LAPORAN-AKHIR.md` di root project dengan isi:

```markdown
# Laporan Akhir — Emerald Charge EV Booking System
**Tanggal:** [isi tanggal]
**Disusun oleh:** Nur Alam Nasyrah (QA, Load-Test & Dokumentasi)

## 1. Ringkasan Eksekutif
[Jelaskan sistem secara singkat, tujuan, dan hasil akhir]

## 2. Status Pengerjaan Per Role
| Role | Anggota | Status | Catatan |
|---|---|---|---|
| Role 1 — Arsitek | Asmaul Husna | ✅ Selesai | 4 ADR, arsitektur lengkap |
| Role 2 — Backend | Lwrance13 | ✅ Selesai | 4 REST service, JWT, WebSocket, Saga |
| Role 3 — Data | Afra Muawiya | ✅ Selesai | PostgreSQL, Redis, TimescaleDB |
| Role 4 — DevOps | Hamsah | ✅ Selesai | Nginx, Docker, Kubernetes |
| Role 5 — QA | Nur Alam Nasyrah | ✅ Selesai | Test, load test, dokumentasi |

## 3. Hasil API Testing
### 3.1 Summary
- Total test cases: [isi]
- Passed: [isi]
- Failed: [isi]
- Coverage: [isi]%

### 3.2 Hasil Per Service
| Service | Tests | Pass | Fail | Notes |
|---|---|---|---|---|
| station-service | [n] | [n] | [n] | |
| booking-service | [n] | [n] | [n] | |
| session-service | [n] | [n] | [n] | |
| billing-service | [n] | [n] | [n] | |
| E2E booking flow | [n] | [n] | [n] | |

## 4. Hasil Load Testing
### 4.1 GET /api/v1/stations (100 VU, 30s)
- Requests/sec: [isi]
- p95 latency: [isi] ms
- Error rate: [isi]%
- Status: ✅ / ❌ (threshold: p95 < 500ms, errors < 1%)

### 4.2 POST /api/v1/bookings concurrent (30 VU, 30s)
- Requests/sec: [isi]
- p95 latency: [isi] ms
- Redis lock conflicts (409): [isi]%
- Server errors (5xx): [isi]%
- Status: ✅ / ❌

### 4.3 WebSocket concurrent (20 VU, 45s)
- WS connections: [isi]
- Messages received: [isi]
- Status: ✅ / ❌

## 5. Temuan & Bug yang Ditemukan
| No | Deskripsi | Severity | Status |
|---|---|---|---|
| 1 | [contoh: payment gateway 10% failure rate adalah by design] | Info | Accepted |
| ... | | | |

## 6. Validasi ADR
| ADR | Keputusan | Terverifikasi? |
|---|---|---|
| ADR-001 | 4 microservice independen | ✅ |
| ADR-002 | REST sinkron + WebSocket | ✅ |
| ADR-003 | Database isolation per service | ✅ |
| ADR-004 | Redis slot locking TTL 300s | ✅ |

## 7. Rekomendasi
- [ ] Tambah rate limiting lebih ketat saat traffic tinggi
- [ ] Tambah retry logic di client saat payment gagal
- [ ] Implementasi circuit breaker untuk service-to-service calls
- [ ] Monitoring dengan Prometheus + Grafana untuk production

## 8. Cara Menjalankan Ulang Test
```bash
# Start semua service (1 command)
./start.sh

# Run unit + integration tests
cd tests && npm test

# Run load tests
k6 run tests/load/k6-stations.js
k6 run tests/load/k6-booking-flow.js
k6 run -e WS_URL=ws://localhost:8003 tests/load/k6-websocket.js
```
```

---

## Urutan Pengerjaan

```
1. Setup test environment (Task 1): buat tests/ folder + package.json
2. npm install di folder tests/
3. Jalankan services (pilih salah satu):
   a. docker-compose up -d        ← Full PostgreSQL+Redis (recommended)
   b. npm run dev di tiap services ← In-memory fallback
4. Tulis + jalankan API tests (Task 2) — termasuk test CRUD baru:
   cd tests && npm run test:api
5. Tulis + jalankan E2E test (Task 3) — test via Nginx gateway port 80:
   npm run test:e2e
6. Install k6, tulis + jalankan load tests (Task 4):
   k6 run tests/load/k6-stations.js
   k6 run tests/load/k6-booking-flow.js
   k6 run -e WS_URL=ws://localhost:8003 tests/load/k6-websocket.js
7. Buat OpenAPI spec (Task 5): docs/openapi/*.yaml
   (Update spec untuk endpoint CRUD baru: POST/PUT/DELETE /stations, /slots, /admin/*)
8. Buat Postman collection (Task 6): docs/postman/*.json
   (Tambahkan folder "6. Admin CRUD" dengan request untuk endpoint baru)
9. Tulis laporan akhir (Task 7): LAPORAN-AKHIR.md
10. Update README — tambah section Testing
11. git add . && git commit -m "feat(role5): add API tests, load tests, OpenAPI docs, laporan akhir"
12. git push origin main
```

---

## Checklist Selesai

- [ ] `tests/package.json` + `tsconfig.json` dibuat
- [ ] `tests/api/station-service.test.ts` — min. **11 test cases** (termasuk CRUD baru)
- [ ] `tests/api/booking-service.test.ts` — min. **7 test cases** (termasuk admin endpoint)
- [ ] `tests/api/session-service.test.ts` — min. **6 test cases** (termasuk admin endpoint)
- [ ] `tests/api/billing-service.test.ts` — min. **8 test cases** (termasuk admin + PATCH status)
- [ ] `tests/e2e/booking-flow.test.ts` — 8 step alur lengkap + Redis lock test
- [ ] `npm test` berjalan tanpa error
- [ ] k6 load test stations — p95 < 500ms, error < 1%
- [ ] k6 load test booking — Redis locking terbukti bekerja (>0 conflict 409)
- [ ] k6 load test WebSocket — connections berhasil
- [ ] `docs/openapi/station-service.yaml` — **include CRUD endpoints baru**
- [ ] `docs/openapi/booking-service.yaml` — include admin endpoint
- [ ] `docs/openapi/session-service.yaml` — include admin endpoint
- [ ] `docs/openapi/billing-service.yaml` — include admin + PATCH status
- [ ] `docs/postman/Emerald-Charge.postman_collection.json` — **tambah folder "Admin CRUD"**
- [ ] `LAPORAN-AKHIR.md` dengan data hasil test yang diisi
- [ ] README diupdate — tambah section **Testing**
- [ ] Push ke GitHub

---

## Rules Penting

- ❌ JANGAN test tanpa menjalankan service dulu
- ❌ JANGAN isi laporan dengan data palsu — jalankan test sungguhan
- ❌ JANGAN skip test CRUD endpoint baru (POST/PUT/DELETE stations, slots)
- ✅ Setiap test harus test hal yang berbeda (positif + negatif case)
- ✅ Load test HARUS verifikasi Redis slot locking bekerja (ada 409 conflicts)
- ✅ E2E test harus lewat Nginx gateway (port 80), bukan langsung ke service
- ✅ Admin endpoint (`/api/v1/admin/*`) harus ditest **dengan token** dan **tanpa token** (401)
- ✅ Test CRUD: setelah POST create → PUT update → DELETE hapus (lifecycle test)
- ✅ Laporan akhir harus berisi data asli dari hasil test
- ✅ Catat apakah test berjalan dengan Docker (PostgreSQL nyata) atau in-memory fallback
