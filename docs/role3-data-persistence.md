# Role 3 — Data & Persistence Engineer
**Pengerjaan: Afra Muawiya**

> Baca file ini lalu kerjakan semua task di bawah secara berurutan.
> Referensi arsitektur wajib dibaca dulu:
> - [docs/ARSITEKTUR.md](ARSITEKTUR.md) — section 4 (Data Model) dan section 6 (Deployment)
> - [docs/adr/ADR-003-database-per-service.md](adr/ADR-003-database-per-service.md)
> - [docs/adr/ADR-004-slot-locking-redis.md](adr/ADR-004-slot-locking-redis.md)

---

## Konteks

Backend API (Role 2) sudah selesai di folder `services/`. Semua service berjalan dengan
**in-memory store** (array JavaScript dari JSON) — data hilang saat server restart.

Tugasmu adalah mengganti in-memory store dengan **database sungguhan** tanpa mengubah
endpoint atau business logic yang sudah ada.

```
services/
├── station-service/   src/index.ts  ← pakai array in-memory dari stations.json
├── booking-service/   src/index.ts  ← pakai array in-memory dari bookings.json
├── session-service/   src/index.ts  ← pakai array in-memory dari charging_sessions.json
└── billing-service/   src/index.ts  ← pakai array in-memory dari invoices.json
```

---

## Stack yang Harus Disetup

| Komponen | Teknologi | Port |
|---|---|---|
| station-db | PostgreSQL 16 | 5432 |
| booking-db | PostgreSQL 16 | 5433 |
| session-db | **TimescaleDB** (pg16) | 5434 |
| billing-db | PostgreSQL 16 | 5435 |
| Slot Locking | **Redis 7** | 6379 |

> **ADR-003:** Setiap service punya database sendiri. TIDAK ada shared table. TIDAK ada JOIN lintas DB.

---

## Task 1 — docker-compose.yml (buat di root project)

Buat file `docker-compose.yml` di root project yang berisi:

```yaml
version: '3.9'
services:
  station-db:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: station_db, POSTGRES_USER: emerald, POSTGRES_PASSWORD: emerald2026 }
    ports: ["5432:5432"]
    volumes:
      - station-db-data:/var/lib/postgresql/data
      - ./services/station-service/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./services/station-service/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U emerald -d station_db"]
      interval: 5s
      retries: 10

  booking-db:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: booking_db, POSTGRES_USER: emerald, POSTGRES_PASSWORD: emerald2026 }
    ports: ["5433:5432"]
    volumes:
      - booking-db-data:/var/lib/postgresql/data
      - ./services/booking-service/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./services/booking-service/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U emerald -d booking_db"]
      interval: 5s
      retries: 10

  session-db:
    image: timescale/timescaledb:latest-pg16
    environment: { POSTGRES_DB: session_db, POSTGRES_USER: emerald, POSTGRES_PASSWORD: emerald2026 }
    ports: ["5434:5432"]
    volumes:
      - session-db-data:/var/lib/postgresql/data
      - ./services/session-service/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./services/session-service/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U emerald -d session_db"]
      interval: 5s
      retries: 10

  billing-db:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: billing_db, POSTGRES_USER: emerald, POSTGRES_PASSWORD: emerald2026 }
    ports: ["5435:5432"]
    volumes:
      - billing-db-data:/var/lib/postgresql/data
      - ./services/billing-service/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./services/billing-service/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U emerald -d billing_db"]
      interval: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5

volumes:
  station-db-data:
  booking-db-data:
  session-db-data:
  billing-db-data:
```

---

## Task 2 — Schema SQL per Service

### services/station-service/schema.sql

```sql
-- station-service database schema
CREATE TABLE IF NOT EXISTS stations (
  id            VARCHAR(10)  PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  location      TEXT,
  city          VARCHAR(100),
  province      VARCHAR(100),
  latitude      DECIMAL(10,6),
  longitude     DECIMAL(10,6),
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  operator_id   VARCHAR(50),
  total_slots   INTEGER      DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slots (
  id             VARCHAR(10) PRIMARY KEY,
  station_id     VARCHAR(10) NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  connector_type VARCHAR(20) NOT NULL,
  power_kw       INTEGER     NOT NULL,
  slot_status    VARCHAR(20) NOT NULL DEFAULT 'available',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tariffs (
  id             SERIAL      PRIMARY KEY,
  slot_id        VARCHAR(10) NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  price_per_kwh  INTEGER     NOT NULL,
  currency       VARCHAR(3)  NOT NULL DEFAULT 'IDR',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER slots_updated_at    BEFORE UPDATE ON slots    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_slots_station_id ON slots(station_id);
CREATE INDEX idx_slots_status     ON slots(slot_status);
CREATE INDEX idx_tariffs_slot_id  ON tariffs(slot_id);
```

### services/booking-service/schema.sql

```sql
-- booking-service database schema
CREATE TABLE IF NOT EXISTS bookings (
  id              VARCHAR(10)  PRIMARY KEY,
  user_id         VARCHAR(20)  NOT NULL,
  station_id      VARCHAR(10)  NOT NULL,
  slot_id         VARCHAR(10)  NOT NULL,
  booking_time    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  scheduled_start TIMESTAMPTZ  NOT NULL,
  scheduled_end   TIMESTAMPTZ  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  qr_code         VARCHAR(100),
  tariff_per_kwh  INTEGER,
  cancel_reason   VARCHAR(100),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Cron job tracker: lepas slot bila user tak datang +15 menit (ADR no-show policy)
CREATE TABLE IF NOT EXISTS no_show_jobs (
  id          SERIAL      PRIMARY KEY,
  booking_id  VARCHAR(10) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  release_at  TIMESTAMPTZ NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cache Idempotency-Key agar POST /bookings aman di-retry
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key               VARCHAR(200) PRIMARY KEY,
  response_snapshot JSONB        NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_bookings_user_id     ON bookings(user_id);
CREATE INDEX idx_bookings_slot_id     ON bookings(slot_id);
CREATE INDEX idx_bookings_status      ON bookings(status);
CREATE INDEX idx_bookings_sched_start ON bookings(scheduled_start);
CREATE INDEX idx_no_show_release_at   ON no_show_jobs(release_at) WHERE status = 'pending';
```

### services/session-service/schema.sql

```sql
-- session-service database schema — menggunakan TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE IF NOT EXISTS sessions (
  id             VARCHAR(10)   PRIMARY KEY,
  booking_id     VARCHAR(10)   NOT NULL,
  user_id        VARCHAR(20)   NOT NULL,
  slot_id        VARCHAR(10)   NOT NULL,
  station_id     VARCHAR(10)   NOT NULL,
  connector_id   VARCHAR(50),
  started_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMPTZ,
  meter_start    DECIMAL(12,3),
  meter_end      DECIMAL(12,3),
  kwh_used       DECIMAL(10,3),
  duration_min   INTEGER,
  status         VARCHAR(20)   NOT NULL DEFAULT 'active',
  tariff_per_kwh INTEGER,
  power_kw       INTEGER       DEFAULT 22,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- TimescaleDB hypertable: volume tulis 100x lebih tinggi dari booking (ADR-001)
-- Partisi otomatis per waktu untuk efisiensi query IoT
CREATE TABLE IF NOT EXISTS power_readings (
  id             BIGSERIAL,
  session_id     VARCHAR(10)   NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  recorded_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  cumulative_kwh DECIMAL(12,3),
  power_w        INTEGER,
  PRIMARY KEY (id, recorded_at)
);

SELECT create_hypertable('power_readings', 'recorded_at', if_not_exists => TRUE);

CREATE INDEX idx_sessions_booking_id ON sessions(booking_id);
CREATE INDEX idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX idx_sessions_status     ON sessions(status);
CREATE INDEX idx_power_session_time  ON power_readings(session_id, recorded_at DESC);
```

### services/billing-service/schema.sql

```sql
-- billing-service database schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS invoices (
  id             VARCHAR(10)  PRIMARY KEY,
  session_id     VARCHAR(10)  NOT NULL,
  user_id        VARCHAR(20)  NOT NULL,
  invoice_date   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  energy_kwh     DECIMAL(10,3),
  tariff_per_kwh INTEGER,
  subtotal       INTEGER,
  tax            INTEGER,
  total_amount   INTEGER,
  payment_status VARCHAR(20)  NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50),
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit trail permanen setiap percobaan pembayaran
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     VARCHAR(10)  NOT NULL REFERENCES invoices(id),
  payment_method VARCHAR(50)  NOT NULL,
  gateway        VARCHAR(50),
  gateway_ref    VARCHAR(100),
  amount         INTEGER,
  status         VARCHAR(20)  NOT NULL DEFAULT 'success',
  paid_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_history (
  id          SERIAL       PRIMARY KEY,
  user_id     VARCHAR(20)  NOT NULL,
  invoice_id  VARCHAR(10)  REFERENCES invoices(id),
  action      VARCHAR(50)  NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_invoices_user_id     ON invoices(user_id);
CREATE INDEX idx_invoices_session_id  ON invoices(session_id);
CREATE INDEX idx_invoices_status      ON invoices(payment_status);
CREATE INDEX idx_payment_history_user ON payment_history(user_id, created_at DESC);
```

---

## Task 3 — Seed SQL per Service

Generate `seed.sql` dari file JSON yang ada di `services/{nama}/src/*.json`.

Contoh format untuk station-service:
```sql
-- services/station-service/seed.sql
INSERT INTO stations (id, name, location, city, province, latitude, longitude, status)
VALUES
  ('ST001', 'SPKLU Station 001', 'Jl. Contoh No. 1', 'Makassar', 'Sulawesi Selatan', -4.675349, 110.59378, 'active'),
  ('ST002', 'SPKLU Station 002', 'Jl. Contoh No. 2', 'Surabaya', 'Jawa Barat', -6.804652, 108.189754, 'active')
  -- ... lanjutkan semua 100 records dari stations.json
ON CONFLICT (id) DO NOTHING;

INSERT INTO slots (id, station_id, connector_type, power_kw, slot_status)
VALUES
  ('SL001', 'ST001', 'Type 2', 22, 'available'),
  ('SL002', 'ST002', 'Type 2', 150, 'available')
  -- ... lanjutkan semua 100 records dari slots.json
ON CONFLICT (id) DO NOTHING;
```

Buat hal yang sama untuk service lain dari file JSON masing-masing.

---

## Task 4 — src/db.ts per Service

Buat file `services/{nama}/src/db.ts` di semua 4 service:

```typescript
import { Pool } from 'pg'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 3_000,
})

pool.on('error', (err) => console.error('[db] Unexpected pool error', err))

export async function query(text: string, params?: any[]) {
  const start = Date.now()
  const res = await pool.query(text, params)
  console.log(`[db] ${text.slice(0, 60)}… — ${Date.now() - start}ms, ${res.rowCount} rows`)
  return res
}
```

---

## Task 5 — Tambah Dependencies per Service

Jalankan di setiap service folder:
```bash
npm install pg dotenv
npm install -D @types/pg
```

Khusus booking-service (ganti RedisMock dengan Redis nyata):
```bash
npm install ioredis
npm install -D @types/ioredis
```

---

## Task 6 — Update src/index.ts per Service

### Pola perubahan:

**Sebelum (in-memory):**
```typescript
import stationsRaw from './stations.json'
const stations: any[] = [...(stationsRaw as any[])]

app.get('/api/v1/stations', (_req, res) => {
  return envelope(res, stations)
})
```

**Sesudah (PostgreSQL):**
```typescript
import 'dotenv/config'
import { query } from './db'

app.get('/api/v1/stations', async (_req, res) => {
  const result = await query('SELECT * FROM stations ORDER BY id LIMIT 50')
  return envelope(res, result.rows)
})
```

### Khusus booking-service — ganti RedisMock dengan ioredis:

**Sebelum:**
```typescript
const redis = new RedisMock()
// ...
if (!redis.setnx(key, requestId, 300)) { ... }
```

**Sesudah:**
```typescript
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
// ...
const locked = await redis.set(key, requestId, 'EX', 300, 'NX')
if (!locked) { ... }
// Release lock:
const currentOwner = await redis.get(key)
if (currentOwner === requestId) await redis.del(key)
```

---

## Task 7 — .env per Service

Buat `.env` (local) dan `.env.docker` (container) di setiap service:

**services/station-service/.env (local):**
```
PORT=8001
DATABASE_URL=postgresql://emerald:emerald2026@localhost:5432/station_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=emerald-charge-secret-2026
```

**services/station-service/.env.docker (container):**
```
PORT=8001
DATABASE_URL=postgresql://emerald:emerald2026@station-db/station_db
REDIS_URL=redis://emerald-redis:6379
JWT_SECRET=emerald-charge-secret-2026
```

Sesuaikan port DB dan nama host untuk masing-masing service:
- booking-service: DB port 5433, host booking-db
- session-service: DB port 5434, host session-db
- billing-service: DB port 5435, host billing-db

---

## Task 8 — Dockerfile per Service

Buat `Dockerfile` di setiap service folder:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 8001
CMD ["node", "dist/index.js"]
```

Sesuaikan `EXPOSE` dengan port masing-masing service.

---

## Urutan Pengerjaan

```
1. Baca ADR-003 dan ADR-004 dulu
2. Buat docker-compose.yml (Task 1)
3. Buat schema.sql semua service (Task 2)
4. Generate seed.sql dari JSON (Task 3)
5. Buat src/db.ts semua service (Task 4)
6. npm install pg, dotenv, ioredis (Task 5)
7. Update src/index.ts semua service (Task 6)
8. Buat .env dan .env.docker (Task 7)
9. Buat Dockerfile semua service (Task 8)
10. Test: docker-compose up --build
11. Verifikasi endpoint: curl http://localhost:8001/api/v1/stations
12. git add . && git commit -m "feat(role3): add PostgreSQL, TimescaleDB, Redis persistence"
13. git push origin main
```

---

## Verifikasi Akhir

Setelah `docker-compose up --build`, pastikan semua ini berjalan:

```bash
# Token
curl -X POST http://localhost:8001/auth/token -d '{"userId":"USR001"}' -H "Content-Type: application/json"

# Stations dari DB
curl http://localhost:8001/api/v1/stations

# Slot availability
curl http://localhost:8001/api/v1/slots/SL001/availability

# Booking baru (test Redis lock)
curl -X POST http://localhost:8002/api/v1/bookings \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Idempotency-Key: test-001" \
  -d '{"stationId":"ST001","slotId":"SL001","startTime":"2026-08-25T10:00:00Z","endTime":"2026-08-25T12:00:00Z"}'
```

---

## Rules Penting — Jangan Dilanggar

- ❌ JANGAN ubah endpoint URL atau business logic
- ❌ JANGAN buat shared table lintas service
- ❌ JANGAN gunakan JOIN lintas database
- ✅ Setiap service hanya query database-nya sendiri
- ✅ Redis SETNX TTL 300s untuk slot locking
- ✅ power_readings HARUS jadi TimescaleDB hypertable
- ✅ Semua kolom waktu pakai `TIMESTAMPTZ`
- ✅ Tambah `.env` ke `.gitignore`
