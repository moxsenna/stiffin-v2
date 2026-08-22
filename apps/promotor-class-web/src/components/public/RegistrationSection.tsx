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

      // Atomically redeem token to establish secure HttpOnly session cookie
      if (res.accessToken) {
        try {
          await enrollmentRepo.redeemToken(res.accessToken);
        } catch (redeemErr) {
          console.warn('[RegistrationSection] Token auto-redemption notice:', redeemErr);
        }
      }

      // Set active learner session with workspace context
      setActiveLearnerSession({
        contactId: res.contactId,
        workspaceSlug: detail.promoter.workspaceSlug,
      });

      setCreatedEnrollmentId(res.enrollmentId);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat pendaftaran. Silakan periksa kembali nomor WhatsApp Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="register" className="container" style={{ paddingTop: '54px', paddingBottom: '60px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        {/* Copy Column */}
        <div>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 38px)',
              letterSpacing: '-0.03em',
              marginBottom: '14px',
              fontWeight: 850,
              lineHeight: 1.15,
              color: 'var(--color-text-main)',
            }}
          >
            Mulai Belajar & Kenali Potensi Genetik Anda
          </h2>
          <p
            style={{
              color: 'var(--color-text-body)',
              fontSize: '15px',
              lineHeight: 1.65,
            }}
          >
            Daftar dengan nomor WhatsApp aktif Anda. Materi pembelajaran langsung terbuka dan progres belajar Anda tersimpan otomatis di webapp.
          </p>
        </div>

        {/* Form Card Column */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--border-radius-xl)',
            padding: '28px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {createdEnrollmentId ? (
            <div
              style={{
                border: '1px solid var(--color-primary-border)',
                backgroundColor: 'var(--color-primary-light)',
                padding: '24px',
                borderRadius: 'var(--border-radius-md)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <strong
                style={{
                  display: 'block',
                  color: 'var(--color-primary)',
                  marginBottom: '6px',
                  fontSize: '17px',
                  fontWeight: 800,
                }}
              >
                Pendaftaran Berhasil!
              </strong>
              <p style={{ fontSize: '13.5px', color: 'var(--color-text-body)', marginBottom: '18px' }}>
                Program telah ditambahkan ke ruang belajar Anda.
              </p>
              <Link
                href={`/learn/programs/${createdEnrollmentId}`}
                className="touch-target-primary"
                style={{
                  width: '100%',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  fontWeight: 780,
                  fontSize: '14.5px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                Buka & Mulai Belajar →
              </Link>
            </div>
          ) : isRegistrationAllowed ? (
            <div>
              <h3 style={{ fontSize: '19px', marginBottom: '6px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                Daftar & Akses Materi
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                }}
              >
                Program ini dapat diakses langsung setelah mengisi data singkat berikut:
              </p>

              {error && (
                <div
                  style={{
                    backgroundColor: 'var(--color-status-danger-bg)',
                    border: '1px solid var(--color-status-danger-border)',
                    color: 'var(--color-status-danger)',
                    padding: '10px 14px',
                    borderRadius: 'var(--border-radius-sm)',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '16px',
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 750,
                      marginBottom: '6px',
                      color: 'var(--color-text-main)',
                    }}
                  >
                    Nama Lengkap
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      border: '1px solid var(--color-divider)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '0 14px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 750,
                      marginBottom: '6px',
                      color: 'var(--color-text-main)',
                    }}
                  >
                    Nomor WhatsApp Aktif
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
                      minHeight: '44px',
                      border: '1px solid var(--color-divider)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '0 14px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="touch-target-primary"
                  style={{
                    width: '100%',
                    borderRadius: 'var(--border-radius-md)',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    fontWeight: 780,
                    fontSize: '14.5px',
                    border: 0,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '4px',
                    opacity: loading ? 0.7 : 1,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {loading ? 'Mendaftarkan...' : 'Daftar & Mulai Belajar'}
                </button>

                <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', lineHeight: 1.5, marginTop: '4px', textAlign: 'center' }}>
                  Data digunakan secara aman untuk akses ruang belajar & komunikasi materi.
                </div>
              </form>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--color-canvas)',
                padding: '24px',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-divider)',
              }}
            >
              <h3 style={{ fontSize: '17px', marginBottom: '8px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                {program.programType === 'aftersales' ? 'Khusus Peserta Tes STIFIn' : 'Program Berbayar'}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                {registrationStatusNotice ||
                  'Pendaftaran mandiri secara umum tidak dibuka untuk program ini.'}
              </p>
              {detail.promoter.whatsappPhoneE164 ? (
                <a
                  href={`https://wa.me/${detail.promoter.whatsappPhoneE164.replace(/\+/g, '')}?text=${encodeURIComponent(`Halo ${detail.promoter.displayName}, saya ingin menanyakan akses untuk program ${program.title}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-target-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    borderRadius: 'var(--border-radius-md)',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 780,
                    fontSize: '13.5px',
                    textDecoration: 'none',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  Hubungi Promotor via WhatsApp
                </a>
              ) : (
                <div
                  className="touch-target-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    borderRadius: 'var(--border-radius-md)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    color: 'var(--color-text-muted)',
                    fontWeight: 700,
                    fontSize: '13.5px',
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
