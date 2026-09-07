'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHead, EmptyState, ErrorState, LoadingRows } from '@/components/ui';
import { contactQueries, lifecycleQueries } from '@/lib/container';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { formatPhoneDisplay } from '@promotor/platform-core';

function stageTagClass(stage: string): string {
  const s = stage.toUpperCase();
  if (s === 'COMPLETED') return 'tag tag-neutral';
  if (s === 'BOOKED' || s === 'FOLLOW_UP') return 'tag tag-accent';
  return 'tag tag-outline';
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<FlowContact[] | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadContacts = useCallback(
    async (filterParam: string) => {
      setLoadError(null);
      try {
        const list = await contactQueries.listContacts(search, filterParam);
        setContacts(list);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat kontak.');
      }
    },
    [search]
  );

  useEffect(() => {
    reloadContacts(activeFilter);
  }, [search, reloadContacts, activeFilter]);

  const shown = contacts?.length ?? 0;

  return (
    <AppShell showBottomNav={true}>
      <PageHeader
        kicker="PromotorFlow"
        title="Kontak"
        sub={loadError ? undefined : `${shown} dari ${shown} kontak`}
        action={
          <Link href="/app/contacts/new" aria-label="Tambah kontak baru" className="header-action">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Link>
        }
      />

      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <input
          type="text"
          className="input"
          placeholder="Cari nama atau nomor"
          aria-label="Cari nama atau nomor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 12px' }} role="group" aria-label="Filter cepat">
            {[
              { label: 'Semua', params: '' },
              { label: 'Belum Dihubungi', params: 'neverContacted=true' },
              { label: 'Follow-up Terlambat', params: 'followUpOverdue=true' },
              { label: 'Prospek', params: 'classification=PROSPECT' },
              { label: 'Klien', params: 'classification=CLIENT' },
            ].map((f) => (
              <button
                key={f.label}
                type="button"
                className={`btn btn-sm ${activeFilter === f.params ? 'btn-primary' : 'btn-secondary'}`}
                aria-pressed={activeFilter === f.params}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                onClick={() => {
                  setActiveFilter(f.params);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError && <ErrorState title="Gagal memuat kontak" detail={loadError} onRetry={() => reloadContacts(activeFilter)} />}

      {!contacts && !loadError && <LoadingRows rows={6} />}

      {contacts && contacts.length > 0 && (
        <>
          <SectionHead label="Daftar kontak" count={`${shown}`} />
          {contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              className="list-row"
              onClick={() => router.push(`/app/contacts/${c.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                <span style={{ font: '700 15px/1.2 var(--font-sans)' }}>{c.name}</span>
                <span className={stageTagClass(c.stage)} style={{ flex: 'none' }}>
                  {lifecycleQueries.getStageLabel(c.stage)}
                </span>
              </div>
              <div className="row-meta">
                {formatPhoneDisplay(c.phoneE164)} · {c.sourceChannel || 'Lead'}
              </div>
            </button>
          ))}
        </>
      )}

      {contacts && contacts.length === 0 && !loadError && (
        <EmptyState
          title="Belum ada kontak yang sesuai"
          explanation="Kontak baru muncul dari booking publik atau ditambahkan manual."
          action={
            <Link href="/app/contacts/new" className="btn btn-secondary btn-sm">
              Tambah kontak
            </Link>
          }
        />
      )}
      <div style={{ height: 24 }} />
    </AppShell>
  );
}
