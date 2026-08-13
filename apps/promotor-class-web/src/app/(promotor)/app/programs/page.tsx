'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getProgramsQuery } from '@/modules/programs/queries';
import { getPublicWorkspaceProfileQuery } from '@/modules/public-storefront/queries';
import { Program } from '@promotor/contracts';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [workspaceSlug, setWorkspaceSlug] = useState('rina');

  useEffect(() => {
    getProgramsQuery().then(data => {
      if (data) setPrograms(data);
    });

    getPublicWorkspaceProfileQuery('rina').then(profile => {
      if (profile) setWorkspaceSlug(profile.workspaceSlug);
    });
  }, []);

  return (
    <PromotorShell>
      <div style={{ padding: '20px 16px', maxWidth: '840px', margin: '0 auto' }}>
        {/* Top Page Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '2px' }}>
                Daftar Program & E-Course
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                Kelola materi edukasi, program gratis, dan kelas berbayar Anda
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link
                href="/app/settings"
                style={{
                  fontSize: '13px',
                  fontWeight: 750,
                  color: 'var(--color-text-main)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-divider)',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⚙️ Pengaturan Storefront
              </Link>

              <Link
                href={`/p/${workspaceSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '13px',
                  fontWeight: 750,
                  color: 'var(--color-primary)',
                  backgroundColor: 'var(--color-primary-light)',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Preview Storefront ↗
              </Link>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '480px' }}>
            Program gratis (lead magnet), khusus peserta tes, dan berbayar ({programs.length} program aktif).
          </div>

          <Link
            href="/app/programs/new"
            className="touch-target-primary"
            style={{
              padding: '0 20px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFF',
              borderRadius: '12px',
              fontWeight: 780,
              fontSize: '13.5px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            + Buat Program Baru
          </Link>
        </div>

        {/* Program Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {programs.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                backgroundColor: 'var(--color-surface)',
                borderRadius: '16px',
                border: '1px dashed var(--color-divider)',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📖</div>
              <h3 style={{ fontSize: '16px', fontWeight: 750, marginBottom: '4px' }}>Belum ada program</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                Buat program pertama Anda untuk mulai menerima peserta di storefront.
              </p>
              <Link
                href="/app/programs/new"
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFF',
                  borderRadius: '10px',
                  fontWeight: 750,
                  fontSize: '13px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                + Buat Program Pertama Anda
              </Link>
            </div>
          ) : (
            programs.map(prog => (
              <div
                key={prog.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--color-divider)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px', fontWeight: 780 }}>{prog.title}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: prog.status === 'published' ? 'var(--color-status-success-bg)' : '#F0F0ED',
                          color: prog.status === 'published' ? 'var(--color-status-success)' : 'var(--color-text-muted)',
                          fontWeight: 750,
                        }}
                      >
                        {prog.status === 'published' ? 'Terbit di Storefront' : 'Draf'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: prog.programType === 'lead_magnet' ? '#eef5f1' : prog.programType === 'aftersales' ? '#FFF8EB' : '#eef2ff',
                          color: prog.programType === 'lead_magnet' ? '#286344' : prog.programType === 'aftersales' ? '#C07000' : '#3730a3',
                          fontWeight: 750,
                        }}
                      >
                        {prog.programType === 'lead_magnet' ? 'Gratis (Lead Magnet)' : prog.programType === 'aftersales' ? 'Khusus Peserta Tes' : 'Berbayar'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                      {prog.subtitle || prog.description}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--color-divider)',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
                    {prog.modules.length} Bab · {prog.modules.reduce((acc, m) => acc + m.lessons.length, 0)} Sesi Pelajaran
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Link
                      href={`/p/${workspaceSlug}/${prog.programSlug}`}
                      target="_blank"
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-text-muted)',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Lihat Landing ↗
                    </Link>
                    <Link
                      href={`/app/programs/${prog.id}`}
                      style={{
                        fontSize: '13px',
                        fontWeight: 780,
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                      }}
                    >
                      Kelola Kurikulum & Materi →
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PromotorShell>
  );
}
