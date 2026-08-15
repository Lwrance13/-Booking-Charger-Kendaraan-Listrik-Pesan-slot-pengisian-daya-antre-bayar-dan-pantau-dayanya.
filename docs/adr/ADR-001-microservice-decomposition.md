# ADR-001: Dekomposisi menjadi 4 Microservice

**Status:** Accepted  
**Tanggal:** 2026-08-15  
**Penulis:** Tim Arsitektur

---

## Konteks

Sistem Booking Charger EV mencakup empat domain yang berbeda tanggung jawab dan siklus ubahnya:
- Manajemen infrastruktur fisik (stasiun, slot)
- Manajemen reservasi waktu
- Pencatatan proses fisik pengisian (telemetri daya)
- Keuangan dan pembayaran

Semua domain ini memiliki **rate of change berbeda**: billing berubah saat ada promo/pajak, session berubah saat ada protokol charger baru, booking berubah saat ada fitur antrean.

## Keputusan

Sistem dibagi menjadi **empat microservice independen**:

1. `station-service` — master data infrastruktur
2. `booking-service` — domain reservasi
3. `session-service` — telemetri & pencatatan sesi
4. `billing-service` — domain keuangan

Setiap service di-deploy, di-scale, dan di-release secara independen.

## Konsekuensi

**Positif:**
- Tim kecil dapat memiliki service masing-masing tanpa konflik
- Scaling independen: `session-service` bisa di-scale lebih saat peak tanpa membebani `billing-service`
- Kegagalan satu service tidak langsung menjatuhkan seluruh sistem

**Negatif:**
- Distributed tracing diperlukan untuk debug lintas service
- Eventual consistency pada beberapa operasi lintas service
- Overhead operasional lebih tinggi dibanding monolith

## Alternatif yang Ditolak

- **Monolith**: Ditolak karena team akan sering konflik pada modul pembayaran vs booking
- **2 service (booking+session digabung)**: Ditolak karena telemetri daya berpotensi menghasilkan volume tulis 100x lebih tinggi dari booking
