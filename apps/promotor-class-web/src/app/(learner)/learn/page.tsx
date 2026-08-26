'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { ProgressBar, EmptyState } from '@/components/ui';
import { getActiveLearnerContactId, resolveWorkspaceSlug } from '@/lib/session';
import { getEnrollmentsByContactIdQuery } from '@/modules/enrollments/queries';
import { getProgramsQuery } from '@/modules/programs/queries';
import { Enrollment, Program } from '@promotor/contracts';

function findNextLesson(prog: Program | undefined, enr: Enrollment): { moduleTitle: string; title: string; id: string } | null {
  if (!prog) return null;
  for (const mod of prog.modules) {
    for (const lesson of mod.lessons) {
      if (!enr.completedLessonIds.includes(lesson.id)) {
        return { moduleTitle: mod.title, title: lesson.title, id: lesson.id };
      }
    }
  }
  return null;
}

export default function LearnerHomePage() {
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());
  const [noSession, setNoSession] = useState(false);
  const [fallbackWorkspace, setFallbackWorkspace] = useState<string | null>(null);

  useEffect(() =>{
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
    ]).then(([enrList, progList]) =>{
      setEnrollments(enrList);
      const pMap = new Map<string, Program>();
      progList.forEach(p =>pMap.set(p.id, p));
      setProgramsMap(pMap);
    });
  }, []);

  if (noSession) {
    return (
      <LearnerShell title="Program Saya">
       <EmptyState
          title="Belum memiliki program aktif"
          explanation="Daftar dan mulai belajar melalui Katalog Program. Buka kembali tautan Ruang Belajar dari promotor Anda bila tautan hilang."
          action={
            fallbackWorkspace ? (
              <Link href={`/p/${fallbackWorkspace}/catalog`} className="btn btn-accent">
               Lihat Katalog Program
              </Link>
           ) : undefined
          }
        />
     </LearnerShell>
   );
  }

  const list = enrollments ?? [];
  const activeEnrollment = list.find(e =>e.status === 'aktif');
  const activeProgram = activeEnrollment ? programsMap.get(activeEnrollment.programId) : undefined;
  const nextLesson = findNextLesson(activeProgram, activeEnrollment as Enrollment);

  return (
    <LearnerShell title="Program Saya" subtitle="Lanjutkan sesi pembelajaran Anda">
     {activeEnrollment && (
        <div className="ink-hero">
         <div className="kicker kicker-on-ink">Lanjutkan belajar</div>
         <div style={{ marginTop: 10, font: '800 19px/1.2 var(--font-sans)', letterSpacing: '-0.02em' }}>
           {nextLesson ? nextLesson.title : activeProgram?.title || 'Program Anda'}
          </div>
         <div style={{ marginTop: 7, font: '500 11px/1.3 var(--font-sans)', color: 'var(--on-ink-muted)' }}>
           {nextLesson ? `${nextLesson.moduleTitle} · ${activeProgram?.title ?? ''}` : (activeProgram?.subtitle || '')}
          </div>
         <div style={{ marginTop: 14 }}>
           <ProgressBar pct={activeEnrollment.progressPercent} accent label={`Progres ${activeEnrollment.progressPercent}%`} />
         </div>
         <div style={{ marginTop: 8, font: '600 11px/1 var(--font-sans)', color: 'var(--on-ink-muted)' }} className="tabular-nums">
           {activeEnrollment.progressPercent}% selesai
          </div>
         <Link
            href={nextLesson ? `/learn/programs/${activeEnrollment.id}/lessons/${nextLesson.id}` : `/learn/programs/${activeEnrollment.id}`}
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
           ) : undefined
          }
        />
     )}

      {list.length >0 && (
        <>
         <div style={{ padding: '14px 18px 10px', font: '700 10px/1 var(--font-sans)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted-strong)', borderBottom: '1px solid var(--line)' }}>
           Program Anda
          </div>
         {list.map(enr =>{
            const prog = programsMap.get(enr.programId);
            const isActive = enr.status !== 'selesai';
            return (
              <div key={enr.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                 <span style={{ font: '700 14px/1.25 var(--font-sans)' }}>{prog?.title || 'Program'}</span>
                 <span className={`tag ${isActive ? 'tag-outline' : 'tag-neutral'}`} style={{ flex: 'none' }}>
                   {enr.status === 'selesai' ? 'Selesai' : 'Berjalan'}
                  </span>
               </div>
               <div className="row-meta">{enr.progressPercent}% · {prog?.modules.length ?? 0} bab</div>
               <Link
                  href={`/learn/programs/${enr.id}`}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 12 }}
                >
                 {enr.status === 'selesai' ? 'Lihat Hasil & Ringkasan' : 'Lanjutkan Belajar'}
                </Link>
             </div>
           );
          })}
        </>
     )}
      <div style={{ height: 24 }} />
   </LearnerShell>
 );
}
