'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHead, SegmentedControl, EmptyState, ErrorState, LoadingRows } from '@/components/ui';
import { contactQueries, lifecycleQueries } from '@/lib/container';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { formatPhoneDisplay } from '@promotor/platform-core';

type ContactFilter = 'ALL' | 'PROSPECT' | 'CLIENT';

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
  const [activeFilter, setActiveFilter] = useState<ContactFilter>('ALL');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadContacts = useCallback(async () =>{
    setLoadError(null);
    try {
      const list = await contactQueries.listContacts(search, activeFilter);
      setContacts(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat kontak.');
    }
  }, [search, activeFilter]);

  useEffect(() =>{
    loadContacts();
  }, [loadContacts]);

  const shown = contacts?.length ?? 0;

  return (
    <AppShell showBottomNav={true}>
     <PageHeader
        kicker="Talira Flow"
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
          onChange={(e) =>setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
       <div style={{ marginTop: 12 }}>
         <SegmentedControl
            ariaLabel="Filter kontak"
            options={[
              { label: 'Semua', value: 'ALL' },
              { label: 'Prospek', value: 'PROSPECT' },
              { label: 'Klien', value: 'CLIENT' },
            ]}
            value={activeFilter}
            onChange={(v) =>setActiveFilter(v as ContactFilter)}
          />
       </div>
     </div>

     {loadError && <ErrorState title="Gagal memuat kontak" detail={loadError} onRetry={() =>loadContacts()} />}

      {!contacts && !loadError && <LoadingRows rows={6} />}

      {contacts && contacts.length >0 && (
        <>
         <SectionHead label="Daftar kontak" count={`${shown}`} />
         {contacts.map((c) =>(
            <button
              key={c.id}
              type="button"
              className="list-row"
              onClick={() =>router.push(`/app/contacts/${c.id}`)}
            >
             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
               <span style={{ font: "700 15px/1.2 var(--font-sans)" }}>{c.name}</span>
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
