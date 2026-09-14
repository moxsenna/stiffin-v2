'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { ProgressBar, EmptyState } from '@/components/ui';
import { getActiveLearnerContactId, resolveWorkspaceSlug, setActiveLearnerSession } from '@/lib/session';
import { getPlatformApiClient } from '@/adapters';
import { Enrollment, Certificate } from '@promotor/contracts';

function findNextLesson(prog: any, enr: any): { moduleTitle: string; title: string; id: string } | null {
  if (!prog || !prog.modules) return null;
  const completedIds = enr.completedLessonIds || [];
  for (const mod of prog.modules) {
    for (const lesson of mod.lessons || []) {
      if (!completedIds.includes(lesson.id)) {
        return { moduleTitle: mod.title, title: lesson.title, id: lesson.id };
      }
    }
  }
  return null;
}

export default function LearnerHomePage() {
  const [enrollments, setEnrollments] = useState<any[] | null>(null);
  const [programsMap, setProgramsMap] = useState<Map<string, any>>(new Map());
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [noSession, setNoSession] = useState(false);
  const [fallbackWorkspace, setFallbackWorkspace] = useState<string | null>(null);

  useEffect(() => {
    const activeContactId = getActiveLearnerContactId();
    const resolvedSlug = resolveWorkspaceSlug();
    setFallbackWorkspace(resolvedSlug);

    const api = getPlatformApiClient();

    // 1. Sync session profile
    api.getLearnerMe()
      .then((res) => {
        if (res?.learner?.contactId) {
          setActiveLearnerSession({
            contactId: res.learner.contactId,
            workspaceSlug: res.learner.workspaceSlug,
          });
          if (res.learner.workspaceSlug) {
            setFallbackWorkspace(res.learner.workspaceSlug);
          }
        }
      })
      .catch(() => {
        if (!activeContactId) {
          setNoSession(true);
        }
      });

    // 2. Load learner programs
    api.getMyLearnerPrograms()
      .then((res) => {
        const progs = res.programs ?? [];
        setEnrollments(progs);
        const pMap = new Map<string, any>();
        progs.forEach((p: any) => {
          pMap.set(p.programId || p.id, {
            id: p.programId || p.id,
            title: p.programTitle || p.title,
            subtitle: p.programSubtitle || p.subtitle,
            coverImageUrl: p.coverImageUrl,
            modules: p.modules || [],
          });
        });
        setProgramsMap(pMap);
      })
      .catch((err) => {
        console.warn('Failed to load learner programs:', err);
        if (!activeContactId) {
          setNoSession(true);
        } else {
          setEnrollments([]);
        }
      });

    // 3. Certificates
    api.listMyCertificates()
      .then((res) => setCertificates(res.certificates ?? []))
      .catch(() => setCertificates([]));
  }, []);

  if (noSession) {
    return (
      <LearnerShell title="Ruang Belajar Peserta">
        <EmptyState
          title="Belum masuk ke akun peserta"
          explanation="Silakan masuk atau daftar akun peserta untuk mengakses program dan materi pembelajaran Anda."
          action={
            <Link href="/masuk" className="btn btn-accent">
              Masuk / Daftar Akun
            </Link>
          }
        />
      </LearnerShell>
    );
  }

  const list = enrollments ?? [];
  const activeEnrollment =
    list.find((e) => e.status === 'ENROLLED' || e.status === 'STARTED' || e.status === 'aktif') || list[0];
  const activeProgram = activeEnrollment ? programsMap.get(activeEnrollment.programId) : undefined;
  const nextLesson = findNextLesson(activeProgram, activeEnrollment);

  return (
    <LearnerShell title="Program Saya" subtitle="Lanjutkan sesi pembelajaran Anda">
      {activeEnrollment && (
        <div className="ink-hero">
          <div className="kicker kicker-on-ink">Lanjutkan belajar</div>
          <div style={{ marginTop: 10, font: '800 19px/1.2 var(--font-sans)', letterSpacing: '-0.02em' }}>
            {nextLesson ? nextLesson.title : activeProgram?.title || 'Program Edukasi Anda'}
          </div>
          <div style={{ marginTop: 7, font: '500 11px/1.3 var(--font-sans)', color: 'var(--on-ink-muted)' }}>
            {nextLesson ? `${nextLesson.moduleTitle} · ${activeProgram?.title ?? ''}` : (activeProgram?.subtitle || '')}
          </div>
          <div style={{ marginTop: 14 }}>
            <ProgressBar
              pct={activeEnrollment.progressPercent ?? 0}
              accent
              label={`Progres ${activeEnrollment.progressPercent ?? 0}%`}
            />
          </div>
          <div style={{ marginTop: 8, font: '600 11px/1 var(--font-sans)', color: 'var(--on-ink-muted)' }} className="tabular-nums">
            {activeEnrollment.progressPercent ?? 0}% selesai
          </div>
          <Link
            href={
              nextLesson
                ? `/learn/programs/${activeEnrollment.id}/lessons/${nextLesson.id}`
                : `/learn/programs/${activeEnrollment.id}`
            }
            className="btn btn-accent"
            style={{ marginTop: 16 }}
          >
            Lanjutkan pelajaran
          </Link>
        </div>
      )}

      {!enrollments && (
        <div style={{ padding: 24 }} className="loading-state">
          <div className="skeleton-line" style={{ width: '80%' }} />
          <div className="skeleton-line" style={{ width: '60%' }} />
        </div>
      )}

      {enrollments && list.length === 0 && (
        <EmptyState
          title="Anda belum terdaftar dalam program pembelajaran apa pun"
          explanation="Pilih program dari katalog untuk mulai belajar."
          action={
            fallbackWorkspace ? (
              <Link href={`/p/${fallbackWorkspace}/catalog`} className="btn btn-secondary btn-sm">
                Lihat Katalog Program
              </Link>
            ) : (
              <Link href="/masuk" className="btn btn-secondary btn-sm">
                Masuk dengan Akun Lain
              </Link>
            )
          }
        />
      )}

      {certificates.length > 0 && (
        <section style={{ marginTop: 12 }}>
          <div className="kicker">Sertifikat Saya</div>
          {certificates.map((cert) => (
            <a
              key={cert.serial}
              href={`/verify/${cert.serial}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'block', padding: 12, border: '1px solid var(--border)', marginTop: 8 }}
            >
              <strong style={{ font: '700 14px/1.4 var(--font-sans)' }}>🎓 {cert.programTitle}</strong>
              <div className="kicker kicker-muted">{cert.serial}</div>
            </a>
          ))}
        </section>
      )}

      {list.length > 0 && (
        <>
          <div
            style={{
              padding: '14px 18px 10px',
              font: '700 10px/1 var(--font-sans)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted-strong)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            Program Anda
          </div>
          {list.map((enr) => {
            const prog = programsMap.get(enr.programId);
            const isCompleted = enr.status === 'COMPLETED' || enr.status === 'selesai' || enr.progressPercent === 100;
            return (
              <div key={enr.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ font: '700 14px/1.25 var(--font-sans)' }}>{prog?.title || enr.programTitle || 'Program'}</span>
                  <span className={`tag ${isCompleted ? 'tag-neutral' : 'tag-outline'}`} style={{ flex: 'none' }}>
                    {isCompleted ? 'Selesai' : 'Berjalan'}
                  </span>
                </div>
                <div className="row-meta">
                  {enr.progressPercent ?? 0}% · {prog?.modules?.length ?? enr.modulesCount ?? 0} bab
                </div>
                <Link
                  href={`/learn/programs/${enr.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 8 }}
                >
                  Buka Ruang Belajar
                </Link>
              </div>
            );
          })}
        </>
      )}
    </LearnerShell>
  );
}
