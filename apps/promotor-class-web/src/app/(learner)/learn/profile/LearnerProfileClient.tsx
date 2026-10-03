'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PwaAppHeader, PwaDock, PwaProgress } from '@/components/pwa/pwa';
import { getActiveLearnerSession, clearActiveLearnerSession, resolveWorkspaceSlug } from '@/lib/session';
import { isReferralPrototypeEnabled } from '@/lib/feature-flags';
import { getEnrollmentsByContactIdQuery } from '@/modules/enrollments/queries';
import { getProgramsQuery } from '@/modules/programs/queries';
import { getContactByIdQuery } from '@/modules/contacts/queries';
import { getPlatformApiClient } from '@/adapters';
import { Enrollment, Program, Contact, Certificate } from '@promotor/contracts';

export function LearnerProfileClient() {
  const router = useRouter();
  const [session, setSession] = useState<{ contactId: string; workspaceSlug: string } | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());
  const [loading, setLoading] = useState(true);
  const [offlineCache, setOfflineCache] = useState(true);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [cacheSize, setCacheSize] = useState<string | null>(null);

  useEffect(() => {
    const activeSession = getActiveLearnerSession();
    setSession(activeSession);
    if (!activeSession?.contactId) {
      setLoading(false);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          if (typeof est.usage === 'number' && est.usage > 0) {
            const mb = est.usage / (1024 * 1024);
            setCacheSize(mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`);
          }
        })
        .catch(() => {});
    }
    const api = getPlatformApiClient();
    Promise.all([
      getContactByIdQuery(activeSession.contactId),
      getEnrollmentsByContactIdQuery(activeSession.contactId),
      getProgramsQuery(),
      api
        .listMyCertificates()
        .then((r) => r.certificates ?? [])
        .catch(() => [] as Certificate[]),
    ])
      .then(([cnt, enrList, progList, certs]) => {
        setContact(cnt || null);
        setEnrollments(enrList);
        const pMap = new Map<string, Program>();
        progList.forEach((p) => pMap.set(p.id, p));
        setProgramsMap(pMap);
        setCertificates(certs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearActiveLearnerSession();
    const targetSlug = resolveWorkspaceSlug();
    router.push(targetSlug ? `/p/${targetSlug}` : '/learn');
  };

  if (loading) {
    return (
      <div className="pwa-screen">
        <PwaAppHeader title="Profil & Portofolio" subtitle="RALIVO PWA" showCart={false} />
        <main className="pwa-wrap pwa-screen-pad-dock">
          <div className="pwa-card pwa-card-pad" style={{ marginTop: 12, textAlign: 'center' }}>Memuat profil...</div>
        </main>
        <PwaDock workspaceSlug={session?.workspaceSlug} />
      </div>
    );
  }

  if (!session || !contact) {
    const targetWorkspace = resolveWorkspaceSlug();
    return (
      <div className="pwa-screen">
        <PwaAppHeader title="Profil & Portofolio" subtitle="RALIVO PWA" showCart={false} />
        <main className="pwa-wrap pwa-screen-pad-dock">
          <div className="pwa-card pwa-card-pad" style={{ marginTop: 12, textAlign: 'center' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>Sesi Belajar Belum Aktif</h2>
            <p className="pwa-muted" style={{ marginTop: 6 }}>
              Halaman ini menyimpan profil dan riwayat program belajar Anda. Silakan buka Katalog Program untuk memilih kelas.
            </p>
            {targetWorkspace ? (
              <Link href={`/p/${targetWorkspace}/catalog`} className="pwa-cta" style={{ marginTop: 14 }}>
                Lihat Katalog Program →
              </Link>
            ) : (
              <div className="pwa-muted" style={{ fontStyle: 'italic', marginTop: 10 }}>Buka kembali tautan Ruang Belajar dari promotor Anda.</div>
            )}
          </div>
        </main>
        <PwaDock />
      </div>
    );
  }

  const completedCount = enrollments.filter((e) => e.status === 'selesai').length;
  const displayName = contact.name || 'Peserta';
  const activeEnrollment =
    enrollments.find((e) => e.status === 'aktif') || enrollments[0] || null;
  const activeProgram = activeEnrollment ? programsMap.get(activeEnrollment.programId) : undefined;
  const shortContactId = contact.id.length > 8 ? `ID: ${contact.id.slice(0, 8).toUpperCase()}` : null;

  return (
    <div className="pwa-screen">
      <PwaAppHeader title="Profil & Portofolio" subtitle="RALIVO PWA" showCart={false} workspaceSlug={session.workspaceSlug} />

      <main className="pwa-wrap pwa-screen-pad-dock">
        {/* Biodata — Pencil spec: white card radius 16, avatar 58px ring */}
        <div className="pwa-card" style={{ marginTop: 12, padding: 14, borderRadius: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="pwa-avatar pwa-avatar-ring" style={{ width: 58, height: 58, fontSize: 23 }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 15, color: '#0F172A' }}>{displayName}</strong>
                <span className="pwa-pill pwa-pill-blue">Peserta Resmi ✓</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
                {[activeProgram?.title, shortContactId, contact.phoneE164].filter(Boolean).join(' • ')}
              </div>
            </div>
          </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" style={{ flex: 1, minHeight: 36, borderRadius: 10, border: 0, background: '#F8FAFC', color: '#0F172A', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }} onClick={() => router.push('/learn')}>
                Buka Ruang Belajar
              </button>
              <button type="button" style={{ flex: 1, minHeight: 36, borderRadius: 10, border: 0, background: '#EFF6FF', color: '#0D52FF', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }} onClick={handleLogout}>
                Ganti Akun
              </button>
            </div>
        </div>

        {/* Bento stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <div className="pwa-card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 850 }} className="tabular-nums">{certificates.length || completedCount}</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Sertifikat</div>
            <div style={{ fontSize: 10.5, color: 'var(--pwa-muted)' }}>Terverifikasi</div>
          </div>
          <div className="pwa-card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 850 }} className="tabular-nums">{enrollments.length}</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Program Diikuti</div>
            <div style={{ fontSize: 10.5, color: 'var(--pwa-muted)' }}>
              {completedCount > 0 ? `${completedCount} selesai` : 'Belum ada yang selesai'}
            </div>
          </div>
        </div>

        {/* Progress aktif */}
        {activeEnrollment && (
          <div className="pwa-card pwa-card-pad" style={{ marginTop: 10 }}>
            <div className="pwa-kicker">PROGRESS BELAJAR AKTIF</div>
            <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 4 }}>
              {activeProgram?.title || 'Program berjalan'}
            </div>
            <div style={{ marginTop: 8 }}><PwaProgress pct={activeEnrollment.progressPercent} /></div>
            <div className="pwa-muted" style={{ marginTop: 6 }}>
              {activeEnrollment.progressPercent}% Selesai • {activeEnrollment.completedLessonIds.length} materi selesai
            </div>
          </div>
        )}

        {/* Kredensial */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <strong style={{ fontSize: 15 }}>Sertifikat Terverifikasi</strong>
          <span className="pwa-pill pwa-pill-blue tabular-nums">{certificates.length} tersimpan</span>
        </div>
        <div className="pwa-muted" style={{ fontSize: 11.5 }}>Dapat diverifikasi publik via tautan di bawah</div>
        {certificates.length === 0 ? (
          <div className="pwa-card pwa-card-pad pwa-muted" style={{ marginTop: 10, textAlign: 'center' }}>
            Belum ada sertifikat. Sertifikat terbit otomatis setelah Anda menyelesaikan seluruh materi program.
          </div>
        ) : (
          certificates.map((c) => (
            <div key={c.serial} className="pwa-card" style={{ marginTop: 10, padding: 14, borderRadius: 16 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="pwa-pill" style={{ background: '#ECFDF5', color: '#059669', border: 0, minHeight: 22, padding: '0 8px', borderRadius: 6, fontSize: 10 }}>
                  LULUS • {new Date(c.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 8 }}>{c.programTitle}</div>
              <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Kredensial ID: {c.serial}</div>
              <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Atas nama: {c.recipientName}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Link
                  href={`/verify/${c.serial}`}
                  style={{ flex: 1, minHeight: 36, borderRadius: 10, border: 0, background: '#0D52FF', color: '#fff', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                >
                  Lihat Sertifikat
                </Link>
              </div>
            </div>
          ))
        )}

        {/* Riwayat belajar dari backend */}
        {enrollments.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <strong style={{ fontSize: 15 }}>Riwayat Learning Access</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {enrollments.map((enr) => {
                const prog = programsMap.get(enr.programId);
                if (!prog) return null;
                return (
                  <Link key={enr.id} href={`/learn/programs/${enr.id}`} className="pwa-card pwa-card-pad" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                    <span>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800 }}>{prog.title}</span>
                      <span className="pwa-muted" style={{ fontSize: 11.5 }}>Progres: {enr.progressPercent}%</span>
                    </span>
                    <span style={{ fontSize: 12.5, color: 'var(--pwa-primary)', fontWeight: 800 }}>Buka →</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Riwayat pendaftaran — bukti akses program dari backend */}
        <div style={{ marginTop: 16 }}>
          <strong style={{ fontSize: 15 }}>Riwayat Pendaftaran</strong>
          <div className="pwa-muted" style={{ fontSize: 11.5 }}>Program yang pernah Anda ikuti beserta progresnya</div>
          {enrollments.length === 0 ? (
            <div className="pwa-card pwa-card-pad pwa-muted" style={{ marginTop: 8, textAlign: 'center' }}>
              Belum ada riwayat pendaftaran.
            </div>
          ) : (
            enrollments.map((enr) => {
              const prog = programsMap.get(enr.programId);
              return (
                <div key={enr.id} className="pwa-card" style={{ marginTop: 8, padding: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{prog?.title || 'Program'}</div>
                    <div className="pwa-muted" style={{ fontSize: 11 }}>
                      Terdaftar {new Date(enr.enrolledAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • Progres {enr.progressPercent}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <span className={enr.status === 'selesai' ? 'pwa-pill pwa-pill-green' : 'pwa-pill pwa-pill-blue'}>
                      {enr.status === 'selesai' ? 'Selesai' : enr.status === 'dibatalkan' ? 'Dibatalkan' : 'Aktif'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {isReferralPrototypeEnabled() && (
          <Link href="/learn/referral" className="pwa-card pwa-card-pad" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginTop: 10, textDecoration: 'none', color: 'inherit', borderColor: '#BFDBFE' }}>
            <span>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: '#1E40AF' }}>Referral & Reward</span>
              <span className="pwa-muted" style={{ fontSize: 11.5 }}>Ajak teman & dapatkan voucher reward</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#2563EB' }}>Lihat →</span>
          </Link>
        )}

        {/* Preferensi PWA */}
        <div style={{ marginTop: 16 }}>
          <strong style={{ fontSize: 15 }}>Fitur PWA & Preferensi</strong>
          <div className="pwa-card pwa-card-pad" style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>Pasang PWA di HP</span>
                <span className="pwa-muted" style={{ fontSize: 11.5 }}>Akses cepat tanpa browser bar</span>
              </span>
              <button type="button" className="pwa-btn-secondary">Pasang</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginTop: 12 }}>
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>Cache Belajar Offline{cacheSize ? ` (${cacheSize})` : ''}</span>
                <span className="pwa-muted" style={{ fontSize: 11.5 }}>
                  {cacheSize ? 'Estimasi penyimpanan browser di perangkat ini' : 'Aktifkan untuk mengukur penyimpanan offline'}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={offlineCache}
                onClick={() => setOfflineCache((v) => !v)}
                style={{
                  flex: 'none', width: 36, height: 20, borderRadius: 999, border: 0, cursor: 'pointer',
                  background: offlineCache ? '#0D52FF' : '#CBD5E1', position: 'relative',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: offlineCache ? 18 : 2, width: 16, height: 16,
                  borderRadius: '50%', background: '#fff', transition: 'left 160ms ease',
                }} />
              </button>
            </div>
            <button type="button" className="pwa-btn-secondary" style={{ width: '100%', marginTop: 12 }}>
              Komunitas Discord Cohort ↗
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%', marginTop: 12, minHeight: 48, borderRadius: 12,
            border: '1px solid #F8B4B4', background: '#FDF2F2', color: '#9B1C1C',
            fontWeight: 800, fontSize: 14, cursor: 'pointer',
          }}
        >
          Keluar Akun
        </button>
      </main>

      <PwaDock workspaceSlug={session.workspaceSlug} />
    </div>
  );
}
