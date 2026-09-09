'use client';

import React, { useState } from 'react';

interface PreviewTab {
  id: 'learner' | 'cockpit' | 'learners';
  label: string;
  badge?: string;
  url: string;
  desktopSrc: string;
  mobileSrc: string;
  captionTitle: string;
  captionDesc: string;
}

const TABS: PreviewTab[] = [
  {
    id: 'learner',
    label: 'Portal Belajar Peserta',
    badge: 'UX Peserta',
    url: 'app.ralivo.com/learn/7-hari-mengenal-stifin/sesi-2',
    desktopSrc: '/images/previews/class-learner-reader.webp',
    mobileSrc: '/images/previews/class-learner-mobile.webp',
    captionTitle: 'Fokus Belajar Tanpa Distraksi (PWA Mobile)',
    captionDesc: 'Peserta mengakses materi video YouTube, refleksi pengunci pemahaman, dan catatan pribadi autosave langsung dari smartphone mereka.',
  },
  {
    id: 'cockpit',
    label: 'Cockpit Promotor',
    badge: 'Intent Engine',
    url: 'app.ralivo.com/app',
    desktopSrc: '/images/previews/class-promotor-cockpit.webp',
    mobileSrc: '/images/previews/class-cockpit-mobile.webp',
    captionTitle: 'Radar Sinyal Pembeli Terpanas',
    captionDesc: 'Ketahui instan peserta mana yang HOT (siap closing tes STIFIn), WARM, atau butuh dorongan edukasi lanjutan.',
  },
  {
    id: 'learners',
    label: 'Monitoring Peserta',
    badge: 'Anti-Drop',
    url: 'app.ralivo.com/app/learners',
    desktopSrc: '/images/previews/class-learners-table.webp',
    mobileSrc: '/images/previews/class-learners-mobile.webp',
    captionTitle: 'Pantau Progres & Deteksi Learner Macet',
    captionDesc: 'Peringatan dini otomatis untuk peserta yang pasif ≥7 hari agar segera dihubungi via WhatsApp sebelum kehilangan minat.',
  },
];

export const ClassAppPreview: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<'learner' | 'cockpit' | 'learners'>('learner');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  const activeTab = TABS.find((t) => t.id === activeTabId) || TABS[0];

  return (
    <div style={{ width: '100%', maxWidth: 1120, margin: '48px auto 0', padding: '0 16px' }}>
      {/* Top Controls: Feature Tabs & Device Switcher */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* Feature Tabs */}
        <div
          className="preview-tabs-container"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
          }}
        >
          {TABS.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                className="preview-tab-btn"
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  backgroundColor: isActive ? 'var(--ink)' : 'var(--surface)',
                  color: isActive ? '#FFFFFF' : 'var(--muted-strong)',
                  border: isActive ? '1px solid var(--ink)' : '1px solid var(--line)',
                  borderRadius: '999px',
                  fontSize: 13,
                  fontWeight: 750,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  boxShadow: isActive ? '0 4px 12px rgba(15,23,42,0.12)' : 'none',
                }}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--surface-muted)',
                      color: isActive ? '#FFFFFF' : 'var(--accent)',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Device Switcher (Desktop viewport only) */}
        <div
          className="device-switcher"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--line)',
            borderRadius: '999px',
            padding: '3px',
            gap: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setDeviceMode('desktop')}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: deviceMode === 'desktop' ? 'var(--surface)' : 'transparent',
              color: deviceMode === 'desktop' ? 'var(--ink)' : 'var(--muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: deviceMode === 'desktop' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            💻 Desktop
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode('mobile')}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: deviceMode === 'mobile' ? 'var(--surface)' : 'transparent',
              color: deviceMode === 'mobile' ? 'var(--ink)' : 'var(--muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: deviceMode === 'mobile' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            📱 Mobile PWA
          </button>
        </div>
      </div>

      {/* Desktop Browser Window Mockup Frame */}
      <div
        className={`preview-desktop-frame ${deviceMode === 'mobile' ? 'force-hide' : ''}`}
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '12px',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Browser Top Chrome / Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 16px',
            backgroundColor: 'var(--canvas)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {/* Traffic Light Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          </div>

          {/* Address Bar */}
          <div
            style={{
              flex: 1,
              maxWidth: 540,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'var(--muted-strong)',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: '#10b981', fontSize: 11 }}>🔒</span>
            <span style={{ opacity: 0.6 }}>https://</span>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{activeTab.url}</span>
          </div>

          {/* Live Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span>Akun Demo Rina</span>
          </div>
        </div>

        {/* Screenshot Viewport Container */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#0F172A',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <img
            src={activeTab.desktopSrc}
            alt={activeTab.captionTitle}
            width={1280}
            height={800}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              aspectRatio: '16/10',
              objectFit: 'cover',
              objectPosition: 'top left',
            }}
            loading="lazy"
          />

          {/* Floating Mobile Inset Phone Preview */}
          <div
            className="preview-mobile-inset"
            style={{
              position: 'absolute',
              right: 24,
              bottom: -20,
              width: 170,
              backgroundColor: 'var(--surface)',
              border: '3px solid var(--ink)',
              borderRadius: '24px',
              boxShadow: '0 20px 35px -8px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              zIndex: 2,
            }}
          >
            <div style={{ backgroundColor: 'var(--ink)', padding: '4px 0', textAlign: 'center' }}>
              <span style={{ width: 32, height: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2, display: 'inline-block' }} />
            </div>
            <img
              src={activeTab.mobileSrc}
              alt={`${activeTab.label} Mobile PWA`}
              width={390}
              height={844}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
              loading="lazy"
            />
          </div>
        </div>

        {/* Feature Caption Underneath Frame */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--surface)',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ minWidth: 260, flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>
              {activeTab.captionTitle}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted-strong)', lineHeight: 1.5 }}>
              {activeTab.captionDesc}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--accent)',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              Demo Aktif Promotor
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Smartphone PWA Frame (Always shown on mobile viewport <=768px, or toggled on desktop) */}
      <div className={`preview-phone-container ${deviceMode === 'mobile' ? 'force-show' : ''}`}>
        <div className="phone-device-shell">
          {/* Top Dynamic Island / Pill */}
          <div className="phone-top-bar">
            <div className="phone-camera-pill" />
          </div>

          {/* Screen Content */}
          <div className="phone-screen">
            <img
              src={activeTab.mobileSrc}
              alt={`${activeTab.captionTitle} Mobile PWA`}
              width={390}
              height={844}
              className="phone-screen-img"
              loading="lazy"
            />
          </div>

          {/* Bottom Home Indicator */}
          <div className="phone-bottom-bar">
            <div className="phone-home-indicator" />
          </div>
        </div>

        {/* Caption Underneath Phone */}
        <div
          style={{
            marginTop: 16,
            textAlign: 'center',
            maxWidth: 360,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
            {activeTab.captionTitle}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted-strong)', lineHeight: 1.5 }}>
            {activeTab.captionDesc}
          </div>
          <div style={{ marginTop: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--accent)',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                padding: '4px 12px',
                borderRadius: '999px',
              }}
            >
              📱 PWA Mobile First · Ramah Kuota
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .preview-desktop-frame {
          display: block;
        }
        .preview-phone-container {
          display: none;
        }

        .preview-phone-container.force-show {
          display: flex !important;
          flex-direction: column;
          align-items: center;
        }
        .preview-desktop-frame.force-hide {
          display: none !important;
        }

        .phone-device-shell {
          width: 100%;
          max-width: 310px;
          background-color: #0f172a;
          border: 7px solid #1e293b;
          border-radius: 36px;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
          overflow: hidden;
          margin: 0 auto;
        }
        .phone-top-bar {
          background-color: #0f172a;
          padding: 8px 0 5px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .phone-camera-pill {
          width: 68px;
          height: 14px;
          background-color: #020617;
          border-radius: 999px;
        }
        .phone-screen {
          width: 100%;
          background-color: #ffffff;
          overflow: hidden;
        }
        .phone-screen-img {
          width: 100%;
          height: auto;
          display: block;
          aspect-ratio: 390 / 844;
          object-fit: cover;
          object-position: top center;
        }
        .phone-bottom-bar {
          background-color: #0f172a;
          padding: 10px 0 6px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .phone-home-indicator {
          width: 96px;
          height: 4px;
          background-color: rgba(255, 255, 255, 0.4);
          border-radius: 999px;
        }

        @media (max-width: 768px) {
          .preview-desktop-frame {
            display: none !important;
          }
          .preview-phone-container {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            width: 100%;
          }
          .device-switcher {
            display: none !important;
          }
          .preview-tabs-container {
            display: flex !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            justify-content: flex-start !important;
            width: 100% !important;
            padding: 4px 4px 10px !important;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .preview-tabs-container::-webkit-scrollbar {
            display: none;
          }
          .preview-tab-btn {
            flex-shrink: 0 !important;
            white-space: nowrap !important;
          }
        }
      `}</style>
    </div>
  );
};
