'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { MockStateStore } from '@/adapters/mock/mock-state-store';
import { Program } from '@promotor/contracts';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    setPrograms(MockStateStore.getState().programs);
  }, []);

  return (
    <PromotorShell>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Daftar Program</h1>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Kelola materi edukasi & program aftersales
            </div>
          </div>

          <Link
            href="/app/programs/new"
            className="touch-target-primary"
            style={{
              padding: '0 16px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFF',
              borderRadius: 'var(--border-radius-md)',
              fontWeight: 600,
            }}
          >
            + Buat Program
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {programs.map(prog => (
            <Link
              key={prog.id}
              href={`/app/programs/${prog.id}`}
              style={{
                padding: '16px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-divider)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>{prog.title}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: prog.isPublished ? 'var(--color-status-success-bg)' : '#F0F0ED',
                      color: prog.isPublished ? 'var(--color-status-success)' : 'var(--color-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {prog.isPublished ? 'Terbit' : 'Draf'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {prog.subtitle || prog.description}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                  {prog.modules.reduce((acc, m) => acc + m.lessons.length, 0)} Pelajaran
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>
                  Lihat Detail →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PromotorShell>
  );
}
