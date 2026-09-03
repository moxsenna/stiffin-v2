'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LightningIcon } from '../foundation/icons';

export const FlowLandingHeader: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 200,
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.92)' : 'var(--color-canvas)',
        backdropFilter: isScrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'none',
        borderBottom: isScrolled ? '1px solid var(--color-divider)' : '1px solid transparent',
        transition: 'all var(--duration-normal) ease',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            color: 'var(--color-text-primary)',
          }}
        >
          <img
            src="/icon.webp"
            alt="Talira Flow"
            width={36}
            height={36}
            style={{
              width: '36px',
              height: '36px',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '17px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
              Talira Flow
            </span>
            <span style={{ fontSize: '10.5px', fontWeight: 650, color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Execution OS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '24px',
          }}
          className="landing-nav-links"
        >
          <a href="#akses-demo" style={{ color: 'var(--color-primary)', fontWeight: 750, fontSize: '14px', textDecoration: 'none' }}>
            ⚡ Akun Demo
          </a>
          <a href="#fitur" style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
            Fitur Utama
          </a>
          <a href="#simulasi" style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
            Simulasi Pipeline
          </a>
          <a href="#kalkulator" style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
            Kalkulator ROI
          </a>
          <a href="#harga" style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
            Harga Paket
          </a>
          <a href="#faq" style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
            FAQ
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/login"
            className="touch-target landing-nav-links"
            style={{
              padding: '8px 16px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              textDecoration: 'none',
            }}
          >
            Masuk
          </Link>

          <Link
            href="/app"
            className="touch-target-primary"
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-full)',
              fontWeight: 780,
              fontSize: '13.5px',
              textDecoration: 'none',
            }}
          >
            <span className="landing-cta-long">Buka App Demo →</span>
            <span className="landing-cta-short" style={{ display: 'none' }}>Demo →</span>
          </Link>

          {/* Hamburger Button (mobile only) */}
          <button
            type="button"
            className="landing-hamburger"
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              width: '44px',
              height: '44px',
              background: 'transparent',
              border: '2px solid var(--ink)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span style={{ width: '18px', height: '2px', backgroundColor: 'var(--ink)' }} />
            <span style={{ width: '18px', height: '2px', backgroundColor: 'var(--ink)' }} />
            <span style={{ width: '18px', height: '2px', backgroundColor: 'var(--ink)' }} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 840px) {
          .landing-nav-links {
            display: flex !important;
          }
          .landing-hamburger {
            display: none !important;
          }
          .landing-mobile-menu {
            display: none !important;
          }
          .landing-cta-short {
            display: none !important;
          }
          .landing-cta-long {
            display: inline !important;
          }
        }
        @media (max-width: 839px) {
          .landing-cta-long {
            display: none !important;
          }
          .landing-cta-short {
            display: inline !important;
          }
        }
      `}</style>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="landing-mobile-menu" style={{ borderTop: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', padding: '8px 24px 16px' }}>
            <a href="#akses-demo" onClick={() => setMobileMenuOpen(false)} style={{ padding: '12px 0', color: 'var(--color-primary)', fontWeight: 750, fontSize: '15px', textDecoration: 'none', borderBottom: '1px solid var(--color-divider)' }}>
              ⚡ Akun Demo Staging
            </a>
            <a href="#fitur" onClick={() => setMobileMenuOpen(false)} style={{ padding: '12px 0', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '15px', textDecoration: 'none', borderBottom: '1px solid var(--color-divider)' }}>
              Fitur Utama
            </a>
            <a href="#simulasi" onClick={() => setMobileMenuOpen(false)} style={{ padding: '12px 0', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '15px', textDecoration: 'none', borderBottom: '1px solid var(--color-divider)' }}>
              Simulasi Pipeline
            </a>
            <a href="#kalkulator" onClick={() => setMobileMenuOpen(false)} style={{ padding: '12px 0', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '15px', textDecoration: 'none', borderBottom: '1px solid var(--color-divider)' }}>
              Kalkulator ROI
            </a>
            <a href="#harga" onClick={() => setMobileMenuOpen(false)} style={{ padding: '12px 0', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '15px', textDecoration: 'none', borderBottom: '1px solid var(--color-divider)' }}>
              Harga Paket
            </a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} style={{ padding: '12px 0', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '15px', textDecoration: 'none' }}>
              FAQ
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};
