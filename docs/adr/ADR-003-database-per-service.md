# ADR-003: Database Isolation per Service

**Status:** Accepted  
**Tanggal:** 2026-08-15  
**Penulis:** Tim Arsitektur

---

## Konteks

Dalam arsitektur microservice, terdapat dua pilihan manajemen data:
1. **Shared database**: semua service membaca/menulis tabel yang sama
2. **Database per service**: setiap service memiliki schema/database sendiri

Shared database menciptakan coupling implisit — perubahan skema di satu service dapat merusak service lain.

## Keputusan

Setiap microservice memiliki **database PostgreSQL sendiri** yang tidak dapat diakses langsung oleh service lain.

| Service | Database | Catatan |
|---|---|---|
| station-service | `station-db` | Master data, jarang berubah |
| booking-service | `booking-db` | Transaksi reservasi |
| session-service | `session-db` | Tambah ekstensi **TimescaleDB** untuk data time-series pembacaan daya |
| billing-service | `billing-db` | Data finansial, butuh audit trail |

### Aturan Akses

- ❌ Tidak ada foreign key lintas database
- ❌ Tidak ada query JOIN lintas database
- ✅ Data lintas service hanya diakses via REST API atau event
- ✅ Setiap service menyimpan **local copy** dari data yang dibutuhkan (mis. `billing-service` menyimpan `userId` yang relevan, bukan query ke `user-service`)

## Konsekuensi

**Positif:**
- Setiap service bisa memilih teknologi DB yang tepat (mis. TimescaleDB untuk telemetri)
- Migrasi skema satu service tidak mempengaruhi service lain
- Blast radius kegagalan terisolasi

**Negatif:**
- Tidak ada transaksi ACID lintas service — perlu pola **Saga** untuk operasi terdistribusi
- Data duplikat kecil di beberapa service (tradeoff yang diterima)

## Pola Saga untuk Booking

```
Booking Saga (Choreography):
  1. booking-service: RESERVE_SLOT → kirim event
  2. station-service: SLOT_LOCKED → konfirmasi
  3. booking-service: BOOKING_CONFIRMED
  
Kompensasi (bila gagal di langkah 3):
  3. booking-service: BOOKING_FAILED → kirim event
  2. station-service: SLOT_RELEASED
```

## Alternatif yang Ditolak

- **Shared PostgreSQL schema per service**: Masih terikat pada database instance yang sama, risiko bottleneck
- **Single database semua service**: Coupling tinggi, deployment satu service bisa merusak semua
