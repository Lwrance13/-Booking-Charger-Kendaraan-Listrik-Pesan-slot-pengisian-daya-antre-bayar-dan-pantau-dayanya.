# ⚡ Emerald Charge — Booking Charger Kendaraan Listrik

> Sistem pemesanan slot pengisian daya EV — pesan slot, antre, bayar, dan pantau daya secara real-time.

![Backend](https://img.shields.io/badge/Backend-Express%20%2B%20TypeScript-green)
![Mobile](https://img.shields.io/badge/Mobile-Expo%20React%20Native-blue)
![Web](https://img.shields.io/badge/Admin-Vite%20%2B%20React-purple)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20Redis-orange)
![Architecture](https://img.shields.io/badge/Architecture-Microservice-red)

---

## 👥 Tim & Peran

| Role | Anggota | Tanggung Jawab | Status |
|---|---|---|---|
| 🏛️ Arsitek Sistem | Asmaul Husna | Arsitektur, ADR, diagram, konsistensi desain | ✅ Selesai |
| ⚙️ Backend/API Engineer | Lwrance13 | Endpoint REST CRUD, logika bisnis, JWT, WebSocket, Saga, **DB integration** | ✅ Selesai |
| 🗄️ Data & Persistence | Afra Muawiya | PostgreSQL schema, Redis, TimescaleDB, seed data | ✅ Selesai |
| 🚀 Infrastructure & DevOps | Hamsah | Nginx gateway, Docker Compose, Kubernetes, health checks | ✅ Selesai |
| 🧪 QA, Load-Test & Docs | Nur Alam Nasyrah | Pengujian, load test, OpenAPI, laporan akhir | 🔄 In Progress |

---

## 🚀 Cara Menjalankan — Quick Start

### 1. Jalankan semua (1 command)

```bash
# Dari root project — start Docker DB + Redis + semua service
./start.sh
```

Script ini akan:
- Start 5 Docker containers (4 PostgreSQL + Redis)
- Tunggu semua healthy
- Start 4 backend services (station, booking, session, billing)
- Health check semua service

```bash
# Stop semua
./stop.sh
```

### 2. Jalankan Web Admin

```bash
cd web-admin
npm install
npm run dev         # Dev server on port 5173 (dengan Vite proxy ke backend)
```

Buka **Codespaces Ports tab → port 5173** di browser.

### 3. Jalankan Mobile App (User)

```bash
cd mobile-user
npm install
npx expo start --tunnel   # Scan QR dengan Expo Go
```

**⚠️ Untuk akses backend dari HP:**
1. Buka Codespaces Ports tab → port 8001
2. Copy forwarded URL (contoh: `https://xxx-8001.app.github.dev`)
3. Update `mobile-user/services/apiService.ts`:
   ```typescript
   export const API_BASE = 'https://xxx-8001.app.github.dev'
   ```

### 4. Jalankan tanpa Docker (fallback JSON)

```bash
# Service tetap berjalan dengan data JSON jika PostgreSQL/Redis tidak tersedia
cd services/station-service && npm run dev   # :8001
cd services/booking-service && npm run dev   # :8002
cd services/session-service && npm run dev   # :8003
cd services/billing-service && npm run dev   # :8004
```

---

## 🗂️ Struktur Proyek

```
.
├── start.sh                     # 🚀 Startup script (Docker + services)
├── stop.sh                      # 🛑 Shutdown script
├── docker-compose.dev.yml       # Docker: 4 PostgreSQL + Redis (development)
├── docker-compose.yml           # Docker: full stack termasuk services
│
├── docs/                        # Dokumentasi arsitektur & ADR
│   ├── ARSITEKTUR.md
│   ├── adr/                     # 4 Architecture Decision Records
│   ├── role3-data-persistence.md
│   ├── role4-infrastructure-devops.md
│   └── role5-qa-loadtest-dokumentasi.md
│
├── data/                        # Dummy data JSON (100 records/entity)
│   ├── station-service/         # stations · slots · vehicles
│   ├── booking-service/         # bookings
│   ├── session-service/         # charging_sessions · realtime_meter
│   ├── billing-service/         # invoices
│   └── shared/                  # audit_history
│
├── services/                    # Backend Microservices (Express + TypeScript)
│   ├── station-service/   :8001
│   ├── booking-service/   :8002
│   ├── session-service/   :8003
│   └── billing-service/   :8004
│
├── gateway/                     # Nginx API Gateway config
│   ├── nginx.conf
│   └── conf.d/emerald.conf      # Routing + rate limit + WebSocket
│
├── k8s/                         # Kubernetes manifests
│   ├── namespace · configmap · ingress
│   ├── redis/
│   └── {4 service}/deployment + service
│
├── web-admin/                   # Admin Dashboard (Vite + React + TypeScript)
│   └── src/pages/               # Stations · Bookings · Sessions · Slots
│                                # Power · Billing · Tariffs · Audit
│
├── mobile-user/                 # User Mobile App (Expo React Native)
│   └── screens/                 # Home · Bookings · Wallet · Profile
│                                # BookSession · StationMap · Vehicles
│
└── mobile/                      # Admin App (Expo — web export only)
```

---

## 🔌 API Microservices

| Service | Port | Database | Endpoint Utama |
|---|---|---|---|
| `station-service` | 8001 | PostgreSQL :5432 | GET/POST/PUT/DELETE `/stations`, GET `/slots/:id/availability`, GET `/tariffs/:id` |
| `booking-service` | 8002 | PostgreSQL :5433 + Redis | POST `/bookings` (Idempotency-Key + Redis lock), GET/PATCH/DELETE `/bookings` |
| `session-service` | 8003 | PostgreSQL :5434 (TimescaleDB) | POST `/sessions/start`, POST `/sessions/:id/stop`, WS `/ws/:sessionId` |
| `billing-service` | 8004 | PostgreSQL :5435 | POST `/invoices`, POST `/payments`, GET `/payments/history/:userId` |

### Admin Endpoints (baru)
```
GET /api/v1/admin/slots      → station-service
GET /api/v1/admin/bookings   → booking-service  (filter: ?status=&user_id=)
GET /api/v1/admin/sessions   → session-service
GET /api/v1/admin/invoices   → billing-service  (filter: ?status=)
PATCH /api/v1/invoices/:id/status → billing-service
```

### Alur End-to-End (E2E Tested ✅)
```
POST /auth/token              → JWT Bearer token
GET  /api/v1/stations         → 50 stasiun dari PostgreSQL
GET  /api/v1/slots/:id/availability → cek slot + tarif
POST /api/v1/bookings         → booking confirmed (Redis lock ADR-004)
POST /api/v1/sessions/start   → sesi dimulai + WebSocket ws://:8003/ws/:id
POST /api/v1/sessions/:id/stop → stop → auto POST /invoices (Saga)
POST /api/v1/payments         → bayar → booking COMPLETED (Saga)
```

---

## 🏗️ Fitur Backend yang Diimplementasi

| Fitur | Status | Detail |
|---|---|---|
| **Database integration** | ✅ | Admin + Mobile READ dari PostgreSQL via API (bukan local JSON) |
| **Data consistency** | ✅ | Admin delete → PostgreSQL diupdate → Mobile refresh → data hilang |
| **JWT Authentication** | ✅ | `authMiddleware` semua endpoint |
| **Response Envelope** | ✅ | `{ data, meta: {requestId, timestamp}, error }` |
| **RFC 7807 Error** | ✅ | `{ type, title, status, detail }` |
| **Redis Slot Locking** | ✅ | `ioredis` + `RedisMock` fallback, TTL 300s (ADR-004) |
| **Idempotency-Key** | ✅ | Cache replay di `POST /bookings` |
| **No-show Auto-Release** | ✅ | Cron 30s: cancel booking +15 mnt no check-in |
| **WebSocket Real-time** | ✅ | Push `{currentKwh, durationMin, estimatedCost}` tiap 30s |
| **Saga Pattern** | ✅ | Stop session → invoice → payment → update booking |
| **CRUD Lengkap** | ✅ | POST/PUT/DELETE stations, slots |
| **PostgreSQL** | ✅ | Dengan JSON fallback saat DB tidak tersedia |
| **TimescaleDB** | ✅ | `power_readings` hypertable di session-service |
| **Crash-proof** | ✅ | `unhandledRejection` handler, DB/Redis graceful degradation |

---

## 🖥️ Web Admin Dashboard

**URL:** `http://localhost:5173` (via Vite dev proxy → backend)

| Halaman | Fitur |
|---|---|
| **Stations** | KPI cards · Tabel + search · **Add/Edit/Delete** stasiun (API → PostgreSQL) |
| **Bookings** | Filter status · **Cancel** booking (API) · Mark Complete · **data dari DB** |
| **Sessions** | Tabel semua sesi · kWh · durasi · **data dari DB** |
| **Slots** | Grid slot · **Toggle Enable/Disable** (API) · progress bar · **data dari DB** |
| **Power** | Bar chart real-time · meter readings · **data dari DB** |
| **Billing** | KPI revenue · filter · tabel invoice · **data dari DB** |
| **Tariffs** | Plan cards · **Edit modal + Delete + Create New** (reactive state) |
| **Audit Log** | Semua perubahan status |

---

## 📱 Mobile User App

**Jalankan:** `npx expo start --tunnel` lalu scan QR dengan Expo Go

| Screen | Fitur |
|---|---|
| **Home** | Welcome · Balance · Book a Slot Now · Next Booking · **Nearby Stations dari DB** |
| **BookSession** | Date picker · Time slot grid · **Confirm Booking → API** · demo fallback |
| **Bookings** | Active Reservation (dari DB) · Auto-release warning · **Check-In → API** |
| **Wallet** | Balance · Top Up · **Riwayat transaksi dari DB** |
| **StationMap** | Map placeholder · markers · **Stations dari DB** · Book Slot |
| **Vehicles** | Kartu kendaraan · **Book Charging → navigasi ke BookSession** |
| **Profile** | Avatar · My Vehicles · Log Out |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| Backend API | Node.js 20 · Express 4 · TypeScript 5.8 · ts-node |
| Auth | JSON Web Token (JWT HS256, 24h expiry) |
| Slot Locking | ioredis → Redis 7 · RedisMock fallback (ADR-004) |
| Real-time | WebSocket (`ws`) — push tiap 30 detik |
| Admin Web | Vite 6 · React 19 · TypeScript · react-router-dom 7 |
| User Mobile | Expo SDK 53 · React Native 0.79.6 · TypeScript |
| Database | PostgreSQL 16 per service (ADR-003) · TimescaleDB (session) |
| Container | Docker + docker-compose.dev.yml |
| Gateway | Nginx 1.27 (dev: Vite proxy) |
| Orchestration | Kubernetes manifests (k8s/) |

---

## 🐳 Docker Setup

```bash
# Start DB + Redis hanya (dev mode — services jalan lokal)
docker compose -f docker-compose.dev.yml up -d

# Stop dan hapus volumes
docker compose -f docker-compose.dev.yml down -v
```

**Containers:**
| Container | Image | Port |
|---|---|---|
| station-db | postgres:16-alpine | 5432 |
| booking-db | postgres:16-alpine | 5433 |
| session-db | timescale/timescaledb:latest-pg16 | 5434 |
| billing-db | postgres:16-alpine | 5435 |
| emerald-redis | redis:7-alpine | 6379 |

---

## 📊 Data

File sumber: `data_spklu_100 (1).xlsx` → 8 JSON files, 100 records/entity

| Entity | File | Service |
|---|---|---|
| Stations | `stations.json` | station-service |
| Slots | `slots.json` | station-service |
| Vehicles | `vehicles.json` | station-service |
| Bookings | `bookings.json` | booking-service |
| Sessions | `charging_sessions.json` | session-service |
| Meter Readings | `realtime_meter.json` | session-service |
| Invoices | `invoices.json` | billing-service |
| Audit History | `audit_history.json` | shared |

---

## 📐 Dokumentasi Arsitektur

- [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) — Context map, sequence diagram, data model, deployment
- [docs/adr/ADR-001](docs/adr/ADR-001-microservice-decomposition.md) — Dekomposisi 4 Microservice
- [docs/adr/ADR-002](docs/adr/ADR-002-komunikasi-antar-service.md) — REST + Event Bus
- [docs/adr/ADR-003](docs/adr/ADR-003-database-per-service.md) — Database Isolation
- [docs/adr/ADR-004](docs/adr/ADR-004-slot-locking-redis.md) — Redis Slot Locking
- [docs/role3-data-persistence.md](docs/role3-data-persistence.md) — Instruksi Role 3
- [docs/role4-infrastructure-devops.md](docs/role4-infrastructure-devops.md) — Instruksi Role 4
- [docs/role5-qa-loadtest-dokumentasi.md](docs/role5-qa-loadtest-dokumentasi.md) — Instruksi Role 5
- [docs/SESSION-PROGRESS.md](docs/SESSION-PROGRESS.md) — **Progress & cara resume jika sesi terputus**

---

## 🐛 Bug Fix History

| Bug | Fix | Commit |
|---|---|---|
| Services crash tanpa PostgreSQL/Redis | Crash guard + JSON fallback di semua service | `fdfef016` |
| billing-db unhealthy | `'NULL'` → `NULL` di seed.sql | `75ff0c79` |
| ioredis crash → booking-service DOWN | Redis proxy pattern + RedisMock fallback | `75ff0c79` |
| Admin "Unauthorized" di semua aksi | `initAdminAuth()` auto-get token on load | `94aca3a0` |
| Tariff save tidak update displayed rate | `useState` reactive + TariffsPage rewrite | `94aca3a0` |
| NAVIGATE 'Bookings' not handled | `navigate('Main', {screen:'Bookings'})` | `bd883039` |
| Check-In 'Booking Not Active' | `_pendingBooking` tracker + demo fallback | `bd883039` |
| Admin delete station tapi user masih lihat | Semua page `useEffect` fetch dari API | `2f851caf` |
| Mobile stations tidak sync dengan DB | `HomeScreen/StationMapScreen` fetch `/api/v1/stations` | `2f851caf` |

---

## 🧪 Testing (Role 5 — Nur Alam Nasyrah)

```bash
# Jalankan services dulu
./start.sh

# Setup test
mkdir -p tests && cd tests
npm install

# API integration tests
npm run test:api

# E2E test (butuh Nginx di port 80)
npm run test:e2e

# Load test (butuh k6)
k6 run tests/load/k6-stations.js
k6 run tests/load/k6-booking-flow.js
```

Lihat instruksi lengkap: [docs/role5-qa-loadtest-dokumentasi.md](docs/role5-qa-loadtest-dokumentasi.md)

---

## 🔧 Konvensi Kode

| Konteks | Konvensi |
|---|---|
| REST path | `kebab-case` plural: `/charging-sessions` |
| JSON field | `camelCase` |
| Database column | `snake_case` |
| Event name | `SCREAMING_SNAKE_CASE` |
| API versioning | `/api/v1/...` |
