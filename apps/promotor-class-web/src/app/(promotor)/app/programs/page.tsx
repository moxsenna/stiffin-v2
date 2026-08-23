'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getProgramsQuery } from '@/modules/programs/queries';
import { getPublicStorefrontRepository } from '@/adapters';
import { Program } from '@promotor/contracts';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [workspaceSlug, setWorkspaceSlug] = useState('demo');
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft' | 'lead_magnet' | 'aftersales'>('all');

  useEffect(() => {
    getProgramsQuery().then(data => {
      if (data) setPrograms(data);
    });

    getPublicStorefrontRepository().getStorefrontProfile().then(profile => {
      if (profile && profile.workspaceSlug) setWorkspaceSlug(profile.workspaceSlug);
    }).catch(() => {});
  }, []);

  const filteredPrograms = programs.filter(p => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'published') return p.status === 'published';
    if (activeFilter === 'draft') return p.status === 'draft';
    if (activeFilter === 'lead_magnet') return p.programType === 'lead_magnet';
    if (activeFilter === 'aftersales') return p.programType === 'aftersales';
    return true;
  });

  const totalLessons = programs.reduce((acc, p) => acc + p.modules.reduce((mAcc, m) => mAcc + m.lessons.length, 0), 0);
  const publishedCount = programs.filter(p => p.status === 'published').length;

  return (
    <PromotorShell>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Modern Header Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', padding: '2px 8px', borderRadius: 'var(--border-radius-full)' }}>
                Client Education OS
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.035em', color: 'var(--color-text-main)', margin: '0 0 6px' }}>
              Katalog Program & E-Course
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, fontWeight: 500 }}>
              Kelola materi edukasi terstruktur, lead magnet otomatis, dan program aftersales STIFIn Anda.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/p/${workspaceSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '13px',
                fontWeight: 750,
                color: 'var(--color-text-body)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                padding: '10px 16px',
                borderRadius: 'var(--border-radius-md)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-xs)',
                transition: 'background-color var(--duration-fast) ease',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Pratinjau Storefront</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>↗</span>
            </Link>

            <Link
              href="/app/programs/new"
              className="touch-target-primary"
              style={{
                padding: '0 22px',
                minHeight: '44px',
                background: 'var(--gradient-primary)',
                color: '#FFF',
                borderRadius: 'var(--border-radius-md)',
                fontWeight: 800,
                fontSize: '13.5px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-glow)',
                transition: 'transform var(--duration-fast) var(--ease-spring)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Buat Program Baru</span>
            </Link>
          </div>
        </div>

        {/* Dynamic Metric Bento Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 650, color: 'var(--color-text-muted)' }}>Total Program</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </span>
            </div>
            <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
              {programs.length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {publishedCount} terbit aktif di storefront
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 650, color: 'var(--color-text-muted)' }}>Total Sesi Materi</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--color-accent-cyan-light)', color: 'var(--color-accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </span>
            </div>
            <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
              {totalLessons}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Video & lembar refleksi terhubung
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 650, color: 'var(--color-text-muted)' }}>Storefront Status</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--color-status-success-bg)', color: 'var(--color-status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 850, color: 'var(--color-status-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-status-success)' }} />
              Live Online
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              /{workspaceSlug} siap menerima leads
            </div>
          </div>
        </div>

        {/* Filter Pills Navigation */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'all', label: 'Semua Program', count: programs.length },
            { id: 'published', label: 'Terbit', count: programs.filter(p => p.status === 'published').length },
            { id: 'draft', label: 'Draf', count: programs.filter(p => p.status === 'draft').length },
            { id: 'lead_magnet', label: 'Lead Magnet (Gratis)', count: programs.filter(p => p.programType === 'lead_magnet').length },
            { id: 'aftersales', label: 'Khusus Aftersales', count: programs.filter(p => p.programType === 'aftersales').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--border-radius-full)',
                backgroundColor: activeFilter === tab.id ? 'var(--color-primary)' : 'var(--color-surface)',
                color: activeFilter === tab.id ? '#FFFFFF' : 'var(--color-text-body)',
                border: activeFilter === tab.id ? '1px solid var(--color-primary)' : '1px solid var(--color-divider)',
                fontSize: '12.5px',
                fontWeight: activeFilter === tab.id ? 750 : 550,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: activeFilter === tab.id ? 'var(--shadow-xs)' : 'none',
                transition: 'all var(--duration-fast) ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 'var(--border-radius-full)',
                  backgroundColor: activeFilter === tab.id ? 'rgba(255, 255, 255, 0.22)' : 'var(--color-canvas-subtle)',
                  color: activeFilter === tab.id ? '#FFFFFF' : 'var(--color-text-muted)',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Program Cards / Empty State */}
        {filteredPrograms.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-xl)',
              border: '1px solid var(--color-divider)',
              padding: '48px 24px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'var(--gradient-brand)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-text-main)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Mulai Bangun Program Edukasi Pertama Anda
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', maxWidth: '480px', margin: '0 auto 28px', lineHeight: 1.6 }}>
              PromotorClass mengubah materi video ringkas menjadi mesin konversi klien otomatis. Pilih blueprint siap pakai di bawah:
            </p>

            {/* Quick Blueprint Templates Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                maxWidth: '860px',
                margin: '0 auto 32px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  padding: '20px',
                  borderRadius: 'var(--border-radius-lg)',
                  border: '1px solid var(--color-primary-border)',
                  backgroundColor: 'var(--color-primary-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Blueprint 1 · Lead Magnet
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '6px' }}>
                    7 Hari Mengenal Karakter STIFIn
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-body)', lineHeight: 1.5, marginBottom: '14px' }}>
                    Video mini-series 3 menit + pertanyaan refleksi untuk memancing kebutuhan Tes STIFIn.
                  </div>
                </div>
                <Link
                  href="/app/programs/new"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 780,
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Gunakan Blueprint Ini →
                </Link>
              </div>

              <div
                style={{
                  padding: '20px',
                  borderRadius: 'var(--border-radius-lg)',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-status-warning)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Blueprint 2 · Aftercare Pasutri
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '6px' }}>
                    Panduan Komunikasi Pasca-Tes
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-body)', lineHeight: 1.5, marginBottom: '14px' }}>
                    Materi eksklusif setelah tes untuk mendorong referral keluarga & follow-on mentoring.
                  </div>
                </div>
                <Link
                  href="/app/programs/new"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 780,
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Gunakan Blueprint Ini →
                </Link>
              </div>

              <div
                style={{
                  padding: '20px',
                  borderRadius: 'var(--border-radius-lg)',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Blueprint 3 · Kelas Berbayar
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '6px' }}>
                    Workshop Parenting Genetik
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-body)', lineHeight: 1.5, marginBottom: '14px' }}>
                    E-course komprehensif dengan akses berbayar langsung melalui WhatsApp promotor.
                  </div>
                </div>
                <Link
                  href="/app/programs/new"
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 780,
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Gunakan Blueprint Ini →
                </Link>
              </div>
            </div>

            <Link
              href="/app/programs/new"
              className="touch-target-primary"
              style={{
                padding: '0 28px',
                minHeight: '48px',
                background: 'var(--gradient-primary)',
                color: '#FFF',
                borderRadius: 'var(--border-radius-md)',
                fontWeight: 800,
                fontSize: '14.5px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              + Buat Program dari Draf Kosong
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            {filteredPrograms.map((prog) => (
              <div
                key={prog.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--border-radius-lg)',
                  border: '1px solid var(--color-divider)',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all var(--duration-fast) var(--ease-spring)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top Accent Line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: prog.status === 'published' ? 'var(--gradient-brand)' : 'var(--color-divider)' }} />

                <div>
                  {/* Status & Type Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--border-radius-full)',
                        backgroundColor: prog.status === 'published' ? 'var(--color-status-success-bg)' : 'var(--color-canvas-subtle)',
                        color: prog.status === 'published' ? 'var(--color-status-success)' : 'var(--color-text-muted)',
                        border: prog.status === 'published' ? '1px solid var(--color-status-success-border)' : '1px solid var(--color-divider)',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: prog.status === 'published' ? 'var(--color-status-success)' : 'var(--color-text-subtle)' }} />
                      {prog.status === 'published' ? 'Terbit di Storefront' : 'Draf'}
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--border-radius-full)',
                        backgroundColor: prog.programType === 'lead_magnet' ? 'var(--color-primary-light)' : prog.programType === 'aftersales' ? 'var(--color-status-warning-bg)' : '#EEF2FF',
                        color: prog.programType === 'lead_magnet' ? 'var(--color-primary)' : prog.programType === 'aftersales' ? 'var(--color-status-warning)' : 'var(--color-accent-indigo)',
                        border: '1px solid var(--color-divider)',
                        fontWeight: 800,
                      }}
                    >
                      {prog.programType === 'lead_magnet' ? 'Gratis (Lead Magnet)' : prog.programType === 'aftersales' ? 'Khusus Aftersales' : 'Berbayar'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 850, color: 'var(--color-text-main)', margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                    {prog.title}
                  </h3>

                  <p style={{ fontSize: '13px', color: 'var(--color-text-body)', lineHeight: 1.5, margin: 0 }}>
                    {prog.subtitle || prog.description || 'Program edukasi interaktif untuk klien STIFIn.'}
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div
                  style={{
                    paddingTop: '16px',
                    borderTop: '1px solid var(--color-divider)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 650 }}>
                    {prog.modules.length} Bab · {prog.modules.reduce((acc, m) => acc + m.lessons.length, 0)} Pelajaran
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Link
                      href={`/p/${workspaceSlug}/${prog.programSlug}`}
                      target="_blank"
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--color-text-muted)',
                        textDecoration: 'none',
                        fontWeight: 650,
                      }}
                    >
                      Pratinjau ↗
                    </Link>
                    <Link
                      href={`/app/programs/${prog.id}`}
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: 'var(--color-primary)',
                        backgroundColor: 'var(--color-primary-light)',
                        border: '1px solid var(--color-primary-border)',
                        padding: '6px 12px',
                        borderRadius: 'var(--border-radius-sm)',
                        textDecoration: 'none',
                        transition: 'background-color var(--duration-fast) ease',
                      }}
                    >
                      Kelola Kurikulum →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PromotorShell>
  );
}
