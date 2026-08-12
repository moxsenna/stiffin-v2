'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { MockStateStore } from '@/adapters/mock/mock-state-store';
import { Enrollment, Program } from '@promotor/contracts';

export default function LearnerHomePage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());

  useEffect(() => {
    const state = MockStateStore.getState();
    setEnrollments(state.enrollments);

    const pMap = new Map<string, Program>();
    state.programs.forEach(p => pMap.set(p.id, p));
    setProgramsMap(pMap);
  }, []);

  return (
    <LearnerShell>
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Program Belajar Saya</h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Lanjutkan sesi pembelajaran Anda
          </div>
        </div>

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
      </div>
    </LearnerShell>
  );
}
