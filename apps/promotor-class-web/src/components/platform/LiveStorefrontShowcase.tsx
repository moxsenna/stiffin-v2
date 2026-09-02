'use client';

import React from 'react';
import Link from 'next/link';

export function LiveStorefrontShowcase() {
  return (
    <section
      style={{
        paddingTop: '64px',
        paddingBottom: '72px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '48px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Context & Proof */}
          <div>
            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                letterSpacing: '-0.04em',
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: '16px',
                color: 'var(--color-text-main)',
              }}
            >
              Halaman publik yang membangun otoritas dan kepercayaan seketika.
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '24px' }}>
              Lihat bagaimana praktisi seperti Rina Prameswari menyajikan materi edukasi gratis & aftersales kepada ratusan orang tua di Surabaya tanpa website builder yang lambat.
            </p>

            {/* Feature bullets */}
            <div style={{ display: 'grid', gap: '14px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '12px' }}>
                  ✓
                </div>
                <span style={{ fontSize: '14px', fontWeight: 650, color: 'var(--color-text-main)' }}>
                  Kecepatan loading secepat kilat di smartphone (&lt; 0.8s)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '12px' }}>
                  ✓
                </div>
                <span style={{ fontSize: '14px', fontWeight: 650, color: 'var(--color-text-main)' }}>
                  Integrasi WhatsApp-first registration tanpa friksi password
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '12px' }}>
                  ✓
                </div>
                <span style={{ fontSize: '14px', fontWeight: 650, color: 'var(--color-text-main)' }}>
                  Katalog program gratis, aftersales, dan berbayar dalam 1 link
                </span>
              </div>
            </div>

            <Link
              href="/p/rina-prameswari"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 24px',
                minHeight: '48px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 780,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(40, 99, 68, 0.25)',
              }}
            >
              Kunjungi Ruang Belajar Rina Prameswari →
            </Link>
          </div>

          {/* Right Column: Interactive Card Preview */}
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              borderRadius: '20px',
              border: '1px solid var(--color-divider)',
              padding: '24px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-divider)' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#FFF', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '16px' }}>
                R
              </span>
              <div>
                <strong style={{ fontSize: '15px', color: 'var(--color-text-main)', display: 'block' }}>
                  Rina Prameswari
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Promotor STIFIn Parenting · Surabaya
                </span>
              </div>
            </div>

            {/* Mini Program Card inside showcase */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--color-divider)', padding: '16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Program Pilihan · Gratis
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '6px' }}>
                7 Hari Mengenal Cara Belajar Anak
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
                Materi praktis untuk mengenali pola belajar genetik anak dan mengurangi konflik di rumah.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                <span>7 Hari · 8 Materi</span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 750 }}>Akses Instan →</span>
              </div>
            </div>

            {/* Testimonial Quote */}
            <div style={{ padding: '14px', backgroundColor: 'var(--color-primary-light)', borderRadius: '12px', border: '1px solid var(--color-primary-border)', fontSize: '12px', color: '#1f5238', lineHeight: 1.55 }}>
              &ldquo;Sejak memakai Talira Class, peserta yang mendaftar program gratis saya meningkat 3x lipat, dan hampir separuhnya lanjut mengambil sesi tes STIFIn untuk seluruh anggota keluarga.&rdquo;
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
