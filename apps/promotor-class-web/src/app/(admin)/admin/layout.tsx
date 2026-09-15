'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdmin } from './AdminContext';

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin', icon: '📊', desc: 'Metrik Pertumbuhan' },
  { label: 'Payout & Arus Kas', href: '/admin/payouts', icon: '💰', desc: 'Settlement & Escrow' },
  { label: 'Payment Ops', href: '/admin/orders', icon: '⚡', desc: 'Order Stream & Refund' },
  { label: 'Tenant Management', href: '/admin/tenants', icon: '🏢', desc: 'Promotor & Login As' },
  { label: 'Helpdesk Peserta', href: '/admin/helpdesk', icon: '🛟', desc: 'Koreksi & Akses Manual' },
  { label: 'Moderasi & Fraud', href: '/admin/moderation', icon: '🛡️', desc: 'Katalog & Kill Switch' },
  { label: 'Engine Room', href: '/admin/engine', icon: '⚙️', desc: 'Outbox, Latensi & Audit' },
];

function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login, logout, adminUser } = useAdmin();
  const pathname = usePathname();
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090D16', color: '#94A3B8', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
        Memverifikasi kredensial Superadmin Ralivo...
      </div>
    );
  }

  if (!isAuthenticated) {
    const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!passkey.trim()) {
        setError('Masukkan Admin Passkey.');
        return;
      }
      setIsSubmitting(true);
      try {
        const success = await login(passkey.trim());
        if (!success) {
          setError('Passkey tidak valid atau tidak memiliki otoritas Superadmin.');
        }
      } catch (err: any) {
        setError(err?.message || 'Gagal autentikasi.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090D16', padding: '24px', fontFamily: 'var(--font-sans)' }}>
        <div style={{ maxWidth: '420px', width: '100%', backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', color: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px' }}>
              R
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em' }}>Ralivo Control Plane</div>
              <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Superadmin Gateway</div>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5, marginBottom: '24px' }}>
            Akses tingkat tinggi untuk manajemen pencairan dana, transaksi Paycore, moderasi katalog, dan monitoring infrastruktur platform.
          </p>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', fontSize: '12px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                ADMIN_API_KEY
              </label>
              <input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Masukkan API key Superadmin..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#090D16',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: isSubmitting ? '#3B82F6' : '#2563EB',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {isSubmitting ? 'Memvalidasi...' : 'Masuk ke Control Plane →'}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1E293B', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
            Dilindungi oleh Fail-Closed Audit Trail & Session Guard.
          </div>
        </div>
      </div>
    );
  }

  const isNavActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', backgroundColor: '#090D16', color: '#F1F5F9', fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar Desktop */}
      <aside
        style={{
          width: '260px',
          borderRight: '1px solid #1E293B',
          backgroundColor: '#0B1120',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', color: '#FFFFFF' }}>
              R
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>Ralivo Admin</div>
              <div style={{ fontSize: '10px', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.06em' }}>CONTROL PLANE</div>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ padding: '14px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {ADMIN_NAV.map((item) => {
            const active = isNavActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: active ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                  border: active ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  color: active ? '#60A5FA' : '#94A3B8',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: active ? '#FFFFFF' : '#CBD5E1', lineHeight: 1.2 }}>{item.label}</div>
                  <div style={{ fontSize: '10px', color: active ? '#93C5FD' : '#64748B', marginTop: '2px' }}>{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div style={{ padding: '16px', borderTop: '1px solid #1E293B', backgroundColor: '#070B14' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
              <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>CF Production</span>
            </div>
            <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>v2.4.0</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#E2E8F0', marginBottom: '4px' }}>
            {adminUser?.name || 'Superadmin'}
          </div>
          <button
            type="button"
            onClick={logout}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#F87171',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '6px',
            }}
          >
            Keluar Control Plane
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Top Navbar */}
        <header
          style={{
            height: '56px',
            borderBottom: '1px solid #1E293B',
            backgroundColor: '#0B1120',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>Modul:</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
              {ADMIN_NAV.find((n) => isNavActive(n.href))?.label || 'Ralivo Admin'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link
              href="/app"
              style={{
                fontSize: '12px',
                color: '#94A3B8',
                textDecoration: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #334155',
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              Buka App Promotor ↗
            </Link>
            <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              LIVE
            </span>
          </div>
        </header>

        {/* View container */}
        <main style={{ flex: 1, padding: '24px 32px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminGate>{children}</AdminGate>
    </AdminProvider>
  );
}
