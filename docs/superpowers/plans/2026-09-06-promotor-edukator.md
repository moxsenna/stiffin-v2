# Promotor Edukator (Ralivo Class Builder & Monitoring) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promotor bisa melampirkan worksheet/materi ke lesson, mempreview kelas sebagai peserta, memahami mengapa peserta diberi label HOT, melihat siapa yang macet belajar, menerima sinyal saat refleksi masuk, mengirim broadcast pengingat 1-tap, membuat paket harga bertingkat, dan menjalankan promo kupon.

**Architecture:** Builder & monitoring memakai endpoint operator existing (`sessionMiddleware` + `requireEntitlement('promotorClass')`). Lampiran lesson sudah didukung backend (`UpsertLessonRequestSchema.attachments` + replace-all di `program-repository.saveLesson`) — task B1 murni UI. Varian harga dan kupon adalah tabel baru dengan integrasi ke checkout Paycore existing di `commerce-routes.ts` / `commerce-service.ts`.

**Tech Stack:** Next.js 15 client components (CSS tokens, tanpa Tailwind), Hono, Drizzle, Zod contracts, `node:test` via `tsx --test`.

## Global Constraints

- Copy Bahasa Indonesia hardcoded; styling tokens + utility existing; tanpa lib UI baru.
- Endpoint operator baru didaftarkan di `apps/platform-api/src/routes/class-routes.ts` (middleware sudah di-register di file tersebut) atau di blok B3 `app.ts` untuk `/api/v1/programs/*`.
- Uang integer IDR; diskon tidak boleh menghasilkan amount negatif.
- Migrasi via `db:generate` + `db:migrate`; `pnpm typecheck` lulus sebelum commit; commit konvensional.
- Test runner `node:test`; integrasi butuh `TEST_DATABASE_URL`.

---

### Task B1: Editor Lampiran Materi di Lesson Editor

**Files:**
- Modify: `apps/promotor-class-web/src/app/(promotor)/app/programs/[programId]/lessons/[lessonId]/LessonEditorClient.tsx`
- Create: `apps/promotor-class-web/src/modules/programs/attachments.ts` (normalisasi input)
- Test: `apps/promotor-class-web/src/__tests__/lesson-attachments-form.test.ts`

**Interfaces:**
- Consumes: `UpsertLessonRequestSchema.attachments` (existing, array `{ kind: 'image'|'download', name, url, sizeFormatted? }` — cek `UpsertLessonAttachmentRequestSchema` di contracts untuk nama field persis), command `saveLesson` existing.
- Produces: state `attachments` di editor dengan operasi `normalizeAttachmentRows(rows): rows` (trim, validasi url http(s), default kind `download`, buang row kosong).

- [ ] **Step 1: Test util yang gagal**

```ts
// apps/promotor-class-web/src/__tests__/lesson-attachments-form.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAttachmentRows, emptyAttachmentRow } from '../modules/programs/attachments';

describe('normalizeAttachmentRows', () => {
  it('membuang row kosong dan memotong spasi', () => {
    const rows = [
      { kind: 'download' as const, name: '  Worksheet.pdf ', url: ' https://drive.google.com/f  ' },
      { kind: 'download' as const, name: '', url: '' },
    ];
    const result = normalizeAttachmentRows(rows);
    assert.deepEqual(result, [{ kind: 'download', name: 'Worksheet.pdf', url: 'https://drive.google.com/f' }]);
  });

  it('membuang row dengan url tidak valid', () => {
    const result = normalizeAttachmentRows([{ kind: 'download', name: 'X', url: 'bukan-url' }]);
    assert.deepEqual(result, []);
  });

  it('default kind = download bila kosong', () => {
    const result = normalizeAttachmentRows([{ kind: undefined as any, name: 'Audio.mp3', url: 'https://x.com/a.mp3' }]);
    assert.equal(result[0].kind, 'download');
  });

  it('emptyAttachmentRow memberi row kosong baru', () => {
    assert.deepEqual(emptyAttachmentRow(), { kind: 'download', name: '', url: '' });
  });
});
```

- [ ] **Step 2: Jalankan → FAIL** (`pnpm --filter @promotor/promotor-class-web test`)

- [ ] **Step 3: Implementasi util**

```ts
// apps/promotor-class-web/src/modules/programs/attachments.ts
export interface AttachmentRowInput {
  kind?: 'image' | 'download' | undefined;
  name: string;
  url: string;
}

export interface AttachmentRow {
  kind: 'image' | 'download';
  name: string;
  url: string;
}

export function emptyAttachmentRow(): AttachmentRow {
  return { kind: 'download', name: '', url: '' };
}

export function normalizeAttachmentRows(rows: AttachmentRowInput[]): AttachmentRow[] {
  return rows
    .map((r) => ({
      kind: r.kind === 'image' ? 'image' as const : 'download' as const,
      name: (r.name ?? '').trim(),
      url: (r.url ?? '').trim(),
    }))
    .filter((r) => r.name.length > 0 || r.url.length > 0)
    .filter((r) => {
      try { const u = new URL(r.url); return u.protocol === 'https:' || u.protocol === 'http:'; }
      catch { return false; }
    });
}
```

- [ ] **Step 4: Test → PASS**

- [ ] **Step 5: UI di LessonEditorClient**

Di `LessonEditorClient.tsx` (setelah blok text content, sebelum blok refleksi):

1. State: `const [attachments, setAttachments] = useState<AttachmentRow[]>([]);` — preload dari lesson yang dimuat (`lesson.attachments ?? []` → map ke row).
2. Tambahkan section:

```tsx
<div style={{ marginTop: 16 }}>
  <div className="field-label">Materi Pendukung (worksheet / handout / audio)</div>
  <p className="kicker kicker-muted">Tempel link file (Google Drive, Dropbox, dsb). Pastikan link bisa diakses peserta.</p>
  {attachments.map((att, idx) => (
    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 2fr 40px', gap: 8, marginTop: 8 }}>
      <select className="input" value={att.kind} aria-label={`Tipe lampiran ${idx + 1}`}
        onChange={(e) => updateRow(idx, { kind: e.target.value as 'image' | 'download' })}>
        <option value="download">Unduhan</option>
        <option value="image">Gambar</option>
      </select>
      <input className="input" placeholder="Nama file" value={att.name} aria-label={`Nama lampiran ${idx + 1}`}
        onChange={(e) => updateRow(idx, { name: e.target.value })} />
      <input className="input" placeholder="https://..." value={att.url} aria-label={`URL lampiran ${idx + 1}`}
        onChange={(e) => updateRow(idx, { url: e.target.value })} />
      <button type="button" className="btn btn-ghost" aria-label={`Hapus lampiran ${idx + 1}`}
        onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>✕</button>
    </div>
  ))}
  <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
    onClick={() => setAttachments([...attachments, emptyAttachmentRow()])}>
    + Tambah Lampiran
  </button>
</div>
```

dengan helper `const updateRow = (idx: number, patch: Partial<AttachmentRow>) => setAttachments(attachments.map((r, i) => i === idx ? { ...r, ...patch } : r));`

3. Saat menyimpan lesson, masukkan hasil normalisasi ke payload command save yang sudah ada:

```ts
const payloadAttachments = normalizeAttachmentRows(attachments).map((r) => ({
  kind: r.kind, name: r.name, url: r.url,
}));
// sertakan attachments: payloadAttachments pada objek payload yang dikirim ke saveLessonCommand
```

> Cek `modules/programs/commands.ts` / `adapters/http/program-repository.ts` `saveLesson` — pastikan payload `attachments` diteruskan ke `PUT /api/v1/programs/:id/modules/:moduleId/lessons/:lessonId` (kontrak sudah punya field `attachments`, repo sudah replace-all; biasanya tinggal meneruskan).

- [ ] **Step 6: Typecheck + commit**

Run: `pnpm typecheck && pnpm --filter @promotor/promotor-class-web test`

```bash
git add -A
git commit -m "feat(promotor): editor lampiran materi (PDF/worksheet/audio via link) di lesson editor"
```

---

### Task B2: Preview sebagai Peserta

**Files:**
- Create: `apps/promotor-class-web/src/app/(learner)/learn/preview/[programId]/page.tsx`
- Create: `apps/promotor-class-web/src/app/(learner)/learn/preview/[programId]/lessons/[lessonId]/page.tsx`
- Modify: `apps/promotor-class-web/src/app/(promotor)/app/programs/[programId]/ProgramDetailClient.tsx` (tombol)

**Interfaces:**
- Consumes: `getProgramByIdQuery(programId)` existing (operator API — mengembalikan program penuh dengan `modules[].lessons[]` termasuk `textContent`, `videoExternalId`, `attachments`, `reflectionPrompt`), `extractYoutubeId`/`getYoutubeEmbedUrl` dari `src/lib/video/parse-youtube-url.ts`, `getPlatformApiClient()` untuk guard sesi operator.
- Produces: halaman preview read-only dengan banner "Mode Pratinjau" (tidak mencatat progres, tidak ada submit).

- [ ] **Step 1: Halaman daftar modul preview**

```tsx
// apps/promotor-class-web/src/app/(learner)/learn/preview/[programId]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { LoadingRows, ErrorState } from '@/components/ui';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { Program } from '@promotor/contracts';

export default function PreviewProgramPage() {
  const params = useParams();
  const programId = params.programId as string;
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProgramByIdQuery(programId).then(setProgram).catch(() => setError('Gagal memuat program. Pastikan Anda login sebagai promotor.'));
  }, [programId]);

  return (
    <LearnerShell title="Pratinjau Kelas">
      <div style={{ margin: 12, padding: 12, background: '#fef9c3', border: '1px solid #ca8a04', font: '600 13px/1.4 var(--font-sans)' }}>
        Mode Pratinjau — progres tidak dicatat dan refleksi tidak bisa dikirim.
      </div>
      {error && <ErrorState message={error} />}
      {!program && !error && <LoadingRows rows={4} />}
      {program && (
        <div style={{ padding: 12 }}>
          <h1 style={{ font: '700 20px/1.3 var(--font-sans)' }}>{program.title}</h1>
          {(program.modules ?? []).map((m: any, mi: number) => (
            <section key={m.id} style={{ marginTop: 16 }}>
              <div className="kicker">Modul {mi + 1} — {m.title}</div>
              {(m.lessons ?? []).map((l: any, li: number) => (
                <Link key={l.id} href={`/learn/preview/${programId}/lessons/${l.id}`}
                  style={{ display: 'block', padding: 12, border: '1px solid var(--border)', marginTop: 8 }}>
                  <strong style={{ font: '600 14px/1.4 var(--font-sans)' }}>{mi + 1}.{li + 1} {l.title}</strong>
                  <div className="kicker kicker-muted">
                    {l.videoExternalId ? '📹 Video' : ''} {l.textContent ? ' · 📄 Materi teks' : ''} {(l.attachments ?? []).length > 0 ? ` · 📎 ${(l.attachments ?? []).length} lampiran` : ''}
                  </div>
                </Link>
              ))}
            </section>
          ))}
        </div>
      )}
    </LearnerShell>
  );
}
```

- [ ] **Step 2: Halaman lesson preview (read-only)**

```tsx
// apps/promotor-class-web/src/app/(learner)/learn/preview/[programId]/lessons/[lessonId]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { LoadingRows } from '@/components/ui';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { getYoutubeEmbedUrl } from '@/lib/video/parse-youtube-url';

export default function PreviewLessonPage() {
  const params = useParams();
  const programId = params.programId as string;
  const lessonId = params.lessonId as string;
  const [lesson, setLesson] = useState<any>(null);
  const [status, setStatus] = useState<'LOADING' | 'NOT_FOUND'>('LOADING');

  useEffect(() => {
    getProgramByIdQuery(programId)
      .then((program: any) => {
        const found = (program?.modules ?? []).flatMap((m: any) => m.lessons ?? []).find((l: any) => l.id === lessonId);
        if (found) setLesson(found); else setStatus('NOT_FOUND');
      })
      .catch(() => setStatus('NOT_FOUND'));
  }, [programId, lessonId]);

  const embedUrl = lesson?.videoYoutubeUrl ? getYoutubeEmbedUrl(lesson.videoYoutubeUrl) : null;

  return (
    <LearnerShell title="Pratinjau Materi">
      <div style={{ margin: 12, padding: 12, background: '#fef9c3', border: '1px solid #ca8a04', font: '600 13px/1.4 var(--font-sans)' }}>
        Mode Pratinjau — inilah yang dilihat peserta.
      </div>
      {status === 'LOADING' && <LoadingRows rows={3} />}
      {status === 'NOT_FOUND' && <p style={{ padding: 16 }}>Materi tidak ditemukan.</p>}
      {lesson && (
        <article style={{ padding: 16 }}>
          <h1 style={{ font: '700 20px/1.3 var(--font-sans)' }}>{lesson.title}</h1>
          {embedUrl && (
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', marginTop: 12, background: '#000' }}>
              <iframe src={embedUrl} title={`Preview video: ${lesson.title}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen />
            </div>
          )}
          {lesson.textContent && (
            <div style={{ marginTop: 16, font: '400 15px/1.65 var(--font-sans)', whiteSpace: 'pre-wrap' }}>{lesson.textContent}</div>
          )}
          {(lesson.attachments ?? []).length > 0 && (
            <section style={{ marginTop: 16 }}>
              <div className="kicker">Materi Pendukung</div>
              {(lesson.attachments ?? []).map((att: any) => (
                <a key={att.id ?? att.url} href={att.url} target="_blank" rel="noreferrer"
                  style={{ display: 'block', padding: 10, border: '1px solid var(--border)', marginTop: 8 }}>
                  📎 {att.name}
                </a>
              ))}
            </section>
          )}
          {lesson.reflectionPrompt && (
            <section style={{ marginTop: 16, padding: 12, border: '1px dashed var(--border)' }}>
              <div className="kicker kicker-muted">Refleksi (peserta akan melihat ini)</div>
              <p style={{ font: '400 14px/1.5 var(--font-sans)' }}>{lesson.reflectionPrompt}</p>
            </section>
          )}
        </article>
      )}
    </LearnerShell>
  );
}
```

- [ ] **Step 3: Tombol di ProgramDetailClient**

Di `ProgramDetailClient.tsx`, dekat link "Preview Halaman Landing" (baris ±356), tambahkan:

```tsx
<Link href={`/learn/preview/${program.id}`} target="_blank" className="btn btn-secondary btn-sm">
  Lihat sebagai Peserta ↗
</Link>
```

- [ ] **Step 4: Verifikasi manual + typecheck**

Run: `pnpm typecheck`
Manual: login promotor → buka program draft → klik "Lihat sebagai Peserta" → banner kuning tampil, materi/lampiran/prompt refleksi terlihat, tidak ada tombol submit.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(promotor): preview materi sebagai peserta sebelum kelas dipublikasikan"
```

---

### Task B3: Transparansi Skor Intent ("Mengapa HOT?")

**Files:**
- Modify: `apps/platform-api/src/db/schema/enrollments.ts` (kolom `intent_breakdown jsonb`)
- Modify: `apps/platform-api/src/services/class/learning-engine-service.ts` (persist breakdown saat recalc)
- Modify: `apps/platform-api/src/routes/class-routes.ts` (learners list & detail mengembalikan `intentBreakdown`)
- Modify: `packages/contracts/src/index.ts` (`IntentBreakdownItem`, field pada `LearnerSummaryItemSchema` & detail)
- Modify: `apps/promotor-class-web/src/components/promotor/LearnerDetail.tsx`
- Test: `apps/platform-api/src/__tests__/integration/intent-breakdown.integration.test.ts`

**Interfaces:**
- Produces:
  - `IntentBreakdownItem = { label: string; points: number }` — mis. `[{ label: 'Enrolled di program', points: 10 }, { label: 'Progres ≥ 50%', points: 20 }]`.
  - `GET /api/v1/class/learners` & `GET /api/v1/class/learners/:contactId` → item punya `intentBreakdown?: IntentBreakdownItem[] | null`.

- [ ] **Step 1: Test integrasi yang gagal**

```ts
// apps/platform-api/src/__tests__/integration/intent-breakdown.integration.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withIntegrationDb } from './test-env';

describe('intent breakdown transparansi', () => {
  it('menyimpan breakdown saat intent dihitung ulang dan mengembalikannya di learners list', async () => {
    await withIntegrationDb(async (db) => {
      const { orgId, sessionToken, programId, lessonId, enrollmentId, contactId } = await seedClassFixture(db);
      // selesaikan 1 lesson via service langsung (pola test integrasi refleksi existing)
      const learning = createLearningEngineService(db);
      await learning.completeLesson({ organizationId: orgId, enrollmentId, lessonId, authenticatedContactId: contactId });

      const res = await requestOperator(db, 'GET', `/api/v1/class/learners?programId=${programId}`, sessionToken);
      const learner = res.body.learners.find((l: any) => l.contactId === contactId);
      assert.ok(Array.isArray(learner.intentBreakdown));
      assert.ok(learner.intentBreakdown.some((b: any) => b.points > 0 && b.label.length > 0));
    });
  });
});
```

> `seedClassFixture` / `requestOperator`: ikuti helper suite integrasi class-routes existing.

- [ ] **Step 2: Jalankan → FAIL** (`pnpm --filter @promotor/platform-api test:integration`)

- [ ] **Step 3: Migrasi + persist**

Schema `enrollments.ts`: `intentBreakdown: jsonb('intent_breakdown'),` (import `jsonb`).

Lalu cari fungsi recalc intent di `learning-engine-service.ts` (tempat `intentScore`/`intentLabel` di-set — cari `calculateIntentScore`). `calculateIntentScore` di `src/domain/learning/intent-engine.ts:41` sudah mengembalikan `breakdown`. Persist:

```ts
intentBreakdown: result.breakdown ? JSON.stringify(
  Object.entries(result.breakdown)
    .filter(([, points]) => (points as number) > 0)
    .map(([label, points]) => ({ label: INTENT_LABELS[label] ?? label, points }))
) : null,
```

dengan map label Indonesia di `intent-engine.ts`:

```ts
export const INTENT_LABELS: Record<string, string> = {
  isEnrolled: 'Terdaftar di program',
  hasStarted: 'Mulai pelajaran pertama',
  progress50: 'Progres mencapai 50%',
  progress80: 'Progres mencapai 80%',
  completion: 'Menyelesaikan program',
  hasClickedCta: 'Mengklik ajakan (CTA)',
};
```

> Sesuaikan key dengan struktur `breakdown` aktual pada `intent-engine.ts` (baca file dulu — breakdown berisi field skor per komponen).

Run: `pnpm --filter @promotor/platform-api db:generate && pnpm --filter @promotor/platform-api db:migrate`

- [ ] **Step 4: Contracts + API**

```ts
export const IntentBreakdownItemSchema = z.object({
  label: z.string(),
  points: z.number().int(),
});
export type IntentBreakdownItem = z.infer<typeof IntentBreakdownItemSchema>;
```

Tambahkan `intentBreakdown: z.array(IntentBreakdownItemSchema).nullable().optional()` ke `LearnerSummaryItemSchema` dan schema detail learner. Di repository/service class-routes yang men-select enrollments untuk learners list, tambahkan kolom `intentBreakdown` dan parse JSON → array (helper `parseIntentBreakdown(raw: unknown): IntentBreakdownItem[] | null` di file route atau service).

- [ ] **Step 5: Test → PASS**

- [ ] **Step 6: UI LearnerDetail**

Di `LearnerDetail.tsx` (setelah badge skor), tambahkan:

```tsx
{(learner.intentBreakdown?.length ?? 0) > 0 && (
  <details style={{ marginTop: 8 }}>
    <summary style={{ font: '600 12px/1.4 var(--font-sans)', cursor: 'pointer' }}>Mengapa skor ini?</summary>
    <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
      {learner.intentBreakdown!.map((b, i) => (
        <li key={i} style={{ font: '400 12px/1.5 var(--font-sans)' }}>
          {b.label} <strong>+{b.points}</strong>
        </li>
      ))}
    </ul>
  </details>
)}
```

- [ ] **Step 7: Typecheck + commit**

Run: `pnpm typecheck && pnpm --filter @promotor/platform-api test:integration`

```bash
git add -A
git commit -m "feat(promotor): tampilkan alasan skor intent HOT/WARM/COLD secara transparan"
```

---

### Task B4: Surface "Learner Macet" + Pastikan Cron Sweep Jalan

**Files:**
- Modify: `apps/platform-api/wrangler.jsonc` (tambah `triggers.crons`)
- Modify: `apps/platform-api/src/services/class/inactivity-sweep-service.ts` (window dari env)
- Modify: `apps/platform-api/src/routes/class-routes.ts` (filter `learningStatus` di learners list)
- Modify: `packages/contracts/src/index.ts` (`LearnersListQuerySchema` + `learningStatus`)
- Modify: `apps/promotor-class-web/src/app/(promotor)/app/page.tsx` (section Learner Macet)
- Test: `apps/platform-api/src/__tests__/integration/learners-atrisk-filter.integration.test.ts`

**Interfaces:**
- Consumes: `learning_signals` (type `LEARNER_INACTIVITY`, status open), `GET /api/v1/class/learners`.
- Produces: query param `learningStatus=AT_RISK` pada learners list; env `INACTIVITY_SWEEP_DAYS` (default 7).

- [ ] **Step 1: Test filter yang gagal**

```ts
// apps/platform-api/src/__tests__/integration/learners-atrisk-filter.integration.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withIntegrationDb } from './test-env';

describe('GET /api/v1/class/learners?learningStatus=AT_RISK', () => {
  it('hanya mengembalikan enrollment AT_RISK', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken, atRiskContactId, normalContactId } = await seedTwoLearnersOneAtRisk(db);
      const res = await requestOperator(db, 'GET', '/api/v1/class/learners?learningStatus=AT_RISK', sessionToken);
      const ids = res.body.learners.map((l: any) => l.contactId);
      assert.ok(ids.includes(atRiskContactId));
      assert.ok(!ids.includes(normalContactId));
    });
  });
});
```

- [ ] **Step 2: Jalankan → FAIL**

- [ ] **Step 3: Implementasi filter**

Di handler `GET /api/v1/class/learners` (`class-routes.ts:234`): parse query `learningStatus` (whitelist `'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'AT_RISK'`, else 400), teruskan ke service/repo → tambah `eq(enrollments.learningStatus, value)` pada kondisi. Contracts:

```ts
export const LearnersListQuerySchema = z.object({
  programId: z.string().uuid().optional(),
  learningStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'AT_RISK']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
```

> Sesuaikan dengan query schema learners existing bila sudah ada field lain.

- [ ] **Step 4: Cron config + env window**

`apps/platform-api/wrangler.jsonc` — tambahkan pada objek utama:

```jsonc
"triggers": { "crons": ["0 2 * * *"] }
```

(02:00 UTC = 09:00 WIB, sekali sehari.)

`inactivity-sweep-service.ts` — ganti angka 7 hari hardcoded dengan:

```ts
const inactivityDays = Number(env?.INACTIVITY_SWEEP_DAYS ?? 7);
```

> Ikuti cara service lain mengakses env di repo ini (parameter `env` atau deps). Jika service tidak menerima env, tambahkan parameter opsional `options: { inactivityDays?: number }` dan teruskan dari `src/index.ts` scheduled handler yang membaca `env.INACTIVITY_SWEEP_DAYS`. Tambahkan `"INACTIVITY_SWEEP_DAYS": "7"` ke `vars` di wrangler.jsonc sebagai dokumentasi.

- [ ] **Step 5: Section "Learner Macet" di dashboard**

Di `apps/promotor-class-web/src/app/(promotor)/app/page.tsx` — fetch `GET /api/v1/class/learners?learningStatus=AT_RISK` (via method api-client `listClassLearners({ learningStatus: 'AT_RISK' })` — tambahkan param ke method jika belum ada) dan render section:

```tsx
{(atRiskLearners.length > 0) && (
  <section style={{ marginTop: 16 }}>
    <SectionHead title="Learner Macet" subtitle={`Progres < 50% & tidak aktif — momen emas disapa via WA`} />
    {atRiskLearners.map((l: any) => (
      <div key={l.contactId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid var(--border)', marginTop: 8 }}>
        <div>
          <strong style={{ font: '600 14px/1.3 var(--font-sans)' }}>{l.name}</strong>
          <div className="kicker kicker-muted">{l.programTitle} · {l.progressPercent}% · macet {l.daysInactive ?? 'beberapa'} hari</div>
        </div>
        <button type="button" className="btn btn-accent btn-sm"
          onClick={() => openWaSheet({ contactName: l.name, phoneE164: l.phoneE164, initialDraft: buildNudgeMessage(l) })}>
          Kirim WA
        </button>
      </div>
    ))}
  </section>
)}
```

dengan util lokal:

```ts
function buildNudgeMessage(l: { name: string; programTitle: string }): string {
  return `Halo Kak ${l.name} 😊 Semangat belajarnya! Terakhir Kakak berhenti di program "${l.programTitle}". Ada yang bisa saya bantu biar lancar lagi? Materinya menarik lho, tinggal sedikit lagi ✨`;
}
```

Reuse `WhatsAppDraftSheet` (`src/components/promotor/WhatsAppDraftSheet.tsx`) untuk sheet kirim WA (komponen sudah ada — lihat props-nya).
> Jika field `phoneE164`/`programTitle` belum ada di `LearnerSummaryItemSchema`, tambahkan ke response learners (join contacts & programs sudah ada di query list).

- [ ] **Step 6: Test → PASS, typecheck, commit**

Run: `pnpm --filter @promotor/platform-api test:integration && pnpm typecheck`

```bash
git add -A
git commit -m "feat(promotor): section Learner Macet di dashboard + filter AT_RISK + aktifkan cron sweep harian"
```

---

### Task B5: Sinyal WhatsApp saat Refleksi Mendatang Masuk

**Files:**
- Modify: `apps/platform-api/src/services/class/learning-engine-service.ts` (`submitReflection` → buat signal `REFLECTION_SUBMITTED`)
- Modify: `apps/promotor-class-web/src/app/(promotor)/app/page.tsx` atau halaman sinyal existing (render sinyal baru dengan tombol WA)
- Test: `apps/platform-api/src/__tests__/integration/reflection-signal.integration.test.ts`

**Interfaces:**
- Consumes: `learning_signals` repo yang dipakai sweep (cari `LEARNER_INACTIVITY` insert untuk pola).
- Produces: signal `type: 'REFLECTION_SUBMITTED'`, `priority: 'HIGH'`, `reason: 'Refleksi {n} kata di {lessonTitle}: "{excerpt 100 char}"'`, `recommendedActionType: 'WHATSAPP_REPLY'` — hanya bila `responseText` ≥ 80 karakter. Idempoten per (enrollment, lesson): cek existing open signal dengan `metadata.lessonId` sama.

- [ ] **Step 1: Test integrasi yang gagal**

```ts
// apps/platform-api/src/__tests__/integration/reflection-signal.integration.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withIntegrationDb } from './test-env';

const LONG_TEXT = 'Anak saya jadi lebih tenang setelah saya mencoba cara komunikasi positif dari modul ini. '.repeat(3);

describe('refleksi mendalam memicu sinyal WA', () => {
  it('membuat REFLECTION_SUBMITTED signal untuk refleksi >= 80 karakter', async () => {
    await withIntegrationDb(async (db) => {
      const { orgId, contactId, enrollmentId, lessonId } = await seedClassFixture(db);
      await createLearningEngineService(db).submitReflection({
        organizationId: orgId, enrollmentId, lessonId,
        responseText: LONG_TEXT, authenticatedContactId: contactId,
      });
      const signals = await db.select().from(learningSignals)
        .where(eq(learningSignals.type, 'REFLECTION_SUBMITTED'));
      assert.equal(signals.length, 1);
      assert.match(signals[0].reason, /Refleksi \d+ kata/);
    });
  });

  it('refleksi pendek tidak memicu sinyal', async () => {
    await withIntegrationDb(async (db) => {
      const { orgId, contactId, enrollmentId, lessonId } = await seedClassFixture(db);
      await createLearningEngineService(db).submitReflection({
        organizationId: orgId, enrollmentId, lessonId,
        responseText: 'Setuju.', authenticatedContactId: contactId,
      });
      const signals = await db.select().from(learningSignals)
        .where(eq(learningSignals.type, 'REFLECTION_SUBMITTED'));
      assert.equal(signals.length, 0);
    });
  });
});
```

- [ ] **Step 2: Jalankan → FAIL** → **Step 3: Implementasi di `submitReflection`**

Setelah logika existing (setelah recalcs & signals evaluasi), tambahkan:

```ts
const text = (responseText ?? '').trim();
if (text.length >= 80) {
  const wordCount = text.split(/\s+/).length;
  const excerpt = text.length > 100 ? `${text.slice(0, 99)}…` : text;
  const existing = await db.select({ id: learningSignals.id }).from(learningSignals)
    .where(and(
      eq(learningSignals.enrollmentId, enrollment.id),
      eq(learningSignals.type, 'REFLECTION_SUBMITTED'),
      isNull(learningSignals.resolvedAt),
    ))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(learningSignals).values({
      organizationId: organizationId,
      contactId: enrollment.contactId,
      programId: enrollment.programId,
      enrollmentId: enrollment.id,
      type: 'REFLECTION_SUBMITTED',
      priority: 'HIGH',
      reason: `Refleksi ${wordCount} kata di "${lesson.title}": "${excerpt}"`,
      recommendedActionType: 'WHATSAPP_REPLY',
      recommendedActionReason: 'Balas refleksi via WhatsApp saat antusiasme peserta masih tinggi',
      status: 'OPEN',
      metadata: { lessonId: lesson.id, lessonTitle: lesson.title },
    });
  }
}
```

> Sesuaikan nama kolom/nilai `status` & `priority` dengan definisi `learning-signals.ts` dan nilai yang dipakai sweep service (baca file schema dulu — pakai nilai enum yang sama persis).

- [ ] **Step 4: UI sinyal** — di dashboard/daftar sinyal existing (lokasi render `LEARNER_INACTIVITY` — grep `LEARNER_INACTIVITY` di `apps/promotor-class-web/src`), pastikan signal baru ikut ter-render (biasanya otomatis karena list semua sinyal open) dan tambahkan tombol WA pada item dengan `recommendedActionType === 'WHATSAPP_REPLY'` memakai `WhatsAppDraftSheet` + draft:

```ts
const draft = `Halo Kak ${learnerName}, terima kasih refleksinya di ${signal.metadata.lessonTitle}! Sangat mendalam. Boleh saya bantu jalankan penerapannya di rumah? 😊`;
```

- [ ] **Step 5: Test → PASS, typecheck, commit**

Run: `pnpm --filter @promotor/platform-api test:integration && pnpm typecheck`

```bash
git add -A
git commit -m "feat(promotor): sinyal REFLECTION_SUBMITTED + tombol WA saat refleksi mendalam masuk"
```

---

### Task B6: Broadcast Pengingat Belajar 1-Tap

**Files:**
- Create: `apps/promotor-class-web/src/components/promotor/BroadcastReminderSheet.tsx`
- Create: `apps/promotor-class-web/src/lib/broadcast.ts`
- Modify: `apps/promotor-class-web/src/app/(promotor)/app/learners/page.tsx`
- Test: `apps/promotor-class-web/src/__tests__/broadcast.test.ts`

**Interfaces:**
- Consumes: learners list (progres `< 50%` → filter klien; `phoneE164` ada di item), `WhatsAppDraftSheet` existing.
- Produces: `buildReminderDraft(learner: { name; programTitle; progressPercent }): string`; `<BroadcastReminderSheet learners isOpen onClose />` dengan antrean WA berurutan.

- [ ] **Step 1: Test util yang gagal**

```ts
// apps/promotor-class-web/src/__tests__/broadcast.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildReminderDraft, buildWaUrl } from '../lib/broadcast';

describe('broadcast reminder', () => {
  it('draft memuat nama, program, dan progres', () => {
    const draft = buildReminderDraft({ name: 'Ayu', programTitle: 'Kelas STIFIn Dasar', progressPercent: 30 });
    assert.match(draft, /Ayu/);
    assert.match(draft, /Kelas STIFIn Dasar/);
    assert.match(draft, /30%/);
  });

  it('wa url membuang karakter non-digit', () => {
    assert.equal(buildWaUrl('+62 812-3456-789', 'hai'), 'https://wa.me/628123456789?text=' + encodeURIComponent('hai'));
  });
});
```

- [ ] **Step 2: Jalankan → FAIL** → **Step 3: Implementasi util**

```ts
// apps/promotor-class-web/src/lib/broadcast.ts
export interface ReminderLearner {
  name: string;
  programTitle: string;
  progressPercent: number;
}

export function buildReminderDraft(learner: ReminderLearner): string {
  return [
    `Halo Kak ${learner.name} 😊`,
    '',
    `Semangat! Kakak sudah menyelesaikan ${learner.progressPercent}% dari program "${learner.programTitle}".`,
    'Tinggal sedikit lagi menuju sertifikat 🎓 Kalau ada kendala, kabari saya ya — saya bantu sampai selesai.',
  ].join('\n');
}

export function buildWaUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 4: Test → PASS** → **Step 5: Sheet komponen**

```tsx
// apps/promotor-class-web/src/components/promotor/BroadcastReminderSheet.tsx
'use client';

import React, { useState } from 'react';
import { BottomSheet } from '@/components/ui';
import { buildReminderDraft, buildWaUrl, ReminderLearner } from '@/lib/broadcast';

export interface BroadcastReminderSheetProps {
  isOpen: boolean;
  learners: (ReminderLearner & { contactId: string; phoneE164: string })[];
  onClose: () => void;
}

export function BroadcastReminderSheet({ isOpen, learners, onClose }: BroadcastReminderSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(learners.map((l) => l.contactId)));
  const [cursor, setCursor] = useState<number | null>(null);

  if (!isOpen) return null;
  const queue = learners.filter((l) => selected.has(l.contactId));
  const current = cursor !== null ? queue[cursor] : null;

  const openNext = () => {
    const nextIndex = (cursor ?? -1) + 1;
    if (nextIndex >= queue.length) { onClose(); return; }
    const learner = queue[nextIndex];
    window.open(buildWaUrl(learner.phoneE164, buildReminderDraft(learner)), '_blank');
    setCursor(nextIndex);
  };

  return (
    <BottomSheet open={isOpen} onClose={onClose} labelledBy="broadcast-title">
      <h2 id="broadcast-title" style={{ font: '700 16px/1.3 var(--font-sans)' }}>Kirim Pengingat Belajar</h2>
      {current ? (
        <>
          <p className="kicker kicker-muted" style={{ marginTop: 8 }}>
            Mengirim {cursor! + 1} dari {queue.length}: {current.name}
          </p>
          <textarea className="textarea" rows={5} readOnly value={buildReminderDraft(current)} aria-label="Draf pengingat" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={openNext}>Sudah Terkirim — Lanjut</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Selesai</button>
          </div>
        </>
      ) : (
        <>
          <p className="kicker kicker-muted" style={{ marginTop: 8 }}>Pilih peserta yang mau dikirimi pengingat ({selected.size}/{learners.length}).</p>
          <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8 }}>
            {learners.map((l) => (
              <label key={l.contactId} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
                <input type="checkbox" checked={selected.has(l.contactId)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(l.contactId); else next.delete(l.contactId);
                    setSelected(next);
                  }} />
                <span style={{ font: '400 13px/1.4 var(--font-sans)' }}>{l.name} · {l.programTitle} · {l.progressPercent}%</span>
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={queue.length === 0} onClick={openNext}>
            Mulai Kirim via WhatsApp
          </button>
        </>
      )}
    </BottomSheet>
  );
}
```

- [ ] **Step 6: Wire di learners page** — tombol "Broadcast Pengingat" pada toolbar (aktif bila ada learner dengan `progressPercent < 50` dan `learningStatus !== 'COMPLETED'`), membuka sheet dengan daftar tsb.

- [ ] **Step 7: Typecheck + commit**

Run: `pnpm typecheck && pnpm --filter @promotor/promotor-class-web test`

```bash
git add -A
git commit -m "feat(promotor): broadcast pengingat belajar 1-tap untuk peserta progres < 50%"
```

---

### Task B7: Multi-tier Pricing & Bundling (Varian Harga)

**Files:**
- Create: `apps/platform-api/src/db/schema/program-price-variants.ts`
- Modify: `apps/platform-api/src/db/schema/index.ts`
- Create: `apps/platform-api/src/repositories/price-variant-repository.ts`
- Modify: `apps/platform-api/src/app.ts` (3 endpoint operator) + `routes/commerce-routes.ts` (checkout pakai varian) + `repositories/public-content-repository.ts` (public program menyertakan variants)
- Modify: `packages/contracts/src/index.ts` (schemas) + `packages/api-client/src/index.ts`
- Modify: `apps/promotor-class-web/src/app/(promotor)/app/programs/[programId]/ProgramDetailClient.tsx` + `apps/promotor-class-web/src/components/public/RegistrationSection.tsx`
- Test: `apps/platform-api/src/__tests__/integration/price-variants.integration.test.ts`

**Interfaces:**
- Produces:
  - `ProgramPriceVariant = { id, programId, label, description?, priceAmount, isDefault, sortOrder }`.
  - Operator: `POST /api/v1/programs/:programId/variants`, `PATCH /api/v1/programs/:programId/variants/:variantId`, `DELETE .../variants/:variantId`.
  - Checkout: `PublicPaidCheckoutRequestSchema` + `variantId?: string` → amount = harga varian; error `VARIANT_NOT_FOUND` (400) bila varian bukan milik program.
  - Program DTO (operator & public) punya `variants?: ProgramPriceVariant[]`.

- [ ] **Step 1: Test integrasi yang gagal**

```ts
// apps/platform-api/src/__tests__/integration/price-variants.integration.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withIntegrationDb } from './test-env';

describe('program price variants + checkout', () => {
  it('membuat varian, checkout dengan varian memakai harga varian', async () => {
    await withIntegrationDb(async (db) => {
      const { sessionToken, paidProgramId } = await seedPaidProgramFixture(db);
      const created = await requestOperator(db, 'POST', `/api/v1/programs/${paidProgramId}/variants`, sessionToken, {
        label: 'Kelas + Konsultasi', description: 'Termasuk 1x sesi konsultasi 60 menit',
        priceAmount: 499000, isDefault: true, sortOrder: 1,
      });
      assert.equal(created.status, 201);
      const variantId = created.body.variant.id;

      const detail = await requestOperator(db, 'GET', `/api/v1/programs/${paidProgramId}`, sessionToken);
      assert.equal(detail.body.program.variants.length, 1);

      const checkout = await requestApp(db, 'POST',
        '/api/v1/public/rina-stifin/programs/kelas-parenting/checkout', undefined, undefined); // sesuaikan slug fixture
      void checkout; void variantId; void sessionToken;
      // Assertion inti: body order amount === 499000 dan metadata.variantId === variantId
      // (ikuti pola assertion checkout existing di test commerce integration)
    });
  });

  it('variantId milik program lain ditolak 400', async () => {
    await withIntegrationDb(async (db) => {
      // seed dua program; coba checkout program A dengan variantId program B
      // assert status 400 dan code VARIANT_NOT_FOUND
    });
  });
});
```

> Tulis test lengkap dengan fixture commerce existing (`commerce_orders` integration tests) — salin pola assertion dari test checkout existing.

- [ ] **Step 2: Jalankan → FAIL** → **Step 3: Schema + migrasi**

```ts
// apps/platform-api/src/db/schema/program-price-variants.ts
import { integer, pgTable, text, timestamp, uuid, varchar, boolean } from 'drizzle-orm/pg-core';

export const programPriceVariants = pgTable('program_price_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  programId: uuid('program_id').notNull(),
  label: varchar('label', { length: 120 }).notNull(),
  description: text('description'),
  priceAmount: integer('price_amount').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Export di schema/index; generate + migrate.

- [ ] **Step 4: Contracts**

```ts
export const ProgramPriceVariantSchema = z.object({
  id: z.string().uuid(),
  programId: z.string().uuid(),
  label: z.string().min(1).max(120),
  description: z.string().nullable().optional(),
  priceAmount: z.number().int().min(0),
  isDefault: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProgramPriceVariant = z.infer<typeof ProgramPriceVariantSchema>;

export const CreatePriceVariantRequestSchema = z.object({
  label: z.string().min(1, 'Nama paket wajib diisi').max(120),
  description: z.string().max(500).optional().nullable(),
  priceAmount: z.number().int().min(0, 'Harga tidak valid'),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});
export type CreatePriceVariantRequest = z.infer<typeof CreatePriceVariantRequestSchema>;

export const UpdatePriceVariantRequestSchema = CreatePriceVariantRequestSchema.partial();
export type UpdatePriceVariantRequest = z.infer<typeof UpdatePriceVariantRequestSchema>;
```

Tambahkan `variants: z.array(ProgramPriceVariantSchema).optional()` ke `ProgramSchema` (field opsional agar backward-compatible).

- [ ] **Step 5: Repo + endpoint + checkout + public response**

- Repo `price-variant-repository.ts`: `listByProgram`, `create`, `update`, `delete`, `findByIdAndProgram` (semua scope `organizationId` + `programId`).
- Endpoint operator di blok B3 `app.ts` (middleware `/api/v1/programs/*` sudah memproteksi):

```ts
app.post('/api/v1/programs/:programId/variants', async (c) => {
  const db = c.get('db');
  const parsed = CreatePriceVariantRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
  const authCtx = c.get('authContext')!;
  const repo = createPriceVariantRepository(db);
  if (parsed.data.isDefault) await repo.clearDefault(authCtx.organization!.organizationId, c.req.param('programId'));
  const variant = await repo.create({
    organizationId: authCtx.organization!.organizationId,
    programId: c.req.param('programId'),
    ...parsed.data,
  });
  return c.json({ variant }, 201);
});
// PATCH & DELETE: pola sama, PATCH partial + clearDefault bila isDefault true, DELETE 204.
```

- `commerce-service` checkout: setelah memuat program, bila `variantId`:

```ts
const variant = await variantRepo.findByIdAndProgram(organizationId, program.id, variantId);
if (!variant) throw new DomainError('VARIANT_NOT_FOUND', 'Paket harga tidak ditemukan');
amount = variant.priceAmount;
metadata = { ...metadata, variantId: variant.id, variantLabel: variant.label };
```

`PublicPaidCheckoutRequestSchema` + `variantId: z.string().uuid().optional()`.

- `public-content-repository` `getProgramBySlug`: sertakan `variants` (sorted by sortOrder) pada response publik — hanya `status='published'`.

- [ ] **Step 6: UI builder + landing**

Builder (`ProgramDetailClient.tsx`) — section "Pilihan Paket" di bawah info harga:

```tsx
<div style={{ marginTop: 16 }}>
  <div className="field-label">Pilihan Paket (opsional)</div>
  <p className="kicker kicker-muted">Contoh: "Kelas Saja" Rp 299rb vs "Kelas + Konsultasi" Rp 499rb.</p>
  {(variants ?? []).map((v) => (
    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, border: '1px solid var(--border)', marginTop: 8 }}>
      <div>
        <strong>{v.label}{v.isDefault ? ' ⭐' : ''}</strong>
        <div className="kicker kicker-muted">Rp {v.priceAmount.toLocaleString('id-ID')}{v.description ? ` · ${v.description}` : ''}</div>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDeleteVariant(v.id)}>Hapus</button>
    </div>
  ))}
  <form onSubmit={handleCreateVariant} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: 8, marginTop: 8 }}>
    <input className="input" placeholder="Nama paket" value={newVariant.label} onChange={(e) => setNewVariant({ ...newVariant, label: e.target.value })} required />
    <input className="input" inputMode="numeric" placeholder="Harga (Rp)" value={newVariant.priceAmount}
      onChange={(e) => setNewVariant({ ...newVariant, priceAmount: Number(e.target.value.replace(/\D/g, '') || 0) })} required />
    <button className="btn btn-primary btn-sm" type="submit">Tambah</button>
  </form>
</div>
```

dengan command `createPriceVariantCommand` / `deletePriceVariantCommand` di `modules/programs/commands.ts` (pola existing) + api-client methods `createPriceVariant`, `deletePriceVariant`.

Landing (`RegistrationSection.tsx`) — pilih paket sebelum checkout:

```tsx
{(variants.length > 0) && (
  <div role="radiogroup" aria-label="Pilih paket" style={{ marginTop: 12 }}>
    {variants.map((v) => (
      <label key={v.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 10, border: '1px solid var(--border)', marginTop: 8, borderColor: selectedVariantId === v.id ? 'var(--accent)' : 'var(--border)' }}>
        <input type="radio" name="variant" checked={selectedVariantId === v.id} onChange={() => setSelectedVariantId(v.id)} />
        <div>
          <strong>{v.label}</strong>
          <div className="kicker kicker-muted">Rp {v.priceAmount.toLocaleString('id-ID')}{v.description ? ` — ${v.description}` : ''}</div>
        </div>
      </label>
    ))}
  </div>
)}
```

dan `createPaidProgramCheckout(slug, programSlug, { name, phone, email, sourceChannel, variantId: selectedVariantId ?? undefined })` — perluas payload api-client.

- [ ] **Step 7: Test → PASS, typecheck, commit**

Run: `pnpm --filter @promotor/platform-api test:integration && pnpm typecheck`

```bash
git add -A
git commit -m "feat(promotor): multi-tier pricing & bundling selector di builder dan checkout"
```

---

### Task B8: Kupon Promo / Voucher Diskon

**Files:**
- Create: `apps/platform-api/src/db/schema/promo-coupons.ts`
- Modify: `apps/platform-api/src/db/schema/index.ts`
- Create: `apps/platform-api/src/repositories/coupon-repository.ts`
- Create: `apps/platform-api/src/services/commerce/coupon-service.ts`
- Modify: `apps/platform-api/src/routes/class-routes.ts` (CRUD operator), `routes/commerce-routes.ts` (checkout + quote publik + increment redemption saat paid), `app.ts` (route publik quote bila lebih cocok di sana)
- Modify: `packages/contracts/src/index.ts`, `packages/api-client/src/index.ts`
- Create: `apps/promotor-class-web/src/app/(promotor)/app/coupons/page.tsx`
- Modify: `apps/promotor-class-web/src/components/public/RegistrationSection.tsx`, `src/components/promotor/...` nav (PromotorShell menu), `apps/promotor-class-web/src/app/(promotor)/app/orders/page.tsx` (tampilkan diskon)
- Test: `apps/platform-api/src/__tests__/coupon-service.test.ts`, `apps/platform-api/src/__tests__/integration/coupon-checkout.integration.test.ts`

**Interfaces:**
- Produces:
  - `PromoCoupon = { id, code, discountType: 'PERCENT'|'FIXED', discountValue, programId?, maxRedemptions?, usedCount, expiresAt?, isActive }`.
  - Operator: `GET /api/v1/class/coupons`, `POST /api/v1/class/coupons`, `PATCH /api/v1/class/coupons/:id` (toggle aktif / ubah limit).
  - Publik quote: `GET /api/v1/public/:slug/programs/:programSlug/coupons/:code` → `{ valid, message, discountAmount, finalAmount }`.
  - Checkout: `PublicPaidCheckoutRequestSchema` + `couponCode?: string` (uppercase-trim) → order `amount = finalAmount`; metadata `{ couponCode, discountAmount }`; `finalAmount === 0` → order langsung `PAID` + enroll (tanpa Paycore), response `checkoutUrl: null`.

- [ ] **Step 1: Unit test coupon-service yang gagal**

```ts
// apps/platform-api/src/__tests__/coupon-service.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCouponService } from '../services/commerce/coupon-service';
import { DomainError } from '../core/errors';

const now = new Date('2026-09-06T03:00:00Z');

function makeDeps(coupon: any) {
  return { deps: { clock: () => now, couponRepo: { async findByCode(_org: string, code: string) { return code === coupon.code ? coupon : null; } } } };
}

const BASE = { id: 'cp1', organizationId: 'o1', code: 'EARLYBIRD', discountType: 'FIXED', discountValue: 50000, programId: null, maxRedemptions: null, usedCount: 0, expiresAt: null, isActive: true };

describe('coupon-service.validateForProgram', () => {
  it('kupon FIXED menghitung diskon dan final amount', () => {
    const { deps } = makeDeps(BASE);
    const svc = createCouponService({} as any, deps as any);
    const res = svc.validateForProgram({ coupon: BASE, programId: 'p1', listPrice: 299000, now });
    assert.deepEqual(res, { valid: true, discountAmount: 50000, finalAmount: 249000, message: 'Kode EARLYBIRD diterapkan' });
  });

  it('PERCENT dibatasi dan tidak melebihi harga', () => {
    const { deps } = makeDeps({ ...BASE, discountType: 'PERCENT', discountValue: 50 });
    const svc = createCouponService({} as any, deps as any);
    const res = svc.validateForProgram({ coupon: { ...BASE, discountType: 'PERCENT', discountValue: 50 }, programId: 'p1', listPrice: 299000, now });
    assert.equal(res.discountAmount, 149500);
  });

  it('kupon tidak aktif / kedaluwarsa / habis kuota → invalid dengan alasan', () => {
    const svc = createCouponService({} as any, makeDeps(BASE).deps as any);
    assert.equal(svc.validateForProgram({ coupon: { ...BASE, isActive: false }, programId: 'p1', listPrice: 100, now }).valid, false);
    assert.equal(svc.validateForProgram({ coupon: { ...BASE, expiresAt: new Date('2026-09-01T00:00:00Z') }, programId: 'p1', listPrice: 100, now }).valid, false);
    assert.equal(svc.validateForProgram({ coupon: { ...BASE, maxRedemptions: 5, usedCount: 5 }, programId: 'p1', listPrice: 100, now }).valid, false);
  });

  it('kupon khusus program lain → invalid', () => {
    const svc = createCouponService({} as any, makeDeps(BASE).deps as any);
    assert.equal(svc.validateForProgram({ coupon: { ...BASE, programId: 'p_lain' }, programId: 'p1', listPrice: 100, now }).valid, false);
  });

  it('finalAmount tidak pernah negatif', () => {
    const svc = createCouponService({} as any, makeDeps(BASE).deps as any);
    const res = svc.validateForProgram({ coupon: { ...BASE, discountValue: 999999 }, programId: 'p1', listPrice: 299000, now });
    assert.equal(res.finalAmount, 0);
  });
});
```

- [ ] **Step 2: Jalankan → FAIL** → **Step 3: Implementasi service**

```ts
// apps/platform-api/src/services/commerce/coupon-service.ts
export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

export function createCouponService(db: any, deps: { clock?: () => Date; couponRepo?: any } = {}) {
  const getNow = deps.clock ?? (() => new Date());
  const repo = deps.couponRepo ?? createDefaultCouponRepo(db);

  const compute = (coupon: any, listPrice: number) => {
    const discount = coupon.discountType === 'PERCENT'
      ? Math.floor((listPrice * coupon.discountValue) / 100)
      : coupon.discountValue;
    const discountAmount = Math.max(0, Math.min(discount, listPrice));
    return { discountAmount, finalAmount: listPrice - discountAmount };
  };

  return {
    compute,
    validateForProgram(input: { coupon: any; programId: string; listPrice: number; now?: Date }): CouponValidationResult {
      const now = input.now ?? getNow();
      const invalid = (message: string): CouponValidationResult => ({ valid: false, discountAmount: 0, finalAmount: input.listPrice, message });
      if (!input.coupon || !input.coupon.isActive) return invalid('Kode kupon tidak aktif');
      if (input.coupon.programId && input.coupon.programId !== input.programId) return invalid('Kode kupon tidak berlaku untuk program ini');
      if (input.coupon.expiresAt && new Date(input.coupon.expiresAt).getTime() < now.getTime()) return invalid('Kode kupon sudah kedaluwarsa');
      if (input.coupon.maxRedemptions != null && input.coupon.usedCount >= input.coupon.maxRedemptions) return invalid('Kuota kode kupon sudah habis');
      const { discountAmount, finalAmount } = compute(input.coupon, input.listPrice);
      return { valid: true, discountAmount, finalAmount, message: `Kode ${input.coupon.code} diterapkan` };
    },

    async findByCode(organizationId: string, code: string) {
      return repo.findByCode(organizationId, code.trim().toUpperCase());
    },
    async list(organizationId: string) { return repo.list(organizationId); },
    async create(organizationId: string, input: any) { return repo.create({ ...input, organizationId, code: input.code.trim().toUpperCase(), usedCount: 0 }); },
    async update(organizationId: string, id: string, patch: any) { return repo.update(organizationId, id, patch); },
    async incrementUsedCount(organizationId: string, id: string) { return repo.incrementUsedCount(organizationId, id); },
  };
}
```

- [ ] **Step 4: Schema + migrasi**

```ts
// apps/platform-api/src/db/schema/promo-coupons.ts
import { boolean, integer, pgTable, timestamp, uuid, varchar, uniqueIndex } from 'drizzle-orm/pg-core';

export const promoCoupons = pgTable(
  'promo_coupons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    code: varchar('code', { length: 40 }).notNull(),
    discountType: varchar('discount_type', { length: 16 }).notNull(), // 'PERCENT' | 'FIXED'
    discountValue: integer('discount_value').notNull(),
    programId: uuid('program_id'),
    maxRedemptions: integer('max_redemptions'),
    usedCount: integer('used_count').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('promo_coupons_org_code_uq').on(table.organizationId, table.code)]
);
```

Export di schema/index; generate + migrate.

- [ ] **Step 5: Contracts + endpoint operator + quote publik + checkout**

Contracts:

```ts
export const PromoCouponSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.number().int().min(1),
  programId: z.string().uuid().nullable().optional(),
  maxRedemptions: z.number().int().nullable().optional(),
  usedCount: z.number().int(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PromoCoupon = z.infer<typeof PromoCouponSchema>;

export const CreateCouponRequestSchema = z.object({
  code: z.string().min(3, 'Kode minimal 3 karakter').max(40).regex(/^[A-Z0-9_-]+$/, 'Kode hanya huruf besar, angka, tanda hubung'),
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.number().int().min(1, 'Nilai diskon minimal 1'),
  programId: z.string().uuid().optional().nullable(),
  maxRedemptions: z.number().int().min(1).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
}).refine((d) => d.discountType === 'FIXED' || d.discountValue <= 100, { message: 'Diskon persen maksimal 100', path: ['discountValue'] });
export type CreateCouponRequest = z.infer<typeof CreateCouponRequestSchema>;

export const CouponQuoteResponseSchema = z.object({
  valid: z.boolean(),
  message: z.string(),
  discountAmount: z.number().int().nonnegative(),
  finalAmount: z.number().int().nonnegative(),
});
```

`PublicPaidCheckoutRequestSchema` + `couponCode: z.string().max(40).optional()`; `PublicPaidCheckoutResponseSchema` — `checkoutUrl: z.string().url().nullable().optional()` (sudah optional; pastikan nullable ditambah jika belum).

Endpoint operator (`class-routes.ts`, pola file):

```ts
app.get('/api/v1/class/coupons', (c) => /* list by authCtx org */);
app.post('/api/v1/class/coupons', (c) => /* validate CreateCouponRequestSchema → couponService.create → 201 */);
app.patch('/api/v1/class/coupons/:id', (c) => /* partial: isActive, maxRedemptions, expiresAt → 200 */);
```

Quote publik (`app.ts` area publik, karena hanya butuh slug):

```ts
app.get('/api/v1/public/:slug/programs/:programSlug/coupons/:code', async (c) => {
  c.header('Cache-Control', 'no-store');
  const db = c.get('db');
  const slug = c.req.param('slug');
  const programSlug = c.req.param('programSlug');
  const couponService = createCouponService(db);
  const coupon = await couponService.findByCodeBySlug(slug, c.req.param('code'));
  const program = await publicContentRepo.getPublishedProgramBySlug(slug, programSlug); // repo existing, sesuaikan nama
  if (!coupon || !program) return c.json({ valid: false, message: 'Kode kupon tidak ditemukan', discountAmount: 0, finalAmount: program?.priceAmount ?? 0 }, 200);
  const result = couponService.validateForProgram({ coupon, programId: program.id, listPrice: program.priceAmount });
  return c.json(result, 200);
});
```

Checkout (`commerce-routes.ts` POST checkout): setelah program dimuat sebelum `paycoreClient.createOrder`:

```ts
let amount = program.priceAmount;
const orderMetadata: Record<string, unknown> = {};
if (parsed.data.couponCode) {
  const coupon = await couponService.findByCodeBySlug(slug, parsed.data.couponCode);
  const quote = couponService.validateForProgram({ coupon, programId: program.id, listPrice: amount });
  if (!quote.valid) throw new DomainError('VALIDATION_ERROR', quote.message);
  amount = quote.finalAmount;
  orderMetadata.couponCode = coupon.code;
  orderMetadata.discountAmount = quote.discountAmount;
}

if (amount === 0) {
  // Kupon 100% — tanpa Paycore: langsung PAID + enroll (reuse path sukses webhook)
  const order = await commerceService.createFreeOrder({ organizationId, programId: program.id, contactId, reference, metadata: orderMetadata });
  const enrollment = await enrollmentService.enrollContact({ organizationId, programId: program.id, contactId, orderId: order.id });
  if (orderMetadata.couponCode) await couponService.incrementUsedCount(organizationId, couponForMetadata.id);
  return c.json({ orderId: order.id, reference, amount: 0, currency: 'IDR', checkoutUrl: null, providerOrderId: 'FREE', expiresAt: null }, 201);
}
```

> `createFreeOrder`: tambahkan method ke `commerce-service.ts` yang membuat `commerce_orders` dengan `status='PAID'`, `paid_at=now`, `payment_mode='FREE'` (perluas enum `CommercePaymentModeSchema` dengan `'FREE'` di contracts — cek penggunaan enum lain dulu).
> Increment redemption: di handler webhook Paycore yang menandai order PAID dan di handler manual approve, jika `order.metadata?.couponCode` → `couponService.incrementUsedCount`.

- [ ] **Step 6: Test integrasi checkout kupon yang gagal → lulus**

Kasus: (1) checkout dengan kupon FIXED → order amount = finalAmount + metadata benar; (2) kupon 100% → order PAID tanpa checkoutUrl, enrollment ada; (3) kupon invalid → 400 dengan pesan; (4) webhook PAID menaikkan `usedCount`.

- [ ] **Step 7: UI**

1. **RegistrationSection** (checkout publik): input kupon + tombol "Pakai":

```tsx
const [couponCode, setCouponCode] = useState('');
const [couponQuote, setCouponQuote] = useState<{ valid: boolean; message: string; finalAmount: number } | null>(null);

const handleApplyCoupon = async () => {
  const res = await api.getPublicCouponQuote(detail.promoter.workspaceSlug, program.programSlug, couponCode.trim().toUpperCase());
  setCouponQuote(res);
};
// render: input + tombol + pesan valid (hijau) / invalid (merah) + harga final
```

Pass `couponCode` ke `createPaidProgramCheckout` bila quote valid.

2. **Halaman kelola kupon** `apps/promotor-class-web/src/app/(promotor)/app/coupons/page.tsx`: daftar kupon (kode, tipe, nilai, terpakai/kuota, status, expiry) + form tambah (kode, tipe PERCENT/FIXED, nilai, program optional via `getProgramsQuery`, kuota optional, expiry date optional) + toggle aktif. Daftarkan menu di `PromotorShell` (label "Kupon", icon svg sederhana ikut pola `nav-icons.tsx`).
3. **api-client**: `listCoupons`, `createCoupon`, `updateCoupon`, `getPublicCouponQuote`.
4. **Orders page**: jika `order.metadata?.discountAmount` → tampilkan "− Rp X (kupon CODE)" di bawah amount.

- [ ] **Step 8: Semua test + typecheck + commit**

Run: `pnpm --filter @promotor/platform-api test && pnpm --filter @promotor/platform-api test:integration && pnpm typecheck`

```bash
git add -A
git commit -m "feat(promotor): kupon promo PERCENT/FIXED dengan quote publik, checkout diskon, dan kuota redemption"
```

---

## Self-Review (dijalankan setelah penulisan)

1. **Cakupan spesifikasi promotor:** kupon (B8) ✓, inactivity alert surface (B4 + cron fix) ✓, multi-tier pricing & bundling (B7) ✓, lampiran rich media di editor (B1) ✓, preview peserta (B2) ✓, notifikasi refleksi (B5) ✓, broadcast 1-tap (B6) ✓, lead intent transparan (B3) ✓.
2. **Placeholder:** semua langkah punya kode/SQL/perintah konkret; poin "sesuaikan nama repo/service dengan file existing" hanya untuk penamaan lokal yang executor wajib baca — bukan placeholder logika.
3. **Konsistensi tipe:** `ProgramPriceVariant`, `PromoCoupon`, `IntentBreakdownItem`, `LearnersListQuerySchema` didefinisikan di contracts dan dipakai di API + UI; `VARIANT_NOT_FOUND` konsisten antara service & test.
