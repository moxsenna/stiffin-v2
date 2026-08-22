'use client';

import React, { useState } from 'react';
import { ChevronDownIcon } from '../foundation/icons';

interface FaqItem {
  question: string;
  answer: string;
}

export const FlowFaqSection: React.FC = () => {
  const faqs: FaqItem[] = [
    {
      question: 'Apakah PromotorFlow memerlukan instalasi khusus dari Play Store atau App Store?',
      answer: 'Tidak perlu. PromotorFlow dibangun dengan teknologi Progressive Web App (PWA) modern. Anda dapat membukanya langsung melalui browser di smartphone, tablet, maupun laptop. Anda juga dapat menambahkan icon PromotorFlow ke Home Screen ponsel dengan 1-klik untuk pengalaman native tanpa memakan memori penyimpanan.',
    },
    {
      question: 'Bagaimana integrasi PromotorFlow dengan platform PromotorClass?',
      answer: 'Sangat mulus! Jika Anda mengaktifkan paket Ekosistem Lengkap, setiap aktivitas belajar peserta di modul PromotorClass (seperti penyelesaian video materi atau lembar refleksi) akan otomatis mengirimkan sinyal intent (Hot/Warm/Cold) ke antrean tindakan Hari Ini di PromotorFlow Anda secara real-time.',
    },
    {
      question: 'Apakah link booking jadwal bisa saya pasang di bio Instagram atau pesan otomatis WhatsApp?',
      answer: 'Bisa sekali! Setiap promotor mendapatkan tautan booking publik unik (misal: promotorflow.id/p/nama-anda/book). Tautan ini dapat langsung Anda taruh di bio Instagram, TikTok, Linktree, maupun pesan auto-reply WhatsApp Business Anda.',
    },
    {
      question: 'Apakah data kontak dan catatan klien saya terjamin keamanannya?',
      answer: 'Sangat aman. Setiap promotor memiliki isolasi data multi-tenant tersendiri yang terenkripsi. Kontak, catatan kendala keluarga, dan histori booking Anda hanya dapat diakses oleh Anda dan tim cabang yang Anda beri wewenang resmi.',
    },
    {
      question: 'Bagaimana jika ada dua klien yang memilih jam konsultasi yang sama secara bersamaan?',
      answer: 'Sistem PromotorFlow dilengkapi mekanisme pencegahan race condition. Begitu sebuah slot waktu berhasil dibooking, slot tersebut langsung dikunci dan otomatis hilang dari pilihan klien lain dalam hitungan milidetik.',
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section
      id="faq"
      style={{
        padding: '80px 24px',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-divider)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 36px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--color-text-primary)',
              marginBottom: '12px',
              lineHeight: 1.2,
            }}
          >
            Pertanyaan yang Sering Diajukan (FAQ)
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Semua hal yang perlu Anda ketahui sebelum menggunakan PromotorFlow.
          </p>
        </div>

        {/* Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.question}
                style={{
                  backgroundColor: 'var(--color-canvas)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-divider)',
                  overflow: 'hidden',
                  transition: 'all var(--duration-fast) ease',
                }}
              >
                <button
                  onClick={() => toggle(idx)}
                  className="touch-target"
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {faq.question}
                  </span>
                  <div
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform var(--duration-normal) var(--ease-spring)',
                      flexShrink: 0,
                    }}
                  >
                    <ChevronDownIcon size={16} color="var(--color-text-tertiary)" />
                  </div>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 20px 20px',
                      fontSize: '14px',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.65,
                      borderTop: '1px solid var(--color-divider)',
                      paddingTop: '14px',
                    }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
