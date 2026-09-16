# Gates: promotor-learners-bento

OWNS: apps/promotor-class-web/src/app/(promotor)/app/learners/**, apps/promotor-class-web/src/components/promotor/LearnerDetail.tsx, apps/promotor-class-web/src/components/promotor/WhatsAppDraftSheet.tsx, apps/promotor-class-web/src/components/promotor/BroadcastReminderSheet.tsx, apps/promotor-class-web/src/components/layout/PromotorTabBar.tsx, apps/promotor-class-web/src/styles/globals.css

Scope: Rombak UI /app/learners (Daftar Peserta & Follow-up) dari gaya kotak jadul ke sistem bento PWA baru (Electric Blue + kartu radius 16 + pill) tanpa mengubah logika data/aksi.

- [x] G1: Typecheck promotor-class-web lolos tanpa error
  CHECK: node scripts/gate-typecheck.mjs
  EXPECT: GATECHECK typecheck passed
  EVIDENCE: 2026-09-15 gate-typecheck.mjs exit 0 "GATECHECK typecheck passed"; next build sukses (First Load JS 102 kB)

- [x] G2: Halaman learners tidak lagi memakai komponen kotak lama
  CHECK: node scripts/gate-learners-bento.mjs
  EXPECT: GATECHECK learners bento passed
  EVIDENCE: 2026-09-15 gate-learners-bento.mjs exit 0 "GATECHECK learners bento passed"

- [x] G3: Tidak ada pola jadul (border 2px solid ink, radius 0, sep-strong) di file learners yang dirombak
  CHECK: node scripts/gate-no-legacy.mjs
  EXPECT: GATECHECK no legacy passed
  EVIDENCE: 2026-09-15 gate-no-legacy.mjs exit 0 "GATECHECK no legacy passed"; grep pola lama di learners/ exit 1 (tidak ada)
