# Session Progress — Emerald Charge Project
**Last updated:** 2026-08-21 | **Branch:** main

> File ini dibuat agar proses bisa dilanjutkan kapan saja.
> Jika laptop mati, buka Codespace, baca file ini, lalu lanjut dari **STATUS SAAT INI**.

---

## STATUS SAAT INI

### Semua Role Selesai:

| Role | Anggota | Status | Commit |
|---|---|---|---|
| Role 1 — Arsitek | Asmaul Husna | ✅ Selesai | `375d222b` |
| Role 2 — Backend | Lwrance13 | ✅ Selesai | `2f851caf` |
| Role 3 — Data | Afra Muawiya | ✅ Selesai | `ccdd1801` |
| Role 4 — DevOps | Hamsah | ✅ Selesai | `fde7dc67` |
| **Role 5 — QA** | Nur Alam Nasyrah | 🔄 **IN PROGRESS** | — |

### Yang Sudah Selesai Saat Ini:
- ✅ 4 backend microservices berjalan (ports 8001–8004)
- ✅ PostgreSQL + Redis via Docker (`./start.sh`)
- ✅ Web admin dashboard (port 5173) — terhubung ke PostgreSQL
- ✅ Mobile user app (Expo Go) — terhubung ke API
- ✅ Database terintegrasi: admin delete → user refresh → data hilang ✅
- ✅ Semua bug navigation, auth, dan UI sudah diperbaiki

### Yang Perlu Diselesaikan:
- 🔄 Role 5: tests/, OpenAPI, Postman, LAPORAN-AKHIR.md
- ⚠️ Mobile user: API_BASE perlu diupdate saat Codespace restart (URL berubah)

---

## CARA MELANJUTKAN SETELAH LAPTOP MATI

### Step 1: Buka Codespace dan start backend
```bash
cd /workspaces/[folder-project]
git pull origin main          # ambil perubahan terbaru
./start.sh                    # start Docker + 4 services
```

### Step 2: Cek semua berjalan
```bash
curl http://localhost:8001/health   # station-service
curl http://localhost:8002/health   # booking-service
curl http://localhost:8003/health   # session-service
curl http://localhost:8004/health   # billing-service
```

### Step 3: Update API_BASE mobile jika URL Codespace berubah
```bash
# Lihat URL baru di Codespaces Ports tab → port 8001
# Update baris ini di mobile-user/services/apiService.ts:
export const API_BASE = 'https://[nama-codespace]-8001.app.github.dev'
```

### Step 4: Jalankan web admin
```bash
cd web-admin && npm run dev   # buka port 5173 di browser
```

### Step 5: Jalankan mobile user
```bash
cd mobile-user && npx expo start --tunnel
```

---

## MASALAH YANG PERNAH TERJADI & SOLUSINYA

| Masalah | Solusi |
|---|---|
| Services crash saat start | Sudah di-fix: crash guard + JSON fallback. Restart: `./start.sh` |
| `billing-db` unhealthy | Fixed: `'NULL'` → `NULL` di seed.sql |
| `ioredis` crash | Fixed: Redis proxy pattern dengan fallback RedisMock |
| NAVIGATE 'Bookings' error | Fixed: `navigate('Main', { screen: 'Bookings' })` |
| "Unauthorized" di admin | Fixed: `initAdminAuth()` auto-get token on App load |
| Admin delete station tapi user masih lihat | Fixed: Semua page pakai `useEffect` fetch API |
| Tarif tidak update setelah save | Fixed: `useState` reactive + TariffsPage rewrite |
| Station 001/002 masih di user | Fixed: Mobile fetch dari API bukan local JSON |

---

## ARSITEKTUR TEKNIS TERKINI

### Backend Services (semuanya jalan via `./start.sh`)
```
:8001 station-service  → PostgreSQL:5432 + JSON fallback
:8002 booking-service  → PostgreSQL:5433 + Redis (ioredis/RedisMock)
:8003 session-service  → TimescaleDB:5434 + WebSocket
:8004 billing-service  → PostgreSQL:5435
```

### Web Admin (`web-admin/`) — Vite + React
- Proxy ke backend via `vite.config.ts` (routes `/api/*` ke service yang sesuai)
- Auth: `initAdminAuth()` di App.tsx auto-get token dari `/auth/token`
- SEMUA page: `useEffect` fetch dari API on mount (bukan local JSON)
- URL: `http://localhost:5173` di Codespaces Ports tab

### Mobile User (`mobile-user/`) — Expo React Native
- `apiService.ts`: `API_BASE = 'https://[codespace]-8001.app.github.dev'`
- Port 8002, 8003, 8004 di-derive dari API_BASE (replace `-8001.` → `-800X.`)
- SEMUA screen: `useEffect` fetch dari API (stations, bookings, invoices)
- Fallback: local JSON jika API tidak reachable

### Data Flow (setelah fix integrasi)
```
Admin DELETE /api/v1/stations/ST001
  → PostgreSQL station_db hapus ST001
  → Admin refresh → ST001 hilang ✅
  → Mobile refresh → ST001 hilang ✅
  (kedua app baca dari DB yang sama)
```

---

## FILE-FILE PENTING

| File | Fungsi |
|---|---|
| `./start.sh` | Start semua (Docker DB + 4 services) |
| `./stop.sh` | Stop semua |
| `docker-compose.dev.yml` | Docker: 4 DB + Redis (tanpa service container) |
| `mobile-user/services/apiService.ts` | URL backend untuk HP — **perlu diupdate tiap restart** |
| `web-admin/src/services/apiClient.ts` | API client admin + auth init |
| `services/*/src/index.ts` | Masing-masing service backend |
| `services/*/.env` | Config DB URL per service |
| `docs/role5-qa-loadtest-dokumentasi.md` | Instruksi Role 5 (Nur Alam) |

---

## LANGKAH SELANJUTNYA (Belum Dikerjakan)

### Role 5 — Nur Alam Nasyrah (QA):
```
Prompt untuk Copilot:
@file:docs/role5-qa-loadtest-dokumentasi.md
Baca file ini dan kerjakan Task 1 dulu — setup folder tests/
Pastikan ./start.sh sudah dijalankan sebelum mulai test.
```

**Task yang perlu diselesaikan:**
1. `tests/package.json` + `tsconfig.json`
2. API integration tests (4 file .test.ts)
3. E2E test booking flow
4. k6 load tests
5. OpenAPI YAML (4 service)
6. Postman collection
7. LAPORAN-AKHIR.md (diisi data asli dari test)

---

## COMMIT HISTORY TERKINI

```
2f851caf  feat: connect admin+mobile to real database (PostgreSQL via API)
94aca3a0  fix(admin+mobile): fix all remaining UI bugs
bd883039  fix(mobile-user+backend): fix all navigation, booking, and UI bugs
867212cf  fix(mobile-user): apiService.ts — route each call to correct service port
05384421  docs: update AGENTS.md — reflect full implementation
b4570669  docs: complete README + Role 5 update
75ff0c79  feat: full Docker setup working — PostgreSQL + Redis + all services
fdfef016  fix(all): make all services resilient without PostgreSQL/Redis
```
