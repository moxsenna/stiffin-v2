# Class ↔ Flow Bridge — Desain Integrasi Dua Arah

**Tanggal:** 2026-09-12
**Status:** Disetujui (brainstorming), menunggu implementation plan
**Tujuan produk:** Menaikkan attachment rate — persentase organisasi yang memiliki kedua entitlement (promotorClass + promotorFlow)
**Arah:** Dua arah sekaligus (Class → Flow dan Flow → Class), loop tertutup
**Mekanisme gating:** Teaser + paywall — fitur jembatan tampil sebagian, bagian otomatis terkunci dengan CTA upgrade
**Kontrak yang mengikat:** `docs/INTEGRATION_CONTRACT.md` (Flow satu-satunya pemilik NextAction; satu orang = satu contact)

---

## 1. Masalah

Buyer Class tidak merasa butuh Flow, dan sebaliknya. Audit kode (2026-09-12) menunjukkan penyebabnya:

1. Integrasi yang ada hanya tingkat data (shared Contact, entitlement, `integration/health` ping). Tidak ada serah-terima *pekerjaan* antar aplikasi.
2. Class menutup semua kebutuhan follow-up-nya sendiri (draft WhatsApp manual, broadcast, sinyal) — tidak ada momen di mana Class mengarahkan pekerjaan ke Flow.
3. Flow tidak pernah menerima event Class: tidak ada query `next_actions` dengan sumber dari Class, tidak ada konsumen `learning_events`/`commerce_orders` di sisi Flow.
4. Dua landing, dua harga, dua dashboard, nol titik lintas di dalam aplikasi.

Fondasi teknis sudah disiapkan sejak awal dan menganggur:

- `next_actions.source` (default `'PROMOTORFLOW'`) + `sourceEventId` + `idempotencyKey`, dengan unique index `(organization_id, source, idempotency_key)` `WHERE idempotency_key IS NOT NULL`.
- `integration_outbox`: `destination`, `operation`, `idempotency_key`, `payload_json`, status `PENDING → PROCESSING → COMPLETED/FAILED`, retry via `attempt_count` + `next_attempt_at`, unique `(destination, idempotency_key)`.

## 2. Keputusan Desain

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Pendekatan | Jembatan event di atas fondasi existing (bukan modul gabungan, bukan merge aplikasi) | Ships bertahap; setiap jembatan = satu cerita upsell; merge justru menghilangkan mekanisme attachment |
| Arah | Dua arah sekaligus | Loop nilai penuh: prospek → belajar → sinyal → follow-up/upsell → aftercare |
| Gating | Teaser + paywall | Attachment butuh user *mengalami* nilai terbatas produk lain + momen beli yang jelas |
| Transport antar produk | `integration_outbox` diproses in-process (satu DB, satu worker) | Tanpa HTTP antar worker, tanpa cron baru; kontrak "one person = one contact" terjaga |
| Kepemilikan data | Flow tetap satu-satunya penulis `next_actions`; Class hanya menerbitkan event | Sesuai kontrak integrasi yang terkunci |

## 3. Section 1 — Arsitektur Event Class → NextAction Flow

> **Koreksi audit (2026-09-12, pasca-approval):** pipa Class → Flow ternyata sudah terbangun dan sebagian besar sudah aktif. `integration-outbox-service` lengkap (enqueue idempotent, retry + dead-letter), `local-promotor-flow-adapter.createLearningNextAction` → `NextActionService.createClassNextAction` sudah menulis `source='PROMOTORCLASS'` + idempotency, dan **tiga event sudah di-bridge dengan gating entitlemen**: `PROGRAM_COMPLETED`, `CTA_CLICKED`, `MILESTONE_80_PERCENT` (learning-engine-service §8) serta `LEARNER_AT_RISK` (inactivity-sweep §4), plus proyeksi aktivitas `APPEND_ACTIVITY`. Dispatch berjalan via cron `index.ts` + in-request setelah sweep/engine. **Satu-satunya event yang belum ada: `ORDER_PAID`.** Sisa kerja R1 adalah gap ini + seluruh lapisan UX (badge, teaser, switcher, metrik).

**Alur:**

```
Class event terjadi (transaksi bisnis yang sudah ada)
   │  emitter menulis baris outbox (idempotencyKey deterministik)
   ▼
integration_outbox (destination='PROMOTORFLOW', status PENDING)
   │  processor in-process (dipanggil setelah request sukses + sweep existing)
   ▼
Flow next-action service
   INSERT next_actions (source='PROMOTORCLASS', idempotencyKey = key outbox)
   │  replay/duplikat → unique index menolak → 1 action per event, selamanya
   ▼
Tampil di "Hari ini" Flow dengan badge "dari Class"
```

**Empat event pertama:**

| Event | Sumber kejadian di kode | NextAction (source='PROMOTORCLASS') | Due |
|---|---|---|---|
| `ORDER_PAID` | commerce-service saat order PAID/APPROVED (PROGRAM_PURCHASE) | "Sambut <nama> yang baru lunas <program> — kirim panduan mulai" | Hari yang sama |
| `PROGRAM_COMPLETED` | lesson-progress service saat program is_completed | "Program <nama> selesai — jadwalkan aftercare/upsell lanjutan" | +1 hari |
| `LEARNER_AT_RISK` | inactivity-sweep-service / signal engine | "<nama> macet <n> hari di <program> — nudge WhatsApp" | Hari yang sama |
| `REFLECTION_HOT` | learning-engine saat skor minat ≥ 80 | "Minat <nama> memanas (skor <n>) — tawarkan program lanjutan" | +2 hari |

**Format idempotencyKey:** `class:<event>:<entityId>` (contoh `class:order-paid:<orderId>`, `class:at-risk:<contactId>:<yyyymmdd>` untuk dedupe mingguan).

**Gating entitlemen:** processor hanya memproses outbox org dengan `ent.promotorFlow = true`. Org tanpa Flow tetap mengumpulkan event PENDING — saat upgrade, backlog langsung mengalir (momen aha di menit pertama).

**Anti-banjir:** maksimal 1 NextAction PENDING per (kontak, jenis event); `LEARNER_AT_RISK` maksimal 1 per kontak per 7 hari (encoded di idempotencyKey).

## 4. Section 2 — Teaser + Paywall UX

**Prasyarat:** `OrganizationPlanAccessSchema` ditambah `features: { promotorClass: boolean, promotorFlow: boolean }` — satu sumber baca gating untuk kedua aplikasi.

### Di Class (pemilik Class, belum Flow)

| Permukaan | Teaser |
|---|---|
| Beranda, bagian "Perlu perhatian" | Kartu teratas: "<n> sinyal siap jadi tindak lanjut otomatis di Flow" + 1 baris pratinjau NextAction (terkunci) + CTA "Aktifkan Flow" + dismiss per org |
| Baris Peserta Macet | "Kirim WA" manual tetap; chip terkunci "Jadwalkan otomatis via Flow" |
| Pesanan (order lunas) | Baris ramping "Flow akan menyambut pembeli ini otomatis — Aktifkan" |

### Di Flow (pemilik Flow, belum Class)

| Permukaan | Teaser |
|---|---|
| Detail kontak stage HOT/BOOKED | Kartu "Program Class yang cocok": maksimal 2 program berbayar terpublikasi (deterministik, terbaru; bukan AI matching) — judul + harga tampil, tombol "Kirim link checkout 1-tap" terkunci |
| Kontak aftercare | Kartu yang sama — momen upsell paling alami dari pipeline |

### Pemilik keduanya

Teaser diganti versi hidup: Class Beranda mendapat list "Tindak lanjut dari Flow" (Selesai/Lewati memanggil API Flow); Flow mendapat kartu program yang benar-benar bisa dikirim — tombol "Kirim link checkout 1-tap" membuka draft WhatsApp berisi link checkout publik `/p/<slug>/<programSlug>` yang dikirim manual oleh promotor (Flow tidak pernah mengirim otomatis, sesuai prinsip PRD Flow).

### Sheet upsell (komponen bersama)

Dua kalimat nilai + harga (Flow +Rp50.000/bulan; Class sesuai harga landing) + tombol checkout (jalur checkout existing) + "nanti saja". Hanya muncul saat diklik — tanpa interstisial.

### Metrik

Tabel baru `bridge_metrics` (id, organization_id, event, meta jsonb, created_at). Event: `teaser_viewed`, `teaser_cta_clicked`, `upgrade_started`, `upgrade_completed`, `bridge_action_executed`, `journey_cross_view`. V1 dibaca via SQL admin.

## 5. Section 3 — Timeline Perjalanan Satu Kontak

**Endpoint shared:** `GET /api/v1/journey/:contactId` — didaftarkan di `app.ts` di belakang middleware sesi organisasi; fail-closed 404 jika kontak bukan milik org. Bukan di bawah `/class/` atau `/flow/` karena milik keduanya.

**Isi:** satu query UNION dari data existing, urut `occurredAt` desc, limit 50:

| Sumber | Item | app |
|---|---|---|
| `next_actions` | dibuat / selesai / dilewati | FLOW |
| `bookings` | terjadwal / selesai / batal | FLOW |
| `aftercare_records` | aftercare dimulai | FLOW |
| `enrollments` | mendaftar program | CLASS |
| `commerce_orders` (PAID/APPROVED) | lunas Rp X · <program> | CLASS |
| `lesson_progress` (is_completed) + `certificates` | materi selesai / lulus | CLASS |

Respons: `{ items: [{ app: 'CLASS'|'FLOW', type, title, detail, occurredAt }] }`.

**UX:** bagian "Perjalanan <Nama>" di detail kontak Flow dan `LearnerDetail` Class; titik warna biru `#2563EB` (Class) / cyan `#06B6D4` (Flow) sesuai DESIGN.md.

**Gating:** pemilik satu produk melihat timeline aplikasinya sendiri penuh + item aplikasi satunya **redup berlabel "lihat di Flow/Class"** (menumbuhkan ingin punya). Pemilik keduanya melihat semua penuh. Event `journey_cross_view` dicatat saat item redup diklik.

## 6. Section 4 — Deep-link & App Switcher

Fondasi: kedua frontend memanggil API yang sama dengan cookie sesi Better Auth di domain API — sesi sudah lintas aplikasi tanpa pekerjaan auth baru. Navigasi = `<a>` lintas origin (full page load, wajar untuk dua PWA terpisah). Jika sesi hilang di tujuan, redirect login existing dengan `returnTo` menangani.

| Elemen | Perilaku |
|---|---|
| Entri "Buka PromotorFlow ↗" di Class (desktop nav + Lainnya) | Pemilik Flow → pindah aplikasi; bukan → ikon kunci → sheet upsell |
| Entri "Buka PromotorClass ↗" di Flow | Cermin sama |
| Baris sinyal/peserta macet Class | `/flow?contact=<id>` — Flow menyorot kontak itu |
| Kartu "Tindak lanjut dari Flow" di Class | `/flow` |
| Kartu program di Flow | `/app/programs/<programId>` |
| Item timeline aplikasi satunya | Detail yang sesuai |

## 7. Rollout

| Rilis | Isi | Kriteria selesai |
|---|---|---|
| **R1 — Class → Flow** | Flag `features` di plan-access; 4 emitter event; processor + dedupe + gating entitlemen; badge "dari Class" di Flow; teaser card Class; app switcher kedua aplikasi | Integration test event→action hijau; teaser tampil untuk org Class-only |
| **R2 — Flow → Class + Timeline** | Kartu program cocok Flow (gated); `/api/v1/journey/:contactId`; timeline UI kedua aplikasi + item redup; deep-link kontekstual; checkout 1-tap aktif untuk pemilik keduanya | Journey test tenant-guard hijau; loop tertutup bisa didemokan end-to-end |
| **R3 — Kalibrasi** | Review metrik 2–4 minggu; tuning copy/frekuensi; persistence dismissal; retensi outbox (purge COMPLETED > 30 hari) | Funnel attachment terbaca dari `bridge_metrics` |

## 8. Pengujian

**Unit:**
- Idempotensi processor: event yang sama diproses dua kali → tetap 1 `next_actions` row.
- Gating entitlemen: org tanpa `promotorFlow` → outbox tetap PENDING, tidak diproses.
- Dedupe: `LEARNER_AT_RISK` dua kali dalam 7 hari → 1 action.

**Integration (postgres):**
- Order PAID → `next_actions` terbentuk `source='PROMOTORCLASS'`, idempotencyKey cocok; replay ditolak unique index.
- `GET /api/v1/journey/:contactId` → 404 untuk kontak lintas org; 200 + item terurut untuk org sendiri.
- `GET /api/v1/billing/plan` membawa `features.promotorClass/promotorFlow` sesuai entitlemen.

**E2E staging manual:**
1. Upgrade org ke Flow → backlog event Class mengalir jadi action berbadge.
2. Journey timeline menampilkan item dua aplikasi penuh.
3. Deep-link class.ralivo.biz.id ↔ flow.ralivo.biz.id tanpa login ulang.
4. Teaser dismiss tidak muncul lagi.

## 9. Risiko & Guardrail

| Risiko | Mitigasi |
|---|---|
| "Hari ini" Flow dibanjiri action dari Class | Maks 1 PENDING per (kontak, jenis); at-risk 1/7 hari; prioritas ≤ 60 |
| Outbox menumpuk | Processor in-request + purge COMPLETED > 30 hari (R3) |
| Melanggar kontrak kepemilikan | Class tidak pernah menulis `next_actions`; hanya outbox. Flow memutuskan bentuk action |
| Teaser mengganggu pengguna lama | Dismiss per org tersimpan; teaser hanya di permukaan yang relevan dengan pekerjaan yang belum selesai |
| Upsell terasa murahan | Sheet hanya muncul saat klik; tanpa banner; copy dua kalimat, tone Ralivo |

## 10. Yang Tidak Dilakukan (YAGNI)

- Tidak ada HTTP antar worker, tidak ada cron baru, tidak ada message queue eksternal.
- Tidak ada "AI matching" program — v1 deterministik (program terbaru terpublikasi).
- Tidak ada penggabungan aplikasi atau modul UI gabungan.
- Tidak ada perubahan pricing/packaging — upsell memakai harga dan jalur checkout yang sudah ada.
- Tidak ada notifikasi push/email baru dari jembatan — action tetap dieksekusi manusia via WhatsApp.
