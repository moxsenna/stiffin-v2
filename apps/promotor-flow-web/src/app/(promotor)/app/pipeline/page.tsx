'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { BrandKicker, LoadingRows, ErrorState } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { contactQueries, lifecycleCommands, messagingQueries, messagingCommands } from '@/lib/container';
import { PIPELINE_STAGES, STAGE_LABELS, groupContactsByStage } from '@/modules/pipeline/grouping';
import { formatPhoneDisplay } from '@promotor/platform-core';
import { ContactLifecycleStage } from '@promotor/contracts';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { getSession } from '@/lib/auth';

const STAGE_TONE: Partial<Record<ContactLifecycleStage, string>> = {
  NEW: 'hv-tone-badge-class',
  CONTACTED: 'hv-tone-badge-hangat',
  INTERESTED: 'hv-tone-badge-hangat',
  FOLLOW_UP: 'hv-tone-badge-urgent',
  BOOKED: 'hv-tone-badge-formal',
  COMPLETED: 'hv-tone-badge-retensi',
};

const STAGE_DOT: Partial<Record<ContactLifecycleStage, string>> = {
  NEW: 'var(--hv-cyan)',
  CONTACTED: 'var(--hv-accent)',
  INTERESTED: 'var(--hv-accent)',
  FOLLOW_UP: 'var(--hv-danger)',
  BOOKED: '#475569',
  COMPLETED: 'var(--hv-success)',
  LOST: 'var(--hv-subtle)',
};

export default function PipelinePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<FlowContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuContact, setMenuContact] = useState<{ id: string; name: string } | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [dragOver, setDragOver] = useState<ContactLifecycleStage | null>(null);
  const [bookingSlug, setBookingSlug] = useState<string>('anda');
  const [waBusyId, setWaBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const list = await contactQueries.listContacts(undefined, undefined);
      setContacts(list);
      try {
        const sess = await getSession();
        if (sess?.organization?.slug) setBookingSlug(sess.organization.slug);
      } catch {
        /* keep default slug */
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat pipeline kontak.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const moveTo = async (contactId: string, stage: ContactLifecycleStage) => {
    if (isMoving) return;
    setIsMoving(true);
    try {
      const lostReason = stage === 'LOST' ? 'Tidak sesuai' : undefined;
      await lifecycleCommands.changeStage(contactId, stage as any, lostReason);
      await loadData();
      showToast(`Tahap kontak dipindah ke ${STAGE_LABELS[stage] || stage}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal memindahkan tahap kontak', 'error');
    } finally {
      setIsMoving(false);
      setMenuContact(null);
    }
  };

  const handleOneTapWa = async (c: FlowContact, e: React.MouseEvent) => {
    e.stopPropagation();
    if (waBusyId) return;
    setWaBusyId(c.id);
    try {
      const category = c.stage === 'BOOKED' ? 'REMIND_BOOKING' : c.stage === 'COMPLETED' ? 'AFTERCARE' : 'FOLLOW_UP';
      const draft = await messagingQueries.generateDraftMessage(category, c.name, {
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

  if (error) {
    return (
      <AppShell showBottomNav={true} fullWidth={true}>
        <div className="hv-page">
          <div className="hv-topnav">
            <div>
              <BrandKicker />
              <h1 className="hv-page-title">Pipeline CRM Kanban</h1>
              <div className="hv-page-sub">Papan visual tahap konversi kontak</div>
            </div>
          </div>
          <div className="hv-column" style={{ maxWidth: 1100 }}>
            <ErrorState title="Terjadi Kesalahan" detail={error} onRetry={loadData} />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!contacts) {
    return (
      <AppShell showBottomNav={true} fullWidth={true}>
        <div className="hv-page">
          <div className="hv-topnav">
            <div>
              <BrandKicker />
              <h1 className="hv-page-title">Pipeline CRM Kanban</h1>
              <div className="hv-page-sub">Memuat data prospek...</div>
            </div>
          </div>
          <div className="hv-column" style={{ maxWidth: 1100 }}>
            <LoadingRows rows={6} />
          </div>
        </div>
      </AppShell>
    );
  }

  const grouped = groupContactsByStage(contacts);

  return (
    <AppShell showBottomNav={true} fullWidth={true}>
      <div className="hv-page">
        <div className="hv-topnav" style={{ maxWidth: 1100 }}>
          <div>
            <BrandKicker />
            <h1 className="hv-page-title">Pipeline CRM Kanban</h1>
            <div className="hv-page-sub">
              {contacts.length} kontak terkelola · geser kartu atau tekan pindah tahap
            </div>
          </div>
        </div>

        <div className="hv-pill-row" style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '0 16px 4px' }} role="group" aria-label="Lompat ke tahapan">
          {PIPELINE_STAGES.filter((s) => s !== 'LOST').map((s) => (
            <button
              key={s}
              type="button"
              className="hv-pill"
              onClick={() => {
                document.getElementById(`hv-kanban-col-${s}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }}
            >
              {STAGE_LABELS[s]} · {grouped[s]?.length ?? 0}
            </button>
          ))}
        </div>

        <div className="hv-kanban" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          {PIPELINE_STAGES.map((stage) => {
            const list = grouped[stage] || [];

            return (
              <section
                key={stage}
                id={`hv-kanban-col-${stage}`}
                className={`hv-kanban-col${dragOver === stage ? ' is-dragover' : ''}`}
                aria-label={STAGE_LABELS[stage]}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage);
                }}
                onDragLeave={() => setDragOver((d) => (d === stage ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const contactId = e.dataTransfer.getData('text/contact-id');
                  if (contactId) {
                    void moveTo(contactId, stage);
                  }
                }}
              >
                <div className="hv-kanban-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span
                      className="hv-kanban-head-dot"
                      style={{ background: STAGE_DOT[stage] ?? 'var(--hv-subtle)' }}
                      aria-hidden="true"
                    />
                    <div className="hv-kanban-title">{STAGE_LABELS[stage]}</div>
                  </div>
                  <span className={`hv-kanban-count${list.length > 0 ? ' is-hot' : ''}`}>{list.length}</span>
                </div>

                <div className="hv-kanban-cards">
                  {list.length === 0 ? (
                    <div className="hv-kanban-empty">
                      {stage === 'LOST' ? 'Belum ada kontak lost' : 'Seret kartu ke sini atau tekan ⇄'}
                    </div>
                  ) : (
                    list.map((c) => (
                      <article key={c.id} className="hv-kanban-card">
                        <button
                          type="button"
                          className="hv-kanban-card-body"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/contact-id', c.id);
                          }}
                          onClick={() => router.push(`/app/contacts/${c.id}`)}
                          aria-label={`Buka detail ${c.name}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div className="hv-contact-card-name">{c.name}</div>
                            {c.classification === 'CLIENT' && (
                              <span className="hv-tone-badge hv-tone-badge-retensi">Klien</span>
                            )}
                          </div>
                          <div className="hv-contact-card-meta">{formatPhoneDisplay(c.phoneE164)}</div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                            <span className={`hv-tone-badge ${STAGE_TONE[stage] ?? 'hv-tone-badge-formal'}`}>
                              {STAGE_LABELS[stage]}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--hv-subtle)' }}>
                              {c.sourceChannel || 'MANUAL'}
                            </span>
                          </div>
                        </button>
                        <div className="hv-kanban-card-actions">
                          <button
                            type="button"
                            className="hv-wa-btn"
                            style={{ minHeight: 38, fontSize: 11 }}
                            disabled={waBusyId === c.id}
                            onClick={(e) => handleOneTapWa(c, e)}
                            aria-label={`Kirim WhatsApp 1-tap ke ${c.name}`}
                          >
                            {waBusyId === c.id ? 'Membuka…' : 'WA 1-Tap'}
                          </button>
                          <button
                            type="button"
                            className="hv-copy-btn hv-kanban-move-btn"
                            style={{ minHeight: 38 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuContact({ id: c.id, name: c.name });
                            }}
                            aria-label={`Pindah tahap ${c.name}`}
                          >
                            ⇄
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {menuContact && (
          <div
            role="dialog"
            aria-label={`Pindah tahap ${menuContact.name}`}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              zIndex: 9999,
            }}
            onClick={() => setMenuContact(null)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                width: '100%',
                maxWidth: '520px',
                padding: '20px 24px 28px',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontWeight: 750, fontSize: '15px', color: '#0F172A' }}>
                  Pindahkan &quot;{menuContact.name}&quot; ke tahap:
                </div>
                <button
                  type="button"
                  onClick={() => setMenuContact(null)}
                  style={{ border: 0, background: 'none', fontSize: '18px', cursor: 'pointer', color: '#94A3B8' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {PIPELINE_STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isMoving}
                    onClick={() => moveTo(menuContact.id, s)}
                    className="hv-btn-sec"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    {STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
