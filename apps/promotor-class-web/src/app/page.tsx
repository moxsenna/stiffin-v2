'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import Link from 'next/link';

export default function LandingHomePage() {
  const [activeTab, setActiveTab] = useState<'promotor' | 'learner'>('promotor');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'Bagaimana cara kerja PromotorClass dalam meningkatkan penjualan tes STIFIn?',
      a: 'Alih-alih melakukan hard selling atau broadcast promo yang sering diabaikan, Anda membagikan e-course singkat (misal: "7 Hari Mengenal Cara Belajar Anak"). Calon klien mendapatkan solusi praktis dan menuliskan lembar refleksi kondisi anaknya. PromotorClass mendeteksi tingkat minat (intent scoring) dan menyiapkan draf pesan WhatsApp personal yang relevan untuk mengajak mereka booking tes STIFIn.',
    },
    {
      q: 'Apakah saya perlu keahlian teknis atau coding untuk membuat program?',
      a: 'Sama sekali tidak. PromotorClass menyediakan template program yang siap pakai serta form pembuatan bab dan materi yang sangat intuitif. Anda cukup memasukkan link video YouTube dan pertanyaan refleksi.',
    },
    {
      q: 'Di mana video materi pembelajaran disimpan?',
      a: 'Anda dapat menggunakan video yang diunggah ke YouTube secara "Unlisted" (tidak terdaftar di pencarian publik) atau publik. PromotorClass akan menampilkan pemutar video yang bersih tanpa distraksi rekomendasi video lain.',
    },
    {
      q: 'Apakah peserta harus menginstal aplikasi dari Play Store / App Store?',
      a: 'Tidak perlu. PromotorClass adalah Progressive Web App (PWA) modern yang langsung terbuka cepat di browser smartphone peserta tanpa perlu install apapun, dengan antarmuka yang 100% ramah mobile.',
    },
    {
      q: 'Bagaimana peserta terhubung ke nomor WhatsApp saya?',
      a: 'Setiap promotor memiliki storefront mandiri (misal: /p/rina) yang langsung terhubung ke nomor WhatsApp Anda. Di akhir setiap materi atau program, tersedia tombol konsultasi langsung yang membuka chat WhatsApp dengan Anda.',
    },
  ];

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-canvas)', color: 'var(--color-text-main)', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Global Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <div
          className="container"
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Brand Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '16px',
              }}
            >
              P
            </div>
            <div>
              <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
                PromotorClass
              </span>
              <span
                style={{
                  display: 'none',
                  marginLeft: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-primary-soft)',
                  color: 'var(--color-primary)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
                className="desktop-only"
              >
                Client Education OS
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <a href="#fitur" style={{ fontSize: '13.5px', fontWeight: 550, color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              Fitur Utama
            </a>
            <a href="#demo" style={{ fontSize: '13.5px', fontWeight: 550, color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              Preview Interaktif
            </a>
            <a href="#cara-kerja" style={{ fontSize: '13.5px', fontWeight: 550, color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              Cara Kerja
            </a>
            <a href="#faq" style={{ fontSize: '13.5px', fontWeight: 550, color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href="/p/rina"
              className="desktop-only btn-secondary"
              style={{ minHeight: '38px', padding: '0 14px', fontSize: '13px' }}
            >
              Lihat Contoh Storefront ↗
            </Link>

            <Link
              href="/app"
              className="btn-primary"
              style={{ minHeight: '40px', padding: '0 16px', fontSize: '13.5px' }}
            >
              Masuk Workspace Promotor →
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section style={{ paddingTop: 'clamp(40px, 6vw, 72px)', paddingBottom: 'clamp(40px, 6vw, 64px)', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '880px' }}>
          {/* Eyebrow Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12.5px',
              fontWeight: 700,
              marginBottom: '20px',
              border: '1px solid var(--color-primary-border)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'inline-block' }} />
            Client Education OS & Intent Signal Engine untuk Promotor STIFIn
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: 'clamp(28px, 4.8vw, 52px)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.12,
              marginBottom: '18px',
              color: 'var(--color-text-main)',
            }}
          >
            Ubah Konten Edukasi Singkat Menjadi Klien Tes STIFIn Berkualitas Tinggi.
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
              marginBottom: '32px',
              maxWidth: '720px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Berikan e-course 3–7 hari yang menyelesaikan masalah nyata calon klien. PromotorClass mendeteksi refleksi belajar, mengukur sinyal minat (intent score), dan menyiapkan draf WhatsApp personal untuk follow-up tanpa kesan *hard-selling*.
          </p>

          {/* Direct Primary Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '40px',
            }}
          >
            <Link
              href="/app"
              className="touch-target-primary"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '15px',
                padding: '0 24px',
                borderRadius: 'var(--border-radius-md)',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Buka Demo Promotor OS</span>
              <span>→</span>
            </Link>

            <Link
              href="/p/rina/7-hari-mengenal-cara-belajar-anak"
              className="touch-target-primary"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-main)',
                border: '1px solid var(--color-divider)',
                fontWeight: 650,
                fontSize: '14.5px',
                padding: '0 20px',
                borderRadius: 'var(--border-radius-md)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🎓 Coba Pengalaman Peserta</span>
            </Link>
          </div>

          {/* Trust & Proof Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '16px',
              paddingTop: '24px',
              borderTop: '1px solid var(--color-divider)',
              textAlign: 'center',
            }}
          >
            <div>
              <strong style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', display: 'block' }}>100%</strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Mobile-First untuk Peserta</span>
            </div>
            <div>
              <strong style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', display: 'block' }}>1-Klik</strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Follow-up Personal WhatsApp</span>
            </div>
            <div>
              <strong style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', display: 'block' }}>Intent Scoring</strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Deteksi Minat Klien Otomatis</span>
            </div>
            <div>
              <strong style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', display: 'block' }}>Zero Server</strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Cepat di Cloudflare Edge</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Product Showcase (Tab Switcher) */}
      <section id="demo" style={{ paddingTop: '56px', paddingBottom: '56px', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', marginBottom: '8px' }}>
              Dua Sisi Pengalaman Terintegrasi
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
              Lihat Bagaimana Promotor dan Peserta Berinteraksi
            </h2>
          </div>

          {/* Tab Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('promotor')}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--border-radius-full)',
                fontSize: '13.5px',
                fontWeight: activeTab === 'promotor' ? 750 : 550,
                backgroundColor: activeTab === 'promotor' ? 'var(--color-primary)' : 'var(--color-canvas)',
                color: activeTab === 'promotor' ? '#FFFFFF' : 'var(--color-text-muted)',
                border: `1px solid ${activeTab === 'promotor' ? 'var(--color-primary)' : 'var(--color-divider)'}`,
                cursor: 'pointer',
                transition: 'all var(--motion-fast)',
              }}
            >
              💼 1. Workspace Promotor (Intent & Follow-up)
            </button>

            <button
              onClick={() => setActiveTab('learner')}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--border-radius-full)',
                fontSize: '13.5px',
                fontWeight: activeTab === 'learner' ? 750 : 550,
                backgroundColor: activeTab === 'learner' ? 'var(--color-primary)' : 'var(--color-canvas)',
                color: activeTab === 'learner' ? '#FFFFFF' : 'var(--color-text-muted)',
                border: `1px solid ${activeTab === 'learner' ? 'var(--color-primary)' : 'var(--color-divider)'}`,
                cursor: 'pointer',
                transition: 'all var(--motion-fast)',
              }}
            >
              📱 2. Ruang Belajar Peserta (Mobile E-Course)
            </button>
          </div>

          {/* Tab Content 1: Promotor View */}
          {activeTab === 'promotor' && (
            <div
              style={{
                backgroundColor: 'var(--color-canvas)',
                borderRadius: 'var(--border-radius-xl)',
                border: '1px solid var(--color-divider)',
                padding: 'clamp(18px, 3vw, 28px)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 750, color: 'var(--color-text-main)', margin: 0 }}>
                    Antrean Kerja Promotor: &quot;Perlu Perhatian&quot;
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Peserta yang menyelesaikan materi & mengisi refleksi siap untuk di-follow up.
                  </div>
                </div>

                <Link
                  href="/app"
                  className="btn-primary"
                  style={{ minHeight: '36px', fontSize: '12.5px', padding: '0 14px' }}
                >
                  Buka Halaman Promotor Asli →
                </Link>
              </div>

              {/* Mock Work Queue Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  className="list-item-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--color-text-main)' }}>Ayu Rahma</strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>+62 812-3456-7890</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                      Menyelesaikan e-course 7 Hari Mengenal Cara Belajar Anak
                    </div>
                    <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                      &ldquo;Kalau sudah main HP, anak saya sulit sekali berhenti dan sering tantrum jika diminta belajar...&rdquo;
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-status-success-bg)',
                        color: 'var(--color-status-success)',
                        padding: '2px 8px',
                        borderRadius: 'var(--border-radius-xs)',
                        display: 'inline-block',
                        marginBottom: '4px',
                      }}
                    >
                      ● Minat tinggi (92/100)
                    </span>
                    <Link
                      href="/app"
                      style={{
                        display: 'block',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                      }}
                    >
                      Follow up WA →
                    </Link>
                  </div>
                </div>

                <div
                  className="list-item-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--color-text-main)' }}>Budi Santoso</strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>+62 813-9876-5432</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                      Mengisi refleksi materi Modul 2
                    </div>
                    <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                      &ldquo;Tertarik dengan tes STIFIn untuk menentukan penjurusan SMA anak pertama saya.&rdquo;
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-status-warning-bg)',
                        color: 'var(--color-status-warning)',
                        padding: '2px 8px',
                        borderRadius: 'var(--border-radius-xs)',
                        display: 'inline-block',
                        marginBottom: '4px',
                      }}
                    >
                      ● Minat sedang (74/100)
                    </span>
                    <Link
                      href="/app"
                      style={{
                        display: 'block',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                      }}
                    >
                      Follow up WA →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Learner View */}
          {activeTab === 'learner' && (
            <div
              style={{
                backgroundColor: 'var(--color-canvas)',
                borderRadius: 'var(--border-radius-xl)',
                border: '1px solid var(--color-divider)',
                padding: 'clamp(18px, 3vw, 28px)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 750, color: 'var(--color-text-main)', margin: 0 }}>
                    Tampilan Sisi Peserta: Distraction-Free & Lembar Refleksi
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Peserta fokus menonton video, membaca materi singkat, dan mengisi refleksi sebelum membuka materi berikutnya.
                  </div>
                </div>

                <Link
                  href="/learn"
                  className="btn-primary"
                  style={{ minHeight: '36px', fontSize: '12.5px', padding: '0 14px' }}
                >
                  Buka Portal Peserta Asli →
                </Link>
              </div>

              {/* Mock Learner Card */}
              <div
                style={{
                  maxWidth: '520px',
                  margin: '0 auto',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid var(--color-divider)',
                  padding: '20px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 750, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Modul 1 · Sesi 1
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>
                  Mengenali Sinyal Stres Belajar pada Anak
                </h4>

                {/* Video container mock */}
                <div
                  style={{
                    backgroundColor: '#1E293B',
                    borderRadius: '10px',
                    aspectRatio: '16 / 9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontSize: '13px',
                    fontWeight: 650,
                    marginBottom: '16px',
                  }}
                >
                  ▶ Video Edukasi YouTube (5 Menit)
                </div>

                {/* Reflection box mock */}
                <div
                  style={{
                    backgroundColor: 'var(--color-primary-soft)',
                    border: '1px solid var(--color-primary-border)',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--color-primary)', marginBottom: '4px' }}>
                    📝 Lembar Refleksi Wajib:
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-main)', marginBottom: '8px' }}>
                    &quot;Bagaimana reaksi anak Anda saat dipaksa belajar dengan cara yang tidak ia sukai?&quot;
                  </div>
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      border: '1px solid var(--color-divider)',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      fontStyle: 'italic',
                    }}
                  >
                    Tuliskan pengalaman Anda di sini...
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    padding: '10px',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  Tandai Selesai & Lanjut →
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Problem vs Solution Comparison Grid */}
      <section id="fitur" style={{ paddingTop: '56px', paddingBottom: '56px', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', marginBottom: '8px' }}>
              Transformasi Pola Penjualan
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
              Mengapa Edukasi Klien Adalah Kunci Closing Tes STIFIn?
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Old Way */}
            <div
              style={{
                backgroundColor: '#FDF2F2',
                border: '1px solid #F8B4B4',
                borderRadius: 'var(--border-radius-lg)',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '20px' }}>❌</span>
                <h3 style={{ fontSize: '16px', fontWeight: 750, color: '#9B1C1C', margin: 0 }}>
                  Cara Lama (Hard Selling Broadcast)
                </h3>
              </div>

              <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px', color: '#7F1D1D', lineHeight: 1.5 }}>
                <li>Broadcast promo tes STIFIn secara acak ke kontak WA (sering diblokir atau diabaikan).</li>
                <li>Calon klien merasa tidak butuh karena belum paham masalah gaya belajar mereka.</li>
                <li>Promotor tidak tahu siapa yang berminat dan siapa yang hanya membaca sekilas.</li>
                <li>Melelahkan dan memakan waktu follow-up tanpa hasil konversi yang pasti.</li>
              </ul>
            </div>

            {/* New Way with PromotorClass */}
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: 'var(--border-radius-lg)',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                <h3 style={{ fontSize: '16px', fontWeight: 750, color: '#166534', margin: 0 }}>
                  Dengan PromotorClass (Educate-First Funnel)
                </h3>
              </div>

              <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px', color: '#14532D', lineHeight: 1.5 }}>
                <li>Bagikan e-course gratis penyelesai masalah (misal: Tips Mengatasi Anak Malas Belajar).</li>
                <li>Calon klien belajar dengan nyaman dan menuliskan refleksi kondisi keluarganya.</li>
                <li>Intent Signal Engine otomatis mengelompokkan klien yang paling membutuhkan tes STIFIn.</li>
                <li>Follow up via WhatsApp berlangsung hangat karena didasarkan pada refleksi asli mereka.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Key Features Grid */}
      <section style={{ paddingTop: '56px', paddingBottom: '56px', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', marginBottom: '8px' }}>
              Fitur Dirancang Khusus
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
              Semua yang Dibutuhkan Promotor STIFIn
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {/* Feature 1 */}
            <div className="card-quiet">
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🏪</div>
              <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '6px' }}>
                Storefront Publik Mandiri
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Dapatkan link profil dan katalog ruang belajar pribadi (misal: <code>/p/nama-anda</code>) lengkap dengan foto, bio, dan nomor WhatsApp resmi Anda.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-quiet">
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📚</div>
              <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '6px' }}>
                Builder Kurikulum & Video
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Susun modul dan pelajaran dengan video YouTube unlisted, materi teks terstruktur, dan lampiran panduan PDF tanpa biaya hosting tambahan.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-quiet">
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📝</div>
              <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '6px' }}>
                Lembar Refleksi Pengunci Materi
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Peserta diwajibkan menuliskan catatan kondisi mereka untuk menyelesaikan materi—memberikan insight berharga bagi Anda sebelum follow-up.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card-quiet">
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎯</div>
              <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '6px' }}>
                Intent Signal & Lead Scoring
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Sistem otomatis menilai tingkat minat peserta (skor 0–100) berdasarkan keaktifan, penyelesaian modul, dan kedalaman jawaban refleksi.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card-quiet">
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>💬</div>
              <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '6px' }}>
                1-Klik Draf WhatsApp Personal
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Kirim pesan WhatsApp dengan template cerdas yang sudah menyapa nama peserta dan menyinggung refleksi yang baru saja mereka tuliskan.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card-quiet">
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎁</div>
              <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '6px' }}>
                Ekosistem Referral Peserta
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Peserta yang puas dapat mengajak rekan atau keluarga menggunakan link referral unik mereka untuk mendapatkan voucher reward workshop.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How It Works Section */}
      <section id="cara-kerja" style={{ paddingTop: '56px', paddingBottom: '56px', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="container" style={{ maxWidth: '880px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', marginBottom: '8px' }}>
              Alur Penggunaan
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
              4 Langkah Menuju Konversi Tes STIFIn
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                1
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '6px' }}>Pilih / Buat E-Course</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Gunakan template program siap pakai atau buat materi edukasi versi Anda sendiri.
              </p>
            </div>

            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                2
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '6px' }}>Sebarkan Link Storefront</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Bagikan link pendaftaran program gratis ke status WA, media sosial, atau webinar.
              </p>
            </div>

            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                3
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '6px' }}>Peserta Menulis Refleksi</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Peserta belajar mandiri dan menuliskan kondisi tantangan keluarga mereka di lembar refleksi.
              </p>
            </div>

            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                4
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 750, marginBottom: '6px' }}>Follow-up Tepat Sasaran</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Buka daftar antrean berskor tinggi, kirim draf WA, dan jadwalkan sesi tes STIFIn resmi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Direct Sandbox Explorer (Direct Testing Links) */}
      <section style={{ paddingTop: '56px', paddingBottom: '56px', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', marginBottom: '8px' }}>
              Eksplorasi Langsung (Live Demo)
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
              Coba Semua Halaman & Pengalaman Aplikasi
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <Link
              href="/app"
              style={{
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--border-radius-md)',
                padding: '18px',
                textDecoration: 'none',
                color: 'var(--color-text-main)',
                transition: 'border-color var(--motion-fast)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                WORKSPACE PROMOTOR
              </div>
              <div style={{ fontSize: '16px', fontWeight: 750, marginBottom: '4px' }}>
                Promotor OS (/app) →
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                Antrean kerja, kurikulum builder, data peserta, dan draf WhatsApp.
              </div>
            </Link>

            <Link
              href="/learn"
              style={{
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--border-radius-md)',
                padding: '18px',
                textDecoration: 'none',
                color: 'var(--color-text-main)',
                transition: 'border-color var(--motion-fast)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                PORTAL PESERTA BELAJAR
              </div>
              <div style={{ fontSize: '16px', fontWeight: 750, marginBottom: '4px' }}>
                Learner OS (/learn) →
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                Halaman program aktif peserta, reader materi video, dan pengisian refleksi.
              </div>
            </Link>

            <Link
              href="/p/rina"
              style={{
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--border-radius-md)',
                padding: '18px',
                textDecoration: 'none',
                color: 'var(--color-text-main)',
                transition: 'border-color var(--motion-fast)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                STOREFRONT PUBLIK CONTOH
              </div>
              <div style={{ fontSize: '16px', fontWeight: 750, marginBottom: '4px' }}>
                Storefront (/p/rina) →
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                Tampilan landing page personal promotor dengan katalog program dan bio profil.
              </div>
            </Link>

            <Link
              href="/p/rina/7-hari-mengenal-cara-belajar-anak"
              style={{
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--border-radius-md)',
                padding: '18px',
                textDecoration: 'none',
                color: 'var(--color-text-main)',
                transition: 'border-color var(--motion-fast)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                LANDING PAGE PENDAFTARAN
              </div>
              <div style={{ fontSize: '16px', fontWeight: 750, marginBottom: '4px' }}>
                Landing Program Lead Magnet →
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                Halaman detail e-course gratis dengan form pendaftaran instan via WhatsApp.
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 8. FAQ Section */}
      <section id="faq" style={{ paddingTop: '56px', paddingBottom: '56px', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="container" style={{ maxWidth: '760px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', marginBottom: '8px' }}>
              Tanya Jawab
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-divider)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14.5px',
                      fontWeight: 700,
                      color: 'var(--color-text-main)',
                      gap: '12px',
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ fontSize: '18px', color: 'var(--color-text-muted)', transition: 'transform var(--motion-fast)', transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                      +
                    </span>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 20px 18px', fontSize: '13.5px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Final High-Conversion CTA Banner */}
      <section style={{ paddingTop: '64px', paddingBottom: '64px', backgroundColor: 'var(--color-primary)', color: '#FFFFFF' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '720px' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '14px', color: '#FFFFFF' }}>
            Mulai Edukasi Calon Klien Anda Sekarang.
          </h2>
          <p style={{ fontSize: '16px', color: '#E2ECE5', lineHeight: 1.6, marginBottom: '28px' }}>
            Tingkatkan konversi tes STIFIn secara elegan dan manusiawi melalui kekuatan edukasi yang terukur.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/app"
              className="touch-target-primary"
              style={{
                backgroundColor: '#FFFFFF',
                color: 'var(--color-primary)',
                fontWeight: 800,
                fontSize: '15px',
                padding: '0 24px',
                borderRadius: 'var(--border-radius-md)',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Buka Workspace Promotor →
            </Link>

            <Link
              href="/p/rina"
              className="touch-target-primary"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                fontSize: '14.5px',
                padding: '0 20px',
                borderRadius: 'var(--border-radius-md)',
                textDecoration: 'none',
              }}
            >
              Lihat Contoh Storefront ↗
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-divider)', padding: '28px 16px', marginTop: 'auto' }}>
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '12.5px',
            color: 'var(--color-text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>PromotorClass</strong> · Client Education OS & Intent Signal Engine
          </div>
        </div>
      </footer>
    </div>
  );
}


