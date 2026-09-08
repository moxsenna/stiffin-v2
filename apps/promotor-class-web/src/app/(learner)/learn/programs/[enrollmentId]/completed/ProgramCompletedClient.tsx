'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { CertificateCard } from '@/components/learner/CertificateCard';
import { LoadingRows } from '@/components/ui';
import { getPlatformApiClient } from '@/adapters';
import { ApiError } from '@promotor/api-client';
import { getEnrollmentByIdQuery } from '@/modules/enrollments/queries';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { getEnrollmentFullDetailsQuery } from '@/modules/learning/queries';
import { getPublicWorkspaceQuery } from '@/modules/public-storefront/queries';
import { resolveWorkspaceSlug } from '@/lib/session';
import { Enrollment, Program, Certificate } from '@promotor/contracts';
import { buildConsultationClaimMessage } from '@/lib/wa-templates';

export function ProgramCompletedClient() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [promoterPhone, setPromoterPhone] = useState<string | null>(null);
  const [reflectionTopics, setReflectionTopics] = useState<string[]>([]);
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    async function loadData() {
      let detailsFound = false;
      let progress: number | undefined;
      try {
        const details = await getEnrollmentFullDetailsQuery(enrollmentId);
        if (details?.enrollment && details?.program) {
          detailsFound = true;
          setEnrollment(details.enrollment as any);
          setProgram(details.program as any);
          progress = (details as any)?.enrollment?.progressPercent;

          const modules = (details as any)?.program?.modules ?? (details as any)?.modules ?? [];
          const topics = modules
            .flatMap((m: any) => m.lessons ?? [])
            .map((l: any) => l.reflection?.responseText)
            .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0);
          setReflectionTopics(topics);
        }
      } catch (err) {
        console.warn('[ProgramCompletedClient] getEnrollmentFullDetailsQuery fallback:', err);
      }

      if (!detailsFound) {
        const enr = await getEnrollmentByIdQuery(enrollmentId);
        if (enr) {
          setEnrollment(enr);
          progress = (enr as any)?.progressPercent;
          const prog = await getProgramByIdQuery(enr.programId);
          if (prog) setProgram(prog);
          setReflectionTopics([]);
        }
      }

      if (progress === 100) {
        try {
          const res = await getPlatformApiClient().issueCertificateCommand(enrollmentId);
          if (res?.certificate) setCertificate(res.certificate);
        } catch (err) {
          if (err instanceof ApiError && err.code === 'PROGRAM_NOT_COMPLETED') return;
          console.warn('[ProgramCompletedClient] issueCertificateCommand skip:', err);
        }
      }

      const currentWorkspace = resolveWorkspaceSlug();
      if (currentWorkspace) {
        const workspaceProfile = await getPublicWorkspaceQuery(currentWorkspace);
        if (workspaceProfile?.whatsappPhoneE164) {
          setPromoterPhone(workspaceProfile.whatsappPhoneE164.replace(/[^0-9]/g, ''));
        }
      }
    }
    loadData();
  }, [enrollmentId]);

  if (!enrollment || !program) {
    return (
      <LearnerShell title="Program Selesai">
        <LoadingRows rows={3} />
      </LearnerShell>
    );
  }

  const reflectionCount = enrollment.completedLessonIds?.length ?? 0;
  const claimMessage = buildConsultationClaimMessage({
    learnerName: (enrollment as any)?.contactName ?? null,
    programTitle: program.title,
    reflectionTopics,
  });
  const waUrl = promoterPhone
    ? `https://wa.me/${promoterPhone}?text=${encodeURIComponent(claimMessage)}`
    : null;

  return (
    <LearnerShell title="Program Selesai">
      <div className="accent-hero">
        <div className="kicker">Program selesai</div>
        <h1 style={{ font: '800 34px/1.05 var(--font-sans)', letterSpacing: '-0.035em', marginTop: 14 }}>
          Program Selesai
        </h1>
        <p style={{ marginTop: 12, font: '400 14px/1.55 var(--font-sans)', maxWidth: 320 }}>
          Selamat! Anda menyelesaikan seluruh materi di <strong>{program.title}</strong>.
        </p>
      </div>

      <section style={{ padding: '18px', borderBottom: '1px solid var(--line)' }}>
        <div className="kicker kicker-muted">Yang sudah Anda kerjakan</div>
        <div style={{ marginTop: 10, font: '600 13px/1.4 var(--font-sans)' }} className="tabular-nums">
          {program.modules.length} modul · {reflectionCount} pelajaran selesai
        </div>
        <div style={{ marginTop: 8 }}>
          {program.modules.map(mod => (
            <div key={mod.id} className="timeline-row" style={{ gap: 10 }}>
              <span style={{ color: 'var(--accent-dark)', fontWeight: 700, flex: 'none' }}>✓</span>
              <span style={{ font: '500 13px/1.4 var(--font-sans)' }}>{mod.title}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '18px' }}>
        <div className="kicker kicker-muted">Langkah berikutnya</div>
        <h2 style={{ font: '700 17px/1.3 var(--font-sans)', marginTop: 10 }}>
          Jadwalkan Tes STIFIn Resmi
        </h2>
        <p style={{ marginTop: 8, font: '400 13px/1.55 var(--font-sans)', color: 'var(--muted-strong)' }}>
          Lanjutkan pemahaman potensi genetik anak dengan konsultasi langsung bersama promotor Anda.
        </p>

        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-block" style={{ marginTop: 16 }}>
            Hubungi Promotor via WhatsApp
          </a>
        )}

        <Link href="/learn" className="btn btn-secondary btn-block" style={{ marginTop: 8 }}>
         Kembali ke Beranda Belajar
        </Link>
     </section>

      {certificate && (
        <CertificateCard
          certificate={certificate}
          verifyUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${certificate.serial}`}
        />
      )}
   </LearnerShell>
 );
}
