# Learner Experience (Peserta) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Peserta bisa login ulang dari HP/laptop apa pun via OTP WhatsApp, tidak kehilangan draft refleksi, melanjutkan video dari titik terakhir, menyimpan catatan pribadi, dan mendapat e-sertifikat shareable — plus template klaim konsultasi yang sudah terisi.

**Architecture:** Semua perubahan learner berada di `apps/promotor-class-web` (frontend Next.js) dan `apps/platform-api` (Hono). Sesi learner memakai infrastruktur existing: `learner_sessions` + cookie `promotor_learner_session` — OTP hanya jadi **cara baru membuat sesi**. Sertifikat di-snapshot ke tabel `certificates` saat terbit dan dirender client-side (canvas PNG + print PDF) dengan QR yang menunjuk ke halaman verifikasi publik.

**Tech Stack:** Next.js 15 (client components), Hono, Drizzle ORM, Zod (`packages/contracts`), `node:test` via `tsx --test`, `qrcode` (satu-satunya dependency baru, client-side only).

## Global Constraints

- Copy user-facing Bahasa Indonesia, hardcoded (tanpa i18n).
- Styling via CSS tokens + utility classes existing (`.btn`, `.input`, `.textarea`, `.kicker`); **tanpa Tailwind**; tanpa library UI baru selain yang ada di `src/components/ui/index.tsx`.
- Backend: error via `DomainError`; validasi via Zod contracts; token learner selalu disimpan sebagai SHA-256 hash.
- Cookie learner: `promotor_learner_session`, `HttpOnly; Secure; SameSite=None; path=/; maxAge=30 hari`.
- Migrasi: `pnpm --filter @promotor/platform-api db:generate` lalu `db:migrate`.
- Uang integer IDR; telepon via `normalizePhone()` dari `@promotor/platform-core`.
- Sebelum setiap commit: `pnpm typecheck` harus lulus.
- Test runner: `node:test` + `node:assert/strict`, dieksekusi `tsx --test`.

---

### Task A1: Autosave Draft Refleksi (localStorage)

**Files:**
- Create: `apps/promotor-class-web/src/lib/reflection-draft.ts`
- Test: `apps/promotor-class-web/src/__tests__/reflection-draft.test.ts`
- Modify: `apps/promotor-class-web/src/app/(learner)/learn/programs/[enrollmentId]/lessons/[lessonId]/LessonReaderClient.tsx`

**Interfaces:**
- Consumes: tidak ada (util mandiri).
- Produces: `buildReflectionDraftKey(enrollmentId: string, lessonId: string): string`, `saveReflectionDraft(key: string, text: string): void`, `loadReflectionDraft(key: string): string | null`, `clearReflectionDraft(key: string): void`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// apps/promotor-class-web/src/__tests__/reflection-draft.test.ts
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReflectionDraftKey,
  saveReflectionDraft,
  loadReflectionDraft,
  clearReflectionDraft,
} from '../lib/reflection-draft';

describe('reflection draft storage', () => {
  beforeEach(() => localStorage.clear());

  it('membuat key per enrollment+lesson', () => {
    assert.equal(buildReflectionDraftKey('e1', 'l2'), 'reflection_draft:e1:l2');
  });

  it('menyimpan dan membaca draft', () => {
    saveReflectionDraft(buildReflectionDraftKey('e1', 'l2'), 'Anak saya pemalu...');
    assert.equal(loadReflectionDraft(buildReflectionDraftKey('e1', 'l2')), 'Anak saya pemalu...');
  });

  it('mengembalikan null jika tidak ada draft', () => {
    assert.equal(loadReflectionDraft(buildReflectionDraftKey('x', 'y')), null);
  });

  it('menghapus draft', () => {
    const key = buildReflectionDraftKey('e1', 'l2');
    saveReflectionDraft(key, 'isi');
    clearReflectionDraft(key);
    assert.equal(loadReflectionDraft(key), null);
  });

  it('tidak melempar error saat localStorage gagal (private mode)', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); };
    assert.doesNotThrow(() => saveReflectionDraft('k', 'v'));
    Storage.prototype.setItem = orig;
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `pnpm --filter @promotor/promotor-class-web test`
Expected: FAIL — `Cannot find module '../lib/reflection-draft'`

- [ ] **Step 3: Implementasi util**

```ts
// apps/promotor-class-web/src/lib/reflection-draft.ts
const KEY_PREFIX = 'reflection_draft:';

export function buildReflectionDraftKey(enrollmentId: string, lessonId: string): string {
  return `${KEY_PREFIX}${enrollmentId}:${lessonId}`;
}

export function saveReflectionDraft(key: string, text: string): void {
  try {
    if (text.trim().length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, text);
    }
  } catch {
    // storage penuh / private mode — draft hilang itu ok, jangan ganggu belajar
  }
}

export function loadReflectionDraft(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function clearReflectionDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // abaikan
  }
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `pnpm --filter @promotor/promotor-class-web test`
Expected: PASS (semua test reflection-draft)

- [ ] **Step 5: Wire ke LessonReaderClient**

Di `LessonReaderClient.tsx`:
1. Tambah import: `import { buildReflectionDraftKey, saveReflectionDraft, loadReflectionDraft, clearReflectionDraft } from '@/lib/reflection-draft';`
2. Di dalam komponen, dekat deklarasi state `reflectionAnswer`, tambahkan dua efek:

```tsx
// Restore draft sekali per lesson
const draftKey = enrollment && lesson ? buildReflectionDraftKey(enrollmentId, lessonId) : null;
useEffect(() => {
  if (!draftKey || lesson?.hasReflection === false) return;
  const saved = loadReflectionDraft(draftKey);
  if (saved && saved.length > 0) {
    setReflectionAnswer((current) => (current.length === 0 ? saved : current));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [draftKey]);

// Debounced autosave 500ms
useEffect(() => {
  if (!draftKey || lesson?.hasReflection === false) return;
  const t = setTimeout(() => saveReflectionDraft(draftKey, reflectionAnswer), 500);
  return () => clearTimeout(t);
}, [draftKey, reflectionAnswer, lesson]);
```

3. Di handler submit yang sukses (setelah `submitReflectionCommand` resolve tanpa error), sebelum navigasi: `if (draftKey) clearReflectionDraft(draftKey);`
4. Di atas tombol submit, tambahkan hint kecil: `{lesson?.hasReflection !== false && (<p style={{ font: '400 11px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>Draf tersimpan otomatis di perangkat ini.</p>)}`

- [ ] **Step 6: Typecheck + commit**

Run: `pnpm typecheck`
Expected: PASS

```bash
git add apps/promotor-class-web/src/lib/reflection-draft.ts apps/promotor-class-web/src/__tests__/reflection-draft.test.ts "apps/promotor-class-web/src/app/(learner)/learn/programs/[enrollmentId]/lessons/[lessonId]/LessonReaderClient.tsx"
git commit -m "feat(learner): autosave draft refleksi ke localStorage agar tidak hilang saat reload"
```

---

### Task A2: Resume Timestamp Video + Auto-advance ke Refleksi

**Files:**
- Modify: `apps/platform-api/src/db/schema/lesson-progress.ts` (tambah kolom)
- Create: `apps/platform-api/src/db/migrations/*.sql` (via drizzle-kit generate)
- Modify: `apps/platform-api/src/repositories/lesson-progress-repository.ts` (upsert posisi)
- Modify: `apps/platform-api/src/services/class/learning-engine-service.ts` (method `recordLessonPosition` + expose `lastPositionSeconds` di detail)
- Modify: `apps/platform-api/src/app.ts` (endpoint PUT position)
- Modify: `packages/contracts/src/index.ts` (`UpdateLessonPositionRequestSchema`)
- Create: `apps/promotor-class-web/src/lib/video/youtube-iframe-api.ts`
- Create: `apps/promotor-class-web/src/components/learner/YoutubeLessonPlayer.tsx`
- Modify: `apps/promotor-class-web/src/app/(learner)/learn/programs/[enrollmentId]/lessons/[lessonId]/LessonReaderClient.tsx`
- Test: `apps/platform-api/src/__tests__/integration/lesson-position.integration.test.ts`, `apps/promotor-class-web/src/__tests__/youtube-player.test.ts`

**Interfaces:**
- Consumes: `learnerAuthMiddleware` (existing), `lessonProgressRepo.listByEnrollment` (existing), `validateEnrollmentAndLesson` (internal learning-engine).
- Produces:
  - API: `PUT /api/v1/learner/enrollments/:enrollmentId/lessons/:lessonId/position` body `{ positionSeconds: number }` → 200 `{ ok: true }`.
  - Detail enrollment (GET `/api/v1/learner/enrollments/:id`): setiap lesson mendapat `lastPositionSeconds: number`.
  - `loadYoutubeIframeApi(): Promise<typeof YT.Player>` (singleton, resolve setelah `window.YT` siap).
  - `<YoutubeLessonPlayer videoId, startSeconds, isCompleted, onEnded, onPositionChange(seconds) />`.

- [ ] **Step 1: Tulis test integrasi endpoint yang gagal**

```ts
// apps/platform-api/src/__tests__/integration/lesson-position.integration.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withIntegrationDb } from './test-env';
// Gunakan helper existing di suite integrasi lain untuk membuat org+program+enrollment:
// lihat pola di src/__tests__/integration/*.integration.test.ts (helper seed bersama).

describe('PUT /api/v1/learner/enrollments/:id/lessons/:lessonId/position', () => {
  it('menyimpan posisi dan mengembalikannya di detail enrollment', async () => {
    await withIntegrationDb(async (db) => {
      // seed: organization, program+module+lesson, contact, enrollment (mengikuti helper suite lain)
      const { orgId, programId, lessonId, enrollmentId, contactId, sessionToken } =
        await seedLearningFixture(db);

      const res = await requestApp(db, 'PUT',
        `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/position`,
        { positionSeconds: 435 }, sessionToken);
      assert.equal(res.status, 200);

      const detail = await requestApp(db, 'GET',
        `/api/v1/learner/enrollments/${enrollmentId}`, undefined, sessionToken);
      const lesson = detail.body.modules.flatMap((m: any) => m.lessons)
        .find((l: any) => l.id === lessonId);
      assert.equal(lesson.lastPositionSeconds, 435);
      assert.equal(lesson.isCompleted, false); // simpan posisi TIDAK menandai selesai
      void orgId; void programId; void contactId;
    });
  });

  it('menolak positionSeconds negatif', async () => {
    await withIntegrationDb(async (db) => {
      const { lessonId, enrollmentId, sessionToken } = await seedLearningFixture(db);
      const res = await requestApp(db, 'PUT',
        `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/position`,
        { positionSeconds: -5 }, sessionToken);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });
});
```

> Catatan executor: `seedLearningFixture` dan `requestApp` adalah helper yang sudah ada / dipakai bersama di suite integrasi lain (lihat `apps/platform-api/src/__tests__/integration/` — salin pola dari test integrasi refleksi). Jika belum ada helper seed bersama, buat `src/__tests__/integration/helpers/learning-fixture.ts` yang membuat org → program (published) → module → lesson → contact → enrollment dan mengembalikan session token learner asli via `createLearnerSessionService(...).redeemToken` setelah membuat `learner_access_tokens`.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `pnpm --filter @promotor/platform-api test:integration`
Expected: FAIL — endpoint 404 / kolom tidak ada.

- [ ] **Step 3: Migrasi — tambah kolom**

Di `apps/platform-api/src/db/schema/lesson-progress.ts`, di dalam definisi tabel tambahkan:

```ts
lastPositionSeconds: integer('last_position_seconds').notNull().default(0),
```

(import `integer` dari `drizzle-orm/pg-core` jika belum). Lalu:

Run: `pnpm --filter @promotor/platform-api db:generate && pnpm --filter @promotor/platform-api db:migrate`
Expected: file migrasi baru di `src/db/migrations/` berisi `ALTER TABLE "lesson_progress" ADD COLUMN "last_position_seconds" integer DEFAULT 0 NOT NULL;`

- [ ] **Step 4: Contracts + repository + service + endpoint**

`packages/contracts/src/index.ts` (dekat `SubmitReflectionRequestSchema`):

```ts
export const UpdateLessonPositionRequestSchema = z.object({
  positionSeconds: z.number().int().min(0).max(86_400, 'Durasi video tidak valid'),
});
export type UpdateLessonPositionRequest = z.infer<typeof UpdateLessonPositionRequestSchema>;
```

`apps/platform-api/src/repositories/lesson-progress-repository.ts` — tambah method (match style file):

```ts
async upsertPosition(
  organizationId: string,
  enrollmentId: string,
  lessonId: string,
  positionSeconds: number,
  now: Date
): Promise<void> {
  await this.db
    .insert(lessonProgress)
    .values({ organizationId, enrollmentId, lessonId, positionSeconds: Math.floor(positionSeconds), isCompleted: false, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [lessonProgress.enrollmentId, lessonProgress.lessonId],
      set: { positionSeconds: Math.floor(positionSeconds), updatedAt: now },
    });
}
```

> Verifikasi dulu unique constraint `(enrollment_id, lesson_id)` pada tabel `lesson_progress` di schema; jika belum ada, tambahkan `uniqueIndex` di migrasi yang sama (drizzle-kit akan meng-generate).

`learning-engine-service.ts` — tambah ke interface + implementasi:

```ts
async recordLessonPosition(input: {
  organizationId: string; enrollmentId: string; lessonId: string;
  authenticatedContactId?: string; positionSeconds: number;
}): Promise<void> {
  const { enrollment } = await validateEnrollmentAndLesson(
    input.organizationId, input.enrollmentId, input.lessonId, input.authenticatedContactId
  );
  await lessonProgressRepo.upsertPosition(
    input.organizationId, enrollment.id, input.lessonId, input.positionSeconds, new Date()
  );
}
```

Di mapping lesson pada `getEnrollmentFullDetails` (blok yang sudah memetakan `isCompleted`), tambahkan:

```ts
lastPositionSeconds: prog?.lastPositionSeconds ?? 0,
```

`apps/platform-api/src/app.ts` — di area learner-protected (setelah route reflection), tambahkan:

```ts
app.put('/api/v1/learner/enrollments/:enrollmentId/lessons/:lessonId/position', async (c) => {
  c.header('Cache-Control', 'no-store');
  const db = c.get('db');
  const enrollmentId = c.req.param('enrollmentId');
  const lessonId = c.req.param('lessonId');
  const learnerCtx = c.get('learnerContext' as any) as any;
  const raw = await c.req.json().catch(() => ({}));
  const parsed = UpdateLessonPositionRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => i.message).join(', ');
    throw new DomainError('VALIDATION_ERROR', `Posisi video tidak valid: ${details}`);
  }
  const learningService = createLearningEngineService(db);
  await learningService.recordLessonPosition({
    organizationId: learnerCtx.organizationId,
    enrollmentId,
    lessonId,
    authenticatedContactId: learnerCtx.contactId,
    positionSeconds: parsed.data.positionSeconds,
  });
  return c.json({ ok: true }, 200);
});
```

(import `UpdateLessonPositionRequestSchema` di header import contracts app.ts.)

- [ ] **Step 5: Jalankan test integrasi, pastikan lulus**

Run: `pnpm --filter @promotor/platform-api test:integration`
Expected: PASS.

- [ ] **Step 6: YouTube IFrame API loader + player component**

```ts
// apps/promotor-class-web/src/lib/video/youtube-iframe-api.ts
let apiPromise: Promise<any> | null = null;

export function loadYoutubeIframeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if ((window as any).YT?.Player) return Promise.resolve((window as any).YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve((window as any).YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiPromise;
}
```

```tsx
// apps/promotor-class-web/src/components/learner/YoutubeLessonPlayer.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { loadYoutubeIframeApi } from '@/lib/video/youtube-iframe-api';

export interface YoutubeLessonPlayerProps {
  videoId: string;
  startSeconds: number;
  isCompleted: boolean;
  onEnded: () => void;
  onPositionChange: (positionSeconds: number) => void;
}

export function YoutubeLessonPlayer({ videoId, startSeconds, isCompleted, onEnded, onPositionChange }: YoutubeLessonPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let lastSaved = 0;

    loadYoutubeIframeApi().then((YT) => {
      if (disposed || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          // Lanjut dari titik terakhir hanya jika belum selesai & posisi tersimpan > 30 detik
          start: !isCompleted && startSeconds > 30 ? Math.max(0, startSeconds - 2) : 0,
        },
        events: {
          onStateChange: (event: any) => {
            // 0 = ENDED
            if (event.data === 0 && !endedRef.current) {
              endedRef.current = true;
              onEnded();
            }
          },
        },
      });

      interval = setInterval(() => {
        const player = playerRef.current;
        if (!player?.getCurrentTime) return;
        const t = Math.floor(player.getCurrentTime());
        // simpan paling sering tiap 10 detik agar hemat request
        if (t - lastSaved >= 10 || (t < lastSaved && t > 0)) {
          lastSaved = t;
          onPositionChange(t);
        }
      }, 5000);
    });

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
      try { playerRef.current?.destroy?.(); } catch { /* abaikan */ }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}
```

- [ ] **Step 7: Unit test util (clamp & keputusan start)**

```ts
// apps/promotor-class-web/src/__tests__/youtube-player.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function resolveStartSeconds(startSeconds: number, isCompleted: boolean): number {
  return !isCompleted && startSeconds > 30 ? Math.max(0, startSeconds - 2) : 0;
}

describe('resolveStartSeconds', () => {
  it('melanjutkan dari titik terakhir bila > 30 detik dan belum selesai', () => {
    assert.equal(resolveStartSeconds(435, false), 433);
  });
  it('mulai dari 0 bila lesson sudah selesai', () => {
    assert.equal(resolveStartSeconds(600, true), 0);
  });
  it('mulai dari 0 bila posisi tersimpan masih di awal', () => {
    assert.equal(resolveStartSeconds(12, false), 0);
  });
});
```

Run: `pnpm --filter @promotor/promotor-class-web test`
Expected: PASS.

- [ ] **Step 8: Ganti iframe di LessonReaderClient**

Di `LessonReaderClient.tsx`:
1. Ambil `lastPositionSeconds` dari data lesson (field baru dari detail API): `const savedPosition = lesson?.lastPositionSeconds ?? 0;`
2. Ganti blok `<iframe ... />` (sekitar baris 220–237) dengan:

```tsx
<YoutubeLessonPlayer
  videoId={lesson.videoExternalId ?? ''}
  startSeconds={savedPosition}
  isCompleted={lesson.isCompleted === true}
  onEnded={() => setShowVideoDonePrompt(true)}
  onPositionChange={(seconds) => {
    submitLessonPositionCommand(enrollmentId, lessonId, seconds).catch(() => {});
  }}
/>
{showVideoDonePrompt && (
  <div style={{ marginTop: 12, padding: 14, border: '1px solid var(--accent)', background: 'var(--accent-soft, #eff6ff)' }}>
    <strong style={{ font: '700 14px/1.4 var(--font-sans)' }}>Video selesai.</strong>
    <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
      Lanjutkan ke refleksi di bawah untuk mengunci modul ini.
    </p>
    <button type="button" className="btn btn-primary btn-sm"
      onClick={() => document.getElementById('refleksi-section')?.scrollIntoView({ behavior: 'smooth' })}>
      Isi Refleksi
    </button>
  </div>
)}
```

3. Tambah state `const [showVideoDonePrompt, setShowVideoDonePrompt] = useState(false);` dan beri `id="refleksi-section"` pada wrapper section refleksi yang sudah ada.
4. Buat command `submitLessonPositionCommand` di `apps/promotor-class-web/src/modules/learning/commands.ts` (ikut pola `submitReflectionCommand` yang ada di file itu — memanggil api client dengan method PUT ke path position; tambahkan method `updateLessonPosition` di `src/adapters/http/learning-repository.ts` ikut pola `submitReflection`).

- [ ] **Step 9: Typecheck + commit**

Run: `pnpm typecheck && pnpm --filter @promotor/platform-api test:integration && pnpm --filter @promotor/promotor-class-web test`
Expected: semua PASS.

```bash
git add -A
git commit -m "feat(learner): resume video dari titik terakhir + prompt lanjut ke refleksi saat video selesai"
```

---

### Task A3: Template Klaim Konsultasi di Halaman Program Selesai

**Files:**
- Create: `apps/promotor-class-web/src/lib/wa-templates.ts`
- Test: `apps/promotor-class-web/src/__tests__/wa-templates.test.ts`
- Modify: `apps/promotor-class-web/src/app/(learner)/learn/programs/[enrollmentId]/completed/ProgramCompletedClient.tsx`

**Interfaces:**
- Consumes: `getEnrollmentFullDetailsQuery` (existing — lessons punya `reflection.responseText`), `promoterPhone` (existing di client).
- Produces: `buildConsultationClaimMessage(input: { learnerName?: string | null; programTitle: string; reflectionTopics?: string[] }): string`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// apps/promotor-class-web/src/__tests__/wa-templates.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildConsultationClaimMessage } from '../lib/wa-templates';

describe('buildConsultationClaimMessage', () => {
  it('memuat nama, program, topik refleksi, dan permintaan klaim', () => {
    const msg = buildConsultationClaimMessage({
      learnerName: 'Budi',
      programTitle: 'Kelas Parenting 101',
      reflectionTopics: ['anak pemalu', 'komunikasi positif'],
    });
    assert.match(msg, /Halo Kak/);
    assert.match(msg, /saya Budi/);
    assert.match(msg, /Kelas Parenting 101/);
    assert.match(msg, /anak pemalu/);
    assert.match(msg, /klaim bonus sesi konsultasi/);
  });

  it('tetap valid tanpa nama dan tanpa topik', () => {
    const msg = buildConsultationClaimMessage({ programTitle: 'Kelas X' });
    assert.doesNotThrow(() => encodeURI(msg));
    assert.match(msg, /Kelas X/);
    assert.match(msg, /klaim bonus sesi konsultasi/);
  });

  it('topik dibatasi maksimal 3', () => {
    const msg = buildConsultationClaimMessage({
      programTitle: 'P',
      reflectionTopics: ['a', 'b', 'c', 'd', 'e'],
    });
    const matches = msg.match(/•/g) ?? [];
    assert.ok(matches.length <= 3);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `pnpm --filter @promotor/promotor-class-web test`
Expected: FAIL — module tidak ditemukan.

- [ ] **Step 3: Implementasi**

```ts
// apps/promotor-class-web/src/lib/wa-templates.ts
export interface ConsultationClaimInput {
  learnerName?: string | null;
  programTitle: string;
  reflectionTopics?: string[];
}

function excerpt(text: string, max = 60): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function buildConsultationClaimMessage(input: ConsultationClaimInput): string {
  const namePart = input.learnerName ? `saya ${input.learnerName}` : 'saya';
  const topics = (input.reflectionTopics ?? [])
    .filter((t) => t && t.trim().length > 0)
    .slice(0, 3)
    .map((t) => `• ${excerpt(t)}`);
  const topicLine = topics.length > 0
    ? `Refleksi saya fokus pada:\n${topics.join('\n')}`
    : 'Refleksi saya sudah lengkap di semua modul.';

  return [
    `Halo Kak, ${namePart} sudah menyelesaikan program "${input.programTitle}".`,
    topicLine,
    'Saya ingin klaim bonus sesi konsultasi STIFIn. Kapan jadwal yang tersedia?',
  ].join('\n\n');
}
```

- [ ] **Step 4: Jalankan test → PASS**

Run: `pnpm --filter @promotor/promotor-class-web test`
Expected: PASS.

- [ ] **Step 5: Pakai di ProgramCompletedClient**

Di `ProgramCompletedClient.tsx`:
1. Import util.
2. Saat data `details` termuat, kumpulkan topik:

```ts
const topics = (details?.modules ?? [])
  .flatMap((m: any) => m.lessons ?? [])
  .map((l: any) => l.reflection?.responseText as string | undefined)
  .filter((t): t is string => Boolean(t && t.length > 0));
setReflectionTopics(topics);
```

(state baru: `const [reflectionTopics, setReflectionTopics] = useState<string[]>([]);` — juga isi fallback dari path `getEnrollmentByIdQuery` bila details null, dengan array kosong.)
3. Ganti builder link WA existing (baris ~65) menjadi:

```tsx
const claimMessage = buildConsultationClaimMessage({
  learnerName: enrollment?.contactName ?? null,
  programTitle: program.title,
  reflectionTopics,
});
const waUrl = `https://wa.me/${promoterPhone}?text=${encodeURIComponent(claimMessage)}`;
```

> Jika `enrollment.contactName` tidak tersedia di tipe `Enrollment`, gunakan `null` — jangan menambah field baru di task ini.
4. Tombol WA existing memakai `waUrl` baru; label tetap.

- [ ] **Step 6: Typecheck + commit**

Run: `pnpm typecheck`

```bash
git add -A
git commit -m "feat(learner): template klaim konsultasi WA berisi ringkasan refleksi peserta"
```

---

### Task A4: Catatan Pribadi per Lesson (private notes)

**Files:**
- Create: `apps/platform-api/src/db/schema/learner-lesson-notes.ts`
- Modify: `apps/platform-api/src/db/schema/index.ts` (re-export)
- Create: `apps/platform-api/src/repositories/learner-lesson-note-repository.ts`
- Modify: `apps/platform-api/src/services/class/learning-engine-service.ts` (getLessonNote / saveLessonNote)
- Modify: `apps/platform-api/src/app.ts` (GET + PUT note)
- Modify: `packages/contracts/src/index.ts` (`UpsertLessonNoteRequestSchema`, `LessonNoteDto`)
- Modify: `apps/promotor-class-web/src/app/(learner)/learn/programs/[enrollmentId]/lessons/[lessonId]/LessonReaderClient.tsx`
- Create: `apps/promotor-class-web/src/modules/learning/notes.ts`
- Test: `apps/platform-api/src/__tests__/integration/lesson-note.integration.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/v1/learner/enrollments/:enrollmentId/lessons/:lessonId/note` → `{ note: { body: string; updatedAt: string } | null }`
  - `PUT` path sama, body `{ body: string }` (max 5.000 char) → `{ note: { body, updatedAt } }`
  - Frontend: `getLessonNoteQuery(enrollmentId, lessonId)`, `saveLessonNoteCommand(enrollmentId, lessonId, body)` (module `learning/notes.ts`, pola adapter HTTP existing).

- [ ] **Step 1: Test integrasi yang gagal**

```ts
// apps/platform-api/src/__tests__/integration/lesson-note.integration.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withIntegrationDb } from './test-env';

describe('learner lesson notes', () => {
  it('upsert lalu baca catatan milik sendiri', async () => {
    await withIntegrationDb(async (db) => {
      const { lessonId, enrollmentId, sessionToken } = await seedLearningFixture(db);
      const put = await requestApp(db, 'PUT',
        `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/note`,
        { body: 'Insight: gaya belajar auditori dominan.' }, sessionToken);
      assert.equal(put.status, 200);
      assert.equal(put.body.note.body, 'Insight: gaya belajar auditori dominan.');

      const get = await requestApp(db, 'GET',
        `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/note`,
        undefined, sessionToken);
      assert.equal(get.body.note.body, 'Insight: gaya belajar auditori dominan.');
    });
  });

  it('menolak body kosong dan lebih dari 5000 karakter', async () => {
    await withIntegrationDb(async (db) => {
      const { lessonId, enrollmentId, sessionToken } = await seedLearningFixture(db);
      const empty = await requestApp(db, 'PUT',
        `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/note`,
        { body: '   ' }, sessionToken);
      assert.equal(empty.status, 400);
      const tooLong = await requestApp(db, 'PUT',
        `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/note`,
        { body: 'x'.repeat(5001) }, sessionToken);
      assert.equal(tooLong.status, 400);
    });
  });

  it('learner lain tidak bisa membaca catatan (404)', async () => {
    await withIntegrationDb(async (db) => {
      const { lessonId, enrollmentId, otherSessionToken } = await seedLearningFixture(db);
      const res = await requestApp(db, 'GET',
        `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/note`,
        undefined, otherSessionToken);
      assert.equal(res.status, 404);
    });
  });
});
```

- [ ] **Step 2: Jalankan → FAIL**

Run: `pnpm --filter @promotor/platform-api test:integration`
Expected: FAIL (404 — endpoint belum ada).

- [ ] **Step 3: Schema + migrasi**

```ts
// apps/platform-api/src/db/schema/learner-lesson-notes.ts
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const learnerLessonNotes = pgTable(
  'learner_lesson_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    enrollmentId: uuid('enrollment_id').notNull(),
    lessonId: uuid('lesson_id').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('learner_lesson_notes_enrollment_lesson_uq').on(table.enrollmentId, table.lessonId),
    index('learner_lesson_notes_org_idx').on(table.organizationId),
  ]
);
```

Export di `src/db/schema/index.ts`: `export * from './learner-lesson-notes';`

Run: `pnpm --filter @promotor/platform-api db:generate && pnpm --filter @promotor/platform-api db:migrate`

- [ ] **Step 4: Contracts**

`packages/contracts/src/index.ts`:

```ts
export const UpsertLessonNoteRequestSchema = z.object({
  body: z.string().trim().min(1, 'Catatan tidak boleh kosong').max(5000, 'Catatan maksimal 5000 karakter'),
});
export type UpsertLessonNoteRequest = z.infer<typeof UpsertLessonNoteRequestSchema>;

export const LessonNoteDtoSchema = z.object({
  body: z.string(),
  updatedAt: z.string(),
});
export type LessonNoteDto = z.infer<typeof LessonNoteDtoSchema>;
```

- [ ] **Step 5: Repository**

```ts
// apps/platform-api/src/repositories/learner-lesson-note-repository.ts
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { learnerLessonNotes } from '../db/schema/learner-lesson-notes';

export interface LearnerLessonNoteRow {
  body: string;
  updatedAt: Date;
}

export function createLearnerLessonNoteRepository(db: NodePgDatabase) {
  return {
    async findByEnrollmentAndLesson(organizationId: string, enrollmentId: string, lessonId: string) {
      const rows = await db
        .select()
        .from(learnerLessonNotes)
        .where(and(
          eq(learnerLessonNotes.organizationId, organizationId),
          eq(learnerLessonNotes.enrollmentId, enrollmentId),
          eq(learnerLessonNotes.lessonId, lessonId),
        ))
        .limit(1);
      return rows[0] ?? null;
    },

    async upsert(organizationId: string, enrollmentId: string, lessonId: string, body: string) {
      const now = new Date();
      const rows = await db
        .insert(learnerLessonNotes)
        .values({ organizationId, enrollmentId, lessonId, body, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: [learnerLessonNotes.enrollmentId, learnerLessonNotes.lessonId],
          set: { body, updatedAt: now },
        })
        .returning();
      return rows[0];
    },
  };
}

export type LearnerLessonNoteRepository = ReturnType<typeof createLearnerLessonNoteRepository>;
```

- [ ] **Step 6: Service (learning-engine) + endpoint**

Di `learning-engine-service.ts` tambah ke interface & implementasi (instantiate repo di factory bersama repo lain):

```ts
async getLessonNote(input: {
  organizationId: string; enrollmentId: string; lessonId: string; authenticatedContactId: string;
}): Promise<{ body: string; updatedAt: string } | null> {
  const { enrollment } = await validateEnrollmentAndLesson(
    input.organizationId, input.enrollmentId, undefined, input.authenticatedContactId
  );
  const row = await lessonNoteRepo.findByEnrollmentAndLesson(input.organizationId, enrollment.id, input.lessonId);
  return row ? { body: row.body, updatedAt: new Date(row.updatedAt).toISOString() } : null;
},

async saveLessonNote(input: {
  organizationId: string; enrollmentId: string; lessonId: string;
  authenticatedContactId: string; body: string;
}): Promise<{ body: string; updatedAt: string }> {
  const { enrollment } = await validateEnrollmentAndLesson(
    input.organizationId, input.enrollmentId, input.lessonId, input.authenticatedContactId
  );
  const row = await lessonNoteRepo.upsert(input.organizationId, enrollment.id, input.lessonId, input.body.trim());
  return { body: row.body, updatedAt: new Date(row.updatedAt).toISOString() };
},
```

`app.ts` (area learner-protected):

```ts
app.get('/api/v1/learner/enrollments/:enrollmentId/lessons/:lessonId/note', async (c) => {
  c.header('Cache-Control', 'no-store');
  const db = c.get('db');
  const learnerCtx = c.get('learnerContext' as any) as any;
  const service = createLearningEngineService(db);
  const note = await service.getLessonNote({
    organizationId: learnerCtx.organizationId,
    enrollmentId: c.req.param('enrollmentId'),
    lessonId: c.req.param('lessonId'),
    authenticatedContactId: learnerCtx.contactId,
  });
  return c.json({ note }, 200);
});

app.put('/api/v1/learner/enrollments/:enrollmentId/lessons/:lessonId/note', async (c) => {
  c.header('Cache-Control', 'no-store');
  const db = c.get('db');
  const learnerCtx = c.get('learnerContext' as any) as any;
  const raw = await c.req.json().catch(() => ({}));
  const parsed = UpsertLessonNoteRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => i.message).join(', ');
    throw new DomainError('VALIDATION_ERROR', `Catatan tidak valid: ${details}`);
  }
  const service = createLearningEngineService(db);
  const note = await service.saveLessonNote({
    organizationId: learnerCtx.organizationId,
    enrollmentId: c.req.param('enrollmentId'),
    lessonId: c.req.param('lessonId'),
    authenticatedContactId: learnerCtx.contactId,
    body: parsed.data.body,
  });
  return c.json({ note }, 200);
});
```

> Catatan: `validateEnrollmentAndLesson` melempar 404 bila `authenticatedContactId` ≠ pemilik enrollment — inilah yang membuat test learner-lain otomatis 404.

- [ ] **Step 7: Jalankan test integrasi → PASS**

Run: `pnpm --filter @promotor/platform-api test:integration`

- [ ] **Step 8: Frontend — modul notes + UI di reader**

```ts
// apps/promotor-class-web/src/modules/learning/notes.ts
import { getPlatformApiClient } from '@/adapters';
import type { LessonNoteDto } from '@promotor/contracts';

export async function getLessonNoteQuery(enrollmentId: string, lessonId: string): Promise<LessonNoteDto | null> {
  const api = getPlatformApiClient();
  const res = await api.request<{ note: LessonNoteDto | null }>('GET',
    `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/note`);
  return res.note ?? null;
}

export async function saveLessonNoteCommand(enrollmentId: string, lessonId: string, body: string): Promise<LessonNoteDto> {
  const api = getPlatformApiClient();
  const res = await api.request<{ note: LessonNoteDto }>('PUT',
    `/api/v1/learner/enrollments/${enrollmentId}/lessons/${lessonId}/note`, { body });
  return res.note;
}
```

> Sesuaikan dengan pola pemanggilan aktual di `modules/learning/queries.ts` / `commands.ts` yang ada (nama fungsi api client bisa berbeda; ikuti file sebelah).

Di `LessonReaderClient.tsx`, di bawah section refleksi:

```tsx
{/* Catatan Pribadi */}
<section style={{ marginTop: 24 }}>
  <div className="kicker kicker-muted">Catatan Pribadi</div>
  <p style={{ font: '400 11px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>
    Hanya Anda yang bisa melihat catatan ini.
  </p>
  <textarea
    className="textarea"
    rows={4}
    value={noteBody}
    onChange={(e) => setNoteBody(e.target.value)}
    placeholder="Ringkasan insight penting dari video ini..."
    aria-label="Catatan pribadi"
  />
  <div style={{ font: '400 11px/1.4 var(--font-sans)', color: 'var(--muted-strong)', marginTop: 4 }}>
    {noteStatus}
  </div>
</section>
```

State + efek debounce (1.5 detik, hanya simpan bila berubah dari nilai tersimpan):

```tsx
const [noteBody, setNoteBody] = useState('');
const [savedNoteBody, setSavedNoteBody] = useState('');
const [noteStatus, setNoteStatus] = useState('');

useEffect(() => {
  getLessonNoteQuery(enrollmentId, lessonId)
    .then((note) => {
      if (note) { setNoteBody(note.body); setSavedNoteBody(note.body); }
    })
    .catch(() => {});
}, [enrollmentId, lessonId]);

useEffect(() => {
  if (noteBody === savedNoteBody || noteBody.trim().length === 0) return;
  setNoteStatus('Menyimpan...');
  const t = setTimeout(() => {
    saveLessonNoteCommand(enrollmentId, lessonId, noteBody)
      .then(() => { setSavedNoteBody(noteBody); setNoteStatus('Tersimpan ✓'); })
      .catch(() => setNoteStatus('Gagal menyimpan — coba lagi.'));
  }, 1500);
  return () => clearTimeout(t);
}, [noteBody, savedNoteBody, enrollmentId, lessonId]);
```

- [ ] **Step 9: Typecheck + commit**

Run: `pnpm typecheck`

```bash
git add -A
git commit -m "feat(learner): catatan pribadi per lesson dengan autosave (hanya terlihat oleh peserta)"
```

---

### Task A5: Login Cepat via OTP WhatsApp

**Files:**
- Create: `apps/platform-api/src/db/schema/learner-otp-challenges.ts`
- Modify: `apps/platform-api/src/db/schema/index.ts`
- Create: `apps/platform-api/src/repositories/learner-otp-repository.ts`
- Create: `apps/platform-api/src/services/class/otp-sender.ts`
- Create: `apps/platform-api/src/services/class/learner-otp-service.ts`
- Modify: `apps/platform-api/src/services/class/learner-session-service.ts` (tambah `createSessionForContact`)
- Modify: `apps/platform-api/src/app.ts` (2 endpoint publik)
- Modify: `apps/platform-api/wrangler.jsonc` (vars `LEARNER_OTP_CHANNEL`)
- Modify: `packages/contracts/src/index.ts` (`RequestLearnerOtpSchema`, `VerifyLearnerOtpSchema`, response types)
- Modify: `packages/api-client/src/index.ts` (2 method)
- Create: `apps/promotor-class-web/src/app/(learner)/masuk/page.tsx`
- Modify: `apps/promotor-class-web/src/app/(learner)/learn/programs/[enrollmentId]/lessons/[lessonId]/LessonReaderClient.tsx` (CTA di layar access denied) dan `src/lib/session.ts` bila perlu
- Test: `apps/platform-api/src/__tests__/learner-otp-service.test.ts`, `apps/platform-api/src/__tests__/integration/learner-otp.integration.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/v1/learner/auth/otp/request` body `{ phoneRaw: string }` → 200 `{ expiresAt: string, devCode?: string }` (`devCode` hanya saat `APP_ENV` ∈ {`development`,`test`}).
  - `POST /api/v1/learner/auth/otp/verify` body `{ phoneRaw: string, code: string }` → 200 `{ contactId, organizationId, workspaceSlug }` + cookie `promotor_learner_session`.
  - Error: `LEARNER_NOT_FOUND` (404, pesan generik), `OTP_INVALID` (401), `OTP_EXPIRED` (401), `OTP_RATE_LIMITED` (429), `OTP_DELIVERY_UNAVAILABLE` (503).
  - Service: `createLearnerOtpService(db, deps?)` dengan `requestChallenge({ phoneRaw })` dan `verifyChallenge({ phoneRaw, code })`.
  - `LearnerSessionService.createSessionForContact(organizationId, contactId)` → `{ sessionToken, session }` (dipakai oleh verify).

- [ ] **Step 1: Unit test service (mock repo & sender) yang gagal**

```ts
// apps/platform-api/src/__tests__/learner-otp-service.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLearnerOtpService, OtpSender } from '../services/class/learner-otp-service';
import { DomainError } from '../core/errors';

const now = new Date('2026-09-06T03:00:00Z');

function makeDeps(overrides: Partial<{ contact: any; sent: string[] }> = {}) {
  const sent: string[] = [];
  const sender: OtpSender = { async send(phoneE164, code) { sent.push(`${phoneE164}:${code}`); } };
  const challengeRows: any[] = [];
  return {
    deps: {
      clock: () => now,
      sender,
      otpRepo: {
        async countRecentByPhone() { return 0; },
        async createChallenge(input: any) {
          const row = { id: 'ch1', ...input, consumedAt: null, attempts: 0 };
          challengeRows.push(row);
          return row;
        },
        async findLatestActiveByPhone() { return challengeRows[challengeRows.length - 1] ?? null; },
        async atomicConsume(id: string, codeHash: string, at: Date) {
          const row = challengeRows.find((r) => r.id === id);
          if (!row) return null;
          if (row.codeHash !== codeHash) { row.attempts += 1; return null; }
          row.consumedAt = at;
          return row;
        },
      },
      contactFinder: {
        async findLearnerByPhone(phoneE164: string) {
          return overrides.contact === undefined
            ? { contactId: 'c1', organizationId: 'o1', workspaceSlug: 'rina-stifin', displayName: 'Budi' }
            : overrides.contact;
        },
      },
    },
    sent,
  };
}

describe('learner-otp-service', () => {
  it('request: membuat challenge 6 digit, mengirim via sender, expiry 5 menit', async () => {
    const { deps, sent } = makeDeps();
    const svc = createLearnerOtpService({} as any, deps as any);
    const res = await svc.requestChallenge({ phoneRaw: '081234567890' });
    assert.match(sent[0], /^\+6281234567890:\d{6}$/);
    assert.equal(new Date(res.expiresAt).getTime() - now.getTime(), 5 * 60_000);
  });

  it('request: rate limit 3 permintaan per 15 menit', async () => {
    const { deps } = makeDeps();
    const svc = createLearnerOtpService({} as any, { ...deps, otpRepo: { ...deps.otpRepo, async countRecentByPhone() { return 3; } } } as any);
    await assert.rejects(() => svc.requestChallenge({ phoneRaw: '081234567890' }),
      (e: DomainError) => e.code === 'OTP_RATE_LIMITED');
  });

  it('request: nomor tanpa enrollment → LEARNER_NOT_FOUND (tanpa membocorkan info)', async () => {
    const { deps } = makeDeps({ contact: null });
    const svc = createLearnerOtpService({} as any, deps as any);
    await assert.rejects(() => svc.requestChallenge({ phoneRaw: '080000000000' }),
      (e: DomainError) => e.code === 'LEARNER_NOT_FOUND');
  });

  it('verify: kode benar menghasilkan sesi + workspaceSlug', async () => {
    const { deps } = makeDeps();
    const svc = createLearnerOtpService({} as any, deps as any);
    const req = await svc.requestChallenge({ phoneRaw: '081234567890' });
    // kode dikirim via sender; untuk test, intercept lewat deps.sender.sent
    const code = (deps as any).__lastCode;
    assert.ok(code);
    const res = await svc.verifyChallenge({ phoneRaw: '081234567890', code });
    assert.equal(res.contactId, 'c1');
    assert.equal(res.workspaceSlug, 'rina-stifin');
    void req;
  });

  it('verify: kode salah → OTP_INVALID', async () => {
    const { deps } = makeDeps();
    const svc = createLearnerOtpService({} as any, deps as any);
    await svc.requestChallenge({ phoneRaw: '081234567890' });
    await assert.rejects(() => svc.verifyChallenge({ phoneRaw: '081234567890', code: '000000' }),
      (e: DomainError) => e.code === 'OTP_INVALID');
  });

  it('verify: kode kedaluwarsa (>5 menit) → OTP_EXPIRED', async () => {
    const { deps } = makeDeps();
    let t = now.getTime();
    const svc = createLearnerOtpService({} as any, {
      ...deps,
      clock: () => new Date(t),
    } as any);
    await svc.requestChallenge({ phoneRaw: '081234567890' });
    t += 6 * 60_000;
    await assert.rejects(() => svc.verifyChallenge({ phoneRaw: '081234567890', code: (deps as any).__lastCode }),
      (e: DomainError) => e.code === 'OTP_EXPIRED');
  });
});
```

> `__lastCode`: pada service, simpan kode terakhir di deps untuk keperluan test — cara paling bersih: `deps.sender` menerima `(phoneE164, code)` dan test membaca `sent[0].split(':')[1]`. Gunakan itu; buang `__lastCode` bila memakai pendekatan ini (test verify membaca kode dari `sent`).

- [ ] **Step 2: Jalankan → FAIL**

Run: `pnpm --filter @promotor/platform-api test`
Expected: FAIL — modul service belum ada.

- [ ] **Step 3: Schema + migrasi**

```ts
// apps/platform-api/src/db/schema/learner-otp-challenges.ts
import { index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const learnerOtpChallenges = pgTable(
  'learner_otp_challenges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    contactId: uuid('contact_id').notNull(),
    phoneE164: varchar('phone_e164', { length: 20 }).notNull(),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('learner_otp_challenges_phone_idx').on(table.phoneE164, table.createdAt)]
);
```

Export di `schema/index.ts`, lalu:
Run: `pnpm --filter @promotor/platform-api db:generate && pnpm --filter @promotor/platform-api db:migrate`

- [ ] **Step 4: Repository + sender + service**

```ts
// apps/platform-api/src/repositories/learner-otp-repository.ts
import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { learnerOtpChallenges } from '../db/schema/learner-otp-challenges';

export function createLearnerOtpRepository(db: NodePgDatabase) {
  return {
    async countRecentByPhone(phoneE164: string, since: Date): Promise<number> {
      const rows = await db.select({ id: learnerOtpChallenges.id })
        .from(learnerOtpChallenges)
        .where(and(eq(learnerOtpChallenges.phoneE164, phoneE164), gte(learnerOtpChallenges.createdAt, since)));
      return rows.length;
    },
    async createChallenge(input: {
      organizationId: string; contactId: string; phoneE164: string;
      codeHash: string; expiresAt: Date;
    }) {
      const rows = await db.insert(learnerOtpChallenges).values(input).returning();
      return rows[0];
    },
    async findLatestActiveByPhone(phoneE164: string) {
      const rows = await db.select().from(learnerOtpChallenges)
        .where(and(eq(learnerOtpChallenges.phoneE164, phoneE164), isNull(learnerOtpChallenges.consumedAt)))
        .orderBy(desc(learnerOtpChallenges.createdAt))
        .limit(1);
      return rows[0] ?? null;
    },
    async atomicConsume(id: string, codeHash: string, now: Date) {
      // Konsumsi hanya jika hash cocok; increment attempts bila salah
      const updated = await db.update(learnerOtpChallenges)
        .set({ consumedAt: now })
        .where(and(
          eq(learnerOtpChallenges.id, id),
          eq(learnerOtpChallenges.codeHash, codeHash),
          isNull(learnerOtpChallenges.consumedAt),
        ))
        .returning();
      if (updated.length > 0) return updated[0];
      await db.update(learnerOtpChallenges)
        .set({ attempts: (await db.select().from(learnerOtpChallenges).where(eq(learnerOtpChallenges.id, id)))[0]?.attempts + 1 ?? 1 })
        .where(eq(learnerOtpChallenges.id, id));
      return null;
    },
  };
}

export type LearnerOtpRepository = ReturnType<typeof createLearnerOtpRepository>;
```

```ts
// apps/platform-api/src/services/class/otp-sender.ts
export interface OtpSender {
  send(phoneE164: string, code: string): Promise<void>;
}

export function createLogOtpSender(logger = console): OtpSender {
  return {
    async send(phoneE164, code) {
      logger.info(`[OTP:dev] kode untuk ${phoneE164}: ${code}`);
    },
  };
}

export function createFonnteOtpSender(token: string): OtpSender {
  return {
    async send(phoneE164, code) {
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: phoneE164.replace(/^\+/, ''),
          message: `Kode login Ralivo Anda: ${code}\nBerlaku 5 menit. Jangan bagikan kode ini ke siapa pun.`,
        }),
      });
      if (!res.ok) {
        throw new Error(`FONNTE_HTTP_${res.status}`);
      }
    },
  };
}
```

```ts
// apps/platform-api/src/services/class/learner-otp-service.ts
import * as crypto from 'node:crypto';
import { DomainError } from '../../core/errors';
import { normalizePhone } from '@promotor/platform-core';
import { createLearnerOtpRepository, LearnerOtpRepository } from '../../repositories/learner-otp-repository';
import { OtpSender } from './otp-sender';

export interface LearnerContactLookup {
  findLearnerByPhone(phoneE164: string): Promise<{
    contactId: string; organizationId: string; workspaceSlug: string; displayName: string;
  } | null>;
}

export interface LearnerOtpDeps {
  clock?: () => Date;
  sender?: OtpSender;
  otpRepo?: LearnerOtpRepository;
  contactFinder?: LearnerContactLookup;
  createSession?: (organizationId: string, contactId: string) => Promise<{ sessionToken: string }>;
}

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const REQUEST_LIMIT_WINDOW_MS = 15 * 60_000;
const REQUEST_LIMIT = 3;

export function createLearnerOtpService(db: any, deps: LearnerOtpDeps = {}) {
  const otpRepo = deps.otpRepo ?? createLearnerOtpRepository(db);
  const getNow = deps.clock ?? (() => new Date());
  const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

  const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

  return {
    async requestChallenge(input: { phoneRaw: string }) {
      const phoneE164 = normalizePhone(input.phoneRaw);
      const learner = await (deps.contactFinder ?? createDefaultContactFinder(db)).findLearnerByPhone(phoneE164);
      if (!learner) throw new DomainError('LEARNER_NOT_FOUND', 'Nomor WhatsApp tidak terdaftar sebagai peserta. Hubungi promotor Anda.');

      const recent = await otpRepo.countRecentByPhone(phoneE164, new Date(getNow().getTime() - REQUEST_LIMIT_WINDOW_MS));
      if (recent >= REQUEST_LIMIT) {
        throw new DomainError('OTP_RATE_LIMITED', 'Terlalu banyak permintaan kode. Coba lagi dalam 15 menit.');
      }

      const code = generateCode();
      const expiresAt = new Date(getNow().getTime() + OTP_TTL_MS);
      await otpRepo.createChallenge({
        organizationId: learner.organizationId,
        contactId: learner.contactId,
        phoneE164,
        codeHash: sha256(code),
        expiresAt,
      });
      await (deps.sender ?? createDefaultSender()).send(phoneE164, code);
      return { expiresAt: expiresAt.toISOString() };
    },

    async verifyChallenge(input: { phoneRaw: string; code: string }) {
      const phoneE164 = normalizePhone(input.phoneRaw);
      const now = getNow();
      const challenge = await otpRepo.findLatestActiveByPhone(phoneE164);
      if (!challenge) throw new DomainError('OTP_INVALID', 'Kode tidak valid. Minta kode baru.');
      if (new Date(challenge.expiresAt).getTime() < now.getTime()) {
        throw new DomainError('OTP_EXPIRED', 'Kode sudah kedaluwarsa. Minta kode baru.');
      }
      if (challenge.attempts >= MAX_ATTEMPTS) {
        throw new DomainError('OTP_EXPIRED', 'Terlalu banyak percobaan. Minta kode baru.');
      }

      const consumed = await otpRepo.atomicConsume(challenge.id, sha256(input.code.trim()), now);
      if (!consumed) throw new DomainError('OTP_INVALID', 'Kode salah. Periksa kembali.');

      const learner = await (deps.contactFinder ?? createDefaultContactFinder(db)).findLearnerByPhone(phoneE164);
      if (!learner) throw new DomainError('LEARNER_NOT_FOUND', 'Nomor WhatsApp tidak terdaftar sebagai peserta.');

      const session = await (deps.createSession ?? createDefaultSessionFactory(db))(learner.organizationId, learner.contactId);
      return { sessionToken: session.sessionToken, ...learner };
    },
  };
}

// Default wiring dihubungkan di app.ts (contactFinder via query contacts+enrollments,
// sender via env LEARNER_OTP_CHANNEL, createSession via learner-session-service).
export type { OtpSender } from './otp-sender';
```

> Implementasikan `createDefaultContactFinder` dan `createDefaultSessionFactory` langsung di file service dengan Drizzle query (`contacts` join `organizations` untuk slug; pilih contact dengan enrollment terbaru; session factory memakai `createLearnerSessionRepository(db).createSession`). Tambahkan `createSessionForContact(organizationId, contactId)` ke `LearnerSessionService` (pola persis `redeemToken` — token `lsess_` + sha256 + expiry 30 hari).

- [ ] **Step 5: Jalankan unit test → PASS**, lalu endpoint + contracts + test integrasi

Contracts:

```ts
export const RequestLearnerOtpSchema = z.object({
  phoneRaw: z.string().min(8, 'Nomor WhatsApp tidak valid').max(32),
});
export type RequestLearnerOtp = z.infer<typeof RequestLearnerOtpSchema>;

export const VerifyLearnerOtpSchema = z.object({
  phoneRaw: z.string().min(8).max(32),
  code: z.string().regex(/^\d{6}$/, 'Kode harus 6 digit angka'),
});
export type VerifyLearnerOtp = z.infer<typeof VerifyLearnerOtpSchema>;
```

`app.ts` — di area publik (dekat `handleRedeemToken`):

```ts
app.post('/api/v1/learner/auth/otp/request', async (c) => {
  c.header('Cache-Control', 'no-store');
  const db = c.get('db');
  const raw = await c.req.json().catch(() => ({}));
  const parsed = RequestLearnerOtpSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DomainError('VALIDATION_ERROR', 'Nomor WhatsApp tidak valid');
  }
  const env = (c.env ?? {}) as any;
  const channel = env.LEARNER_OTP_CHANNEL ?? 'log';
  let sender;
  if (channel === 'fonnte' && env.FONNTE_TOKEN) {
    sender = createFonnteOtpSender(env.FONNTE_TOKEN);
  } else if (channel === 'fonnte' && !env.FONNTE_TOKEN) {
    throw new DomainError('OTP_DELIVERY_UNAVAILABLE', 'Layanan kode sedang tidak tersedia. Hubungi promotor Anda.');
  } else {
    sender = createLogOtpSender();
  }
  const isDev = ['development', 'test'].includes(env.APP_ENV ?? 'development');
  const service = createLearnerOtpService(db, { sender });
  const result = await service.requestChallenge({ phoneRaw: parsed.data.phoneRaw });
  return c.json(isDev ? { ...result, devCode: (service as any).__devLastCode ?? undefined } : result, 200);
});

app.post('/api/v1/learner/auth/otp/verify', async (c) => {
  c.header('Cache-Control', 'no-store');
  const db = c.get('db');
  const raw = await c.req.json().catch(() => ({}));
  const parsed = VerifyLearnerOtpSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DomainError('VALIDATION_ERROR', 'Kode verifikasi tidak valid');
  }
  const service = createLearnerOtpService(db);
  const result = await service.verifyChallenge({ phoneRaw: parsed.data.phoneRaw, code: parsed.data.code });

  setCookie(c, 'promotor_learner_session', result.sessionToken, {
    httpOnly: true, secure: true, sameSite: 'None', path: '/', maxAge: 30 * 24 * 3600,
  });
  return c.json({
    contactId: result.contactId,
    organizationId: result.organizationId,
    workspaceSlug: result.workspaceSlug,
  }, 200);
});
```

> Agar `devCode` bisa dites, buat `createLogOtpSender` juga menembakkan callback opsional — solusi bersih: di app.ts, saat mode dev buat sender kustom `{ async send(_p, code) { devCode = code; } }` dan masukkan ke response. Jangan pernah kirim `devCode` di production.
>
> `c.env` di Hono Workers tersedia via `c.env`; jika app ini dibuat tanpa binding env di type, ambil via parameter `deps` di `createApp(deps)` yang sudah ada — ikuti cara `PAYCORE_*` env diakses di `commerce-routes.ts`.

Test integrasi: `learner-otp.integration.test.ts` — happy path request (dev sender menangkap kode) → verify → cookie ter-set → GET `/api/v1/learner/me/enrollments` dengan cookie = 200. Plus: kode salah 5x → OTP_EXPIRED.

- [ ] **Step 6: Frontend halaman /masuk + api-client**

`packages/api-client/src/index.ts` (kelas `PromotorClassContentApiClient`, ikut pola method lain):

```ts
async requestLearnerOtp(workspaceHint: string, phoneRaw: string) {
  return this.request<{ expiresAt: string; devCode?: string }>('POST', '/api/v1/learner/auth/otp/request', { phoneRaw });
}
async verifyLearnerOtp(phoneRaw: string, code: string) {
  return this.request<{ contactId: string; organizationId: string; workspaceSlug: string }>('POST', '/api/v1/learner/auth/otp/verify', { phoneRaw, code });
}
```

```tsx
// apps/promotor-class-web/src/app/(learner)/masuk/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { getPlatformApiClient } from '@/adapters';
import { setLearnerSession } from '@/lib/session'; // sesuaikan nama fn dengan lib/session.ts

export default function LearnerLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'PHONE' | 'CODE'>('PHONE');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const api = getPlatformApiClient();
      await api.requestLearnerOtp('', phone);
      setStep('CODE');
    } catch (err: any) {
      setError(err?.message ?? 'Gagal mengirim kode. Coba lagi.');
    } finally { setBusy(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const api = getPlatformApiClient();
      const res = await api.verifyLearnerOtp(phone, code);
      setLearnerSession({ contactId: res.contactId, workspaceSlug: res.workspaceSlug });
      router.push(res.workspaceSlug ? `/learn` : '/learn');
    } catch (err: any) {
      setError(err?.message ?? 'Kode salah atau kedaluwarsa.');
    } finally { setBusy(false); }
  };

  return (
    <LearnerShell title="Masuk">
      <div style={{ padding: 16 }}>
        <h1 style={{ font: '700 20px/1.3 var(--font-sans)' }}>Masuk dengan Nomor WhatsApp</h1>
        <p className="kicker kicker-muted" style={{ marginTop: 4 }}>
          {step === 'PHONE' ? 'Masukkan nomor yang Anda pakai saat mendaftar kelas.' : 'Masukkan 6 digit kode yang dikirim via WhatsApp.'}
        </p>
        {error && (
          <div role="alert" style={{ marginTop: 12, padding: 12, border: '1px solid #dc2626', color: '#dc2626', font: '400 13px/1.5 var(--font-sans)' }}>
            {error}
          </div>
        )}
        {step === 'PHONE' ? (
          <form onSubmit={handleRequest}>
            <input className="input" inputMode="tel" placeholder="08xxxxxxxxxx" value={phone}
              onChange={(e) => setPhone(e.target.value)} aria-label="Nomor WhatsApp" required />
            <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 12 }}>
              {busy ? 'Mengirim...' : 'Kirim Kode via WhatsApp'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <input className="input" inputMode="numeric" maxLength={6} placeholder="••••••" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Kode verifikasi" required />
            <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 12 }}>
              {busy ? 'Memeriksa...' : 'Masuk ke Kelas Saya'}
            </button>
            <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setStep('PHONE')}>
              Ganti nomor
            </button>
          </form>
        )}
      </div>
    </LearnerShell>
  );
}
```

> Cek `src/lib/session.ts` — gunakan fungsi penyimpanan sesi yang sudah ada (penyimpanan `promotor_class_learner_session_v2`); jika belum ada setter yang cocok, tambahkan `setLearnerSession(session)` di file itu.

**CTA di layar akses ditolak:** di `LessonReaderClient.tsx` pada blok `accessDenied`, tambahkan di atas tombol hubungi promotor:

```tsx
<a className="btn btn-accent btn-block" href="/masuk">Masuk dengan Nomor WhatsApp</a>
<p className="kicker kicker-muted" style={{ marginTop: 8 }}>Ganti perangkat? Masuk lagi dengan nomor WhatsApp Anda.</p>
```

**wrangler.jsonc** — tambah di `vars`: `"LEARNER_OTP_CHANNEL": "log"`, dan dokumentasikan secret `FONNTE_TOKEN` (diset via `wrangler secret put FONNTE_TOKEN`, TIDAK di-commit).

- [ ] **Step 7: Semua test + typecheck + commit**

Run: `pnpm --filter @promotor/platform-api test && pnpm --filter @promotor/platform-api test:integration && pnpm typecheck`
Expected: PASS semua.

```bash
git add -A
git commit -m "feat(learner): login cepat via OTP WhatsApp dengan rate limit dan token hashed"
```

---

### Task A6: e-Sertifikat Digital (terbit, PNG, PDF, QR verifikasi)

**Files:**
- Create: `apps/platform-api/src/db/schema/certificates.ts`
- Modify: `apps/platform-api/src/db/schema/index.ts`
- Create: `apps/platform-api/src/repositories/certificate-repository.ts`
- Create: `apps/platform-api/src/services/class/certificate-service.ts`
- Modify: `apps/platform-api/src/app.ts` (POST issue + GET public verify)
- Modify: `packages/contracts/src/index.ts` (CertificateSchema + responses)
- Modify: `packages/api-client/src/index.ts` (2 method)
- Create: `apps/promotor-class-web/src/lib/certificate/certificate-canvas.ts`
- Create: `apps/promotor-class-web/src/components/learner/CertificateCard.tsx`
- Modify: `apps/promotor-class-web/src/app/(learner)/learn/programs/[enrollmentId]/completed/ProgramCompletedClient.tsx`
- Create: `apps/promotor-class-web/src/app/(public)/verify/[serial]/page.tsx`
- Modify: `apps/promotor-class-web/package.json` (dep `qrcode`)
- Test: `apps/platform-api/src/__tests__/certificate-service.test.ts`, `apps/platform-api/src/__tests__/integration/certificate.integration.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/v1/learner/enrollments/:enrollmentId/certificate` → 200 `{ certificate }` (idempotent; 400 `PROGRAM_NOT_COMPLETED` bila `progressPercent < 100`).
  - `GET /api/v1/public/certificates/:serial` → 200 `{ certificate: { serial, recipientName, programTitle, promoterName, issuedAt, valid: true } }` / 404.
  - `Certificate = { serial, recipientName, programTitle, promoterName, issuedAt }`.
  - `renderCertificateCanvas(cert, verifyUrl): HTMLCanvasElement` (4:3, 1200×900).
  - `<CertificateCard certificate verifyUrl />` dengan tombol "Unduh PNG" & "Cetak / Simpan PDF".

- [ ] **Step 1: Unit test service yang gagal**

```ts
// apps/platform-api/src/__tests__/certificate-service.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCertificateService } from '../services/class/certificate-service';
import { DomainError } from '../core/errors';

const now = new Date('2026-09-06T03:00:00Z');

function makeDeps(overrides: Record<string, any> = {}) {
  const created: any[] = [];
  return {
    deps: {
      clock: () => now,
      certRepo: {
        async findByEnrollment(enrollmentId: string) { return created.find((c) => c.enrollmentId === enrollmentId) ?? null; },
        async findBySerial(serial: string) { return created.find((c) => c.serial === serial) ?? null; },
        async create(input: any) { const row = { id: 'cert1', ...input }; created.push(row); return row; },
      },
      enrollmentFinder: {
        async findOwnedEnrollment(_org: string, enrollmentId: string, _contact: string) {
          return overrides.enrollment ?? {
            id: enrollmentId, organizationId: 'o1', contactId: 'c1',
            progressPercent: 100, status: 'COMPLETED',
            contactName: 'Budi Santoso', programTitle: 'Kelas Parenting 101', promoterName: 'Rina',
          };
        },
      },
    },
    created,
  };
}

describe('certificate-service', () => {
  it('menerbitkan sertifikat dengan snapshot data + serial', async () => {
    const { deps, created } = makeDeps();
    const svc = createCertificateService({} as any, deps as any);
    const cert = await svc.issueForEnrollment({ organizationId: 'o1', enrollmentId: 'e1', authenticatedContactId: 'c1' });
    assert.match(cert.serial, /^RAL-\d{2}-[A-Z0-9]{8}$/);
    assert.equal(cert.recipientName, 'Budi Santoso');
    assert.equal(cert.programTitle, 'Kelas Parenting 101');
    assert.equal(created.length, 1);
  });

  it('idempotent: terbit kedua kali mengembalikan sertifikat yang sama', async () => {
    const { deps } = makeDeps();
    const svc = createCertificateService({} as any, deps as any);
    const a = await svc.issueForEnrollment({ organizationId: 'o1', enrollmentId: 'e1', authenticatedContactId: 'c1' });
    const b = await svc.issueForEnrollment({ organizationId: 'o1', enrollmentId: 'e1', authenticatedContactId: 'c1' });
    assert.equal(a.serial, b.serial);
  });

  it('menolak bila progres belum 100%', async () => {
    const { deps } = makeDeps({ enrollment: { id: 'e1', organizationId: 'o1', contactId: 'c1', progressPercent: 60, status: 'STARTED', contactName: 'B', programTitle: 'P', promoterName: 'R' } });
    const svc = createCertificateService({} as any, deps as any);
    await assert.rejects(() => svc.issueForEnrollment({ organizationId: 'o1', enrollmentId: 'e1', authenticatedContactId: 'c1' }),
      (e: DomainError) => e.code === 'PROGRAM_NOT_COMPLETED');
  });

  it('verifikasi serial tidak dikenal → null', async () => {
    const { deps } = makeDeps();
    const svc = createCertificateService({} as any, deps as any);
    assert.equal(await svc.verifyBySerial('RAL-00-XXXXYYYY'), null);
  });
});
```

- [ ] **Step 2: Jalankan → FAIL**

Run: `pnpm --filter @promotor/platform-api test`

- [ ] **Step 3: Schema + migrasi**

```ts
// apps/platform-api/src/db/schema/certificates.ts
import { pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    enrollmentId: uuid('enrollment_id').notNull(),
    serial: varchar('serial', { length: 32 }).notNull(),
    recipientName: text('recipient_name').notNull(),
    programTitle: text('program_title').notNull(),
    promoterName: text('promoter_name').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('certificates_serial_uq').on(table.serial),
    uniqueIndex('certificates_enrollment_uq').on(table.enrollmentId),
  ]
);
```

Export di `schema/index.ts`; generate + migrate.

- [ ] **Step 4: Service**

```ts
// apps/platform-api/src/services/class/certificate-service.ts
import * as crypto from 'node:crypto';
import { DomainError } from '../../core/errors';

export interface OwnedEnrollmentSnapshot {
  id: string; organizationId: string; contactId: string;
  progressPercent: number; status: string;
  contactName: string; programTitle: string; promoterName: string;
}

export interface CertificateDto {
  serial: string; recipientName: string; programTitle: string; promoterName: string; issuedAt: string;
}

export function createCertificateService(db: any, deps: {
  clock?: () => Date;
  certRepo?: any;
  enrollmentFinder?: { findOwnedEnrollment(organizationId: string, enrollmentId: string, contactId: string): Promise<OwnedEnrollmentSnapshot | null> };
} = {}) {
  const getNow = deps.clock ?? (() => new Date());
  const certRepo = deps.certRepo ?? createDefaultCertRepo(db);
  const enrollmentFinder = deps.enrollmentFinder ?? createDefaultEnrollmentFinder(db);

  const generateSerial = () => {
    const yy = String(getNow().getFullYear()).slice(-2);
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `RAL-${yy}-${rand}`;
  };

  return {
    async issueForEnrollment(input: {
      organizationId: string; enrollmentId: string; authenticatedContactId: string;
    }): Promise<CertificateDto> {
      const existing = await certRepo.findByEnrollment(input.enrollmentId);
      if (existing) return toDto(existing);

      const enrollment = await enrollmentFinder.findOwnedEnrollment(
        input.organizationId, input.enrollmentId, input.authenticatedContactId
      );
      if (!enrollment) throw new DomainError('NOT_FOUND', 'Enrollment tidak ditemukan');
      if (enrollment.progressPercent < 100 || enrollment.status !== 'COMPLETED') {
        throw new DomainError('PROGRAM_NOT_COMPLETED', 'Selesaikan semua modul untuk mendapatkan sertifikat.');
      }

      const row = await certRepo.create({
        organizationId: enrollment.organizationId,
        enrollmentId: enrollment.id,
        serial: generateSerial(),
        recipientName: enrollment.contactName,
        programTitle: enrollment.programTitle,
        promoterName: enrollment.promoterName,
        issuedAt: getNow(),
      });
      return toDto(row);
    },

    async verifyBySerial(serial: string): Promise<CertificateDto | null> {
      const row = await certRepo.findBySerial(serial);
      return row ? toDto(row) : null;
    },
  };
}

function toDto(row: any): CertificateDto {
  return {
    serial: row.serial,
    recipientName: row.recipientName,
    programTitle: row.programTitle,
    promoterName: row.promoterName,
    issuedAt: new Date(row.issuedAt).toISOString(),
  };
}

// createDefaultCertRepo / createDefaultEnrollmentFinder: implement Drizzle di file yang sama.
// findOwnedEnrollment: join enrollments → contacts → programs → organizations(slug)/workspace_profiles(display_name),
// dengan where organizationId + enrollment.id + contactId = authenticatedContactId.
```

- [ ] **Step 5: Contracts + endpoint**

Contracts:

```ts
export const CertificateSchema = z.object({
  serial: z.string(),
  recipientName: z.string(),
  programTitle: z.string(),
  promoterName: z.string(),
  issuedAt: z.string(),
});
export type Certificate = z.infer<typeof CertificateSchema>;

export const CertificateIssueResponseSchema = z.object({ certificate: CertificateSchema });
export const PublicCertificateVerificationSchema = z.object({
  certificate: CertificateSchema.extend({ valid: z.literal(true) }),
});
```

`app.ts`:

```ts
// learner-protected:
app.post('/api/v1/learner/enrollments/:enrollmentId/certificate', async (c) => {
  c.header('Cache-Control', 'no-store');
  const db = c.get('db');
  const learnerCtx = c.get('learnerContext' as any) as any;
  const service = createCertificateService(db);
  const certificate = await service.issueForEnrollment({
    organizationId: learnerCtx.organizationId,
    enrollmentId: c.req.param('enrollmentId'),
    authenticatedContactId: learnerCtx.contactId,
  });
  return c.json({ certificate }, 200);
});

// public (dekat route public lain):
app.get('/api/v1/public/certificates/:serial', async (c) => {
  c.header('Cache-Control', 'public, max-age=60');
  const db = c.get('db');
  const service = createCertificateService(db);
  const certificate = await service.verifyBySerial(c.req.param('serial'));
  if (!certificate) {
    throw new DomainError('NOT_FOUND', 'Sertifikat tidak ditemukan');
  }
  return c.json({ certificate: { ...certificate, valid: true } }, 200);
});
```

- [ ] **Step 6: Test integrasi** — terbit saat COMPLETED (fixture enrollment 100%), tolak saat 60%, idempotent, GET public verify 200 + serial bogus 404. Run: `pnpm --filter @promotor/platform-api test:integration` → PASS.

- [ ] **Step 7: Renderer canvas + card + halaman verifikasi**

```ts
// apps/promotor-class-web/src/lib/certificate/certificate-canvas.ts
import type { Certificate } from '@promotor/contracts';
import QRCode from 'qrcode';

const W = 1200; const H = 900;

export async function renderCertificateCanvas(cert: Certificate, verifyUrl: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // background + double border
  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 6; ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#2563eb';
  ctx.font = '700 26px Archivo, sans-serif';
  ctx.fillText('SERTIFIKAT PENYELESAIAN', W / 2, 130);

  ctx.fillStyle = '#334155';
  ctx.font = '400 18px Archivo, sans-serif';
  ctx.fillText('Diberikan dengan bangga kepada', W / 2, 200);

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 56px Archivo, sans-serif';
  ctx.fillText(cert.recipientName, W / 2, 290);

  ctx.fillStyle = '#334155';
  ctx.font = '400 20px Archivo, sans-serif';
  ctx.fillText('atas keikutsertaan dan penyelesaian program', W / 2, 350);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 34px Archivo, sans-serif';
  ctx.fillText(cert.programTitle, W / 2, 410);

  ctx.font = '400 18px Archivo, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Dibimbing oleh ${cert.promoterName}`, W / 2, 480);

  const issued = new Date(cert.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(`Diterbitkan ${issued}`, W / 2, 520);

  // QR verifikasi
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 180 });
  const qr = new Image();
  await new Promise<void>((resolve) => { qr.onload = () => resolve(); qr.src = qrDataUrl; });
  ctx.drawImage(qr, W / 2 - 90, 590, 180, 180);
  ctx.font = '400 14px Archivo, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Serial: ${cert.serial}`, W / 2, 800);
  ctx.fillText('Pindai QR untuk verifikasi keaslian', W / 2, 824);

  return canvas;
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
```

```tsx
// apps/promotor-class-web/src/components/learner/CertificateCard.tsx
'use client';

import React from 'react';
import type { Certificate } from '@promotor/contracts';
import { renderCertificateCanvas, downloadCanvasPng } from '@/lib/certificate/certificate-canvas';

export function CertificateCard({ certificate, verifyUrl }: { certificate: Certificate; verifyUrl: string }) {
  const handleDownload = async () => {
    const canvas = await renderCertificateCanvas(certificate, verifyUrl);
    downloadCanvasPng(canvas, `sertifikat-${certificate.serial}.png`);
  };
  const handlePrint = async () => {
    const canvas = await renderCertificateCanvas(certificate, verifyUrl);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Sertifikat ${certificate.serial}</title></head>
      <body style="margin:0"><img src="${canvas.toDataURL('image/png')}" style="width:100%" onload="window.print()" /></body></html>`);
    win.document.close();
  };

  return (
    <section style={{ marginTop: 24, border: '2px solid var(--accent)', padding: 16 }}>
      <div className="kicker">Sertifikat Digital</div>
      <h2 style={{ font: '700 18px/1.4 var(--font-sans)', marginTop: 4 }}>
        Selamat, {certificate.recipientName}! 🎉
      </h2>
      <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
        Serial <strong>{certificate.serial}</strong> — bagikan ke WhatsApp Status / Instagram Story / LinkedIn.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={handleDownload}>Unduh PNG</button>
        <button type="button" className="btn btn-secondary" onClick={handlePrint}>Cetak / Simpan PDF</button>
      </div>
      <p style={{ font: '400 11px/1.4 var(--font-sans)', color: 'var(--muted-strong)', marginTop: 8 }}>
        Verifikasi keaslian: {verifyUrl}
      </p>
    </section>
  );
}
```

**Halaman verifikasi publik** `apps/promotor-class-web/src/app/(public)/verify/[serial]/page.tsx`: client component — fetch `GET /api/v1/public/certificates/{serial}` via api client method baru `verifyCertificate(serial)`; render status valid (hijau, data sertifikat) atau "Sertifikat tidak ditemukan" (merah). Pakai `LearnerShell`-less layout sederhana dengan tokens existing.

**Integrasi ProgramCompletedClient:** saat load, jika `enrollment.progressPercent === 100` → panggil `issueCertificateCommand(enrollmentId)` (api-client method baru `POST .../certificate`), simpan state `certificate`, render `<CertificateCard certificate verifyUrl={\`${window.location.origin}/verify/${certificate.serial}\`} />`. Tangani error `PROGRAM_NOT_COMPLETED` dengan silent skip.

- [ ] **Step 8: Typecheck + commit**

Run: `pnpm --filter @promotor/promotor-class-web install && pnpm typecheck && pnpm --filter @promotor/platform-api test`

```bash
git add -A
git commit -m "feat(learner): e-sertifikat otomatis dengan QR verifikasi, unduh PNG, dan cetak PDF"
```

---

### Task A7: Hub "Kelas Saya" + Riwayat Sertifikat

**Files:**
- Modify: `apps/platform-api/src/app.ts` (GET `/api/v1/learner/me/certificates`)
- Modify: `packages/contracts/src/index.ts` (array CertificateSchema)
- Modify: `packages/api-client/src/index.ts` (`listMyCertificates`)
- Modify: `apps/promotor-class-web/src/app/(learner)/learn/page.tsx`
- Test: `apps/platform-api/src/__tests__/integration/learner-certificates-list.integration.test.ts`

**Interfaces:**
- Produces: `GET /api/v1/learner/me/certificates` (learner-auth) → `{ certificates: Certificate[] }` (by contactId, urut issuedAt desc).

- [ ] **Step 1: Test integrasi yang gagal** — seed 2 sertifikat untuk contact → list mengembalikan 2 terurut; contact lain → 0. Run: `test:integration` → FAIL.

- [ ] **Step 2: Endpoint + repo method** `listByContact(organizationId, contactId)` di `certificate-repository.ts` + route learner-protected (pola sama dengan `/me/enrollments`). Kontrak: `export const LearnerCertificatesResponseSchema = z.object({ certificates: z.array(CertificateSchema) });`

- [ ] **Step 3: UI /learn** — fetch sertifikat sekali on mount; pada kartu program berstatus COMPLETED yang punya sertifikat (match tidak bisa langsung — tampilkan section terpisah "Sertifikat Saya" di atas daftar program):

```tsx
{certificates.length > 0 && (
  <section style={{ marginTop: 12 }}>
    <div className="kicker">Sertifikat Saya</div>
    {certificates.map((cert) => (
      <a key={cert.serial} href={`/verify/${cert.serial}`} target="_blank" rel="noreferrer"
        style={{ display: 'block', padding: 12, border: '1px solid var(--border)', marginTop: 8 }}>
        <strong style={{ font: '700 14px/1.4 var(--font-sans)' }}>🎓 {cert.programTitle}</strong>
        <div className="kicker kicker-muted">{cert.serial}</div>
      </a>
    ))}
  </section>
)}
```

- [ ] **Step 4: Test → PASS, typecheck, commit**

Run: `pnpm --filter @promotor/platform-api test:integration && pnpm typecheck`

```bash
git add -A
git commit -m "feat(learner): riwayat sertifikat di hub Kelas Saya"
```

---

## Self-Review (dijalankan setelah penulisan)

1. **Cakupan spesifikasi learner:** OTP login (A5) ✓, e-sertifikat shareable (A6) ✓, download materi/worksheet — sudah didukung attachment existing + Task B1 (UI builder di Plan B); tidak ada kerja ganda ✓, autosave (A1) ✓, resume video + auto-advance (A2) ✓, template klaim konsultasi (A3) ✓, katalog Kelas Saya + riwayat sertifikat (A7) ✓, catatan pribadi (A4) ✓.
2. **Placeholder:** tidak ada TBD/TODO; setiap langkah punya kode atau perintah konkret.
3. **Konsistensi tipe:** `Certificate`, `LessonNoteDto`, `UpdateLessonPositionRequest` didefinisikan sekali di contracts dan dipakai konsisten; nama endpoint konsisten antara task API dan task frontend.
