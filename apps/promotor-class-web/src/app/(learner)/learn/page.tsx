'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { getActiveLearnerContactId, resolveWorkspaceSlug } from '@/lib/session';
import { getEnrollmentsByContactIdQuery } from '@/modules/enrollments/queries';
import { getProgramsQuery } from '@/modules/programs/queries';
import { Enrollment, Program } from '@promotor/contracts';

export default function LearnerHomePage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());
  const [noSession, setNoSession] = useState(false);
  const [fallbackWorkspace, setFallbackWorkspace] = useState<string | null>(null);

  useEffect(() => {
    const activeContactId = getActiveLearnerContactId();
    const resolvedSlug = resolveWorkspaceSlug();
    setFallbackWorkspace(resolvedSlug);

    if (!activeContactId) {
      setNoSession(true);
      return;
    }

    Promise.all([
      getEnrollmentsByContactIdQuery(activeContactId),
      getProgramsQuery(),
    ]).then(([enrList, progList]) => {
      setEnrollments(enrList);
      const pMap = new Map<string, Program>();
      progList.forEach(p => pMap.set(p.id, p));
      setProgramsMap(pMap);
    });
  }, []);

  if (noSession) {
    return (
      <LearnerShell title="Program Saya">
        <div style={{ padding: '48px 16px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px', color: 'var(--color-text-main)' }}>
            Belum Memiliki Program Aktif
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
            Halaman ini menampilkan seluruh kelas dan e-course yang sedang Anda ikuti. Silakan buka Katalog Program untuk mendaftar materi yang tersedia.
          </p>

          {fallbackWorkspace ? (
            <Link
              href={`/p/${fallbackWorkspace}/catalog`}
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
              Buka Katalog Program →
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
    <LearnerShell title="Program Saya" subtitle="Lanjutkan sesi pembelajaran Anda">
      <div style={{ padding: '20px 0' }}>
        {enrollments.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--color-divider)',
              fontSize: '14px',
              color: 'var(--color-text-muted)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <p style={{ marginBottom: '20px', lineHeight: 1.5 }}>
              Anda belum terdaftar dalam program pembelajaran apa pun saat ini.
            </p>
            {fallbackWorkspace && (
              <Link
                href={`/p/${fallbackWorkspace}/catalog`}
                className="touch-target-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 22px',
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
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {enrollments.map(enr => {
              const prog = programsMap.get(enr.programId);
              if (!prog) return null;

              const isCompleted = enr.status === 'selesai' || enr.progressPercent === 100;

              return (
                <div
                  key={enr.id}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--border-radius-lg)',
                    border: '1px solid var(--color-divider)',
                    padding: '22px',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
                      {prog.title}
                    </h3>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 750,
                        padding: '3px 10px',
                        borderRadius: 'var(--border-radius-full)',
                        backgroundColor: isCompleted ? 'var(--color-status-success-bg)' : 'var(--color-primary-light)',
                        color: isCompleted ? 'var(--color-status-success)' : 'var(--color-primary)',
                        border: isCompleted ? '1px solid var(--color-status-success-border)' : '1px solid var(--color-primary-border)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isCompleted ? '✓ Selesai' : 'Sedang Berjalan'}
                    </span>
                  </div>

                  <p style={{ fontSize: '13.5px', color: 'var(--color-text-body)', marginBottom: '18px', lineHeight: 1.55 }}>
                    {prog.subtitle}
                  </p>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 550 }}>Progres Belajar</span>
                      <span className="tabular-nums" style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                        {enr.progressPercent}%
                      </span>
                    </div>
                    <div style={{ height: '7px', backgroundColor: 'var(--color-canvas)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--color-divider)' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${enr.progressPercent}%`,
                          backgroundColor: 'var(--color-primary)',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/learn/programs/${enr.id}`}
                    className="touch-target-primary"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFF',
                      fontWeight: 780,
                      fontSize: '14px',
                      borderRadius: 'var(--border-radius-md)',
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {isCompleted ? 'Lihat Ringkasan & Hasil' : 'Lanjutkan Belajar →'}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LearnerShell>
  );
}
