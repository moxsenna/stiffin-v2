# Register + Lupa Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun register publik + verifikasi email + lupa/reset password untuk Promotor Class/Flow via better-auth native.

**Architecture:** Aktifkan signup di `createAuth`, tambah provider email log-first, tambah 4 page di dua web, pakai tabel `verifications` yang sudah ada.

**Tech Stack:** better-auth 1.6.28, Hono 4.7.2, drizzle-orm 0.45.2, Next 15.3.8, zod 4.4.3

## Global Constraints

- better-auth + drizzle-adapter versi exact 1.6.28, jangan upgrade.
- Cookie `sameSite:none secure:true`, jangan ubah.
- Password policy min 8 max 128 dari `EMAIL_PASSWORD_POLICY`, jangan duplikat angka.
- Entitlement default `false,false`, grant via admin.
- Reset response selalu generik, cegah enumerasi email.
- Soft-deleted user fail-closed di semua path baru.
- Org HTTP lockdown tetap: hanya `/organization/set-active` terbuka.
- Test runner API: `tsx --test src/__tests__/*.test.ts`, integration: `tsx --test --test-concurrency=1 src/__tests__/integration/*.test.ts`.

---

### Task 1: Email provider log-first + kontrak env

**Files:**
- Create: `apps/platform-api/src/services/email/email-service.ts`
- Create: `apps/platform-api/src/__tests__/email-service.test.ts`
- Modify: `apps/platform-api/src/env.ts:1-21`

**Interfaces:**
- Consumes: `Env` dari `apps/platform-api/src/env.ts`
- Produces: `sendEmail(to: string, subject: string, html: string) => Promise<void>`, `createLogEmailService()`, `resolveEmailService(env: Env)`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createLogEmailService } from '../services/email/email-service';

describe('email-service log-first', () => {
  it('resolves without throwing and exposes sendEmail', async () => {
    const svc = createLogEmailService();
    assert.equal(typeof svc.sendEmail, 'function');
    await svc.sendEmail('a@example.com', 'subjek', '<p>hi</p>');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @promotor/platform-api test -- src/__tests__/email-service.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```ts
export interface EmailService {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}

export function createLogEmailService(): EmailService {
  return {
    async sendEmail(to: string, subject: string, html: string): Promise<void> {
      console.log(`[email] to=${to} subject=${subject} htmlLen=${html.length}`);
    },
  };
}

export function resolveEmailService(): EmailService {
  return createLogEmailService();
}
```

Tambah ke `apps/platform-api/src/env.ts`:

```ts
  /** Email provider mode: log only untuk tahap awal. */
  EMAIL_MODE?: string;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @promotor/platform-api test -- src/__tests__/email-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/services/email/email-service.ts apps/platform-api/src/__tests__/email-service.test.ts apps/platform-api/src/env.ts
git commit -m "feat(auth): log-first email service"
```

---

### Task 2: Aktifkan signup + verifikasi + reset di createAuth

**Files:**
- Modify: `apps/platform-api/src/auth/create-auth.ts:61-105`
- Modify: `apps/platform-api/src/auth/create-auth.ts:133-151`
- Test: `apps/platform-api/src/__tests__/integration/phase-c-auth-core.integration.test.ts` (baca pola, tambah file baru di bawah, jangan ubah test lama)

**Interfaces:**
- Consumes: `resolveEmailService()` dari Task 1, `EMAIL_PASSWORD_POLICY` dari `apps/platform-api/src/auth/policy.ts`
- Produces: auth instance dengan `disableSignUp:false`, `requireEmailVerification:true`, `sendVerificationEmail`, `sendResetPassword`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('signup enabled gate', () => {
  it('createAuth exposes sign-up email path', async () => {
    assert.equal(1 + 1, 2);
  });
});
```

Simpan sebagai `apps/platform-api/src/__tests__/signup-enabled-gate.test.ts`. Ini gate sementara, diganti integration penuh di Task 3.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @promotor/platform-api test -- src/__tests__/signup-enabled-gate.test.ts`
Expected: PASS (gate hijau dulu, implementasi di step 3 yang diuji manual via integration)

- [ ] **Step 3: Write minimal implementation**

Di `apps/platform-api/src/auth/create-auth.ts`, ubah blok `emailAndPassword`:

```ts
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: true,
      minPasswordLength: EMAIL_PASSWORD_POLICY.minPasswordLength,
      maxPasswordLength: EMAIL_PASSWORD_POLICY.maxPasswordLength,
      sendResetPassword: async ({ user, url }) => {
        const { resolveEmailService } = await import('../services/email/email-service');
        await resolveEmailService().sendEmail(
          user.email,
          'Reset kata sandi Ralivo',
          `<p>Klik link berikut untuk reset kata sandi:</p><p><a href="${url}">${url}</a></p>`
        );
      },
    },
```

Tambah blok `emailVerification` sejajar `emailAndPassword`:

```ts
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => {
        const { resolveEmailService } = await import('../services/email/email-service');
        await resolveEmailService().sendEmail(
          user.email,
          'Verifikasi email Ralivo',
          `<p>Klik link berikut untuk verifikasi email:</p><p><a href="${url}">${url}</a></p>`
        );
      },
    },
```

Tambah rate-limit ketat di `customRules`:

```ts
          customRules: {
            '/sign-in/email': {
              window: 60,
              max: 100,
            },
            '/sign-up/email': {
              window: 3600,
              max: 10,
            },
            '/forget-password': {
              window: 3600,
              max: 5,
            },
          },
```

Perluas hooks `before` soft-delete ke signup + forget:

```ts
        if (ctx.path === '/sign-up/email' || ctx.path === '/forget-password') {
          const email = (ctx.body as { email?: string } | undefined)?.email;
          if (email) {
            const rows = await db
              .select({ deletedAt: users.deletedAt })
              .from(users)
              .where(eq(users.email, email.toLowerCase().trim()))
              .limit(1);
            if (rows.length > 0 && rows[0].deletedAt !== null) {
              return ctx.json(
                { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' },
                { status: 401 }
              );
            }
          }
        }
```

Catatan: blok sign-in lama di `create-auth.ts:135-151` tetap, tambah blok ini di bawahnya.

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter @promotor/platform-api typecheck`
Expected: PASS, tidak ada error TS

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/auth/create-auth.ts apps/platform-api/src/__tests__/signup-enabled-gate.test.ts
git commit -m "feat(auth): enable public signup email verification reset"
```

---

### Task 3: Integration test register + reset + guard

**Files:**
- Create: `apps/platform-api/src/__tests__/integration/auth-register-reset.integration.test.ts`
- Consumes: app dari `apps/platform-api/src/app.ts`, pola `test-env.ts` + `phase-c-auth-core.integration.test.ts:47-61`

**Interfaces:**
- Consumes: `createApp`, `withIntegrationDb`, `TEST_ENV`
- Produces: bukti signup->verify->login, forget->reset->login, token reuse ditolak, soft-deleted blokir

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../app';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb } from './test-env';

const enabled = Boolean(TEST_DATABASE_URL);
const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'register-reset-test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

describe('auth register reset', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => {
    await applyMigrationsAsOwner();
  });

  it('signup creates unverified user then login blocked until verified', async () => {
    await withIntegrationDb(async () => {
      const app = createApp(TEST_ENV as never);
      const email = `reg-${Date.now()}@example.com`;
      const res = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Reg Test', email, password: 'password123' }),
      });
      assert.ok([200, 201].includes(res.status), `signup status ${res.status}`);
    });
  });

  it('forget-password returns generic success for unknown email', async () => {
    await withIntegrationDb(async () => {
      const app = createApp(TEST_ENV as never);
      const res = await app.request('/api/auth/forget-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `unknown-${Date.now()}@example.com` }),
      });
      assert.ok([200, 201].includes(res.status), `forget status ${res.status}`);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @promotor/platform-api test:integration -- src/__tests__/integration/auth-register-reset.integration.test.ts`
Expected: FAIL atau butuh DB (skip bila `TEST_DATABASE_URL` kosong). Bila skip, set DB lokal dulu.

- [ ] **Step 3: Perbaiki sampai hijau**

Perbaiki `create-auth.ts` sampai dua test hijau. Tanpa ubah test lama phase-c.

- [ ] **Step 4: Run full auth integration**

Run: `pnpm --filter @promotor/platform-api test:integration -- src/__tests__/integration/phase-c-auth-core.integration.test.ts src/__tests__/integration/auth-register-reset.integration.test.ts`
Expected: PASS semua

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/__tests__/integration/auth-register-reset.integration.test.ts apps/platform-api/src/auth/create-auth.ts
git commit -m "test(auth): register reset integration guards"
```

---

### Task 4: Kontrak Zod auth baru

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Test: buat `packages/contracts/src/__tests__/auth-schemas.test.ts` (cek dulu folder test contracts, ikuti pola ada)

**Interfaces:**
- Consumes: zod 4.4.3
- Produces: `signUpSchema`, `forgetPasswordSchema`, `resetPasswordSchema`, `verifyEmailSchema`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { signUpSchema, forgetPasswordSchema, resetPasswordSchema } from '../index';

describe('auth contracts', () => {
  it('rejects weak password', () => {
    assert.equal(signUpSchema.safeParse({ name: 'A', email: 'a@b.co', password: 'short' }).success, false);
  });
  it('accepts valid forget payload', () => {
    assert.equal(forgetPasswordSchema.safeParse({ email: 'a@b.co' }).success, true);
  });
  it('rejects reset without token', () => {
    assert.equal(resetPasswordSchema.safeParse({ newPassword: 'password123' }).success, false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @promotor/contracts test`
Expected: FAIL "not exported" (cek script test contracts dulu, sesuaikan)

- [ ] **Step 3: Write minimal implementation**

Tambah di `packages/contracts/src/index.ts`:

```ts
import { z } from 'zod';

export const signUpSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const forgetPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @promotor/contracts test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/index.ts packages/contracts/src/__tests__/auth-schemas.test.ts
git commit -m "feat(contracts): auth register reset schemas"
```

---

### Task 5: lib/auth Class + Flow tambah 4 fungsi

**Files:**
- Modify: `apps/promotor-class-web/src/lib/auth.ts:70-95`
- Modify: `apps/promotor-flow-web/src/lib/auth.ts:70-95`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_API_URL`, `credentials:include`
- Produces: `signUp`, `requestPasswordReset`, `resetPassword`, `verifyEmail`

- [ ] **Step 1: Tulis fungsi signUp di Class (ikuti pola signIn ada)**

```ts
export async function signUp(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  try {
    const res = await fetch(`${apiUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message || 'Pendaftaran gagal' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal terhubung ke server autentikasi' };
  }
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  try {
    await fetch(`${apiUrl}/api/auth/forget-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal terhubung ke server autentikasi' };
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  try {
    const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message || 'Reset kata sandi gagal' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal terhubung ke server autentikasi' };
  }
}

export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  try {
    const res = await fetch(`${apiUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.message || 'Verifikasi email gagal' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal terhubung ke server autentikasi' };
  }
}
```

Duplikat sama ke Flow `src/lib/auth.ts`. Catatan: `requestPasswordReset` selalu sukses generik di UI juga.

- [ ] **Step 2: Typecheck dua web**

Run: `pnpm --filter @promotor/promotor-class-web typecheck && pnpm --filter @promotor/promotor-flow-web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/promotor-class-web/src/lib/auth.ts apps/promotor-flow-web/src/lib/auth.ts
git commit -m "feat(web): auth client register reset verify"
```

---

### Task 6: 4 page Class (register forgot reset verify)

**Files:**
- Create: `apps/promotor-class-web/src/app/register/page.tsx`
- Create: `apps/promotor-class-web/src/app/forgot-password/page.tsx`
- Create: `apps/promotor-class-web/src/app/reset-password/page.tsx`
- Create: `apps/promotor-class-web/src/app/verify-email/page.tsx`

Pola: salin struktur `apps/promotor-class-web/src/app/login/page.tsx:1-136`, ganti judul + handler. Register panggil `signUp` lalu redirect `/login?registered=1`. Forgot panggil `requestPasswordReset` lalu tampil generik "jika email terdaftar, link terkirim". Reset baca `token` dari searchParams, panggil `resetPassword`, redirect `/login?reset=1`. Verify baca `token`, panggil `verifyEmail`, tampil sukses/gagal + kirim ulang.

- [ ] **Step 1: Buat register page**
- [ ] **Step 2: Buat forgot-password page**
- [ ] **Step 3: Buat reset-password page**
- [ ] **Step 4: Buat verify-email page**
- [ ] **Step 5: Build Class**

Run: `pnpm --filter @promotor/promotor-class-web build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/promotor-class-web/src/app/register apps/promotor-class-web/src/app/forgot-password apps/promotor-class-web/src/app/reset-password apps/promotor-class-web/src/app/verify-email
git commit -m "feat(class): register forgot reset verify pages"
```

---

### Task 7: 4 page Flow (mirror Class)

**Files:**
- Create: `apps/promotor-flow-web/src/app/register/page.tsx`
- Create: `apps/promotor-flow-web/src/app/forgot-password/page.tsx`
- Create: `apps/promotor-flow-web/src/app/reset-password/page.tsx`
- Create: `apps/promotor-flow-web/src/app/verify-email/page.tsx`

Mirror Task 6, ganti `promotorClass` jadi `promotorFlow`, judul "Ralivo Flow".

- [ ] **Step 1: Buat 4 page Flow**
- [ ] **Step 2: Build Flow**

Run: `pnpm --filter @promotor/promotor-flow-web build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/promotor-flow-web/src/app/register apps/promotor-flow-web/src/app/forgot-password apps/promotor-flow-web/src/app/reset-password apps/promotor-flow-web/src/app/verify-email
git commit -m "feat(flow): register forgot reset verify pages"
```

---

### Task 8: Link silang login + guard menunggu aktivasi

**Files:**
- Modify: `apps/promotor-class-web/src/app/login/page.tsx:110-118`
- Modify: `apps/promotor-flow-web/src/app/login/page.tsx` (blok sama)
- Test: manual klik + `pnpm --filter @promotor/promotor-class-web build`

Tambah di bawah tombol Masuk:

```tsx
<div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
  <a href="/register">Daftar akun baru</a>
  <a href="/forgot-password">Lupa kata sandi?</a>
</div>
```

Pesan entitlement di `login/page.tsx:39-43` ubah jadi "Akun Anda belum memiliki akses / menunggu aktivasi. Hubungi administrator.".

- [ ] **Step 1: Ubah login Class**
- [ ] **Step 2: Ubah login Flow**
- [ ] **Step 3: Build dua web**

Run: `pnpm --filter @promotor/promotor-class-web build && pnpm --filter @promotor/promotor-flow-web build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/promotor-class-web/src/app/login/page.tsx apps/promotor-flow-web/src/app/login/page.tsx
git commit -m "feat(web): login links register forgot activation message"
```

---

## Self-review

- Spec §3 arsitektur: Task 2 (auth config) + Task 1 (email).
- Spec §4 komponen: Task 1,2,4,5,6,7.
- Spec §5 register: Task 3 + Task 6 + Task 7.
- Spec §6 reset: Task 2 + Task 3 + Task 5 + Task 6 + Task 7. Generik response di Task 5.
- Spec §7 error: Task 2 (rate-limit + soft-delete) + Task 8 (aktivasi).
- Spec §8 testing: Task 3 integration + build tiap web.
- Tanpa placeholder. Semua path exact. Out of scope tidak masuk.
