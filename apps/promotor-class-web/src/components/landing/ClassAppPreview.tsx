'use client';

import React, { useState } from 'react';

interface PreviewTab {
  id: 'learner' | 'cockpit' | 'learners';
  label: string;
  badge?: string;
  url: string;
  desktopSrc: string;
  mobileSrc?: string;
  captionTitle: string;
  captionDesc: string;
}

const TABS: PreviewTab[] = [
  {
    id: 'learner',
    label: 'Portal Belajar Peserta',
    badge: 'UX Peserta',
    url: 'app.ralivo.com/learn/7-hari-mengenal-stifin/lesson-1',
    desktopSrc: '/images/previews/class-learner-reader.webp',
    mobileSrc: '/images/previews/class-learner-mobile.webp',
    captionTitle: 'Fokus Belajar Tanpa Distraksi',
    captionDesc: 'Video materi YouTube, catatan pribadi autosave 1.500ms, refleksi pengunci, dan tombol konsultasi 1-tap WhatsApp.',
  },
  {
    id: 'cockpit',
    label: 'Cockpit Promotor',
    badge: 'Intent Engine',
    url: 'app.ralivo.com/app',
    desktopSrc: '/images/previews/class-promotor-cockpit.webp',
    captionTitle: 'Radar Sinyal Pembeli Terpanas',
    captionDesc: 'Ketahui instan peserta mana yang HOT (siap beli tes), WARM, atau butuh dorongan edukasi lanjutan.',
  },
  {
    id: 'learners',
    label: 'Monitoring Peserta',
    badge: 'Anti-Drop',
    url: 'app.ralivo.com/app/learners',
    desktopSrc: '/images/previews/class-learners-table.webp',
    captionTitle: 'Pantau Progres & Deteksi Learner Macet',
    captionDesc: 'Peringatan dini otomatis untuk peserta yang pasif ≥7 hari agar segera dihubungi sebelum kehilangan minat.',
  },
];

export const ClassAppPreview: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<'learner' | 'cockpit' | 'learners'>('learner');
  const activeTab = TABS.find((t) => t.id === activeTabId) || TABS[0];

  return (
    <div style={{ width: '100%', maxWidth: 1120, margin: '48px auto 0', padding: '0 16px' }}>
      {/* Tab Switchers */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                backgroundColor: isActive ? 'var(--ink)' : 'var(--surface)',
                color: isActive ? '#FFFFFF' : 'var(--muted-strong)',
                border: isActive ? '1px solid var(--ink)' : '1px solid var(--line)',
                borderRadius: '999px',
                fontSize: 13.5,
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
                    fontSize: 10,
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

      {/* Browser Window Mockup Frame */}
      <div
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
            <span className="live-tag">Live UI</span>
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

          {/* Floating Mobile Inset Phone Preview (Only on tabs that have mobileSrc) */}
          {activeTab.mobileSrc && (
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
                alt={`${activeTab.label} Mobile`}
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
          )}
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
              Terbuka untuk Promotor
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .preview-mobile-inset {
            display: none !important;
          }
          .live-tag {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
