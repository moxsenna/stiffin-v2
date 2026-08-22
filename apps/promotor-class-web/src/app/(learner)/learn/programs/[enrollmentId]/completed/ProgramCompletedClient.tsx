'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { getEnrollmentByIdQuery } from '@/modules/enrollments/queries';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { getEnrollmentFullDetailsQuery } from '@/modules/learning/queries';
import { getPublicWorkspaceQuery } from '@/modules/public-storefront/queries';
import { resolveWorkspaceSlug } from '@/lib/session';
import { Enrollment, Program } from '@promotor/contracts';

export function ProgramCompletedClient() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [promoterPhone, setPromoterPhone] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const details = await getEnrollmentFullDetailsQuery(enrollmentId);
        if (details?.enrollment && details?.program) {
          setEnrollment(details.enrollment as any);
          setProgram(details.program as any);
        }
      } catch (err) {
        console.warn('[ProgramCompletedClient] getEnrollmentFullDetailsQuery fallback:', err);
      }

      if (!enrollment) {
        const enr = await getEnrollmentByIdQuery(enrollmentId);
        if (enr) {
          setEnrollment(enr);
          const prog = await getProgramByIdQuery(enr.programId);
          if (prog) setProgram(prog);
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
      <LearnerShell>
        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 600 }}>
          Memuat ringkasan kelulusan...
        </div>
      </LearnerShell>
    );
  }

  const waBookingUrl = promoterPhone
    ? `https://wa.me/${promoterPhone}?text=${encodeURIComponent(`Halo, saya telah menyelesaikan program "${program.title}". Saya ingin konsultasi lanjutan / booking Tes STIFIn.`)}`
    : null;

  return (
    <LearnerShell title="Program Selesai" showBack={true} backHref="/learn">
      <div style={{ padding: '24px 0', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-status-success-bg)',
              color: 'var(--color-status-success)',
              border: '1px solid var(--color-status-success-border)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 850, letterSpacing: '-0.025em', marginBottom: '6px', color: 'var(--color-text-main)' }}>
            Selamat, Program Selesai!
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>
            Anda telah menuntaskan seluruh materi pembelajaran di <strong>{program.title}</strong>.
          </p>
        </div>

        {/* Value Recap List */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            padding: '22px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '14px' }}>
            Rangkaian Materi yang Dituntaskan
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {program.modules.map((mod, idx) => (
              <div key={mod.id} style={{ fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-body)' }}>
                <span style={{ color: 'var(--color-status-success)', fontWeight: 800 }}>✓</span>
                <span>Modul {idx + 1}: {mod.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Step Section */}
        <div
          style={{
            backgroundColor: 'var(--color-primary-light)',
            padding: '24px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-primary-border)',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '6px' }}>
            Langkah Selanjutnya
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-body)', lineHeight: 1.6, marginBottom: '18px' }}>
            Optimalkan pemahaman potensi genetik keluarga Anda dengan menjadwalkan <strong>Tes STIFIn Resmi</strong> atau sesi konsultasi lanjutan bersama Promotor Anda.
          </p>

          {waBookingUrl && (
            <a
              href={waBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target-primary"
              style={{
                width: '100%',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 780,
                fontSize: '14px',
                borderRadius: 'var(--border-radius-md)',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.056-1.528-.276-1.157-.428-2.023-1.428-2.614-2.228-.06-.081-.462-.614-.462-1.17 0-.555.289-.828.391-.938.102-.11.222-.138.297-.138.074 0 .148.002.212.006.069.004.16.027.247.234.089.213.308.751.336.806.028.055.046.12.009.193-.036.073-.056.12-.11.184-.056.064-.117.142-.167.193-.056.055-.114.116-.049.227.065.111.288.475.617.768.424.377.781.493.892.548.111.055.176.046.241-.028.065-.074.278-.324.352-.435.074-.111.148-.093.247-.056.1.037.63.297.738.351.108.055.18.083.207.129.028.046.028.67-.116 1.075z" />
              </svg>
              Jadwalkan Konsultasi via WhatsApp
            </a>
          )}
        </div>

        <Link
          href="/learn"
          style={{
            display: 'block',
            textAlign: 'center',
            fontSize: '13.5px',
            color: 'var(--color-text-muted)',
            fontWeight: 650,
            padding: '10px',
          }}
        >
          ← Kembali ke Beranda Belajar
        </Link>
      </div>
    </LearnerShell>
  );
}
