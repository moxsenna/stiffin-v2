'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { MockStateStore } from '@/adapters/mock/mock-state-store';
import { Enrollment, Program } from '@promotor/contracts';

export function ProgramCompletedClient() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    const state = MockStateStore.getState();
    const enr = state.enrollments.find(e => e.id === enrollmentId);
    if (!enr) return;
    setEnrollment(enr);
    const prog = state.programs.find(p => p.id === enr.programId);
    if (prog) setProgram(prog);
  }, [enrollmentId]);

  if (!enrollment || !program) {
    return (
      <LearnerShell>
        <div style={{ padding: '40px', textAlign: 'center' }}>Memuat ringkasan...</div>
      </LearnerShell>
    );
  }

  const waBookingUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Mbak Rina, saya telah menyelesaikan program "${program.title}". Saya ingin konsultasi / booking Tes STIFIn.`)}`;

  return (
    <LearnerShell>
      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-primary)' }}>
          Program Selesai
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Selamat! Anda telah menyelesaikan seluruh rangkaian materi di <strong>{program.title}</strong>.
        </p>

        {/* Value Recap List */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            padding: '16px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-divider)',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
            Yang Sudah Anda Kerjakan
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {program.modules.map(mod => (
              <div key={mod.id} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--color-status-success)', fontWeight: 700 }}>✓</span>
                <span>{mod.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Step Section */}
        <div
          style={{
            backgroundColor: 'var(--color-primary-light)',
            padding: '16px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-primary-border)',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
            Langkah Berikutnya
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-main)', marginBottom: '14px' }}>
            Lanjutkan pemahaman potensi genetik anak dengan menjadwalkan <strong>Tes STIFIn Resmi</strong> atau sesi konsultasi langsung dengan Mbak Rina.
          </p>

          <a
            href={waBookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="touch-target-primary"
            style={{
              width: '100%',
              backgroundColor: 'var(--color-primary)',
              color: '#FFF',
              fontWeight: 700,
              borderRadius: 'var(--border-radius-md)',
              textAlign: 'center',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            Hubungi Promotor via WhatsApp
          </a>
        </div>

        <Link
          href="/learn"
          style={{ display: 'block', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '16px' }}
        >
          Kembali ke Beranda Belajar
        </Link>
      </div>
    </LearnerShell>
  );
}
