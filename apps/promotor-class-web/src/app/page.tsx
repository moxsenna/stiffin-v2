'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.replace('/app');
      } else {
        router.replace('/login');
      }
    }).catch(() => {
      router.replace('/login');
    });
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-canvas)',
      }}
    >
      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
        Membuka PromotorClass...
      </div>
    </div>
  );
}
