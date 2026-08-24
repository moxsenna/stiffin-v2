'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export function PlatformHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: scrolled ? 'rgba(247, 247, 245, 0.95)' : 'var(--color-canvas)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: '1px solid var(--color-divider)',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div
        className="container"
        style={{
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
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
            color: 'var(--color-text-main)',
          }}
        >
          <span
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '16px',
              letterSpacing: '-0.02em',
              boxShadow: '0 2px 6px rgba(40, 99, 68, 0.25)',
            }}
          >
            P
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              PromotorClass
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 550 }}>
              Client Education OS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className="desktop-only"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <a
            href="#solusi"
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
              borderRadius: '8px',
              transition: 'background-color 0.15s ease',
            }}
          >
            Solusi
          </a>
          <a
            href="#cara-kerja"
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
              borderRadius: '8px',
              transition: 'background-color 0.15s ease',
            }}
          >
            Cara Kerja
          </a>
          <a
            href="#kalkulator-roi"
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
              borderRadius: '8px',
              transition: 'background-color 0.15s ease',
            }}
          >
            Simulasi ROI
          </a>
          <a
            href="#harga"
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
              borderRadius: '8px',
              transition: 'background-color 0.15s ease',
            }}
          >
            Harga
          </a>
          <a
            href="#faq"
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
              borderRadius: '8px',
              transition: 'background-color 0.15s ease',
            }}
          >
            FAQ
          </a>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/login"
            style={{
              padding: '0 14px',
              minHeight: '38px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 650,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
              borderRadius: '9px',
              border: '1px solid var(--color-divider)',
              backgroundColor: '#FFFFFF',
              transition: 'background-color 0.15s ease',
            }}
          >
            Masuk
          </Link>
          <Link
            href="/login"
            style={{
              padding: '0 16px',
              minHeight: '38px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFFFFF',
              backgroundColor: 'var(--color-primary)',
              textDecoration: 'none',
              borderRadius: '9px',
              border: '1px solid var(--color-primary)',
              boxShadow: '0 1px 3px rgba(40, 99, 68, 0.2)',
              transition: 'transform 0.1s ease, background-color 0.15s ease',
            }}
          >
            Mulai Gratis →
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-only"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '9px',
              border: '1px solid var(--color-divider)',
              backgroundColor: '#FFFFFF',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-main)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-only"
          style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--color-divider)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <a
            href="#solusi"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 0',
              fontSize: '15px',
              fontWeight: 650,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-divider)',
            }}
          >
            Solusi
          </a>
          <a
            href="#cara-kerja"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 0',
              fontSize: '15px',
              fontWeight: 650,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-divider)',
            }}
          >
            Cara Kerja
          </a>
          <a
            href="#kalkulator-roi"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 0',
              fontSize: '15px',
              fontWeight: 650,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-divider)',
            }}
          >
            Simulasi ROI
          </a>
          <a
            href="#harga"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 0',
              fontSize: '15px',
              fontWeight: 650,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-divider)',
            }}
          >
            Harga
          </a>
          <a
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 0',
              fontSize: '15px',
              fontWeight: 650,
              color: 'var(--color-text-main)',
              textDecoration: 'none',
            }}
          >
            FAQ
          </a>
        </div>
      )}
    </header>
  );
}
