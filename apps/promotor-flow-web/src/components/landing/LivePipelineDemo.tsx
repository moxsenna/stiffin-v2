'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { WhatsAppIcon, CheckIcon, LightningIcon } from '../foundation/icons';

interface PipelineStageExample {
  id: string;
  stageName: string;
  badgeColor: string;
  badgeBg: string;
  leadName: string;
  leadContext: string;
  actionTitle: string;
  actionDue: string;
  whatsappDraft: string;
  impactExplanation: string;
}

export const LivePipelineDemo: React.FC = () => {
  const stages: PipelineStageExample[] = [
    {
      id: 'NEW',
      stageName: 'Prospek Baru (NEW)',
      badgeColor: 'var(--color-primary)',
      badgeBg: 'var(--color-primary-light)',
      leadName: 'Bunda Sarah (Mama Nadine, 7 th)',
      leadContext: 'Sumber: Instagram DM · Bertanya: "Anak saya susah fokus saat belajar, apakah cocok tes STIFIn?"',
      actionTitle: 'Sapa prospek & kirim ringkasan manfaat Tes Biometrik STIFIn',
      actionDue: 'Jatuh tempo: Hari ini',
      whatsappDraft: 'Halo Bunda Sarah! Terima kasih sudah menghubungi kami. Terkait ananda Nadine (7 th), Tes STIFIn sangat tepat untuk mengetahui Mesin Kecerdasan dominan dan gaya belajar alaminya agar belajar tidak lagi dengan paksaan. Boleh saya tahu di kota mana domisili Bunda saat ini?',
      impactExplanation: 'Respons cepat dalam 15 menit meningkatkan peluang konversi konsultasi hingga 380%.',
    },
    {
      id: 'INTERESTED',
      stageName: 'Minat Tinggi (INTERESTED)',
      badgeColor: '#B42318',
      badgeBg: '#FEF3F2',
      leadName: 'Pak Dimas Prasetyo',
      leadContext: 'Sumber: Website Storefront · Telah menyelesaikan modul edukasi "Mengenal 5 Mesin Kecerdasan" (Score: 85/100)',
      actionTitle: 'Kirim link pemilihan jadwal tes tatap muka (On-Site / Home Visit)',
      actionDue: 'Jatuh tempo: 10:00 WIB',
      whatsappDraft: 'Halo Pak Dimas! Senang melihat Bapak sudah menyimak materi pengantar STIFIn. Untuk memetakan potensi Bapak dan keluarga secara presisi, silakan pilih slot jadwal tes yang paling pas melalui link ini: https://promotorflow.id/p/stifin-consulting/book',
      impactExplanation: 'Integrasi sinyal belajar PromotorClass memfilter prospek yang sudah teredukasi dan siap bayar.',
    },
    {
      id: 'BOOKED',
      stageName: 'Booking Terkunci (BOOKED)',
      badgeColor: '#067647',
      badgeBg: '#ECFDF3',
      leadName: 'Keluarga Ibu Maya (3 Peserta)',
      leadContext: 'Jadwal: Sabtu, 10:00 WIB · Lokasi: Home Visit · Status Pembayaran: Lunas (PAID)',
      actionTitle: 'Konfirmasi kedatangan & kirim panduan persiapan jari sebelum scan',
      actionDue: 'Jatuh tempo: H-1 Sesi',
      whatsappDraft: 'Halo Ibu Maya! Mengingatkan kembali jadwal Tes STIFIn Home Visit untuk 3 anggota keluarga besok Sabtu pukul 10.00 WIB. Mohon pastikan ujung 10 jari ananda dalam keadaan bersih dan tidak berminyak ya Bu. Sampai bertemu besok!',
      impactExplanation: 'Pengingat otomatis H-1 menekan angka pembatalan jadwal (no-show rate) hingga 0%.',
    },
    {
      id: 'AFTERCARE',
      stageName: 'Aftercare D+7 (RETENTION)',
      badgeColor: '#2563EB',
      badgeBg: '#EFF6FF',
      leadName: 'Pak Rian & Ananda Farhan (Tes Sensing)',
      leadContext: 'Selesai tes 7 hari yang lalu · Hasil tes: Sensing Ekstrovert · Sedang menerapkan pola reward fisik',
      actionTitle: 'Follow-up evaluasi D+7 penerapan panduan & tawarkan kelas parenting',
      actionDue: 'Jatuh tempo: Hari ini (Otomatis)',
      whatsappDraft: 'Halo Pak Rian! Sudah 1 pekan sejak sesi pembahasan hasil Tes STIFIn Farhan (Sensing). Bagaimana respon Farhan saat belajar dengan metode visual konkret yang kita diskusikan? Apakah ada kendala yang dialami?',
      impactExplanation: 'Follow-up D+7 membuka peluang upsell program pendampingan dan permohonan referral keluarga baru.',
    },
  ];

  const [activeStage, setActiveStage] = useState<PipelineStageExample>(stages[0]);

  return (
    <section
      id="simulasi"
      style={{
        padding: '72px 24px',
        backgroundColor: 'var(--color-canvas)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 40px' }}>
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
            Simulasi Pipeline Interaktif: Dari Chat Menjadi Klien Setia
          </h2>
          <p style={{ fontSize: '15.5px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Klik tahapan pipeline di bawah untuk melihat bagaimana PromotorFlow mengotomatiskan tindakan harian dan draf pesan Anda.
          </p>
        </div>

        {/* Stage Selector Pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            marginBottom: '28px',
          }}
        >
          {stages.map((stg) => {
            const isSelected = activeStage.id === stg.id;
            return (
              <button
                key={stg.id}
                onClick={() => setActiveStage(stg)}
                className="touch-target"
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: isSelected ? '#FFFFFF' : 'var(--color-text-secondary)',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '13.5px',
                  boxShadow: isSelected ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                  transition: 'all var(--duration-fast) ease',
                  cursor: 'pointer',
                }}
              >
                {stg.stageName}
              </button>
            );
          })}
        </div>

        {/* Interactive Simulator Box */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-divider)',
            padding: '32px',
            boxShadow: 'var(--shadow-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
          }}
        >
          {/* Left Column: Context & Action Trigger */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: activeStage.badgeBg,
                  color: activeStage.badgeColor,
                  fontWeight: 800,
                  fontSize: '12px',
                  marginBottom: '10px',
                }}
              >
                {activeStage.stageName}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-text-primary)', margin: 0 }}>
                {activeStage.leadName}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                {activeStage.leadContext}
              </p>
            </div>

            {/* Next Action Box */}
            <div
              style={{
                backgroundColor: 'var(--color-canvas)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-divider)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--color-text-tertiary)' }}>
                TINDAKAN OTOMATIS BERIKUTNYA
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                {activeStage.actionTitle}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-primary)', fontWeight: 650, marginTop: '2px' }}>
                {activeStage.actionDue}
              </div>
            </div>

            {/* Impact Metric */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary-border)',
                fontSize: '13px',
                color: 'var(--color-primary-hover)',
                lineHeight: 1.5,
              }}
            >
              <strong>Dampak Bisnis:</strong> {activeStage.impactExplanation}
            </div>
          </div>

          {/* Right Column: WhatsApp Auto-Draft Live Mockup */}
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WhatsAppIcon size={18} color="#25D366" />
                  <span style={{ fontSize: '13px', fontWeight: 780, color: 'var(--color-text-primary)' }}>
                    Draf Pesan Siap Kirim
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                  Terpersonalisasi
                </span>
              </div>

              {/* Chat Bubble Simulation */}
              <div
                style={{
                  backgroundColor: '#E7FCE8',
                  padding: '16px',
                  borderRadius: '12px 12px 2px 12px',
                  border: '1px solid #C3F5C7',
                  fontSize: '13.5px',
                  lineHeight: 1.6,
                  color: '#143818',
                  whiteSpace: 'pre-wrap',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {activeStage.whatsappDraft}
              </div>
            </div>

            <Link
              href="/app"
              className="touch-target-primary"
              style={{
                width: '100%',
                backgroundColor: '#25D366',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                fontWeight: 780,
                fontSize: '14.5px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <WhatsAppIcon size={20} color="#FFFFFF" />
              <span>Coba Kirim di App Demo →</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
