'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { getActiveLearnerContactId } from '@/lib/session';
import { getEnrollmentsByContactIdQuery } from '@/modules/enrollments/queries';
import { getProgramsQuery } from '@/modules/programs/queries';
import { Enrollment, Program } from '@promotor/contracts';

export default function LearnerHomePage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());
  const [noSession, setNoSession] = useState(false);

  useEffect(() => {
    const activeContactId = getActiveLearnerContactId();

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
      <LearnerShell>
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Sesi Pembelajaran Tidak Ditemukan
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
            Silakan mendaftar terlebih dahulu pada salah satu program publik kami untuk mengakses materi belajar.
          </p>
          <Link
            href="/p/rina/7-hari-mengenal-cara-belajar-anak"
            className="touch-target-primary"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFF',
              fontWeight: 700,
              borderRadius: 'var(--border-radius-md)',
              textDecoration: 'none',
            }}
          >
            Lihat Program Edukasi Gratis →
          </Link>
        </div>
      </LearnerShell>
    );
  }

  return (
    <LearnerShell>
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Program Belajar Saya</h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Lanjutkan sesi pembelajaran Anda
          </div>
        </div>

        {enrollments.length === 0 ? (
          <div
            style={{
              padding: '30px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-divider)',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
            }}
          >
            Anda belum terdaftar dalam program pembelajaran apa pun.
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
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-divider)',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{prog.title}</h3>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--border-radius-sm)',
                        backgroundColor: enr.status === 'selesai' ? 'var(--color-status-success-bg)' : 'var(--color-primary-light)',
                        color: enr.status === 'selesai' ? 'var(--color-status-success)' : 'var(--color-primary)',
                      }}
                    >
                      {enr.status === 'selesai' ? 'Selesai' : 'Sedang Berjalan'}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                    {prog.subtitle}
                  </p>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>Progres</span>
                      <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {enr.progressPercent}%
                      </span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--color-divider)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${enr.progressPercent}%`, backgroundColor: 'var(--color-primary)' }} />
                    </div>
                  </div>

                  {/* Learner Route MUST use enrollmentId! */}
                  <Link
                    href={`/learn/programs/${enr.id}`}
                    className="touch-target-primary"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFF',
                      fontWeight: 700,
                      borderRadius: 'var(--border-radius-md)',
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'block',
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
