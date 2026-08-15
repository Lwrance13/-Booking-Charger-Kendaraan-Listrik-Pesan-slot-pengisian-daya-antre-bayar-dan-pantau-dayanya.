# ADR-002: Pola Komunikasi REST Sinkron + Event Bus Asinkron

**Status:** Accepted  
**Tanggal:** 2026-08-15  
**Penulis:** Tim Arsitektur

---

## Konteks

Antar service perlu bertukar data. Ada dua kategori kebutuhan:
1. **Butuh jawaban sekarang** (mis. cek ketersediaan slot saat booking)
2. **Notifikasi bahwa sesuatu terjadi** (mis. sesi selesai → billing perlu tahu)

Memaksakan semua komunikasi jadi sinkron menciptakan rantai ketergantungan: jika `billing-service` down, `session-service` tidak bisa selesaikan sesi.

## Keputusan

- **REST sinkron** untuk operasi yang **membutuhkan respons langsung** dalam flow yang sama (mis. validasi ketersediaan slot)
- **Event Bus (RabbitMQ/Kafka)** untuk **notifikasi antar domain** yang tidak perlu respons langsung

### Tabel Komunikasi

| Komunikasi | Metode | Alasan |
|---|---|---|
| booking-service → station-service: cek slot | REST | Perlu jawaban sebelum booking dikonfirmasi |
| session-service → booking-service: validasi | REST | Perlu status booking sebelum sesi dimulai |
| session-service → billing-service: buat invoice | REST | Invoice ID dibutuhkan dalam respons sesi |
| session-service → client: update daya | WebSocket | Push real-time tanpa polling |

### Event yang Dipublikasikan

| Event | Publisher | Subscriber |
|---|---|---|
| `BOOKING_CANCELLED` | booking-service | station-service (bebaskan slot) |
| `SESSION_COMPLETED` | session-service | billing-service (trigger invoice) |
| `PAYMENT_CONFIRMED` | billing-service | booking-service (update status) |
| `SLOT_FAULT_REPORTED` | station-service | booking-service (cancel booking terdampak) |

## Konsekuensi

**Positif:**
- Service tidak saling memblokir pada operasi non-kritis
- Event bus menjadi audit log alami

**Negatif:**
- Perlu idempoten handler di sisi consumer (event bisa dikirim ulang)
- Debugging lebih kompleks, perlu correlation ID di setiap event

## Alternatif yang Ditolak

- **gRPC penuh**: Overhead setup tinggi untuk tim saat ini, REST sudah cukup untuk volume yang ada
- **REST penuh tanpa event**: Coupling terlalu ketat, cascade failure lebih mudah terjadi
