'use client';

import React from 'react';

export function ValueStrip() {
  const pillars = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      title: 'Fokus Kebutuhan Nyata',
      desc: 'Pilih materi yang paling sesuai dengan tantangan dan dinamika belajar anak Anda saat ini.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: 'Ringkas & Mudah Diikuti',
      desc: 'Sesi video singkat dan refleksi mandiri yang dirancang pas untuk orang tua dan profesional sibuk.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
      title: 'Pendampingan Berkelanjutan',
      desc: 'Setiap modul terhubung langsung dengan panduan aksi praktis dan follow-up promotor via WhatsApp.',
    },
  ];

  return (
    <section className="container" style={{ paddingTop: '28px', paddingBottom: '36px' }}>
      <div
        style={{
          borderTop: '1px solid var(--color-divider)',
          borderBottom: '1px solid var(--color-divider)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          padding: '24px 0',
        }}
      >
        {pillars.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '0 8px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </div>
            <h3 style={{ fontSize: '15.5px', fontWeight: 780, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>
              {item.title}
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                lineHeight: 1.6,
                color: 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
