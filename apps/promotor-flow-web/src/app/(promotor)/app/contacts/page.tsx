'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { BrandKicker, EmptyState, ErrorState, LoadingRows } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { contactQueries, lifecycleQueries, messagingQueries, messagingCommands } from '@/lib/container';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { formatPhoneDisplay } from '@promotor/platform-core';
import { getSession } from '@/lib/auth';

const STAGE_TONE: Record<string, string> = {
  NEW: 'hv-tone-badge-class',
  CONTACTED: 'hv-tone-badge-hangat',
  INTERESTED: 'hv-tone-badge-hangat',
  FOLLOW_UP: 'hv-tone-badge-urgent',
  BOOKED: 'hv-tone-badge-formal',
  COMPLETED: 'hv-tone-badge-retensi',
  LOST: 'hv-tone-badge-formal',
};

const QUICK_FILTERS = [
  { label: 'Semua', params: '' },
  { label: 'Belum Dihubungi', params: 'neverContacted=true' },
  { label: 'Follow-up Terlambat', params: 'followUpOverdue=true' },
  { label: 'Prospek', params: 'classification=PROSPECT' },
  { label: 'Klien', params: 'classification=CLIENT' },
];

export default function ContactsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<FlowContact[] | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookingSlug, setBookingSlug] = useState<string>('anda');
  const [waBusyId, setWaBusyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);

  const reloadContacts = useCallback(
    async (filterParam: string) => {
      setLoadError(null);
      try {
        const list = await contactQueries.listContacts(search, filterParam);
        setContacts(list);
        try {
          const sess = await getSession();
          if (sess?.organization?.slug) setBookingSlug(sess.organization.slug);
        } catch {
          /* keep default slug */
        }
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

  const handleExportCsv = () => {
    if (!contacts || contacts.length === 0) {
      showToast('Tidak ada kontak untuk diekspor', 'info');
      return;
    }
    const exportList =
      isBatchMode && selectedIds.size > 0
        ? contacts.filter((c) => selectedIds.has(c.id))
        : contacts;

    const headers = ['ID', 'Nama', 'WhatsApp', 'Stage', 'Klasifikasi', 'Channel', 'Terakhir Diperbarui'];
    const rows = exportList.map((c) => [
      c.id,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.phoneE164 || ''}"`,
      c.stage,
      c.classification,
      `"${(c.sourceChannel || '').replace(/"/g, '""')}"`,
      c.updatedAt || c.createdAt || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kontak-ralivo-flow-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${exportList.length} kontak berhasil diekspor ke CSV`, 'success');
  };

  const toggleSelectAll = () => {
    if (!contacts) return;
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const toggleSelectContact = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchBroadcast = async () => {
    if (selectedIds.size === 0) {
      showToast('Pilih setidaknya satu kontak untuk broadcast', 'info');
      return;
    }
    const selectedContacts = (contacts || []).filter((c) => selectedIds.has(c.id));
    const phoneList = selectedContacts.map((c) => formatPhoneDisplay(c.phoneE164)).join(', ');
    const draft = `Halo Bapak/Ibu, ada update jadwal sesi konsultasi & tes STIFIn terbaru. Silakan pilih jadwal: https://flow.ralivo.biz.id/p/${bookingSlug}/book`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`Daftar Broadcast (${selectedContacts.length} kontak):\n${phoneList}\n\nPesan:\n${draft}`);
        showToast(`Draft broadcast & ${selectedContacts.length} nomor berhasil disalin ke clipboard!`, 'success');
      } catch {
        showToast(`Draft broadcast siap untuk ${selectedContacts.length} kontak`, 'success');
      }
    } else {
      showToast(`Draft broadcast siap untuk ${selectedContacts.length} kontak`, 'success');
    }
  };

  const handleOneTapWa = async (c: FlowContact, e: React.MouseEvent) => {
    e.stopPropagation();
    if (waBusyId) return;
    setWaBusyId(c.id);
    try {
      const draft = await messagingQueries.generateDraftMessage('FOLLOW_UP', c.name, {
        bookingLink: messagingQueries.buildBookingLink(bookingSlug),
      });
      const waUrl = messagingQueries.buildWhatsAppUrl(c.phoneE164, draft);
      await messagingCommands.recordWhatsAppOpened(c.id, draft);
      window.open(waUrl, '_blank', 'noopener');
    } catch (err: any) {
      showToast(err?.message || 'Gagal membuka WhatsApp.', 'error');
    } finally {
      setWaBusyId(null);
    }
  };

  return (
    <AppShell showBottomNav={true}>
      <div className="hv-page">
        <div className="hv-topnav">
          <div>
            <BrandKicker />
            <h1 className="hv-page-title">Kontak</h1>
            <div className="hv-page-sub">
              {loadError ? 'Kelola prospek & klien' : `${shown} kontak terkelola`}
            </div>
          </div>
          <Link href="/app/contacts/new" aria-label="Tambah kontak baru" className="hv-cta">
            + Baru
          </Link>
        </div>

        <div className="hv-column">
          <input
            type="text"
            className="hv-input"
            placeholder="Cari nama atau nomor"
            aria-label="Cari nama atau nomor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 }}>
            <div className="hv-pill-row" role="group" aria-label="Filter cepat" style={{ margin: 0 }}>
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  className={`hv-pill${activeFilter === f.params ? ' is-active' : ''}`}
                  aria-pressed={activeFilter === f.params}
                  onClick={() => setActiveFilter(f.params)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setIsBatchMode(!isBatchMode)}
                className="hv-pill"
                style={{
                  background: isBatchMode ? 'var(--hv-accent)' : undefined,
                  color: isBatchMode ? '#ffffff' : undefined,
                  fontWeight: 700,
                }}
              >
                {isBatchMode ? 'Batal' : 'Batch'}
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="hv-pill"
                title="Ekspor daftar ke format CSV"
              >
                CSV ⤓
              </button>
            </div>
          </div>

          {isBatchMode && contacts && contacts.length > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
              }}
            >
              <span style={{ fontWeight: 600, color: '#1e40af' }}>
                {selectedIds.size} dari {contacts.length} kontak terpilih
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {selectedIds.size === contacts.length ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              </div>
            </div>
          )}

          {loadError && <ErrorState title="Gagal memuat kontak" detail={loadError} onRetry={() => reloadContacts(activeFilter)} />}

          {!contacts && !loadError && <LoadingRows rows={6} />}

          {contacts && contacts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {contacts.map((c) => (
                <article key={c.id} className="hv-card" style={{ padding: 12, position: 'relative' }}>
                  {isBatchMode && (
                    <div
                      onClick={(e) => toggleSelectContact(c.id, e)}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => {}}
                        style={{ width: 18, height: 18, accentColor: 'var(--hv-accent)', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    className="hv-contact-card"
                    style={{ border: 0, padding: 0, marginBottom: 8, paddingRight: isBatchMode ? 28 : 0 }}
                    onClick={() => router.push(`/app/contacts/${c.id}`)}
                    aria-label={`Buka detail ${c.name}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div className="hv-contact-card-name">{c.name}</div>
                      <span className={`hv-tone-badge ${STAGE_TONE[c.stage?.toUpperCase()] ?? 'hv-tone-badge-formal'}`}>
                        {lifecycleQueries.getStageLabel(c.stage)}
                      </span>
                    </div>
                    <div className="hv-contact-card-meta">
                      {formatPhoneDisplay(c.phoneE164)} · {c.sourceChannel || 'Lead'}
                      {c.classification === 'CLIENT' ? ' · Klien' : ''}
                    </div>
                  </button>
                  <div className="hv-actions-row">
                    <button
                      type="button"
                      className="hv-wa-btn"
                      disabled={waBusyId === c.id}
                      onClick={(e) => handleOneTapWa(c, e)}
                      aria-label={`Kirim WhatsApp 1-tap ke ${c.name}`}
                    >
                      {waBusyId === c.id ? 'Membuka…' : 'Kirim ke WhatsApp'}
                    </button>
                    <button
                      type="button"
                      className="hv-btn-sec"
                      onClick={() => router.push(`/app/contacts/${c.id}`)}
                      aria-label={`Detail ${c.name}`}
                    >
                      Detail ›
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {isBatchMode && selectedIds.size > 0 && (
            <div
              style={{
                position: 'fixed',
                bottom: 84,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 32px)',
                maxWidth: 440,
                background: 'var(--ink)',
                color: '#ffffff',
                padding: '12px 16px',
                borderRadius: '16px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 100,
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700 }}>
                {selectedIds.size} Kontak
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={handleBatchBroadcast}
                  className="hv-btn-primary"
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    borderRadius: '8px',
                  }}
                >
                  Salin Draft Broadcast
                </button>
              </div>
            </div>
          )}

          {contacts && contacts.length === 0 && !loadError && (
            <EmptyState
              title="Belum ada kontak yang sesuai"
              explanation="Kontak baru muncul dari booking publik atau ditambahkan manual."
              action={
                <Link href="/app/contacts/new" className="hv-btn-sec">
                  Tambah kontak
                </Link>
              }
            />
          )}
          <div style={{ height: 24 }} />
        </div>
      </div>
    </AppShell>
  );
}
