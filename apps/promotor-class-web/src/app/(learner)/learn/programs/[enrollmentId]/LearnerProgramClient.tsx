'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { getActiveLearnerContactId } from '@/lib/session';
import { getEnrollmentByIdQuery } from '@/modules/enrollments/queries';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { getEnrollmentFullDetailsQuery } from '@/modules/learning/queries';
import { Enrollment, Program } from '@promotor/contracts';

export function LearnerProgramClient() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const details = await getEnrollmentFullDetailsQuery(enrollmentId);
        if (details?.enrollment && details?.program) {
          const enr: any = details.enrollment;
          const prog: any = details.program;

          const activeContactId = getActiveLearnerContactId();
          if (activeContactId && enr.contactId && enr.contactId !== activeContactId) {
            setAccessDenied(true);
            return;
          }

          if (enr.progressPercent === 100 || enr.learningStatus === 'COMPLETED') {
            router.push(`/learn/programs/${enrollmentId}/completed`);
            return;
          }

          const progressMap: Record<string, any> = {};
          for (const m of prog.modules || []) {
            for (const l of m.lessons || []) {
              progressMap[l.id] = {
                completed: !!l.isCompleted,
                completedAt: l.completedAt || '',
                reflectionAnswer: l.reflection?.responseText || undefined,
              };
            }
          }

          setEnrollment({
            ...enr,
            lessonProgress: progressMap,
          } as any);

          setProgram({
            ...prog,
            modules: (prog.modules || []).map((m: any) => ({
              ...m,
              lessons: (m.lessons || []).map((l: any) => ({
                ...l,
                videoYoutubeUrl: l.videoUrl || l.videoYoutubeUrl,
                hasReflection: !!l.reflectionType,
                hasCta: !!l.ctaType,
              })),
            })),
          } as any);
          return;
        }
      } catch (err) {
        console.warn('[LearnerProgramClient] getEnrollmentFullDetailsQuery fallback:', err);
      }

      // Fallback
      getEnrollmentByIdQuery(enrollmentId).then(enr => {
        if (!enr) return;
        const activeContactId = getActiveLearnerContactId();
        if (activeContactId && enr.contactId !== activeContactId) {
          setAccessDenied(true);
          return;
        }
        setEnrollment({
          ...enr,
          lessonProgress: enr.lessonProgress || {},
        });
        getProgramByIdQuery(enr.programId).then(prog => {
          if (prog) setProgram(prog);
        });
      });
    }

    loadData();
  }, [enrollmentId]);

  if (accessDenied) {
    return (
      <LearnerShell>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-status-danger)', marginBottom: '8px' }}>
            Akses Ditolak
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Anda tidak memiliki hak akses ke program pembelajaran ini.
          </p>
          <Link href="/learn" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
            ← Kembali ke Program Saya
          </Link>
        </div>
      </LearnerShell>
    );
  }

  if (!enrollment || !program) {
    return (
      <LearnerShell>
        <div style={{ padding: '40px', textAlign: 'center' }}>Memuat program...</div>
      </LearnerShell>
    );
  }

  return (
    <LearnerShell title={program.title}>
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
                  const lessonProgress = (enrollment.lessonProgress && enrollment.lessonProgress[les.id]) || undefined;
                  const isCompleted = (les as any).isCompleted ?? lessonProgress?.completed;

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
                          {les.videoYoutubeUrl ? 'Video' : 'Teks'} {les.hasReflection ? '· Refleksi' : ''}
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
