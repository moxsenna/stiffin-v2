'use client';

import React from 'react';

export const FlowTestimonials: React.FC = () => {
  const testimonials = [
    {
      quote: 'Dulu sering sekali chat orang tua yang tanya tes STIFIn tenggelam karena sehari masuk puluhan DM. Dengan Today Queue PromotorFlow, tidak ada satu pun prospek yang luput. Konversi booking saya naik lebih dari dua kali lipat.',
      author: 'dr. Rina Hidayati',
      role: 'Promotor Senior & Parenting Coach',
      city: 'Jakarta Selatan',
      initials: 'RH',
      verifiedMetric: '+140% Konversi Booking',
    },
    {
      quote: 'Link booking 14-hari menghemat waktu tim cabang kami luar biasa banyak. Klien tinggal pilih slot Home Visit yang masih kosong, pilih lokasi, dan masuk kalender otomatis tanpa perlu tanya jawab manual.',
      author: 'Faisal Ahmad, S.Psi',
      role: 'Kepala Cabang & Promotor STIFIn',
      city: 'Surabaya',
      initials: 'FA',
      verifiedMetric: '15 Jam Dihemat / Minggu',
    },
    {
      quote: 'Fitur Aftercare D+7 adalah game changer. Klien merasa sangat diperhatikan karena kita mengevaluasi perkembangan belajar anaknya sepekan pasca tes. Dari situ hampir 40% klien mendaftar tes untuk anggota keluarga lain.',
      author: 'Hj. Nurul Anisa',
      role: 'Konsultan Karir Remaja & Keluarga',
      city: 'Bandung',
      initials: 'NA',
      verifiedMetric: '38% Repeat & Referral',
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
              key={t.author}
              style={{
                backgroundColor: 'var(--color-canvas)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-divider)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '20px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    fontWeight: 780,
                    fontSize: '11.5px',
                    marginBottom: '16px',
                  }}
                >
                  ✓ {t.verifiedMetric}
                </div>

                <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
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
                    {t.author}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {t.role} · {t.city}
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
