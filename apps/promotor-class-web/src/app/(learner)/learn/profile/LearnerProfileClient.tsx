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

  const completedCount = enrollments.filter(e => e.status === 'selesai').length;
  const inProgressCount = enrollments.filter(e => e.status !== 'selesai').length;

  if (loading) {
    return (
      <LearnerShell title="Profil Saya">
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Memuat profil...
        </div>
      </LearnerShell>
    );
  }

  if (!session || !contact) {
    const targetWorkspace = resolveWorkspaceSlug();

    return (
      <LearnerShell title="Profil Saya">
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-hover)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: 'var(--color-text-muted)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 750, marginBottom: '8px' }}>
            Sesi Belajar Belum Aktif
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            Halaman ini menyimpan profil dan riwayat program belajar Anda. Jika Anda calon peserta atau baru pertama kali datang, silakan buka Katalog Program untuk memilih e-course gratis atau program pendampingan STIFIn.
          </p>

          {targetWorkspace ? (
            <Link
              href={`/p/${targetWorkspace}/catalog`}
              className="touch-target-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 24px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFF',
                fontWeight: 700,
                borderRadius: '12px',
                textDecoration: 'none',
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
      <div style={{ padding: '20px 16px' }}>
        {/* Profile Info Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            border: '1px solid var(--color-divider)',
            padding: '24px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
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
              fontWeight: 750,
              flexShrink: 0,
            }}
          >
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 750, marginBottom: '2px' }}>
              {contact.name}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              WhatsApp: {contact.phoneE164}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 650, marginTop: '4px' }}>
              Promotor: {session.workspaceSlug}
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
              borderRadius: '14px',
              border: '1px solid var(--color-divider)',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)' }} className="tabular-nums">
              {inProgressCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Sedang Berjalan
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '14px',
              border: '1px solid var(--color-divider)',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-status-success)' }} className="tabular-nums">
              {completedCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Program Selesai
            </div>
          </div>
        </div>

        {/* Enrolled Programs List */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '12px' }}>
            Riwayat Learning Access
          </h3>
          {enrollments.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '12px',
                border: '1px solid var(--color-divider)',
                padding: '20px',
                fontSize: '13px',
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
                      borderRadius: '12px',
                      border: '1px solid var(--color-divider)',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textDecoration: 'none',
                      color: 'var(--color-text-main)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{prog.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Progres: {enr.progressPercent}%
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-primary)',
                        fontWeight: 700,
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

        {/* Referral Program Banner / Entry Card */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            href="/learn/referral"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid #BFDBFE',
              borderRadius: '14px',
              padding: '16px',
              textDecoration: 'none',
              color: 'var(--color-text-main)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                🎁
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 750, color: '#1E40AF' }}>
                  Referral & Reward
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Ajak teman belajar STIFIn & dapatkan voucher reward
                </div>
              </div>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 750, color: '#2563EB' }}>
              Lihat →
            </span>
          </Link>
        </div>

        {/* Session Action */}
        <div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              minHeight: '48px',
              borderRadius: '12px',
              border: '1px solid #F8B4B4',
              backgroundColor: '#FDF2F2',
              color: '#9B1C1C',
              fontWeight: 700,
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
