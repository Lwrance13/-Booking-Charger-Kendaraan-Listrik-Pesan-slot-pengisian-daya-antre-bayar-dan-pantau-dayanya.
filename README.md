# ⚡ Emerald Charge — Booking Charger Kendaraan Listrik

> Sistem pemesanan slot pengisian daya EV — pesan slot, antre, bayar, dan pantau daya secara real-time.

![Stack](https://img.shields.io/badge/Backend-Express%20%2B%20TypeScript-green)
![Mobile](https://img.shields.io/badge/Mobile-Expo%20React%20Native-blue)
![Web](https://img.shields.io/badge/Admin-Vite%20%2B%20React-purple)
![Architecture](https://img.shields.io/badge/Architecture-Microservice-orange)

---

## 👥 Tim & Peran

| Role | Anggota | Tanggung Jawab | Status |
|---|---|---|---|
| 🏛️ Arsitek Sistem | Asmaul Husna | Arsitektur, ADR, diagram, konsistensi desain | ✅ Selesai |
| ⚙️ Backend/API Engineer | Lwrance13 | Endpoint REST, logika bisnis, JWT, WebSocket | ✅ Selesai |
| 🗄️ Data & Persistence Engineer | Afra Muawiya | Schema DB, Redis, TimescaleDB, migrasi | ✅ Selesai |
| 🚀 Infrastructure & DevOps | Hamsah | Docker, Compose, API Gateway, Kubernetes | ⏳ Pending |
| 🧪 QA, Load-Test & Dokumentasi | Nur Alam Nasyrah | Pengujian, load test, laporan akhir | ⏳ Pending |

---

## 🗂️ Struktur Proyek

```
.
├── docs/                        # Dokumentasi arsitektur & ADR
│   ├── ARSITEKTUR.md            # Context map, sequence diagram, data model
│   └── adr/                     # Architecture Decision Records
│       ├── ADR-001-microservice-decomposition.md
│       ├── ADR-002-komunikasi-antar-service.md
│       ├── ADR-003-database-per-service.md
│       └── ADR-004-slot-locking-redis.md
│
├── data/                        # Dummy data JSON per service (100 records/entity)
│   ├── station-service/         # stations.json · slots.json · vehicles.json
│   ├── booking-service/         # bookings.json
│   ├── session-service/         # charging_sessions.json · realtime_meter.json
│   ├── billing-service/         # invoices.json
│   └── shared/                  # audit_history.json
│
├── services/                    # Backend Microservices (Express + TypeScript)
│   ├── station-service/         # :8001 — stasiun, slot, tarif
│   ├── booking-service/         # :8002 — reservasi + Redis lock + no-show cron
│   ├── session-service/         # :8003 — sesi pengisian + WebSocket real-time
│   └── billing-service/         # :8004 — invoice + pembayaran + saga
│
├── web-admin/                   # Admin Dashboard Web (Vite + React + TypeScript)
│   └── src/pages/               # Stations · Bookings · Sessions · Slots
│                                #   Power · Billing · Tariffs · Audit Log
│
├── mobile-user/                 # User Mobile App (Expo React Native)
│   └── screens/                 # Home · Bookings · Wallet · Profile
│                                #   BookSession · StationMap · Vehicles
│
└── mobile/                      # Admin App (Expo — web export only)
    └── screens/                 # Dashboard · Slots · Power · Tariffs
```

---

## 🔌 Microservices

| Service | Port | Endpoints Utama |
|---|---|---|
| `station-service` | 8001 | `GET /api/v1/stations` · `GET /api/v1/slots/:id/availability` · `PATCH /api/v1/slots/:id/status` · `GET /api/v1/tariffs/:slotId` |
| `booking-service` | 8002 | `POST /api/v1/bookings` · `GET /api/v1/bookings/:id` · `PATCH /api/v1/bookings/:id/status` · `DELETE /api/v1/bookings/:id` |
| `session-service` | 8003 | `POST /api/v1/sessions/start` · `POST /api/v1/sessions/:id/stop` · `WS /ws/:sessionId` |
| `billing-service` | 8004 | `POST /api/v1/invoices` · `GET /api/v1/invoices/:id` · `POST /api/v1/payments` · `GET /api/v1/payments/history/:userId` |

### Alur End-to-End

```
1. POST /auth/token              → JWT Bearer token
2. GET  /api/v1/stations         → Temukan stasiun tersedia
3. GET  /api/v1/slots/:id/availability → Cek slot
4. POST /api/v1/bookings         → Booking dikonfirmasi (Redis SETNX lock + Idempotency-Key)
5. POST /api/v1/sessions/start   → Mulai sesi pengisian (idempoten by bookingId)
   └── WebSocket ws://host:8003/ws/:sessionId → Push meter tiap 30 detik
6. POST /api/v1/sessions/:id/stop → Stop sesi → auto buat invoice
7. GET  /api/v1/invoices/:id     → Cek tagihan
8. POST /api/v1/payments         → Bayar → booking status COMPLETED (Saga)
```

### Fitur Backend yang Diimplementasi

| Fitur | Implementasi |
|---|---|
| **JWT Authentication** | `authMiddleware` di semua endpoint |
| **Response Envelope** | `{ data, meta: { requestId, timestamp }, error }` |
| **RFC 7807 Error** | `{ type, title, status, detail }` |
| **Redis Slot Locking** | `RedisMock.setnx()` TTL 300s per slot per jam (ADR-004) |
| **Idempotency-Key** | Cache replay pada `POST /bookings` |
| **No-show Auto-Release** | Cron setiap 30s: cancel booking +15 mnt no check-in |
| **WebSocket Real-time** | Push `{ currentKwh, durationMin, estimatedCost }` tiap 30s |
| **Saga Pattern** | Stop session → invoice → payment → update booking status |

---

## 🚀 Cara Menjalankan

### Cara Menjalankan dengan Docker (Recommended)

```bash
# Jalankan semua database + Redis + service sekaligus
docker-compose up --build

# Atau hanya database + Redis (development mode)
docker-compose up -d station-db booking-db session-db billing-db redis
```

### Cara Menjalankan Manual (tanpa Docker)

### Cara Menjalankan Manual (tanpa Docker)

```bash
# Pastikan PostgreSQL + Redis sudah berjalan dulu, lalu:
cd services/station-service && npm install && npm run dev   # :8001
cd services/booking-service && npm install && npm run dev   # :8002
cd services/session-service && npm install && npm run dev   # :8003
cd services/billing-service && npm install && npm run dev   # :8004
```

### Admin Web Dashboard

```bash
cd web-admin
npm install
npm run dev        # dev server :5173
npm run build      # production build → dist/
```

### User Mobile App (Expo Go)

```bash
cd mobile-user
npm install
npx expo start --tunnel   # scan QR dengan Expo Go
```

---

## 📐 Arsitektur & Desain

### Dokumentasi Lengkap

- [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) — Context map, sequence diagram, data model, deployment view, design principles
- [docs/adr/ADR-001](docs/adr/ADR-001-microservice-decomposition.md) — Dekomposisi 4 Microservice
- [docs/adr/ADR-002](docs/adr/ADR-002-komunikasi-antar-service.md) — Komunikasi REST + Event Bus
- [docs/adr/ADR-003](docs/adr/ADR-003-database-per-service.md) — Database Isolation per Service
- [docs/adr/ADR-004](docs/adr/ADR-004-slot-locking-redis.md) — Slot Locking dengan Redis

### Konvensi

| Konteks | Konvensi |
|---|---|
| REST path | `kebab-case` plural: `/charging-sessions` |
| JSON field | `camelCase` |
| Database column | `snake_case` |
| Event name | `SCREAMING_SNAKE_CASE` |
| Service name | `kebab-case` |
| API versioning | `/api/v1/...` |

---

## 📦 Tech Stack

| Layer | Teknologi |
|---|---|
| Backend API | Node.js · Express · TypeScript · ts-node |
| Auth | JSON Web Token (JWT) |
| Caching / Lock | Redis (in-memory mock — akan diganti Role 3) |
| Real-time | WebSocket (`ws`) |
| Admin Web | Vite · React 19 · TypeScript · react-router-dom |
| User Mobile | Expo SDK 53 · React Native 0.79 · TypeScript |
| Database | PostgreSQL 16 per service · TimescaleDB (session-service) |
| Caching / Lock | Redis 7 — `ioredis` · SET EX 300 NX per slot per jam |
| Container | Docker + docker-compose (4 DB + Redis + 4 service) · Kubernetes (Role 4) |

---

## 📊 Data Dummy

File sumber: `dummy_data_spklu_100 (1).xlsx` — 100 records per entitas

| Entity | Records | Service |
|---|---|---|
| Stations | 100 | station-service |
| Slots | 100 | station-service |
| Vehicles | 100 | station-service |
| Bookings | 100 | booking-service |
| Charging Sessions | 100 | session-service |
| Realtime Meter | 101 | session-service |
| Invoices | 100 | billing-service |
| Audit History | 100 | shared |
