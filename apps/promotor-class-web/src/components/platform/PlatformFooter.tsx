'use client';

import React from 'react';
import Link from 'next/link';

export function PlatformFooter() {
  return (
    <footer
      style={{
        backgroundColor: '#191918',
        color: '#A0A09B',
        paddingTop: '64px',
        paddingBottom: '48px',
        borderTop: '1px solid #2B2B28',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Brand Col */}
          <div style={{ maxWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <img
                src="/images/ralivo-logo-dark.webp"
                alt="Ralivo"
                width={120}
                height={32}
                style={{ height: '32px', width: 'auto', display: 'block' }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#60A5FA',
                  backgroundColor: 'rgba(96, 165, 250, 0.12)',
                  border: '1px solid rgba(96, 165, 250, 0.25)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Class
              </span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#888883', marginBottom: '16px' }}>
              Client Education OS untuk Promotor STIFIn, praktisi parenting, dan coach profesional di Indonesia.
            </p>
            <div style={{ fontSize: '12px', color: '#666661' }}>
              Bagian dari ekosistem Promotor Suite (PromotorClass + PromotorFlow).
            </div>
          </div>

          {/* Links Col 1 */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 750, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
              Produk & Fitur
            </div>
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <a href="#solusi" style={{ color: '#A0A09B', textDecoration: 'none' }}>Storefront Publik</a>
              <a href="#cara-kerja" style={{ color: '#A0A09B', textDecoration: 'none' }}>Engine Refleksi & Sinyal</a>
              <a href="#fitur" style={{ color: '#A0A09B', textDecoration: 'none' }}>Onboarding Aftersales</a>
              <a href="#kalkulator-roi" style={{ color: '#A0A09B', textDecoration: 'none' }}>Kalkulator Konversi ROI</a>
            </div>
          </div>

          {/* Links Col 2 */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 750, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
              Demo & Akses
            </div>
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <Link href="/p/rina-prameswari" style={{ color: '#A0A09B', textDecoration: 'none' }}>Live Demo Storefront</Link>
              <Link href="/login" style={{ color: '#A0A09B', textDecoration: 'none' }}>Masuk ke Dashboard</Link>
              <Link href="/login" style={{ color: '#A0A09B', textDecoration: 'none' }}>Daftar Akun Baru</Link>
            </div>
          </div>

          {/* Links Col 3 */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 750, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
              Bantuan & Kontak
            </div>
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <a href="#faq" style={{ color: '#A0A09B', textDecoration: 'none' }}>Pusat Bantuan / FAQ</a>
              <a href="https://wa.me/" target="_blank" rel="noreferrer" style={{ color: '#A0A09B', textDecoration: 'none' }}>Hubungi Tim Support</a>
              <span style={{ color: '#666661' }}>Surabaya & Jakarta, Indonesia</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid #2B2B28',
            paddingTop: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '12px',
            color: '#666661',
          }}
        >
          <div>
            © {new Date().getFullYear()} PromotorClass. Seluruh hak cipta dilindungi undang-undang.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>Privasi Data Peserta Terjamin</span>
            <span>Enkripsi Standar Industri</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
