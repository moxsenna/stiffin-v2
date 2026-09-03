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
                src="/icon.webp"
                alt="Talira Class"
                width={32}
                height={32}
                style={{
                  width: '32px',
                  height: '32px',
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 800, fontSize: '16px', color: '#FFFFFF' }}>
                Talira Class
              </span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#888883', marginBottom: '16px' }}>
              Client Education OS untuk promotor, praktisi parenting, dan coach profesional di Indonesia.
            </p>
            <div style={{ fontSize: '12px', color: '#666661' }}>
              Bagian dari ekosistem Talira Suite (Talira Class + Talira Flow).
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
            © {new Date().getFullYear()} Talira Class. Seluruh hak cipta dilindungi undang-undang.
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
