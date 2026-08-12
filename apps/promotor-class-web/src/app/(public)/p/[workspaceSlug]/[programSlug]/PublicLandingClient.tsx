'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { programRepository } from '@/adapters/mock/program-repository';
import { contactRepository } from '@/adapters/mock/contact-repository';
import { learnerRepository } from '@/adapters/mock/learner-repository';
import { Program, Enrollment } from '@promotor/contracts';

export function PublicLandingClient() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const programSlug = params.programSlug as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccessEnrollment, setRegistrationSuccessEnrollment] = useState<Enrollment | null>(null);

  useEffect(() => {
    programRepository.getProgramBySlugs(workspaceSlug, programSlug).then((prog: Program | undefined) => {
      if (prog) {
        setProgram(prog);
      } else {
        // Fallback to first program if slugs not exact
        programRepository.getPrograms().then((progs: Program[]) => {
          if (progs.length > 0) setProgram(progs[0]);
        });
      }
    });
  }, [workspaceSlug, programSlug]);

  if (!program) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat halaman program...</div>;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      // 1. Normalize phone via platform-core normalizePhone and match/create Contact
      const contact = await contactRepository.matchOrCreateContact(name.trim(), phone.trim());

      // 2. Create Enrollment
      const newEnrollment = await learnerRepository.createEnrollment(contact.id, program.id);

      // 3. Set Registration Success Access State
      setRegistrationSuccessEnrollment(newEnrollment);
    } catch (err) {
      alert('Gagal mendaftar: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // State #2: Registration Success / Access State
  if (registrationSuccessEnrollment) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas)', padding: '24px 16px' }}>
        <div
          style={{
            maxWidth: '500px',
            margin: '40px auto 0',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-md)',
            border: '2px solid var(--color-primary-border)',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
            Pendaftaran Berhasil!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-main)', marginBottom: '20px' }}>
            Program <strong>&ldquo;{program.title}&rdquo;</strong> telah berhasil ditambahkan ke akun belajar Anda.
          </p>

          <Link
            href={`/learn/programs/${registrationSuccessEnrollment.id}`}
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
            Mulai Belajar Sekarang →
          </Link>
        </div>
      </div>
    );
  }

  // State #1: Landing & Registration Form
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas)', padding: '24px 16px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Header Badge */}
        <div style={{ marginBottom: '16px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 'var(--border-radius-full)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
            }}
          >
            PROGRAM EDUKASI PROMOTOR STIFIN
          </span>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{program.title}</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
          {program.subtitle || program.description}
        </p>

        {/* Course Outline Preview */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            padding: '16px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-divider)',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Ringkasan Modul</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {program.modules.map(mod => (
              <div key={mod.id} style={{ fontSize: '13px' }}>
                <div style={{ fontWeight: 600 }}>{mod.title}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                  {mod.lessons.length} sesi pembelajaran & refleksi
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Registration Form Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            padding: '20px',
            borderRadius: 'var(--border-radius-md)',
            border: '2px solid var(--color-primary-border)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
            Daftar Gratis & Akses Materi
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Isi nama & nomor WhatsApp untuk langsung memulai pembelajaran:
          </p>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Ayu Lestari"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-divider)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Nomor WhatsApp (E.164) *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-divider)',
                  fontSize: '14px',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="touch-target-primary"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFF',
                fontWeight: 700,
                borderRadius: 'var(--border-radius-md)',
                marginTop: '6px',
              }}
            >
              {isSubmitting ? 'Mendaftarkan...' : 'Daftar & Mulai Belajar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
