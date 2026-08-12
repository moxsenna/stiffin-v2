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
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 750, marginBottom: '8px' }}>
            Sesi Pembelajaran Belum Aktif
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            Silakan mendaftar terlebih dahulu pada salah satu program edukasi promotor Anda untuk mengakses materi belajar.
          </p>

          {fallbackWorkspace ? (
            <Link
              href={`/p/${fallbackWorkspace}`}
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
              Kembali ke Ruang Belajar →
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
      <div style={{ padding: '16px' }}>
        {enrollments.length === 0 ? (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '16px',
              border: '1px solid var(--color-divider)',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              Anda belum terdaftar dalam program pembelajaran apa pun.
            </p>
            {fallbackWorkspace && (
              <Link
                href={`/p/${fallbackWorkspace}/catalog`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFF',
                  fontWeight: 700,
                  borderRadius: '10px',
                  textDecoration: 'none',
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

              return (
                <div
                  key={enr.id}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: '16px',
                    border: '1px solid var(--color-divider)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 750 }}>{prog.title}</h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        backgroundColor: enr.status === 'selesai' ? 'var(--color-status-success-bg)' : 'var(--color-primary-light)',
                        color: enr.status === 'selesai' ? 'var(--color-status-success)' : 'var(--color-primary)',
                      }}
                    >
                      {enr.status === 'selesai' ? 'Selesai' : 'Sedang Berjalan'}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                    {prog.subtitle}
                  </p>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Progres Belajar</span>
                      <span className="tabular-nums" style={{ fontWeight: 750, color: 'var(--color-primary)' }}>
                        {enr.progressPercent}%
                      </span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${enr.progressPercent}%`, backgroundColor: 'var(--color-primary)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>

                  <Link
                    href={`/learn/programs/${enr.id}`}
                    className="touch-target-primary"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFF',
                      fontWeight: 750,
                      borderRadius: '12px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {enr.status === 'selesai' ? 'Lihat Hasil & Ringkasan' : 'Lanjutkan Belajar'}
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
