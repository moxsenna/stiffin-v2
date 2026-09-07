# Ralivo Roadmap Induk — Learner Experience, Promotor Edukator, Flow CRM

> **For agentic workers:** Dokumen ini adalah roadmap induk. Eksekusi dilakukan lewat 3 rencana detail terpisah (Plan A/B/C di folder yang sama). Setiap Plan mandiri dan menghasilkan software yang bisa diuji.

**Goal:** Menutup semua gap produk Ralivo dari 3 sudut pandang (Peserta, Promotor Edukator, Sales CRM) dalam 3 rencana implementasi yang diprioritaskan per fase.

**Architecture:** Monorepo pnpm — `apps/platform-api` (Hono di Cloudflare Workers + Drizzle/Postgres-Neon via Hyperdrive), `apps/promotor-class-web` (Next.js 15, learner + promotor class), `apps/promotor-flow-web` (Next.js 15, CRM). Kontrak Zod bersama di `packages/contracts`, HTTP client di `packages/api-client`, util bersama di `packages/platform-core`.

---

## 1. Hasil Audit Codebase (kondisi 2026-09-06)

Penting: **beberapa item di daftar permintaan ternyata SUDAH ADA** — rencana ini tidak mengerjakannya dua kali:

| Item permintaan | Status di codebase | Lokasi |
|---|---|---|
| Inactivity / drop-off alert (≥7 hari, progres <50%) | ✅ Sudah ada: sweep cron → `AT_RISK` + signal + next action | `apps/platform-api/src/services/class/inactivity-sweep-service.ts` |
| Auto Aftercare D+7 | ✅ Sudah ada: saat booking COMPLETED → NextAction AFTERCARE due +7d | `apps/platform-api/src/domain/next-action-rules.ts:231` |
| Lampiran materi (tabel + tampil di reader) | ✅ Backend & reader ada; ❌ **builder tidak punya UI** | `apps/platform-api/src/db/schema/lesson-attachments.ts`, `UpsertLessonRequestSchema.attachments` |
| Katalog "Kelas Saya" | ✅ Halaman `/learn` ada dengan progres; ❌ belum ada riwayat sertifikat | `apps/promotor-class-web/src/app/(learner)/learn/page.tsx` |
| Post-WA delay picker (2/5/7 hari) | ✅ Ada di `WhatsAppBottomSheet`; ❌ belum ada **taksonomi outcome** | `apps/promotor-flow-web/src/components/today/WhatsAppBottomSheet.tsx` |
| wa.me deep link + aktivitas WA_SENT | ✅ Ada | `apps/platform-api/src/services/messaging-service.ts` |
| Cron worker (`scheduled`) | ✅ Handler ada di `src/index.ts` | ⚠️ **Belum ada `triggers.crons` di `wrangler.jsonc`** — sweep tidak pernah jalan di production. Diperbaiki di Plan B. |

Yang **belum ada sama sekali**: login OTP WhatsApp, e-sertifikat, autosave refleksi, resume timestamp video, kupon, varian harga/bundling, preview peserta, catatan pribadi, taksonomi outcome WA, kanban, catatan cepat timestamped, sinkron kalender, persona template, filter cerdas, kalkulator komisi, broadcast pengingat, alasan skor HOT yang transparan, notifikasi refleksi ke promotor.

**Keterbatasan infrastruktur yang memengaruhi desain:**
- **Tidak ada gateway WA outbound** (tidak ada Fonnte/Wablas/Twilio). Semua WA hari ini via `wa.me` deep-link yang ditekan promotor. Konsekuensi: (a) OTP dikirim via **adapter yang bisa diplug** — mode `log` untuk dev/test dan mode `fonnte` (env `FONNTE_TOKEN`) untuk production; (b) "notifikasi WA ke promotor" diimplementasikan sebagai **sinyal di dashboard + draft WA 1-tap**, bukan kirim otomatis.
- **Tidak ada object storage** (R2 belum dipakai). Lampiran materi tetap berbasis URL (Google Drive/dll) — sesuai `lesson_attachments.url`.
- Sertifikat dirender **client-side canvas** (PNG) + print-to-PDF, bukan generate PDF di Workers.

---

## 2. Tiga Rencana Eksekusi

| Plan | File | Isi | Jumlah task |
|---|---|---|---|
| **A — Learner Experience** | `2026-09-06-learner-experience.md` | Autosave refleksi, resume video + auto-advance, template klaim konsultasi, catatan pribadi, login OTP WhatsApp, e-sertifikat + halaman verifikasi, hub "Kelas Saya" + riwayat sertifikat | 7 |
| **B — Promotor Edukator** | `2026-09-06-promotor-edukator.md` | UI lampiran di lesson editor, preview sebagai peserta, transparansi skor intent, surface "Learner Macet" + cron fix, sinyal refleksi, broadcast pengingat 1-tap, varian harga/bundling, kupon promo | 8 |
| **C — Ralivo Flow CRM** | `2026-09-06-flow-crm.md` | Modal outcome pasca-WA, catatan cepat timestamped, tambah-ke-kalender (.ics/Google), persona template, filter cerdas kontak, kanban pipeline, kalkulator omset/komisi, verifikasi Aftercare D+7 | 8 |

## 3. Urutan Eksekusi yang Disarankan (fase)

**Fase 0 — Quick wins, tidak ada migrasi DB (±1–2 hari):**
A1 (autosave), A3 (template klaim), B1 (UI lampiran), C2 (catatan cepat), C3 (kalender), C8 (verifikasi aftercare).

**Fase 1 — Fondasi data & notifikasi (±2–3 hari):**
A2 (resume video, 1 kolom baru), B3 (intent breakdown, 1 kolom baru), B5 (sinyal refleksi), B4 (surface Learner Macet + fix cron wrangler), C4 (persona template, 1 kolom baru), C5 (filter kontak).

**Fase 2 — Fitur besar learner (±3–4 hari):**
A5 (OTP login — tabel baru + 2 endpoint), A6 (e-sertifikat — tabel baru + 2 endpoint + canvas), A7 (hub + sertifikat), B2 (preview peserta).

**Fase 3 — Monetisasi & CRM besar (±4–5 hari):**
C1 (outcome modal), C7 (omset/komisi, migrasi `bookings.paid_at`), B7 (varian harga, tabel baru), B8 (kupon, tabel baru), B6 (broadcast), C6 (kanban).

**Aturan dependensi:**
- A7 (riwayat sertifikat di hub) **bergantung** pada A6.
- B6 (broadcast) lebih berguna setelah B4 (filter AT_RISK), tapi tidak wajib.
- C1 mengubah skema request `confirm-sent` — kerjakan sebelum C6 agar kartu kanban bisa memakai outcome.
- B8 (kupon) mengubah `PublicPaidCheckoutRequestSchema` dan response checkout (`checkoutUrl` menjadi nullable); kerjakan bersama/di atas B7 (varian) untuk menghindari konflik dua kali ubah checkout.

## 4. Konvensi Global (berlaku untuk semua plan)

- Copy user-facing **Bahasa Indonesia** (hardcoded, tanpa i18n — sesuai existing).
- Styling: **CSS tokens** (`src/styles/tokens.css`) + utility classes existing (`.btn`, `.btn-primary`, `.btn-accent`, `.input`, `.textarea`, `.kicker`) + primitif `components/ui/index.tsx` (`BottomSheet`, `SegmentedControl`, `Toast`/`useToast`, `EmptyState`). **Tanpa Tailwind.**
- Backend: Hono route di `app.ts` / `routes/*.ts`; error via `DomainError(code, message)`; validasi request via Zod dari `packages/contracts`; uji `node:test` via `tsx --test` (unit: `pnpm --filter @promotor/platform-api test`, integrasi: `pnpm --filter @promotor/platform-api test:integration`, perlu `TEST_DATABASE_URL`).
- Migrasi Drizzle: ubah schema di `src/db/schema/*.ts` → `pnpm --filter @promotor/platform-api db:generate` → `pnpm --filter @promotor/platform-api db:migrate`. Nama tabel snake_case, kolom `organization_id` untuk tenant scoping.
- Uang: integer rupiah. Telepon: `normalizePhone()` dari `packages/platform-core`.
- Cookie learner: `promotor_learner_session`, `HttpOnly; Secure; SameSite=None; Max-Age 30d`.
- Commit konvensional (`feat:`, `test:`, `fix:`, `chore:`) per task.
- Typecheck penuh sebelum commit: `pnpm typecheck`.

## 5. Risiko & Keputusan Desain Penting

1. **OTP tanpa gateway WA** — keamanan tetap terjaga (kode di-hash, sekali pakai, 5 menit, maks 5 percobaan, rate limit 3 permintaan/15 menit). Mode `log` HANYA boleh aktif saat `APP_ENV` development/test; production wajib `FONNTE_TOKEN` atau endpoint menolak dengan `OTP_DELIVERY_UNAVAILABLE`.
2. **Checkout gratis setelah kupon 100%** — jika final amount = 0, order langsung `PAID` tanpa Paycore, enrollment dibuat, response `checkoutUrl: null`. Semua consumer response checkout harus tahan `null`.
3. **Sertifikat kanvas** — identitas (nama peserta, program, promotor, serial) di-**snapshot** ke tabel `certificates` saat terbit agar sertifikat tetap valid meski data berubah. Verifikasi publik via serial + halaman `/verify/[serial]`.
4. **Refactor dihindari** — Plan B2 (preview) sengaja TIDAK mengekstrak `LessonReaderClient` menjadi komponen bersama; halaman preview dibuat terpisah read-only untuk meminimalkan regresi pada alur belajar yang sudah stabil.
