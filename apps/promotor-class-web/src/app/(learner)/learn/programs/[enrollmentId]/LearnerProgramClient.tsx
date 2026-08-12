'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { MockStateStore } from '@/adapters/mock/mock-state-store';
import { Enrollment, Program } from '@promotor/contracts';

export function LearnerProgramClient() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    const state = MockStateStore.getState();
    const enr = state.enrollments.find((e: Enrollment) => e.id === enrollmentId);
    if (!enr) return;
    setEnrollment(enr);
    const prog = state.programs.find((p: Program) => p.id === enr.programId);
    if (prog) setProgram(prog);
  }, [enrollmentId]);

  if (!enrollment || !program) {
    return (
      <LearnerShell>
        <div style={{ padding: '40px', textAlign: 'center' }}>Memuat program...</div>
      </LearnerShell>
    );
  }

  return (
    <LearnerShell>
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          <Link href="/learn">← Kembali ke Program Saya</Link>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{program.title}</h1>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          {program.subtitle}
        </div>

        {/* Modules & Lessons List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {program.modules.map(mod => (
            <div
              key={mod.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-divider)',
                padding: '16px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>{mod.title}</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mod.lessons.map(les => {
                  const lessonProgress = enrollment.lessonProgress[les.id];
                  const isCompleted = lessonProgress?.completed;

                  return (
                    <Link
                      key={les.id}
                      href={`/learn/programs/${enrollment.id}/lessons/${les.id}`}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--color-canvas)',
                        borderRadius: 'var(--border-radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: 'inherit',
                        textDecoration: 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{les.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {les.videoYoutubeUrl ? '🎥 Video' : '📄 Teks'} {les.hasReflection ? '· 📝 Refleksi' : ''}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isCompleted ? 'var(--color-status-success-bg)' : '#FFF',
                          color: isCompleted ? 'var(--color-status-success)' : 'var(--color-primary)',
                          border: '1px solid var(--color-divider)',
                        }}
                      >
                        {isCompleted ? '✓ Selesai' : 'Mulai →'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </LearnerShell>
  );
}
