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
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <LightningIcon size={20} color="#FFFFFF" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '17px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
              PromotorFlow
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
            gap: '32px',
          }}
          className="desktop-nav"
        >
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
            className="touch-target"
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
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            Buka App Demo →
          </Link>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 840px) {
          .desktop-nav {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
};
