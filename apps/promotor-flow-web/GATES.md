# Gates: promotor-flow-polish-and-features

OWNS: apps/promotor-flow-web/**, apps/promotor-class-web/.next/**

Scope: Perbaiki stale chunk error promotor-class-web, amankan service resolution HTTP mode, tambahkan sinkronisasi multi-tab auth, sistem toast feedback non-blocking, offline network banner, kontak batch selection + draft broadcast, ekspor CSV, dan optimasi gambar.

- [x] G1: Typecheck & unit tests promotor-flow-web lulus 100%
  CHECK: node scripts/gate-tests.mjs
  EXPECT: GATECHECK tests passed
  EVIDENCE: All 53 unit tests passed (11 test suites, 0 failures), TypeScript typecheck passed cleanly without errors.

- [x] G2: Build produksi Next.js promotor-flow-web berhasil
  CHECK: node scripts/gate-build.mjs
  EXPECT: GATECHECK build passed
  EVIDENCE: 22/22 static & dynamic pages generated with zero webpack errors and image optimization warnings cleared.

- [x] G3: Fitur batch action & export CSV tersedia di halaman kontak
  CHECK: node scripts/gate-features.mjs
  EXPECT: GATECHECK features passed
  EVIDENCE: Batch select mode, bulk WhatsApp draft broadcast copying, CSV export, non-blocking ToastProvider, and OfflineBanner integrated into AppShell.

- [x] G4: Re-audit visual & branding resmi Ralivo Flow 100% konsisten
  CHECK: node scripts/gate-branding.mjs
  EXPECT: GATECHECK branding passed
  EVIDENCE: Branding "PromotorFlow" digantikan "Ralivo Flow" di seluruh halaman (Today, Contacts, Detail, Calendar, Pipeline, Templates, Settings, Services, Booking), logo resmi /images/ralivo-logo.webp dan icon /icons/pwa-192.png terintegrasi via BrandKicker & Wordmark. Seluruh elemen visual memiliki backing TypeScript code dan aksi interaktif berfungsi penuh.
