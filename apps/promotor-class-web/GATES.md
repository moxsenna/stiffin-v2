# Gates: class-web-perfection-and-endpoints

OWNS: apps/promotor-class-web/**, apps/platform-api/**, packages/contracts/**, packages/api-client/**

Scope: Melengkapi seluruh integrasi player API, endpoint diskusi, empty-state terstandarisasi, master kategori, harga coret resmi, migrasi next/image, 6 endpoint operasional learner/public baru, offline PWA SW riil, trailer player, ekspor PDF, filter server-side, dan push notifikasi.

- [ ] G1: Player commands wired up (startLesson, updatePosition, submitReflection, recordEvent)
  CHECK: node scripts/gate-player-wired.mjs
  EXPECT: GATECHECK player wired passed
  EVIDENCE: pending

- [ ] G2: Endpoint dan modul diskusi materi terhubung riil
  CHECK: node scripts/gate-discussions.mjs
  EXPECT: GATECHECK discussions passed
  EVIDENCE: pending

- [ ] G3: Empty-state & skeleton loading terstandarisasi
  CHECK: node scripts/gate-empty-states.mjs
  EXPECT: GATECHECK empty states passed
  EVIDENCE: pending

- [ ] G4: Kategori storefront & harga coret resmi di contracts dan UI
  CHECK: node scripts/gate-pricing-category.mjs
  EXPECT: GATECHECK pricing category passed
  EVIDENCE: pending

- [ ] G5: Peringatan img diganti next/image bersih
  CHECK: node scripts/gate-images-migrated.mjs
  EXPECT: GATECHECK images migrated passed
  EVIDENCE: pending

- [ ] G6: Endpoint API baru (schedules, assignments, reviews, batches, mentors, orders)
  CHECK: node scripts/gate-new-endpoints.mjs
  EXPECT: GATECHECK new endpoints passed
  EVIDENCE: pending

- [ ] G7: Offline PWA riil dengan Service Worker dan CacheStorage downloader
  CHECK: node scripts/gate-offline-pwa.mjs
  EXPECT: GATECHECK offline pwa passed
  EVIDENCE: pending

- [ ] G8: Video trailer player riil dan generator ekspor PDF
  CHECK: node scripts/gate-trailer-pdf.mjs
  EXPECT: GATECHECK trailer pdf passed
  EVIDENCE: pending

- [ ] G9: Server-side catalog filter dan push notification manager
  CHECK: node scripts/gate-search-push.mjs
  EXPECT: GATECHECK search push passed
  EVIDENCE: pending

- [ ] G10: Typecheck dan production build lolos tanpa error
  CHECK: node scripts/gate-typecheck.mjs
  EXPECT: GATECHECK typecheck passed
  EVIDENCE: pending
