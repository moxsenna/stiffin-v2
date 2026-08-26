'use client';

import React from 'react';

export const FlowTestimonials: React.FC = () => {
  const testimonials = [
    {
      quote: 'Dulu sering sekali chat orang tua yang tanya tes STIFIn tenggelam karena sehari masuk puluhan DM. Dengan Today Queue PromotorFlow, tidak ada satu pun prospek yang luput.',
      role: 'Promotor Senior & Parenting Coach',
      city: 'Jakarta Selatan',
      initials: 'P1',
    },
    {
      quote: 'Link booking 14-hari menghemat waktu tim cabang kami luar biasa banyak. Klien tinggal pilih slot Home Visit yang masih kosong, pilih lokasi, dan masuk kalender otomatis tanpa perlu tanya jawab manual.',
      role: 'Kepala Cabang & Promotor STIFIn',
      city: 'Surabaya',
      initials: 'P2',
    },
    {
      quote: 'Fitur Aftercare D+7 adalah game changer. Klien merasa sangat diperhatikan karena kita mengevaluasi perkembangan belajar anaknya sepekan pasca tes.',
      role: 'Konsultan Karir Remaja & Keluarga',
      city: 'Bandung',
      initials: 'P3',
    },
  ];

  return (
    <section
      style={{
        padding: '80px 24px',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-divider)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 56px' }}>
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--color-text-primary)',
              marginBottom: '14px',
              lineHeight: 1.2,
            }}
          >
            Cerita Sukses dari Para Praktisi & Promotor STIFIn
          </h2>
          <p style={{ fontSize: '15.5px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Lihat bagaimana PromotorFlow mengubah operasional harian para konsultan biometrik di berbagai kota di Indonesia.
          </p>
        </div>

        {/* 3 Testimonials Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {testimonials.map((t) => (
            <div
              key={t.role}
              style={{
                backgroundColor: 'var(--color-canvas)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-divider)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '20px',
              }}
            >
              <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>
                &ldquo;{t.quote}&rdquo;
              </p>

              <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--color-text-primary)' }}>
                    {t.role}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {t.city}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
