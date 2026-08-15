# Arsitektur Sistem — Booking Charger Kendaraan Listrik

## 1. Ringkasan

Sistem ini memungkinkan pengguna memesan slot pengisian daya EV, memantau sesi pengisian, dan membayar tagihan secara otomatis. Dirancang sebagai **empat microservice independen** yang berkomunikasi via REST (sinkron) dan Event/Message (asinkron).

---

## 2. Context Map (Peta Konteks)

![Context Map](diagrams/context-map.svg)

![User Journey Flow](diagrams/flow.svg)

Empat bounded context utama beserta arah ketergantungan:

```mermaid
graph TD
    Client(["👤 Client\n(Mobile / Web App)"])

    subgraph Core["Core Domain"]
        SS["🔌 station-service\nKelola stasiun, slot,\ndaya tersedia, tarif"]
        BS["📅 booking-service\nPesan slot, cegah bentrok,\nlepas bila tak datang"]
        SE["⚡ session-service\nCatat sesi pengisian:\nmulai · kWh · selesai"]
        BL["💳 billing-service\nHitung tagihan dari kWh,\nproses pembayaran"]
    end

    Client -->|"Cari stasiun & slot"| SS
    Client -->|"Buat / batalkan booking"| BS
    Client -->|"Mulai / lihat sesi"| SE
    Client -->|"Bayar tagihan"| BL

    BS -->|"Cek ketersediaan slot"| SS
    BS -->|"Konfirmasi booking aktif"| SE
    SE -->|"Ambil tarif per kWh"| SS
    SE -->|"Kirim data kWh terpakai"| BL
```

---

## 3. Alur Sistem End-to-End

```mermaid
sequenceDiagram
    actor U as Pengguna
    participant SS as station-service
    participant BS as booking-service
    participant SE as session-service
    participant BL as billing-service

    Note over U,BL: ── Fase Penemuan & Pemesanan ──

    U->>SS: GET /stations?lat=&lng=&available=true
    SS-->>U: Daftar stasiun + slot tersedia + tarif

    U->>BS: POST /bookings {stationId, slotId, startTime, endTime}
    BS->>SS: GET /slots/{slotId}/availability
    SS-->>BS: {available: true, powerKw, tariffPerKwh}
    BS-->>U: {bookingId, status: CONFIRMED, qrCode}

    Note over U,BL: ── Fase Kedatangan & Pengisian ──

    U->>SE: POST /sessions/start {bookingId, connectorId}
    SE->>BS: GET /bookings/{bookingId}
    BS-->>SE: {booking: ACTIVE, userId, slotId}
    SE->>SS: PATCH /slots/{slotId}/status {status: OCCUPIED}
    SS-->>SE: OK
    SE-->>U: {sessionId, startedAt, meterStart}

    loop Setiap 30 detik
        SE->>SE: Catat pembacaan daya (kWh meter)
        SE-->>U: WebSocket push {currentKwh, durationMin, estimatedCost}
    end

    Note over U,BL: ── Fase Selesai & Pembayaran ──

    U->>SE: POST /sessions/{sessionId}/stop
    SE->>SS: GET /tariffs/{slotId}
    SS-->>SE: {tariffPerKwh: 2500}
    SE->>SS: PATCH /slots/{slotId}/status {status: AVAILABLE}
    SE->>BL: POST /invoices {sessionId, userId, kwhUsed, tariffPerKwh}
    BL-->>SE: {invoiceId, totalAmount}
    SE-->>U: {sessionId: COMPLETED, kwhUsed, invoiceId}

    U->>BL: POST /payments {invoiceId, paymentMethod}
    BL-->>U: {paymentId, status: PAID, receipt}
    BL->>BS: PATCH /bookings/{bookingId}/status {status: COMPLETED}
```

---

## 4. Data Model per Service

### station-service
```
Station        { id, name, location(lat,lng), address, totalSlots, operatorId }
Slot           { id, stationId, connectorType, powerKw, status(AVAILABLE|OCCUPIED|FAULT) }
Tariff         { id, slotId, pricePerKwh, currency, effectiveFrom }
```

### booking-service
```
Booking        { id, userId, slotId, startTime, endTime, status(PENDING|CONFIRMED|ACTIVE|COMPLETED|CANCELLED) }
NoShowJob      { bookingId, releaseAt }   ← cron job lepas slot bila tak datang +15 mnt
```

### session-service
```
Session        { id, bookingId, userId, slotId, startedAt, endedAt, meterStart, meterEnd, kwhUsed }
PowerReading   { id, sessionId, recordedAt, cumulativeKwh, powerW }
```

### billing-service
```
Invoice        { id, sessionId, userId, kwhUsed, tariffPerKwh, subtotal, tax, total, status(PENDING|PAID|FAILED) }
Transaction    { id, invoiceId, paymentMethod, gateway, gatewayRef, paidAt, amount }
PaymentHistory { id, userId, invoiceId, action, createdAt }
```

---

## 5. Pola Komunikasi

| Pengirim | Penerima | Metode | Endpoint / Event |
|---|---|---|---|
| booking-service | station-service | REST GET | `/slots/{id}/availability` |
| session-service | booking-service | REST GET | `/bookings/{id}` |
| session-service | station-service | REST GET/PATCH | `/tariffs/{slotId}`, `/slots/{id}/status` |
| session-service | billing-service | REST POST | `/invoices` |
| billing-service | booking-service | REST PATCH | `/bookings/{id}/status` |
| session-service | client | WebSocket | `session.{sessionId}.power` |

> **Prinsip:** Komunikasi sinkron (REST) hanya untuk operasi yang membutuhkan respons langsung. Notifikasi status non-kritis menggunakan event bus (lihat ADR-002).

---

## 6. Deployment View

```mermaid
graph LR
    subgraph Internet
        Client["Mobile / Web Client"]
    end

    subgraph API_Gateway["API Gateway (nginx / Kong)"]
        GW["/api/v1/*\nRate Limit · Auth JWT · Routing"]
    end

    subgraph Services["Kubernetes Cluster"]
        SS_Pod["station-service\n:8001"]
        BS_Pod["booking-service\n:8002"]
        SE_Pod["session-service\n:8003"]
        BL_Pod["billing-service\n:8004"]
    end

    subgraph Data["Datastores"]
        DB_SS[("PostgreSQL\nstation-db")]
        DB_BS[("PostgreSQL\nbooking-db")]
        DB_SE[("PostgreSQL\nsession-db\n+ TimescaleDB")]
        DB_BL[("PostgreSQL\nbilling-db")]
        Redis[("Redis\nSlot lock cache")]
        MQ[("RabbitMQ / Kafka\nEvent Bus")]
    end

    Client --> GW
    GW --> SS_Pod & BS_Pod & SE_Pod & BL_Pod
    SS_Pod --- DB_SS & Redis
    BS_Pod --- DB_BS & Redis
    SE_Pod --- DB_SE & MQ
    BL_Pod --- DB_BL & MQ
```

---

## 7. Konsistensi Desain — Design Principles

### 7.1 API Contract
- Semua endpoint menggunakan **REST JSON**, versioned: `/api/v1/`
- Response envelope standar:
  ```json
  { "data": {}, "meta": { "requestId": "", "timestamp": "" }, "error": null }
  ```
- Error menggunakan RFC 7807 Problem Details:
  ```json
  { "type": "/errors/slot-unavailable", "title": "Slot not available", "status": 409, "detail": "..." }
  ```

### 7.2 Naming Convention
| Konteks | Konvensi |
|---|---|
| REST path | `kebab-case`, noun plural: `/charging-sessions` |
| JSON field | `camelCase` |
| Database column | `snake_case` |
| Event name | `SCREAMING_SNAKE_CASE`: `SESSION_COMPLETED` |
| Service name | `kebab-case`: `billing-service` |

### 7.3 Database Isolation
- Setiap service memiliki **database sendiri** — tidak ada shared table
- Cross-service data diakses hanya via API, tidak via JOIN lintas DB

### 7.4 Idempotency
- `POST /bookings` menggunakan `Idempotency-Key` header
- `POST /sessions/start` idempoten terhadap `bookingId`

### 7.5 Slot Locking
- Gunakan **Redis SETNX** dengan TTL 5 menit saat booking dimulai untuk mencegah race condition double-booking

---

## 8. Referensi ADR

| No | Judul | Status |
|---|---|---|
| [ADR-001](adr/ADR-001-microservice-decomposition.md) | Dekomposisi menjadi 4 Microservice | Accepted |
| [ADR-002](adr/ADR-002-komunikasi-antar-service.md) | Pola Komunikasi REST + Event Bus | Accepted |
| [ADR-003](adr/ADR-003-database-per-service.md) | Database Isolation per Service | Accepted |
| [ADR-004](adr/ADR-004-slot-locking-redis.md) | Slot Locking dengan Redis | Accepted |
