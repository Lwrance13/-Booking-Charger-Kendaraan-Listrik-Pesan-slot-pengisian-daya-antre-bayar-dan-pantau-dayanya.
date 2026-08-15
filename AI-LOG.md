# AI-LOG — Catatan Pemakaian GitHub Copilot

Log ini dicatat **per sesi / per aksi**, bukan ditumpuk di akhir.
Format: `[tanggal] [model] [prompt singkat] → [output]`

---

## 2026-08-15

### [08:00] Desain Arsitektur Sistem
**Model:** Claude Sonnet 4.6  
**Prompt:** Baca gambar context map 4 service, buatkan diagram alur sistem design dan rancang arsitektur, diagram, ADR, konsistensi desain.  
**Output:**
- `docs/ARSITEKTUR.md` — context map (Mermaid), sequence diagram end-to-end, data model per service, tabel pola komunikasi, deployment view, design principles (API contract, naming, idempotency, slot locking)
- `docs/adr/ADR-001-microservice-decomposition.md`
- `docs/adr/ADR-002-komunikasi-antar-service.md`
- `docs/adr/ADR-003-database-per-service.md`
- `docs/adr/ADR-004-slot-locking-redis.md`
- `README.md` diperbarui dengan tabel layanan dan link ke docs

**Keputusan desain yang di-generate:**
- 4 bounded context terpisah (station / booking / session / billing)
- REST sinkron untuk operasi butuh respons langsung; event bus untuk notifikasi
- 1 DB per service (TimescaleDB untuk session telemetri)
- Redis SETNX untuk anti double-booking

---

### [08:30] Diagram Visual Neobrutalism
**Model:** Claude Sonnet 4.6  
**Prompt:** Buatkan gambar diagram dengan tema neobrutalism.  
**Output:**
- `docs/diagrams/context-map.svg` — 940×700px, 2×2 grid service, hard shadow +6px, flat colors, inter-service REST arrows berlabel, badge data/port/tech
- `docs/diagrams/flow.svg` — 960×420px, pipeline 4 fase (Discover → Book → Charge → Pay) + "under the hood" callout block

**Elemen neobrutalism yang diterapkan:**
- Border `stroke-width: 3.5px` hitam
- Hard shadow tanpa blur (offset solid)
- Warna: kuning `#FFD60A` · coral `#FF5A5A` · cyan `#14D4DC` · lime `#B0F049` · pink `#FF90E8`
- Header strip hitam + teks berwarna per box
- Dot-grid background krem `#FFFAED`

---

### [08:45] Git Push
**Model:** Claude Sonnet 4.6  
**Prompt:** Push project ini.  
**Output:** Commit + push ke branch `setup-awal` (8 files, 1048 insertions)

---

<!-- tambahkan entri baru DI SINI, di bawah baris terakhir, bukan di akhir file -->
