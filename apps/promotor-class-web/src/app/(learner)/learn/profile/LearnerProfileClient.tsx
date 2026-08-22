'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import {
  getActiveLearnerSession,
  clearActiveLearnerSession,
  resolveWorkspaceSlug,
} from '@/lib/session';
import { isReferralPrototypeEnabled } from '@/lib/feature-flags';
import { getEnrollmentsByContactIdQuery } from '@/modules/enrollments/queries';
import { getProgramsQuery } from '@/modules/programs/queries';
import { getContactByIdQuery } from '@/modules/contacts/queries';
import { Enrollment, Program, Contact } from '@promotor/contracts';

export function LearnerProfileClient() {
  const router = useRouter();
  const [session, setSession] = useState<{ contactId: string; workspaceSlug: string } | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeSession = getActiveLearnerSession();
    setSession(activeSession);

    if (!activeSession?.contactId) {
      setLoading(false);
      return;
    }

    Promise.all([
      getContactByIdQuery(activeSession.contactId),
      getEnrollmentsByContactIdQuery(activeSession.contactId),
      getProgramsQuery(),
    ]).then(([cnt, enrList, progList]) => {
      setContact(cnt || null);
      setEnrollments(enrList);
      const pMap = new Map<string, Program>();
      progList.forEach(p => pMap.set(p.id, p));
      setProgramsMap(pMap);
      setLoading(false);
    });
  }, []);

  const handleLogout = () => {
    clearActiveLearnerSession();
    const targetSlug = resolveWorkspaceSlug();
    if (targetSlug) {
      router.push(`/p/${targetSlug}`);
    } else {
      router.push('/learn');
    }
  };

  const completedCount = enrollments.filter(e => e.status === 'selesai' || e.progressPercent === 100).length;
  const inProgressCount = enrollments.filter(e => e.status !== 'selesai' && e.progressPercent < 100).length;

  if (loading) {
    return (
      <LearnerShell title="Profil Saya">
        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 600 }}>
          Memuat profil learner...
        </div>
      </LearnerShell>
    );
  }

  if (!session || !contact) {
    const targetWorkspace = resolveWorkspaceSlug();

    return (
      <LearnerShell title="Profil Saya">
        <div style={{ padding: '48px 16px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-hover)',
              border: '1px solid var(--color-divider)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: 'var(--color-text-muted)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px', color: 'var(--color-text-main)' }}>
            Sesi Belajar Belum Aktif
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
            Halaman ini menyimpan profil dan riwayat program belajar Anda. Silakan buka Katalog Program untuk mendaftar materi yang tersedia.
          </p>

          {targetWorkspace ? (
            <Link
              href={`/p/${targetWorkspace}/catalog`}
              className="touch-target-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 24px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFF',
                fontWeight: 780,
                fontSize: '14px',
                borderRadius: 'var(--border-radius-md)',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Lihat Katalog Program →
            </Link>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
              Buka kembali tautan Ruang Belajar dari promotor Anda.
            </div>
          )}
        </div>
      </LearnerShell>
    );
  }

  return (
    <LearnerShell title="Profil Saya" workspaceSlug={session.workspaceSlug}>
      <div style={{ padding: '20px 0' }}>
        {/* Profile Info Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '24px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 850,
              flexShrink: 0,
              border: '1px solid var(--color-primary-border)',
            }}
          >
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em', marginBottom: '2px' }}>
              {contact.name}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              WhatsApp: {contact.phoneE164}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-primary)', fontWeight: 700, marginTop: '4px' }}>
              Ruang Belajar: {session.workspaceSlug}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-divider)',
              padding: '18px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ fontSize: '26px', fontWeight: 850, color: 'var(--color-primary)' }} className="tabular-nums">
              {inProgressCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
              Sedang Berjalan
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-divider)',
              padding: '18px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ fontSize: '26px', fontWeight: 850, color: 'var(--color-status-success)' }} className="tabular-nums">
              {completedCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>
              Program Selesai
            </div>
          </div>
        </div>

        {/* Enrolled Programs List */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '15.5px', fontWeight: 800, marginBottom: '14px', color: 'var(--color-text-main)' }}>
            Riwayat Akses Pembelajaran
          </h3>
          {enrollments.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-divider)',
                padding: '24px',
                fontSize: '13.5px',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
              }}
            >
              Belum ada program yang terdaftar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {enrollments.map(enr => {
                const prog = programsMap.get(enr.programId);
                if (!prog) return null;

                return (
                  <Link
                    key={enr.id}
                    href={`/learn/programs/${enr.id}`}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderRadius: 'var(--border-radius-md)',
                      border: '1px solid var(--color-divider)',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textDecoration: 'none',
                      color: 'var(--color-text-main)',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 750 }}>{prog.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Progres: {enr.progressPercent}%
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-primary)',
                        fontWeight: 750,
                      }}
                    >
                      Buka →
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Referral Program Banner / Entry Card (Prototype Gate) */}
        {isReferralPrototypeEnabled() && (
          <div style={{ marginBottom: '24px' }}>
            <Link
              href="/learn/referral"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-status-info-border)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '18px',
                textDecoration: 'none',
                color: 'var(--color-text-main)',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-status-info-bg)',
                    color: 'var(--color-status-info)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 12 20 22 4 22 4 12" />
                    <rect x="2" y="7" width="20" height="5" />
                    <line x1="12" y1="22" x2="12" y2="7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 780, color: 'var(--color-status-info)' }}>
                    Referral & Reward
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Ajak rekan belajar STIFIn & dapatkan voucher reward
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 780, color: 'var(--color-status-info)' }}>
                Lihat →
              </span>
            </Link>
          </div>
        )}

        {/* Session Action */}
        <div>
          <button
            onClick={handleLogout}
            className="touch-target-primary"
            style={{
              width: '100%',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-status-danger-border)',
              backgroundColor: 'var(--color-status-danger-bg)',
              color: 'var(--color-status-danger)',
              fontWeight: 780,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Keluar dari Sesi Belajar
          </button>
        </div>
      </div>
    </LearnerShell>
  );
}
