'use client';

import React from 'react';

export function ProblemVsSolution() {
  const comparisons = [
    {
      aspect: 'Pendaftaran & Akses',
      oldWay: 'Formulir rumit, minta buat password, verifikasi email berlapis. Drop-off mencapai 65% sebelum peserta mulai.',
      newWay: 'Input Nama & WhatsApp 1-klik. Materi langsung terbuka instan di browser ponsel peserta tanpa instalasi.',
    },
    {
      aspect: 'Format & Konsumsi Materi',
      oldWay: 'Kirim link Google Drive atau video rekaman Zoom 2 jam. Peserta cepat jenuh dan link tenggelam di riwayat chat.',
      newWay: 'Struktur materi ringkas 5–8 menit dengan 1 pertanyaan refleksi yang mendorong peserta langsung praktik.',
    },
    {
      aspect: 'Visibilitas Minat (Intent)',
      oldWay: 'Buta data. Tidak tahu peserta mana yang serius butuh bantuan pendampingan atau sekadar mengunduh materi.',
      newWay: 'Sistem otomatis mendeteksi peserta berpotensi tinggi dari kualitas jawaban refleksi dan progres modul.',
    },
    {
      aspect: 'Eksekusi Follow-Up',
      oldWay: 'Broadcast massal yang terasa dingin, sering diabaikan, atau bahkan dianggap spam yang mengganggu.',
      newWay: 'Draft WhatsApp kontekstual otomatis yang mengutip refleksi spesifik peserta. Percakapan jadi hangat dan human.',
    },
    {
      aspect: 'Pendampingan Aftersales',
      oldWay: 'Setelah tes assessment selesai, tidak ada follow-up berkala. Klien cepat lupa hasil tes dan tidak melakukan repeat order.',
      newWay: 'Program 30 Hari Pasca Tes terstruktur menjaga relasi klien, meningkatkan kepuasan, dan memicu referral.',
    },
  ];

  return (
    <section
      id="solusi"
      style={{
        paddingTop: '64px',
        paddingBottom: '72px',
        backgroundColor: 'var(--color-canvas)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div className="container">
        <div style={{ maxWidth: '780px', margin: '0 auto 40px', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              letterSpacing: '-0.04em',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '14px',
              color: 'var(--color-text-main)',
            }}
          >
            Mengapa cara lama menguras tenaga tanpa hasil konversi yang jelas.
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Bandingkan alur kerja konvensional berbasis Google Drive dan broadcast WhatsApp manual dengan arsitektur terintegrasi Talira Class.
          </p>
        </div>

        {/* Comparison Table / Grid */}
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-divider)',
            borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          }}
        >
          {/* Header Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(140px, 1fr) 1.5fr 1.5fr',
              backgroundColor: '#FAF9F6',
              borderBottom: '1px solid var(--color-divider)',
              padding: '16px 24px',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '0.02em',
            }}
            className="comparison-header"
          >
            <div style={{ color: 'var(--color-text-muted)' }}>Aspek Alur Kerja</div>
            <div style={{ color: '#D32F2F', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D32F2F' }} />
              Cara Konvensional (Manual / Drive)
            </div>
            <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
              Dengan Talira Class
            </div>
          </div>

          {/* Rows */}
          {comparisons.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px, 1fr) 1.5fr 1.5fr',
                padding: '20px 24px',
                borderBottom: idx < comparisons.length - 1 ? '1px solid var(--color-divider)' : 'none',
                gap: '20px',
                alignItems: 'start',
                backgroundColor: idx % 2 === 1 ? '#FDFAF7' : '#FFFFFF',
              }}
              className="comparison-row"
            >
              <div style={{ fontWeight: 780, fontSize: '14px', color: 'var(--color-text-main)' }}>
                {item.aspect}
              </div>

              <div style={{ fontSize: '13px', color: '#6A6860', lineHeight: 1.6 }}>
                {item.oldWay}
              </div>

              <div style={{ fontSize: '13px', color: 'var(--color-text-main)', lineHeight: 1.6, fontWeight: 550 }}>
                {item.newWay}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
