# Booking Charger Kendaraan Listrik

Sistem pemesanan slot pengisian daya EV — pesan slot, antre, bayar, dan pantau daya secara real-time.

## Layanan

| Service | Tanggung Jawab |
|---|---|
| `station-service` | Kelola stasiun, slot, daya tersedia, tarif |
| `booking-service` | Pesan slot, cegah bentrok, lepas bila tak datang |
| `session-service` | Catat sesi pengisian: mulai · kWh terpakai · selesai |
| `billing-service` | Hitung tagihan dari kWh terpakai, proses pembayaran |

## Dokumentasi Arsitektur

- [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) — Context map, sequence diagram, data model, deployment view, design principles
- [docs/adr/ADR-001](docs/adr/ADR-001-microservice-decomposition.md) — Dekomposisi 4 Microservice
- [docs/adr/ADR-002](docs/adr/ADR-002-komunikasi-antar-service.md) — Komunikasi REST + Event Bus
- [docs/adr/ADR-003](docs/adr/ADR-003-database-per-service.md) — Database Isolation per Service
- [docs/adr/ADR-004](docs/adr/ADR-004-slot-locking-redis.md) — Slot Locking dengan Redis
