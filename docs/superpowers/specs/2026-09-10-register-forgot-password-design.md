# Register + Lupa Password — Design Spec

Tanggal: 2026-09-10
Status: Approved user (pendekatan A)
Scope: Promotor Class + Flow web, platform-api auth

## 1. Kondisi kini

- Signup mati. `apps/platform-api/src/auth/create-auth.ts:68` set `disableSignUp:true`.
- Akun hanya via internal `apps/platform-api/src/auth/provisioning.ts:85-167`. Tanpa route HTTP.
- Email sender kosong. `apps/platform-api/src/env.ts` tanpa SMTP/Resend/SES. Reset tidak bisa kirim.
- Tabel `verifications` siap. `apps/platform-api/src/db/schema/verifications.ts:1-13`. Belum dipakai promotor.
- Login duplikat. `apps/promotor-class-web/src/lib/auth.ts:46-118` + `apps/promotor-flow-web/src/lib/auth.ts:46-118`.

## 2. Keputusan

- Pendekatan A: better-auth native. Aktifkan signup + verifikasi email + reset password.
- Bukan invite-only. Bukan OTP WhatsApp.
- Entitlement default `false,false`. Grant via admin.

## 3. Arsitektur

- Backend `apps/platform-api/src/auth/create-auth.ts`: `disableSignUp:false`, `requireEmailVerification:true`, wire `sendVerificationEmail`, `sendResetPassword`.
- Provider email baru wajib dulu. Tanpa ini semua flow macet.
- Frontend dua web: tambah `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.
- Pakai ulang `src/lib/auth.ts`, pola `src/app/login/page.tsx`.
- Route auth tetap `app.all(/api/auth/*)->auth.handler` di `apps/platform-api/src/app.ts`. Tanpa route custom.
- Role enum tetap `owner|admin|member`. Cookie `sameSite:none secure:true`.

## 4. Komponen

- Backend auth config: enable signup, require verification, sender reset.
- `apps/platform-api/src/services/email/`: interface `sendEmail(to,subject,html)`, satu implementasi. Pilihan provider (Resend/SES/SMTP) diputuskan saat implementation plan, bukan di spec ini.
- `packages/contracts/src/`: schema Zod `signUp`, `forgetPassword`, `resetPassword`, `verifyEmail`.
- Web Class + Flow `src/lib/auth.ts`: tambah `signUp`, `requestPasswordReset`, `resetPassword`, `verifyEmail`, `credentials:include`.
- Web Class + Flow pages: register, forgot, reset, verify-email. Form + state + redirect login.
- Admin grant: `product_entitlements` default false, grant manual.

## 5. Flow register

1. User isi nama+email+password di `/register`.
2. Web panggil `POST /api/auth/sign-up/email`.
3. API buat `users` + `accounts(providerId:credential)` + kirim verifikasi.
4. User klik link -> `/verify-email?token=...` -> `POST /api/auth/verify-email`.
5. User login `/login`, `GET /api/me` cek entitlements.
6. Tanpa grant: tampil "menunggu aktivasi", tolak `router.replace(returnTo)`.

## 6. Flow lupa + reset

Security warning: endpoint reset balas generik "jika email terdaftar, link terkirim". Cegah enumerasi email.

1. User isi email di `/forgot-password`.
2. Web panggil `POST /api/auth/forget-password`, selalu sukses generik.
3. API tulis `verifications`, kirim link, rate-limit ketat.
4. User klik link -> `/reset-password?token=...`.
5. Web panggil `POST /api/auth/reset-password`, policy `apps/platform-api/src/auth/policy.ts:8-12`.
6. Soft-deleted diblokir sama seperti sign-in.
7. Redirect `/login`, sesi lama revoke.

## 7. Error handling

- Email tak terdaftar: sukses generik. Tanpa bocor.
- Token salah/kadaluarsa: pesan kirim ulang. Tanpa detail internal.
- Password lemah: tolak ikut policy, min 8 max 128.
- Rate-limit per IP+email. Lockout sementara.
- Soft-deleted: fail-closed.
- Belum verifikasi: blokir login, tampil kirim ulang.
- Tanpa entitlement: tolak `/app`, tampil menunggu aktivasi.

## 8. Testing

- Unit: schema Zod, `normalizeEmail`, password policy, email mock.
- Integration: signup->verify->login, forget->reset->login, token reuse ditolak, soft-deleted blokir, rate-limit kepicu.
- E2E Class + Flow: 4 page baru + guard entitlement.
- Negatif: enum tidak bocor, password lemah ditolak, sesi lama revoke.

## 9. Out of scope

- Invite admin bulk. OAuth provider. Magic link. Ubah session middleware. Ubah org resolver.
