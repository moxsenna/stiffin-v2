'use client';

import React from 'react';

export function FeatureGrid() {
  return (
    <section
      id="fitur"
      style={{
        paddingTop: '64px',
        paddingBottom: '72px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div className="container">
        <div style={{ maxWidth: '780px', margin: '0 auto 48px', textAlign: 'center' }}>
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
            Fitur lengkap yang dirancang khusus untuk alur kerja promotor.
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Setiap fitur dibangun dengan satu tujuan: mempermudah promotor mengedukasi peserta dan meningkatkan omzet konsultasi.
          </p>
        </div>

        {/* Asymmetrical 2x2 Feature Showcase */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
          }}
        >
          {/* Feature 1: Lead Magnet Builder */}
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              border: '1px solid var(--color-divider)',
              borderRadius: '20px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.02em' }}>
                Storefront & Lead Magnet Instan
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '20px' }}>
                Dapatkan link personal seperti <code>promotor.id/p/nama-anda</code> yang siap dibagikan ke media sosial atau bio Instagram. Publikasikan mini-course 3–7 hari tanpa perlu beli hosting atau utak-atik kode.
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '14px 18px',
                border: '1px solid var(--color-divider)',
                fontSize: '12px',
                color: 'var(--color-text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 650 }}>Domain Personal & Link WhatsApp Auto-Capture</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 750 }}>Siap Pakai</span>
            </div>
          </div>

          {/* Feature 2: Reflection & Intent Engine */}
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              border: '1px solid var(--color-divider)',
              borderRadius: '20px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.02em' }}>
                Engine Refleksi & Pemetaan Minat
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '20px' }}>
                Bukan sekadar kuis pilihan ganda yang membosankan. Lembar refleksi dirancang untuk memancing peserta menceritakan kondisi nyata mereka, sehingga Anda memahami kebutuhan mereka sebelum memulai konsultasi.
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '14px 18px',
                border: '1px solid var(--color-divider)',
                fontSize: '12px',
                color: 'var(--color-text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 650 }}>Insight Peserta Langsung Masuk ke Profil</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 750 }}>Otomatis</span>
            </div>
          </div>

          {/* Feature 3: WhatsApp Follow-Up Generator */}
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              border: '1px solid var(--color-divider)',
              borderRadius: '20px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.02em' }}>
                Generator Pesan WhatsApp Kontekstual
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '20px' }}>
                Hemat waktu mengetik pesan satu per satu. Sistem menyiapkan draft WhatsApp yang menyebut nama peserta, materi yang dipelajari, dan solusi yang relevan hanya dengan menekan 1 tombol.
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '14px 18px',
                border: '1px solid var(--color-divider)',
                fontSize: '12px',
                color: 'var(--color-text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 650 }}>Integrasi WhatsApp Web & Mobile 1-Klik</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 750 }}>Langsung Terbuka</span>
            </div>
          </div>

          {/* Feature 4: Aftersales & Retention Hub */}
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              border: '1px solid var(--color-divider)',
              borderRadius: '20px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.02em' }}>
                Program Onboarding Aftersales 30 Hari
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '20px' }}>
                Kunci kepuasan klien tes STIFIn dan assessment adalah pendampingan berkelanjutan. Berikan panduan harian otomatis agar klien merasakan dampak nyata dari hasil tes mereka.
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '14px 18px',
                border: '1px solid var(--color-divider)',
                fontSize: '12px',
                color: 'var(--color-text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 650 }}>Mengurangi Churn & Meningkatkan Repeat Order</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 750 }}>Aftersales OS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
