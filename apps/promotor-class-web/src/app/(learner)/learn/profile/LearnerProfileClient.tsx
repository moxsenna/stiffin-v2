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
import { Enrollment, Program, Contact } from '@promotor/contracts';

export function LearnerProfileClient() {
  const router = useRouter();
  const [session, setSession] = useState<{ contactId: string; workspaceSlug: string } | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());
  const [loading, setLoading] = useState(true);
  const [offlineCache, setOfflineCache] = useState(true);

  useEffect(() => {
    const activeSession = getActiveLearnerSession();
    setSession(activeSession);
    if (!activeSession?.contactId) {
      setLoading(false);
      return;
    }
    Promise.all([
      getContactByIdQuery(activeSession.contactId),
      getEnrollmentsByContactIdQuery(activeSession.contactId),
      getProgramsQuery(),
    ]).then(([cnt, enrList, progList]) => {
      setContact(cnt || null);
      setEnrollments(enrList);
      const pMap = new Map<string, Program>();
      progList.forEach((p) => pMap.set(p.id, p));
      setProgramsMap(pMap);
      setLoading(false);
    });
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
  const displayName = contact.name || 'Bima Pratama';

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
              <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Fullstack AI Cohort #12 • ID: RLV-882194 • Jakarta</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" style={{ flex: 1, minHeight: 36, borderRadius: 10, border: 0, background: '#F8FAFC', color: '#0F172A', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Edit Biodata</button>
            <button type="button" style={{ flex: 1, minHeight: 36, borderRadius: 10, border: 0, background: '#EFF6FF', color: '#0D52FF', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Portofolio Publik ↗</button>
          </div>
        </div>

        {/* Bento stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <div className="pwa-card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 850 }} className="tabular-nums">{Math.max(completedCount, 3)}</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Sertifikat</div>
            <div style={{ fontSize: 10.5, color: 'var(--pwa-muted)' }}>Terverifikasi LinkedIn</div>
          </div>
          <div className="pwa-card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 850 }} className="tabular-nums">2.450 XP</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Total XP</div>
            <div style={{ fontSize: 10.5, color: 'var(--pwa-muted)' }}>Top 5% Cohort 12</div>
          </div>
        </div>

        {/* Progress aktif */}
        <div className="pwa-card pwa-card-pad" style={{ marginTop: 10 }}>
          <div className="pwa-kicker">PROGRESS BELAJAR AKTIF</div>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 4 }}>Fullstack AI Engineer Cohort</div>
          <div style={{ marginTop: 8 }}><PwaProgress pct={82} /></div>
          <div className="pwa-muted" style={{ marginTop: 6 }}>82% Selesai • 18 dari 22 materi • Demo Day: 28 Feb</div>
        </div>

        {/* Kredensial */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <strong style={{ fontSize: 15 }}>Sertifikat Terverifikasi</strong>
          <span className="pwa-pill pwa-pill-blue">Lihat Semua</span>
        </div>
        <div className="pwa-muted" style={{ fontSize: 11.5 }}>Dapat diakses publik & diimpor ke LinkedIn</div>
        {[
          {
            tag: 'LULUS DENGAN PUJIAN • 10 Feb 2025',
            title: 'Fullstack Web Development & AI Engineering',
            cred: 'RLV-FSW-2025-081',
            skills: ['Next.js 15', 'LangChain', 'FastAPI'],
          },
          {
            tag: 'MINI BOOTCAMP • 15 Jan 2025',
            title: 'UI/UX Design Systems & Mobile Ergonomics',
            cred: 'RLV-UX-2025-029',
            skills: ['Figma Tokens', 'Design Ops', 'PWA UX'],
          },
        ].map((c, i) => (
          <div key={c.cred} className="pwa-card" style={{ marginTop: 10, padding: 14, borderRadius: 16 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="pwa-pill" style={{ background: i === 0 ? '#ECFDF5' : '#EFF6FF', color: i === 0 ? '#059669' : '#0D52FF', border: 0, minHeight: 22, padding: '0 8px', borderRadius: 6, fontSize: 10 }}>{c.tag}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 8 }}>{c.title}</div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Kredensial ID: {c.cred}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {c.skills.map((s) => (
                <span key={s} className="pwa-pill" style={{ background: '#F1F5F9', color: '#475569', border: 0, minHeight: 22, padding: '0 8px', borderRadius: 999, fontSize: 10.5 }}>{s}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" style={{ flex: 1, minHeight: 36, borderRadius: 10, border: 0, background: '#0D52FF', color: '#fff', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
                Lihat Sertifikat
              </button>
              <button
                type="button"
                style={{
                  flex: 1, minHeight: 44, borderRadius: 10, border: '1px solid #E2E8F0',
                  background: '#fff', color: '#0F172A', fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                }}
              >
                Unduh PDF
              </button>
            </div>
          </div>
        ))}

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

        {/* Transaksi */}
        <div style={{ marginTop: 16 }}>
          <strong style={{ fontSize: 15 }}>Riwayat Transaksi</strong>
          <div className="pwa-muted" style={{ fontSize: 11.5 }}>Bukti bayar & invoice resmi perpajakan</div>
          {[
            { t: 'Fullstack AI Cohort 12 • 12 Jan 2025 • QRIS BCA', amt: 'Rp 1.499.000' },
            { t: 'UI/UX Design Systems • 05 Nov 2024 • GoPay', amt: 'Rp 499.000' },
          ].map((r) => (
            <div key={r.t} className="pwa-card" style={{ marginTop: 8, padding: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{r.t.split('•')[0]}</div>
                <div className="pwa-muted" style={{ fontSize: 11 }}>{r.t}</div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontSize: 13, fontWeight: 850 }} className="tabular-nums">{r.amt}</div>
                <span className="pwa-pill pwa-pill-green">Lunas</span>
              </div>
            </div>
          ))}
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
                <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>Cache Belajar Offline (1.2 GB)</span>
                <span className="pwa-muted" style={{ fontSize: 11.5 }}>3 modul tersimpan di perangkat</span>
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
