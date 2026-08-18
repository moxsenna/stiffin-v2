'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicProgramDetail } from '@/modules/public-storefront/types';
import { getEnrollmentRepository } from '@/adapters';
import { setActiveLearnerSession } from '@/lib/session';

interface RegistrationSectionProps {
  detail: PublicProgramDetail;
}

export function RegistrationSection({ detail }: RegistrationSectionProps) {
  const { program, isRegistrationAllowed, registrationStatusNotice } = detail;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEnrollmentId, setCreatedEnrollmentId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRegistrationAllowed) return;

    setError(null);
    setLoading(true);

    try {
      const enrollmentRepo = getEnrollmentRepository();
      const res = await enrollmentRepo.registerPublicLearner({
        workspaceSlug: detail.promoter.workspaceSlug,
        programSlug: program.programSlug,
        name: name.trim(),
        phoneRaw: phone.trim(),
      });

      // Set active learner session with workspace context and token
      setActiveLearnerSession({
        contactId: res.contactId,
        workspaceSlug: detail.promoter.workspaceSlug,
      });

      if (typeof window !== 'undefined' && res.accessToken) {
        localStorage.setItem(`learner_token_${res.contactId}`, res.accessToken);
      }

      setCreatedEnrollmentId(res.enrollmentId);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat pendaftaran. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="register" className="container" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        {/* Copy Column */}
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 820,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              marginBottom: '12px',
            }}
          >
            Akses Ruang Belajar
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              letterSpacing: '-0.04em',
              marginBottom: '14px',
              fontWeight: 750,
              lineHeight: 1.15,
            }}
          >
            Mulai kenali dan optimalkan potensi genetik Anda sekarang.
          </h2>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '15px',
              lineHeight: 1.65,
            }}
          >
            Masukkan nama dan nomor WhatsApp aktif Anda. Materi pembelajaran langsung terbuka dan progres Anda tersimpan dengan rapi di aplikasi.
          </p>
        </div>

        {/* Form Card Column */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-divider)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: 'var(--shadow)',
          }}
        >
          {createdEnrollmentId ? (
            <div
              style={{
                border: '1px solid #cfded3',
                backgroundColor: '#f4f8f5',
                padding: '20px',
                borderRadius: '14px',
              }}
            >
              <strong
                style={{
                  display: 'block',
                  color: 'var(--color-primary)',
                  marginBottom: '6px',
                  fontSize: '16px',
                }}
              >
                Pendaftaran Berhasil!
              </strong>
              <p style={{ fontSize: '14px', color: '#55544f', marginBottom: '16px' }}>
                Program telah ditambahkan ke ruang belajar Anda.
              </p>
              <Link
                href={`/learn/programs/${createdEnrollmentId}`}
                className="touch-target-primary"
                style={{
                  width: '100%',
                  minHeight: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  fontWeight: 780,
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Mulai belajar sekarang →
              </Link>
            </div>
          ) : isRegistrationAllowed ? (
            <div>
              <h3 style={{ fontSize: '20px', marginBottom: '6px', fontWeight: 750 }}>
                Daftar & Buka Akses
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.55,
                  marginBottom: '18px',
                }}
              >
                Program ini gratis untuk umum & calon peserta STIFIn. Materi langsung dapat diakses setelah mendaftar.
              </p>

              {error && (
                <div
                  style={{
                    backgroundColor: '#FDF2F2',
                    border: '1px solid #F8B4B4',
                    color: '#9B1C1C',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '14px',
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 750,
                      marginBottom: '6px',
                    }}
                  >
                    Nama lengkap
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    style={{
                      width: '100%',
                      minHeight: '46px',
                      border: '1px solid var(--color-divider)',
                      borderRadius: '11px',
                      padding: '0 14px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 750,
                      marginBottom: '6px',
                    }}
                  >
                    Nomor WhatsApp
                  </label>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0812 3456 7890"
                    style={{
                      width: '100%',
                      minHeight: '46px',
                      border: '1px solid var(--color-divider)',
                      borderRadius: '11px',
                      padding: '0 14px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    fontWeight: 780,
                    fontSize: '14px',
                    border: 0,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '4px',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Memproses pendaftaran...' : 'Daftar & mulai belajar'}
                </button>

                <div style={{ fontSize: '11px', color: '#929087', lineHeight: 1.5, marginTop: '8px' }}>
                  Dengan mendaftar, Anda menyetujui penggunaan data untuk akses program dan komunikasi terkait pembelajaran.
                </div>
              </form>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--color-surface-muted)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid var(--color-divider)',
              }}
            >
              <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 750 }}>
                {program.programType === 'aftersales' ? 'Khusus Peserta Tes STIFIn' : 'Program Berbayar'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                {registrationStatusNotice ||
                  'Pendaftaran mandiri secara umum tidak tersedia untuk materi ini.'}
              </p>
              {detail.promoter.whatsappPhoneE164 ? (
                <a
                  href={`https://wa.me/${detail.promoter.whatsappPhoneE164.replace(/\+/g, '')}?text=Saya%20ingin%20tanya%20akses%20program%20ini`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    textDecoration: 'none',
                    marginTop: '12px',
                  }}
                >
                  Hubungi Promotor via WhatsApp
                </a>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    color: 'var(--color-text-main)',
                    fontWeight: 700,
                    fontSize: '13px',
                    marginTop: '12px',
                  }}
                >
                  Hubungi Promotor untuk Akses
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
