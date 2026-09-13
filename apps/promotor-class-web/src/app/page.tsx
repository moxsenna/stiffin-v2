'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { PricingSection } from '@/components/platform/PricingSection';
import { ClassAppPreview } from '@/components/landing/ClassAppPreview';
import { LaunchVideoShowcase } from '@/components/landing/LaunchVideoShowcase';

export default function RootPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.search.includes('lp=1') || window.location.search.includes('preview=1'))) {
      return;
    }
    getSession()
      .then((session) => {
        if (session) router.replace('/app');
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ backgroundColor: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          backgroundColor: isScrolled ? 'rgba(255,255,255,0.94)' : 'var(--surface)',
          backdropFilter: isScrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
          borderBottom: isScrolled ? '1px solid var(--line)' : '1px solid transparent',
          transition: 'all 180ms ease',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--ink)', minWidth: 0 }}>
            <img
              src="/images/ralivo-logo.webp"
              alt="Ralivo"
              width={120}
              height={32}
              style={{ height: '32px', width: 'auto', display: 'block' }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--accent)',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Class
            </span>
          </Link>
          <nav style={{ display: 'none', alignItems: 'center', gap: 22 }} className="landing-nav-links">
            <a href="#fitur" style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-strong)', textDecoration: 'none' }}>Fitur</a>
            <a href="#cara-kerja" style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-strong)', textDecoration: 'none' }}>Cara Kerja</a>
            <a href="#flow" style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-strong)', textDecoration: 'none' }}>Ralivo Flow</a>
            <a href="#harga" style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-strong)', textDecoration: 'none' }}>Harga</a>
            <a href="#faq" style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-strong)', textDecoration: 'none' }}>FAQ</a>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Link
              href="/login"
              style={{ display: 'none', padding: '8px 14px', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', textDecoration: 'none', whiteSpace: 'nowrap' }}
              className="landing-nav-links"
            >
              Masuk
            </Link>
            <Link
              href="/login"
              style={{ padding: '9px 14px', backgroundColor: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', borderRadius: 8 }}
            >
              <span className="landing-cta-long">Buat Kelas Gratis →</span>
              <span className="landing-cta-short" style={{ display: 'none' }}>Gratis →</span>
            </Link>
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="landing-hamburger"
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 4,
                width: 44,
                height: 44,
                background: 'transparent',
                border: '2px solid var(--ink)',
                borderRadius: 8,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span style={{ width: 18, height: 2, backgroundColor: 'var(--ink)', display: 'block', borderRadius: 1 }} />
              <span style={{ width: 18, height: 2, backgroundColor: 'var(--ink)', display: 'block', borderRadius: 1 }} />
              <span style={{ width: 18, height: 2, backgroundColor: 'var(--ink)', display: 'block', borderRadius: 1 }} />
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--surface)' }}>
            <nav style={{ display: 'flex', flexDirection: 'column', padding: '8px 16px 16px' }}>
              <a href="#fitur" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 0', color: 'var(--ink)', fontWeight: 600, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--line)' }}>Fitur</a>
              <a href="#cara-kerja" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 0', color: 'var(--ink)', fontWeight: 600, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--line)' }}>Cara Kerja</a>
              <a href="#flow" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 0', color: 'var(--ink)', fontWeight: 600, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--line)' }}>Ralivo Flow</a>
              <a href="#harga" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 0', color: 'var(--ink)', fontWeight: 600, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--line)' }}>Harga</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 0', color: 'var(--ink)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>FAQ</a>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ marginTop: 12, padding: '14px', border: '2px solid var(--ink)', borderRadius: 8, textAlign: 'center', fontWeight: 700, textDecoration: 'none', color: 'var(--ink)' }}>Masuk</Link>
            </nav>
          </div>
        )}
        <style>{`@media(min-width:840px){.landing-nav-links{display:flex!important}.landing-hamburger{display:none!important}.landing-cta-short{display:none!important}.landing-cta-long{display:inline!important}}@media(max-width:839px){.landing-nav-links{display:none!important}.landing-hamburger{display:inline-flex!important}.landing-cta-long{display:none!important}.landing-cta-short{display:inline!important}}`}</style>
      </header>

      <section style={{ padding: '56px 20px 48px', maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', backgroundColor: 'var(--accent-soft)', border: '1px solid #bfdbfe', borderRadius: 9999, color: 'var(--accent-dark)', fontSize: 12.5, fontWeight: 780, marginBottom: 24, maxWidth: '100%', boxSizing: 'border-box', textAlign: 'left' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
          <span>Dirancang untuk Promotor & Ekosistem STIFIn di Seluruh Indonesia</span>
        </div>
        <h1 style={{ fontSize: 'clamp(28px,5.5vw,56px)', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.04em', maxWidth: 860, margin: '0 auto 18px' }}>
          Ubah Setiap Sesi Belajar<br />Menjadi <span style={{ color: 'var(--accent)' }}>Sinyal Intent</span> yang Menjual
        </h1>
        <p style={{ fontSize: 'clamp(15px,2vw,19px)', color: 'var(--muted-strong)', lineHeight: 1.6, maxWidth: 740, margin: '0 auto 32px', fontWeight: 450 }}>
          LMS pertama untuk promotor STIFIn. Bangun program edukasi, lacak <strong>progres & refleksi</strong>, skor <strong>intent HOT/WARM/COLD</strong>, dan kirim follow-up WA 1-tap — tanpa pindah tools.
        </p>
        <div className="hero-cta-group" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 48 }}>
          <Link href="/login" style={{ padding: '14px 26px', backgroundColor: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, boxShadow: '0 4px 14px rgba(37,99,235,0.2)' }}>Mulai Gratis — Buat Program Pertama →</Link>
          <a href="#cara-kerja" style={{ padding: '14px 26px', backgroundColor: 'var(--surface)', color: 'var(--ink)', border: '2px solid var(--ink)', fontWeight: 750, fontSize: 15, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>Lihat Cara Kerja</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 16, maxWidth: 860, margin: '0 auto', padding: '16px', backgroundColor: 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: 14, textAlign: 'center' }}>
          <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}><div style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 900, color: 'var(--accent)', wordBreak: 'break-word' }}>3</div><div style={{ fontSize: 13, color: 'var(--muted-strong)', fontWeight: 600, overflowWrap: 'anywhere' }}>Langkah: Program → Belajar → Follow-up</div></div>
          <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}><div style={{ fontSize: 'clamp(18px,3.5vw,24px)', fontWeight: 900, color: 'var(--accent)', wordBreak: 'break-word' }}>HOT/WARM/COLD</div><div style={{ fontSize: 13, color: 'var(--muted-strong)', fontWeight: 600, overflowWrap: 'anywhere' }}>Intent Otomatis per Peserta</div></div>
          <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}><div style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 900, color: 'var(--accent)' }}>D+7</div><div style={{ fontSize: 13, color: 'var(--muted-strong)', fontWeight: 600 }}>Aftercare Otomatis</div></div>
        </div>

        {/* Video Tur Walkthrough Platform */}
        <LaunchVideoShowcase />

        {/* Simulasi Interaktif Tampilan Layar */}
        <ClassAppPreview />
      </section>

      <section id="fitur" style={{ padding: '64px 24px', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 48px' }}>
            <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 12 }}>Semua yang Promotor Butuhkan — Satu Tempat</h2>
            <p style={{ fontSize: 15.5, color: 'var(--muted-strong)', lineHeight: 1.6 }}>Bukan LMS generik. Dirancang dari alur nyata promotor STIFIn: edukasi → refleksi → intent → follow-up.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
            {[
              { t: 'Program Builder Kilat', d: 'Buat modul & pelajaran (teks/video YouTube), tambah refleksi pengunci & CTA WA dalam menit, bukan jam.', h: ['Video unlisted YouTube', 'Refleksi wajib', 'CTA WA otomatis'] },
              { t: 'Intent Engine HOT/WARM/COLD', d: 'Skor intent otomatis dari progres, refleksi, dan status — promotor tahu siapa yang siap ditawarkan tes.', h: ['Skor 0-100 real-time', 'Label HOT/WARM/COLD', 'Alasan terukur'] },
              { t: 'Lifecycle & Aftercare D+7', d: 'Pantau status belajar, trigger aftercare 7 hari setelah selesai, dan cegah prospek hilang.', h: ['Status aktif/selesai/risiko', 'Aftercare otomatis', 'Timeline lengkap'] },
              { t: 'Sinkron Ralivo Flow', d: 'Enrollment Class otomatis jadi kontak Flow — follow-up WA & booking langsung jalan.', h: ['Shared Contact E.164', 'M17 sync', 'Anti duplikat'] },
            ].map((f) => (
              <div key={f.t} style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--line)', padding: '28px' }}>
                <h3 style={{ fontSize: 18, fontWeight: 850, marginBottom: 10, lineHeight: 1.3 }}>{f.t}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted-strong)', lineHeight: 1.6, margin: 0 }}>{f.d}</p>
                <div style={{ borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {f.h.map((x) => (
                    <div key={x} style={{ display: 'flex', gap: 8, fontSize: 13, fontWeight: 600 }}><span style={{ color: 'var(--accent)' }}>✓</span><span>{x}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cara-kerja" style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 40 }}>Dari Daftar ke Follow-up — 3 Langkah</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
          {[
            { n: '01', t: 'Buat Program & Share Link', d: 'Publikasikan program, dapatkan link storefront otomatis. Bagikan ke Instagram/WA. Peserta daftar, kontak & enrollment terbentuk.' },
            { n: '02', t: 'Peserta Belajar & Refleksi', d: 'Materi teks & video, refleksi pengunci, progres terukur. Sistem hitung intent dan tandai yang perlu perhatian.' },
            { n: '03', t: 'Follow-up 1-Tap di Flow', d: 'Peserta HOT muncul di Beranda promotor. Buka di Flow, kirim WA personal, booking tes, aftercare D+7 otomatis.' },
          ].map((s) => (
            <div key={s.n} style={{ border: '1px solid var(--line)', padding: 24, backgroundColor: 'var(--surface)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--accent)', marginBottom: 8 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{s.t}</h3>
              <p style={{ fontSize: 14, color: 'var(--muted-strong)', lineHeight: 1.6, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="flow" style={{ padding: '72px 24px', backgroundColor: 'var(--surface-muted)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', maxWidth: 820, margin: '0 auto 48px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                backgroundColor: 'rgba(5, 150, 105, 0.08)',
                border: '1px solid rgba(5, 150, 105, 0.25)',
                color: '#059669',
                fontSize: 12.5,
                fontWeight: 800,
                marginBottom: 16,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ width: 8, height: 8, backgroundColor: '#059669', display: 'inline-block' }} />
              Sinergi Ekosistem: Ralivo Class + Ralivo Flow
            </div>

            <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 14 }}>
              Konversi Minat Belajar Menjadi Closing Tes Nyata dengan <span style={{ color: '#059669' }}>Ralivo Flow</span>
            </h2>

            <p style={{ fontSize: 15.5, color: 'var(--muted-strong)', lineHeight: 1.65, margin: 0 }}>
              Edukasi di Ralivo Class baru langkah awal. <strong>Ralivo Flow</strong> adalah sistem operasi eksekusi harian promotor STIFIn yang memastikan setiap peserta yang teredukasi segera dikonversi menjadi sesi tes berbayar melalui antrean WhatsApp 1-tap, booking kalender mandiri, dan siklus Aftercare D+7.
            </p>
          </div>

          {/* 4 Feature Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, marginBottom: 40 }}>
            {[
              {
                b: 'Daily Execution OS',
                t: 'Antrean Tindakan Hari Ini (Today Work Queue)',
                d: 'Peserta yang menyelesaikan materi atau mengirim refleksi HOT di Class langsung muncul di antrean harian Flow. Draf pesan WA kontekstual siap dikirim dalam 1 klik tanpa bingung menyusun kata.',
                h: ['Prioritas aksi harian otomatis', 'Draf pesan WA kontekstual materi', 'Peringatan prospek tertunda (Overdue)'],
              },
              {
                b: 'Self-Booking 14-Hari',
                t: 'Halaman Booking Kalender Publik',
                d: 'Hilangkan drama bolak-balik tanya jadwal. Cukup bagikan 1 tautan booking ke peserta yang siap tes, biarkan mereka memilih slot jam konsultasi yang masih kosong sesuai ketersediaan Anda.',
                h: ['Pilih slot waktu 14-hari ke depan', 'Kunci slot real-time (anti bentrok)', 'Struk instruksi persiapan tes otomatis'],
              },
              {
                b: 'Customer Lifecycle',
                t: 'Pusat Komando CRM 6-Tahap',
                d: 'Lacak perjalanan setiap keluarga dari NEW, CONTACTED, INTERESTED, BOOKED, COMPLETED, hingga LOST. Seluruh catatan kendala belajar anak & histori pembayaran tersimpan rapi.',
                h: ['Pipeline visual 6-tahap jelas', 'Catatan profil keluarga terpusat', 'Audit alasan prospek batal (Lost Reason)'],
              },
              {
                b: 'Retensi & Repeat Order',
                t: 'Siklus Otomatis Aftercare D+7',
                d: 'Hubungan dengan klien tidak berakhir setelah tes STIFIn. Flow otomatis menjadwalkan tindakan evaluasi tepat 7 hari pasca tes — momen emas untuk menawarkan kelas lanjutan di Ralivo Class!',
                h: ['Pengingat Aftercare D+7 otomatis', 'Peluang upsell kelas parenting/mentoring', 'Pintu masuk permohonan referral keluarga'],
              },
            ].map((c) => (
              <div key={c.t} style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--line)', padding: '26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 18 }}>
                <div>
                  <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, color: '#059669', backgroundColor: 'rgba(5, 150, 105, 0.08)', padding: '3px 8px', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {c.b}
                  </div>
                  <h3 style={{ fontSize: 17.5, fontWeight: 850, marginBottom: 10, lineHeight: 1.3 }}>{c.t}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--muted-strong)', lineHeight: 1.6, margin: 0 }}>{c.d}</p>
                </div>
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {c.h.map((x) => (
                    <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600 }}>
                      <span style={{ color: '#059669' }}>✓</span>
                      <span>{x}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Workflow Diagram */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', padding: '32px 24px', marginBottom: 36 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 19, fontWeight: 850, marginBottom: 6 }}>Alur Sinergi Terpadu: Class ke Flow</h3>
              <p style={{ fontSize: 13.5, color: 'var(--muted-strong)', margin: 0 }}>Bagaimana Ralivo Class dan Ralivo Flow bekerja bergandengan tangan untuk melipatgandakan omset tes STIFIn Anda.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
              {[
                { n: '01', p: 'Ralivo Class', c: '#2563EB', t: 'Calon Klien Belajar', d: 'Mengikuti modul video & refleksi pengunci di portal storefront Anda.' },
                { n: '02', p: 'Ralivo Class', c: '#2563EB', t: 'Intent Engine HOT', d: 'Sistem menganalisis pemahaman peserta dan mengirim sinyal HOT ke Flow.' },
                { n: '03', p: 'Ralivo Flow', c: '#059669', t: '1-Tap Follow-up WA', d: 'Promotor hubungi via draf personal & bagikan link booking jadwal tes.' },
                { n: '04', p: 'Ralivo Flow', c: '#059669', t: 'Closing & Retensi D+7', d: 'Sesi tes selesai, otomatis dijadwalkan aftercare & penawaran kelas lanjutan.' },
              ].map((s) => (
                <div key={s.n} style={{ padding: 18, backgroundColor: 'var(--canvas)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>{s.n}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: s.c, backgroundColor: s.c === '#2563EB' ? 'rgba(37,99,235,0.08)' : 'rgba(5,150,105,0.08)', border: `1px solid ${s.c === '#2563EB' ? 'rgba(37,99,235,0.2)' : 'rgba(5,150,105,0.2)'}`, padding: '2px 6px', borderRadius: 4 }}>{s.p}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 4 }}>{s.t}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted-strong)', lineHeight: 1.5 }}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Callout Banner */}
          <div style={{ padding: '24px 28px', backgroundColor: 'var(--surface)', border: '1px solid rgba(5, 150, 105, 0.25)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ maxWidth: 720 }}>
              <div style={{ fontSize: 16, fontWeight: 850, color: 'var(--ink)', marginBottom: 4 }}>
                Satu Akun, Satu Langganan — Ekosistem Terpadu Ralivo
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--muted-strong)', lineHeight: 1.6 }}>
                Database kontak berbasis standar E.164 tersinkronisasi secara otomatis. Saat Anda berlangganan <strong>Ralivo Solo</strong>, Anda langsung mendapatkan akses penuh ke <strong>Ralivo Class</strong> dan <strong>Ralivo Flow</strong> tanpa biaya tambahan.
              </div>
            </div>
            <a href="#harga" style={{ padding: '10px 20px', backgroundColor: '#059669', color: '#fff', fontWeight: 800, fontSize: 13.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Lihat Paket Terpadu →
            </a>
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 24px', backgroundColor: 'var(--ink)', color: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px,4vw,36px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>Siap Ubah Edukasi Menjadi Pipeline?</h2>
        <p style={{ fontSize: 16, color: '#94a3b8', maxWidth: 640, margin: '0 auto 24px', lineHeight: 1.6 }}>Bergabung dengan promotor yang sudah pakai Ralivo Class — gratis untuk memulai, tanpa kartu kredit.</p>
        <Link href="/login" style={{ display: 'inline-flex', padding: '14px 32px', backgroundColor: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>Buat Program Pertama Gratis →</Link>
        <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>Gratis • Setup 5 menit • Support STIFIn</div>
      </section>

      <PricingSection />

      <section id="faq" style={{ padding: '48px 24px', maxWidth: 800, margin: '0 auto', borderTop: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, textAlign: 'center', marginBottom: 24 }}>Pertanyaan Umum</h2>
        {[
          { q: 'Apakah butuh kartu kredit untuk mulai?', a: 'Tidak. Paket Ralivo Free bisa langsung digunakan tanpa kartu kredit.' },
          { q: 'Berapa biaya langganan Ralivo Solo?', a: 'Paket Ralivo Solo berharga Rp 149.000/bulan atau Rp 1.190.000/tahun (hemat s/d 33%). Pembayaran didukung transfer bank dan QRIS otomatis via gateway resmi. Terdapat biaya transaksi flat Rp3.000 per penjualan program kelas berbayar tanpa potongan persentase komisi.' },
          { q: 'Apa itu Ralivo Flow dan apakah sudah termasuk dalam langganan?', a: 'Ya, sudah termasuk! Ralivo Flow adalah sistem CRM dan antrean eksekusi WhatsApp harian untuk promotor STIFIn. Ketika peserta belajar di Ralivo Class dan menunjukkan minat tinggi (HOT), data mereka otomatis masuk ke Today Work Queue di Ralivo Flow untuk di-follow up 1-tap dan diarahkan ke booking jadwal tes STIFIn. Keduanya sudah tergabung dalam satu paket langganan Ralivo Solo.' },
          { q: 'Apakah video materi harus di YouTube?', a: 'Ya, Anda dapat menggunakan video YouTube unlisted atau publik via embed resmi — tanpa biaya hosting video tambahan.' },
          { q: 'Bagaimana keamanan data peserta?', a: 'Data peserta diisolasi per organisasi promotor secara multi-tenant terenkripsi dengan format nomor E.164 terstandardisasi.' },
        ].map((f) => (
          <div key={f.q} style={{ padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{f.q}</div>
            <div style={{ fontSize: 14, color: 'var(--muted-strong)', lineHeight: 1.6 }}>{f.a}</div>
          </div>
        ))}
      </section>

      <footer style={{ padding: '32px 24px', borderTop: '1px solid var(--line)', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        © 2026 Ralivo Class — STIFIn Platform • <Link href="/login" style={{ color: 'var(--accent-dark)', fontWeight: 700 }}>Masuk Promotor</Link> • <Link href="/learn" style={{ color: 'var(--accent-dark)', fontWeight: 700 }}>Portal Peserta</Link>
      </footer>

      <style>{`@media(max-width:840px){.landing-nav-links{display:none!important}}`}</style>
    </div>
  );
}
