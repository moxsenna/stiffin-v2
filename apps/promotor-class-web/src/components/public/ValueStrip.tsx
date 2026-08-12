'use client';

import React from 'react';

export function ValueStrip() {
  const items = [
    {
      num: '01',
      title: 'Mulai dari yang paling relevan',
      desc: 'Pilih materi sesuai kondisi keluarga, bukan urutan kursus yang kaku.',
    },
    {
      num: '02',
      title: 'Materi kecil, bukan kuliah panjang',
      desc: 'Video, bacaan, dan refleksi yang dirancang untuk orang tua yang sibuk.',
    },
    {
      num: '03',
      title: 'Ada langkah berikutnya',
      desc: 'Setiap program membantu Anda tahu apa yang sebaiknya dilakukan setelah belajar.',
    },
  ];

  return (
    <section className="container" style={{ paddingTop: '42px', paddingBottom: '42px' }}>
      <div
        style={{
          borderTop: '1px solid var(--color-divider)',
          borderBottom: '1px solid var(--color-divider)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
          padding: '12px 0',
        }}
      >
        {items.map((item) => (
          <div
            key={item.num}
            style={{
              padding: '16px 12px',
            }}
          >
            <div
              style={{
                color: 'var(--color-primary)',
                fontSize: '12px',
                fontWeight: 850,
                marginBottom: '10px',
              }}
            >
              {item.num}
            </div>
            <h3 style={{ fontSize: '16px', marginBottom: '6px', fontWeight: 750 }}>{item.title}</h3>
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.55,
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
