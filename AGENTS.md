# AGENTS.md

## Project context
**Emerald Charge** — Platform pemesanan slot pengisian daya EV (SPKLU). Sistem ini sudah **fully implemented** dengan 4 microservice backend, web admin dashboard, mobile user app, PostgreSQL databases, Redis, dan Docker setup.

## Implementation status
- ✅ Role 1 (Arsitektur): 4 ADR, context map, sequence diagram, data model
- ✅ Role 2 (Backend): 4 REST API services (Express+TypeScript), JWT, WebSocket, Saga, CRUD lengkap
- ✅ Role 3 (Data): PostgreSQL schema per service, TimescaleDB, Redis, seed data (100 records)
- ✅ Role 4 (DevOps): Nginx gateway, Docker Compose, Kubernetes manifests, health checks
- 🔄 Role 5 (QA): In progress — lihat `docs/role5-qa-loadtest-dokumentasi.md`

## Quick start
```bash
./start.sh          # Start Docker DB + Redis + semua 4 service
cd web-admin && npm run dev    # Admin dashboard :5173
cd mobile-user && npx expo start --tunnel   # Mobile app
```

## Primary references
- [README.md](README.md) — cara menjalankan lengkap
- [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md)
- [docs/adr/ADR-001-microservice-decomposition.md](docs/adr/ADR-001-microservice-decomposition.md)
- [docs/adr/ADR-002-komunikasi-antar-service.md](docs/adr/ADR-002-komunikasi-antar-service.md)
- [docs/adr/ADR-003-database-per-service.md](docs/adr/ADR-003-database-per-service.md)
- [docs/adr/ADR-004-slot-locking-redis.md](docs/adr/ADR-004-slot-locking-redis.md)
- [docs/role5-qa-loadtest-dokumentasi.md](docs/role5-qa-loadtest-dokumentasi.md)

## Service structure
```
services/station-service/   :8001  PostgreSQL :5432
services/booking-service/   :8002  PostgreSQL :5433 + Redis :6379
services/session-service/   :8003  TimescaleDB :5434 + WebSocket
services/billing-service/   :8004  PostgreSQL :5435
web-admin/                          Vite+React admin (Vite proxy → backend)
mobile-user/                        Expo React Native user app
gateway/                            Nginx config (dev: Vite proxy)
k8s/                                Kubernetes manifests
```

## Architecture to preserve
- Four bounded contexts: `station-service`, `booking-service`, `session-service`, `billing-service`.
- **No cross-service DB joins** — data only via REST API (ADR-003).
- **Redis SETNX** slot locking TTL 300s per slot per hour block (ADR-004).
- **TimescaleDB** for `power_readings` time-series in session-service (ADR-001).
- Response envelope: `{ data, meta: {requestId, timestamp}, error }`.
- Error format: RFC 7807 Problem Details `{ type, title, status, detail }`.
- API versioning: `/api/v1/...`.

## Conventions
- REST paths: `kebab-case`, noun plural: `/charging-sessions`
- JSON fields: `camelCase`
- Database columns: `snake_case`
- Event names: `SCREAMING_SNAKE_CASE`
- Service names: `kebab-case`

## Working rules for agents
- Read `docs/ARSITEKTUR.md` before making design changes.
- Keep changes consistent with ADR decisions — especially ADR-003 (no shared DB) and ADR-004 (Redis lock).
- All services must be resilient: handle PostgreSQL/Redis unavailability gracefully (JSON fallback).
- TypeScript must compile with 0 errors before committing.
- The `.env` files configure database connections — do not hardcode credentials.
- Admin endpoints require JWT auth (`Authorization: Bearer <token>`).
- Station service also serves `/auth/token` for development convenience.

## Build & test commands
```bash
# TypeScript check
cd services/station-service && npx tsc --noEmit
cd web-admin && npx tsc --noEmit
cd mobile-user && npx tsc --noEmit

# Build web-admin
cd web-admin && npm run build

# Build mobile Android bundle
cd mobile-user && npx expo export --platform android --output-dir android-test
```
