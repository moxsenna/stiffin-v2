'use client';

import React, { useState } from 'react';

export function FaqSection() {
  const faqs = [
    {
      q: 'Apakah saya membutuhkan keahlian teknis atau koding untuk menggunakan Talira Class?',
      a: 'Sama sekali tidak. Anda hanya perlu mengisi judul program, memasukkan link video (YouTube unlisted / Vimeo / Google Drive), dan menuliskan 1 pertanyaan refleksi. Dalam kurang dari 2 menit, storefront personal Anda sudah langsung aktif dan siap dibagikan.',
    },
    {
      q: 'Bagaimana cara peserta mendaftar dan belajar?',
      a: 'Peserta cukup memasukkan nama dan nomor WhatsApp di halaman storefront Anda. Begitu tombol diklik, modul langsung terbuka di peramban (browser) smartphone peserta. Tidak ada download aplikasi, tidak ada buat password yang sering membuat peserta lupa atau batal belajar.',
    },
    {
      q: 'Mengapa Talira Class lebih efektif dibanding membagikan link Google Drive atau grup WhatsApp?',
      a: 'Link Google Drive sering hilang di riwayat chat, dan Anda tidak tahu apakah peserta benar-benar menontonnya. Di grup WhatsApp, peserta pasif cenderung diam. Talira Class memberikan ruang belajar mandiri yang rapi, mencatat progres belajar, dan memicu refleksi aktif sehingga peserta merasa terikat dengan materi Anda.',
    },
    {
      q: 'Bagaimana cara sistem mendeteksi sinyal niat beli (intent lead)?',
      a: 'Ketika peserta menyelesaikan materi dan mengisi form refleksi mengenai masalah nyata mereka (misal: kendala belajar anak, kebingungan memilih jurusan, atau stres komunikasi pasangan), sistem menganalisis konteks tersebut dan menandai peserta di dashboard Anda dengan rekomendasi follow-up yang relevan.',
    },
    {
      q: 'Apakah saya bisa menggunakan Talira Class untuk program pendampingan aftersales tes STIFIn?',
      a: 'Ya, ini salah satu keunggulan utama Talira Class. Anda dapat membuat program "30 Hari Pendampingan Pasca Tes" yang hanya bisa diakses oleh klien yang sudah melakukan tes, sehingga mereka mendapatkan panduan bertahap dan merasakan nilai maksimal dari sesi konsultasi Anda.',
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      id="faq"
      style={{
        paddingTop: '64px',
        paddingBottom: '72px',
        backgroundColor: '#FFFFFF',
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
            Pertanyaan yang sering diajukan.
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Semua hal yang perlu Anda ketahui sebelum meluncurkan ruang belajar edukasi pertama Anda.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gap: '12px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--color-divider)',
                  borderRadius: '14px',
                  backgroundColor: isOpen ? 'var(--color-canvas)' : '#FFFFFF',
                  overflow: 'hidden',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    border: 0,
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 750, color: 'var(--color-text-main)', lineHeight: 1.4 }}>
                    {faq.q}
                  </span>
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isOpen ? 'var(--color-primary-light)' : 'var(--color-canvas)',
                      color: isOpen ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '16px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 24px 22px',
                      fontSize: '14px',
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.7,
                      borderTop: '1px solid var(--color-divider-subtle, #EAEAE6)',
                      paddingTop: '14px',
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
