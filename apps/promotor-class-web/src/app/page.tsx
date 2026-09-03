'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

import { DemoAccessCard } from '@/components/platform/DemoAccessCard';

export default function RootPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
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
              src="/icon.webp"
              alt="Talira Class"
              width={34}
              height={34}
              style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>Talira Class</span>
              <span style={{ fontSize: 10, fontWeight: 650, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Client Education OS</span>
            </div>
          </Link>
          <nav style={{ display: 'none', alignItems: 'center', gap: 22 }} className="landing-nav-links">
            <a href="#akses-demo" style={{ fontSize: 14, fontWeight: 750, color: 'var(--accent-dark)', textDecoration: 'none' }}>⚡ Akun Demo</a>
            <a href="#fitur" style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-strong)', textDecoration: 'none' }}>Fitur</a>
            <a href="#cara-kerja" style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-strong)', textDecoration: 'none' }}>Cara Kerja</a>
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
              style={{ padding: '10px 14px', backgroundColor: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}
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
                width: 42,
                height: 42,
                background: 'transparent',
                border: '2px solid var(--ink)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span style={{ width: 16, height: 2, backgroundColor: 'var(--ink)', display: 'block' }} />
              <span style={{ width: 16, height: 2, backgroundColor: 'var(--ink)', display: 'block' }} />
              <span style={{ width: 16, height: 2, backgroundColor: 'var(--ink)', display: 'block' }} />
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--surface)' }}>
            <nav style={{ display: 'flex', flexDirection: 'column', padding: '8px 16px 16px' }}>
              <a href="#akses-demo" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 0', color: 'var(--accent-dark)', fontWeight: 750, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--line)' }}>⚡ Akun Demo Staging</a>
              <a href="#fitur" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 0', color: 'var(--ink)', fontWeight: 600, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--line)' }}>Fitur</a>
              <a href="#cara-kerja" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 0', color: 'var(--ink)', fontWeight: 600, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--line)' }}>Cara Kerja</a>
              <a href="#harga" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 0', color: 'var(--ink)', fontWeight: 600, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--line)' }}>Harga</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 0', color: 'var(--ink)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>FAQ</a>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ marginTop: 12, padding: '14px', border: '2px solid var(--ink)', textAlign: 'center', fontWeight: 700, textDecoration: 'none', color: 'var(--ink)' }}>Masuk</Link>
            </nav>
          </div>
        )}
        <style>{`@media(min-width:840px){.landing-nav-links{display:flex!important}.landing-hamburger{display:none!important}.landing-cta-short{display:none!important}.landing-cta-long{display:inline!important}}@media(max-width:839px){.landing-nav-links{display:none!important}.landing-hamburger{display:inline-flex!important}.landing-cta-long{display:none!important}.landing-cta-short{display:inline!important}}`}</style>
      </header>

      <section style={{ padding: '64px 24px 48px', maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', backgroundColor: 'var(--accent-soft)', border: '1px solid #bfdbfe', color: 'var(--accent-dark)', fontSize: 12.5, fontWeight: 780, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, backgroundColor: 'var(--accent)', display: 'inline-block' }} />
          Dirancang untuk Promotor & Ekosistem STIFIn di Seluruh Indonesia
        </div>
        <h1 style={{ fontSize: 'clamp(32px,5.5vw,56px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', maxWidth: 860, margin: '0 auto 18px' }}>
          Ubah Setiap Sesi Belajar<br />Menjadi <span style={{ color: 'var(--accent)' }}>Sinyal Intent</span> yang Menjual
        </h1>
        <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: 'var(--muted-strong)', lineHeight: 1.6, maxWidth: 740, margin: '0 auto 32px', fontWeight: 450 }}>
          LMS pertama untuk promotor STIFIn. Bangun program edukasi, lacak <strong>progres & refleksi</strong>, skor <strong>intent HOT/WARM/COLD</strong>, dan kirim follow-up WA 1-tap — tanpa pindah tools.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 36 }}>
          <Link href="/login" style={{ padding: '14px 28px', backgroundColor: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>Mulai Gratis — Buat Program Pertama →</Link>
          <a href="#akses-demo" style={{ padding: '14px 28px', backgroundColor: 'var(--surface)', color: 'var(--ink)', border: '2px solid var(--ink)', fontWeight: 750, fontSize: 15, textDecoration: 'none' }}>⚡ Akses Akun Demo</a>
        </div>

        {/* Prominent Demo Access Card */}
        <DemoAccessCard />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16, maxWidth: 860, margin: '0 auto', padding: '16px', backgroundColor: 'var(--surface-muted)', border: '1px solid var(--line)', textAlign: 'center' }}>
          <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}><div style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 900, color: 'var(--accent)', wordBreak: 'break-word' }}>3</div><div style={{ fontSize: 13, color: 'var(--muted-strong)', fontWeight: 600, overflowWrap: 'anywhere' }}>Langkah: Program → Belajar → Follow-up</div></div>
          <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}><div style={{ fontSize: 'clamp(18px,3.5vw,24px)', fontWeight: 900, color: 'var(--accent)', wordBreak: 'break-word' }}>HOT/WARM/COLD</div><div style={{ fontSize: 13, color: 'var(--muted-strong)', fontWeight: 600, overflowWrap: 'anywhere' }}>Intent Otomatis per Peserta</div></div>
          <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}><div style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 900, color: 'var(--accent)' }}>D+7</div><div style={{ fontSize: 13, color: 'var(--muted-strong)', fontWeight: 600 }}>Aftercare Otomatis</div></div>
        </div>
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
              { t: 'Sinkron PromotorFlow', d: 'Enrollment Class otomatis jadi kontak Flow — follow-up WA & booking langsung jalan.', h: ['Shared Contact E.164', 'M17 sync', 'Anti duplikat'] },
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
            { n: '03', t: 'Follow-up 1-Tap di Flow', d: 'Learner HOT muncul di Beranda promotor. Buka di Talira Flow, kirim WA personal, booking tes, aftercare D+7 otomatis.' },
          ].map((s) => (
            <div key={s.n} style={{ border: '1px solid var(--line)', padding: 24, backgroundColor: 'var(--surface)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--accent)', marginBottom: 8 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{s.t}</h3>
              <p style={{ fontSize: 14, color: 'var(--muted-strong)', lineHeight: 1.6, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '48px 24px', backgroundColor: 'var(--ink)', color: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px,4vw,36px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>Siap Ubah Edukasi Menjadi Pipeline?</h2>
        <p style={{ fontSize: 16, color: '#94a3b8', maxWidth: 640, margin: '0 auto 24px', lineHeight: 1.6 }}>Bergabung dengan promotor yang sudah pakai Talira Class — gratis untuk memulai, tanpa kartu kredit.</p>
        <Link href="/login" style={{ display: 'inline-flex', padding: '14px 32px', backgroundColor: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>Buat Program Pertama Gratis →</Link>
        <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>Gratis • Setup 5 menit • Support STIFIn</div>
      </section>

      <section id="harga" style={{ padding: '64px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, textAlign: 'center', marginBottom: 32 }}>Harga Simpel — Mulai Gratis</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
          <div style={{ border: '1px solid var(--line)', padding: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Gratis</h3>
            <div style={{ fontSize: 32, fontWeight: 900, margin: '12px 0' }}>Rp 0 <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>/ selamanya</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <li>✓ 1 program aktif</li>
              <li>✓ Intent scoring & refleksi</li>
              <li>✓ Storefront publik</li>
            </ul>
            <Link href="/login" style={{ display: 'block', marginTop: 20, padding: '12px', border: '2px solid var(--ink)', textAlign: 'center', fontWeight: 800, textDecoration: 'none', color: 'var(--ink)' }}>Mulai Gratis</Link>
          </div>
          <div style={{ border: '2px solid var(--ink)', padding: 32, backgroundColor: 'var(--ink)', color: '#fff' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Pro — Paling Populer</h3>
            <div style={{ fontSize: 32, fontWeight: 900, margin: '12px 0' }}>Segera <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>— hubungi kami</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: '#e2e8f0' }}>
              <li>✓ Program tanpa batas</li>
              <li>✓ Aftercare & lifecycle lengkap</li>
              <li>✓ Sinkron Talira Flow + WA 1-tap</li>
            </ul>
            <Link href="/login" style={{ display: 'block', marginTop: 20, padding: '12px', backgroundColor: 'var(--accent)', color: '#fff', textAlign: 'center', fontWeight: 800, textDecoration: 'none' }}>Pilih Pro →</Link>
          </div>
        </div>
      </section>

      <section id="faq" style={{ padding: '48px 24px', maxWidth: 800, margin: '0 auto', borderTop: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, textAlign: 'center', marginBottom: 24 }}>Pertanyaan Umum</h2>
        {[
          { q: 'Apakah butuh kartu kredit untuk mulai?', a: 'Tidak. Paket gratis bisa langsung pakai tanpa kartu kredit.' },
          { q: 'Apakah video harus di YouTube?', a: 'Ya, pakai YouTube unlisted/publik via embed resmi — tanpa hosting video terpisah.' },
          { q: 'Bagaimana data peserta aman?', a: 'Tenant isolation + E.164 + sumber event terjaga, tidak ada duplikat kontak.' },
        ].map((f) => (
          <div key={f.q} style={{ padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{f.q}</div>
            <div style={{ fontSize: 14, color: 'var(--muted-strong)', lineHeight: 1.6 }}>{f.a}</div>
          </div>
        ))}
      </section>

      <footer style={{ padding: '32px 24px', borderTop: '1px solid var(--line)', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        © 2026 Talira Class — Client Education OS • <Link href="/login" style={{ color: 'var(--accent-dark)', fontWeight: 700 }}>Masuk Promotor</Link> • <Link href="/learn" style={{ color: 'var(--accent-dark)', fontWeight: 700 }}>Portal Learner</Link>
      </footer>

      <style>{`@media(max-width:840px){.landing-nav-links{display:none!important}}`}</style>
    </div>
  );
}
