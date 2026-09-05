'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession, sanitizeReturnTo } from '@/lib/auth';
import { Wordmark } from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnTo = searchParams.get('returnTo');
  const returnTo = sanitizeReturnTo(rawReturnTo);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await signIn(email.trim(), password);
      if (!result.success) {
        setErrorMessage(result.error || 'Email atau kata sandi tidak cocok.');
        setIsLoading(false);
        return;
      }

      const session = await getSession();
      if (!session) {
        setErrorMessage('Sesi masuk tidak dapat diverifikasi.');
        setIsLoading(false);
        return;
      }

      if (session.entitlements && !session.entitlements.promotorFlow) {
        setErrorMessage('Akun Anda tidak memiliki akses ke PromotorFlow.');
        setIsLoading(false);
        return;
      }

      router.replace(returnTo);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat masuk.');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--canvas)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 16px',
      }}
    >
     <div style={{ width: '100%', maxWidth: '360px' }}>
       <div style={{ marginBottom: 28 }}>
         <Wordmark flow />
         <h1 style={{ font: '800 26px/1.1 var(--font-sans)', letterSpacing: '-0.03em', marginTop: 18 }}>
           Masuk ke Ralivo Flow
         </h1>
         <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)', marginTop: 6 }}>
           Sistem eksekusi pipeline harian promotor
         </p>
       </div>

       <div style={{ background: 'var(--surface)', border: 'var(--sep-strong)', padding: 22 }}>
         {errorMessage && (
            <div className="field-error" role="alert" style={{ marginBottom: 16 }}>

             {errorMessage}
            </div>
         )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
           <div>
             <label className="field-label" htmlFor="flow-email">Email promotor</label>
             <input
                id="flow-email"
                type="email"
                required
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) =>setEmail(e.target.value)}
                placeholder="promotor@stifin.id"
              />
           </div>

           <div>
             <label className="field-label" htmlFor="flow-password">Kata sandi</label>
             <input
                id="flow-password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) =>setPassword(e.target.value)}
                placeholder="Kata sandi"
              />
           </div>

           <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
             {isLoading ? 'Memverifikasi...' : 'Masuk'}
            </button>
         </form>
       </div>

       <div style={{ marginTop: 20, font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted)' }}>
         Butuh bantuan akses akun? Hubungi administrator cabang Anda.
        </div>
     </div>
   </div>
 );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--canvas)' }}>
         <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Memuat halaman masuk...</div>
       </div>
     }
    >
     <LoginForm />
   </Suspense>
 );
}
