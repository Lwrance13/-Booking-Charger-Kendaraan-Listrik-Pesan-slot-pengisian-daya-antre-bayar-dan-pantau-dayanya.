# ADR-004: Slot Locking dengan Redis untuk Mencegah Double-Booking

**Status:** Accepted  
**Tanggal:** 2026-08-15  
**Penulis:** Tim Arsitektur

---

## Konteks

Saat banyak pengguna memesan slot yang sama secara bersamaan (race condition), ada risiko dua booking dikonfirmasi untuk slot dan waktu yang sama. Operasi "cek ketersediaan → buat booking" tidak atomic jika hanya mengandalkan database check.

## Keputusan

Gunakan **Redis SETNX (SET if Not eXists)** sebagai distributed lock saat proses booking berlangsung.

### Mekanisme

```
Key format : lock:slot:{slotId}:{date}:{hourBlock}
TTL        : 300 detik (5 menit) — waktu cukup untuk flow booking selesai
Value      : {requestId} — untuk memastikan hanya pemilik lock yang bisa release

Flow:
  1. booking-service: SETNX lock:slot:123:2026-08-15:14 {requestId} EX 300
  2. Jika SETNX = 1 (berhasil dapat lock):
       → Lanjut cek DB availability
       → Simpan booking ke database
       → DEL lock (release)
       → Return CONFIRMED
  3. Jika SETNX = 0 (slot sedang di-lock):
       → Return 409 Conflict "Slot sedang dalam proses pemesanan, coba lagi"
```

### Blok Waktu (Hour Block)

Slot dikunci per blok 1 jam. Booking 14:00–16:00 akan mengunci:
- `lock:slot:123:2026-08-15:14`
- `lock:slot:123:2026-08-15:15`

## Konsekuensi

**Positif:**
- Race condition double-booking tereliminasi
- Lock TTL otomatis mencegah deadlock bila service crash sebelum release
- Performa tinggi — Redis sub-millisecond latency

**Negatif:**
- Ketergantungan pada Redis sebagai komponen infrastruktur baru
- Bila Redis down, booking tidak bisa diproses (perlu Redis Sentinel / Cluster untuk HA)
- Lock granularity per jam mungkin terlalu kasar — evaluasi ulang jika booking sub-jam dibutuhkan

## Alternatif yang Ditolak

- **Database-level `SELECT FOR UPDATE`**: Efektif tapi menciptakan long-lived DB transaction, menurunkan throughput
- **Optimistic locking (version field)**: Pengguna perlu retry eksplisit, UX buruk saat high contention
- **Queue per slot**: Kompleksitas tinggi, tidak perlu untuk volume saat ini
