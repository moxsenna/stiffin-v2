'use client';

import React, { useState, useRef } from 'react';

export const LaunchVideoShowcase: React.FC = () => {
  const [activeVersion, setActiveVersion] = useState<'mobile' | 'desktop'>('mobile');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleToggle = (version: 'mobile' | 'desktop') => {
    setActiveVersion(version);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
  };

  const handlePlayToggle = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1120,
        margin: '48px auto 0',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Info & Switcher */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'inline-block',
                boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.2)',
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#2563eb',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Video Tur Platform · 30 Detik
            </span>
          </div>
          <h3
            style={{
              fontSize: 'clamp(20px, 3vw, 26px)',
              fontWeight: 850,
              color: 'var(--ink)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Satu Ekosistem Edukasi, Langsung Terhubung
          </h3>
        </div>

        {/* Toggle Version (Mobile vs Desktop) */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--line)',
            borderRadius: '999px',
            padding: '4px',
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => handleToggle('mobile')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: activeVersion === 'mobile' ? '#2563eb' : 'transparent',
              color: activeVersion === 'mobile' ? '#ffffff' : 'var(--muted-strong)',
              fontSize: 13,
              fontWeight: 750,
              cursor: 'pointer',
              boxShadow: activeVersion === 'mobile' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 160ms ease',
            }}
          >
            <span>📱 Tampilan Mobile PWA</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                backgroundColor: activeVersion === 'mobile' ? 'rgba(255,255,255,0.25)' : 'rgba(37,99,235,0.1)',
                color: activeVersion === 'mobile' ? '#ffffff' : '#2563eb',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              Utama
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleToggle('desktop')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: activeVersion === 'desktop' ? '#0f172a' : 'transparent',
              color: activeVersion === 'desktop' ? '#ffffff' : 'var(--muted-strong)',
              fontSize: 13,
              fontWeight: 750,
              cursor: 'pointer',
              boxShadow: activeVersion === 'desktop' ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none',
              transition: 'all 160ms ease',
            }}
          >
            <span>💻 Tampilan Desktop</span>
          </button>
        </div>
      </div>

      {/* Video Container Shell */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#090d16',
          borderRadius: 20,
          border: '1.5px solid var(--line)',
          boxShadow: '0 28px 60px -15px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(37, 99, 235, 0.08)',
          overflow: 'hidden',
          aspectRatio: '16/9',
          width: '100%',
        }}
      >
        <video
          ref={videoRef}
          src={activeVersion === 'mobile' ? '/videos/ralivo-launch-mobile.mp4' : '/videos/ralivo-launch-desktop.mp4'}
          poster={activeVersion === 'mobile' ? '/videos/poster-mobile.png' : '/videos/poster-desktop.png'}
          controls
          playsInline
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
            backgroundColor: '#000000',
          }}
        />

        {/* Custom Play Overlay Button (Hidden when playing) */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handlePlayToggle}
            aria-label="Putar Video Tur"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 99, 235, 0.92)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 12px 32px rgba(37, 99, 235, 0.5), 0 0 0 8px rgba(37, 99, 235, 0.25)',
              transition: 'transform 180ms ease, background-color 180ms ease',
              zIndex: 3,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)';
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.92)';
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 4 }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        )}

        {/* Top Floating Badge */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '999px',
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#ffffff',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <span>🎵 Musik & Visual 1080p</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ color: '#60a5fa' }}>ralivo.biz.id</span>
        </div>
      </div>

      {/* Feature Highlights beneath Video */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          marginTop: 18,
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '14px 16px',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>
            1. Ruang Kelas PWA Mobile
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-strong)', lineHeight: 1.4 }}>
            Peserta belajar nyaman tanpa instal aplikasi, materi video YouTube terkunci, dan progres tersimpan instan.
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '14px 16px',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>
            2. Follow-Up WhatsApp Terarah
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-strong)', lineHeight: 1.4 }}>
            Otomatisasi draft pesan personal saat siswa selesai modul atau butuh dorongan belajar lanjutan.
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '14px 16px',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>
            3. Checkout Instan & Sesi Konsultasi
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-strong)', lineHeight: 1.4 }}>
            Verifikasi pembayaran QRIS/VA otomatis tanpa cek mutasi manual, plus booking konsultasi 1-on-1.
          </div>
        </div>
      </div>
    </div>
  );
};
