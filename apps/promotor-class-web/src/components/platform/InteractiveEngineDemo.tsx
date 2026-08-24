'use client';

import React, { useState } from 'react';

export function InteractiveEngineDemo() {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  return (
    <section
      id="cara-kerja"
      style={{
        paddingTop: '64px',
        paddingBottom: '72px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div className="container">
        <div style={{ maxWidth: '780px', margin: '0 auto 36px', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              letterSpacing: '-0.04em',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '14px',
              color: 'var(--color-text-main)',
            }}
          >
            Bagaimana PromotorClass mengubah materi menjadi klien nyata.
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Bukan sekadar statistik view atau persentase video. Setiap interaksi peserta diterjemahkan menjadi konteks percakapan personal yang siap difollow-up.
          </p>
        </div>

        {/* Step Selector Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            maxWidth: '860px',
            margin: '0 auto 32px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab(0)}
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              border: activeTab === 0 ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
              backgroundColor: activeTab === 0 ? 'var(--color-primary-light)' : 'var(--color-canvas)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Tahap 1 · Peserta
            </div>
            <div style={{ fontSize: '15px', fontWeight: 750, color: 'var(--color-text-main)' }}>
              Belajar & Isi Refleksi
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Materi ringkas + 1 pertanyaan pemantik
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(1)}
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              border: activeTab === 1 ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
              backgroundColor: activeTab === 1 ? 'var(--color-primary-light)' : 'var(--color-canvas)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Tahap 2 · Sistem
            </div>
            <div style={{ fontSize: '15px', fontWeight: 750, color: 'var(--color-text-main)' }}>
              Deteksi Sinyal Intent
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Otomatis klasifikasi minat & kebutuhan
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(2)}
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              border: activeTab === 2 ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
              backgroundColor: activeTab === 2 ? 'var(--color-primary-light)' : 'var(--color-canvas)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Tahap 3 · Promotor
            </div>
            <div style={{ fontSize: '15px', fontWeight: 750, color: 'var(--color-text-main)' }}>
              Follow-Up 1-Klik WhatsApp
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Pesan relevan & siap closing
            </div>
          </button>
        </div>

        {/* Interactive View Display Frame */}
        <div
          style={{
            maxWidth: '920px',
            margin: '0 auto',
            backgroundColor: 'var(--color-canvas)',
            border: '1px solid var(--color-divider)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Mockup Header Bar */}
          <div
            style={{
              padding: '14px 20px',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid var(--color-divider)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FF5F56' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27C93F' }} />
              <span style={{ marginLeft: '12px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {activeTab === 0 && 'ruangbelajar.id/p/rina/7-hari-mengenal-anak (Tampilan Peserta)'}
                {activeTab === 1 && 'app.promotorclass.com/activity (Dashboard Sinyal Promotor)'}
                {activeTab === 2 && 'WhatsApp Web / Mobile Follow-Up Trigger'}
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              Live Interactive Engine
            </span>
          </div>

          {/* Tab 0 Content: Learner Experience */}
          {activeTab === 0 && (
            <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Modul 2 · Video & Refleksi Singkat
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.02em' }}>
                  &ldquo;Mengapa Anak Cepat Bosan Saat Belajar Teori?&rdquo;
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                  Peserta menonton materi 5 menit, lalu mengisi 1 refleksi ringan langsung di browser smartphone mereka tanpa harus install aplikasi atau login password rumit.
                </p>
                <div style={{ padding: '12px 16px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--color-divider)', fontSize: '13px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)', display: 'block', marginBottom: '4px' }}>
                    Jawaban Refleksi Peserta:
                  </span>
                  <span style={{ color: '#4f4e4a', fontStyle: 'italic' }}>
                    &ldquo;Anak saya (9 tahun) sangat sulit diajak baca buku lebih dari 10 menit, tapi sangat antusias saat praktik eksperimen sains atau menggambar...&rdquo;
                  </span>
                </div>
              </div>

              {/* Mockup Screen */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--color-divider)', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ height: '140px', backgroundColor: '#286344', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', position: 'relative' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.25)', display: 'grid', placeItems: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </div>
                  <span style={{ position: 'absolute', bottom: '10px', right: '12px', fontSize: '11px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>05:12</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Refleksi Mandiri</div>
                  <div style={{ padding: '10px', backgroundColor: 'var(--color-canvas)', borderRadius: '8px', border: '1px solid var(--color-divider)', fontSize: '12px', color: 'var(--color-text-main)' }}>
                    Apa pola yang paling sering Anda lihat ketika anak mulai menolak belajar?
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab(1)}
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 0,
                      cursor: 'pointer',
                    }}
                  >
                    Kirim Refleksi → Lihat Apa yang Terjadi di Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1 Content: Intent Signal Detection */}
          {activeTab === 1 && (
            <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Sinyal Bisnis Real-Time
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.02em' }}>
                  Tahu Persis Kapan Calon Klien Membutuhkan Anda
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '18px' }}>
                  Ketika peserta mengisi refleksi atau menyelesaikan modul, PromotorClass menganalisis tingkat keterlibatan dan menandai peserta sebagai <strong>High Intent Lead</strong>.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
                    <strong>Nama Peserta:</strong> Budi Santoso (0812-8899-XXXX)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
                    <strong>Indikator:</strong> Selesai 3 Modul + Mengisi Kebutuhan Belajar Anak
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#C07000' }} />
                    <strong>Rekomendasi Aksi:</strong> Tawarkan Sesi Tes STIFIn & Konsultasi Parenting
                  </div>
                </div>
              </div>

              {/* Signal Card Visual */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--color-divider)', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--color-divider)' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px' }}>Feed Aktivitas Learner</span>
                  <span style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#EAF5F2', color: '#167A68', borderRadius: '6px', fontWeight: 700 }}>
                    Intent: Tinggi
                  </span>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F9F9F8', borderRadius: '10px', border: '1px solid #ECEBE7', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    <span>Budi Santoso</span>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Baru saja</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#55544f', margin: 0 }}>
                    Menyelesaikan materi <em>Mengapa Anak Cepat Bosan</em> dan membagikan tantangan mendampingi belajar di rumah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab(2)}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '9px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 750,
                    border: 0,
                    cursor: 'pointer',
                  }}
                >
                  Buka Draft WhatsApp →
                </button>
              </div>
            </div>
          )}

          {/* Tab 2 Content: 1-Click WhatsApp Follow-up */}
          {activeTab === 2 && (
            <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Pesan Kontekstual & Human
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.02em' }}>
                  Follow-Up Tanpa Terasa Seperti Spam
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '18px' }}>
                  PromotorClass menyusun draf pesan WhatsApp yang menyebutkan materi dan refleksi spesifik dari peserta. Peserta merasa didengar dan diapresiasi, bukan di-hard sell.
                </p>
                <div style={{ padding: '12px 16px', backgroundColor: '#EAF5F2', borderRadius: '10px', border: '1px solid #B8D4C5', fontSize: '13px', color: '#167A68' }}>
                  <strong>Hasil Konversi:</strong> 94% calon klien merespons positif karena pesan relevan dengan masalah nyata yang mereka hadapi saat ini.
                </div>
              </div>

              {/* WhatsApp Message Preview */}
              <div style={{ backgroundColor: '#EFEAE2', borderRadius: '16px', border: '1px solid #D5CFC5', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#25D366', color: '#FFF', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                    WA
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 750 }}>Kirim ke: Budi Santoso</div>
                    <div style={{ fontSize: '11px', color: '#667781' }}>+62 812-8899-XXXX</div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px 10px 10px 0', padding: '12px 14px', fontSize: '13px', lineHeight: 1.5, color: '#111B21', marginBottom: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  Halo Pak Budi, salam hangat dari Rina Prameswari 👋
                  <br /><br />
                  Saya membaca refleksi Bapak di materi <em>Cara Belajar Anak</em> tadi mengenai ananda (9 tahun) yang lebih cepat paham lewat eksperimen visual.
                  <br /><br />
                  Pola tersebut sangat khas dengan mesin kecerdasan tertentu. Apakah Bapak berkenan jika kita jadwalkan diskusi singkat 15 menit via telepon untuk bedah potensi belajarnya?
                </div>

                <a
                  href="https://wa.me/?text=Halo%20Pak%20Budi"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 780,
                    textDecoration: 'none',
                    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                  Kirim Pesan WhatsApp Sekarang
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
