'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, LoadingRows, ErrorState } from '@/components/ui';
import { contactQueries, lifecycleCommands } from '@/lib/container';
import { PIPELINE_STAGES, STAGE_LABELS, groupContactsByStage } from '@/modules/pipeline/grouping';
import { formatPhoneDisplay } from '@promotor/platform-core';
import { ContactLifecycleStage } from '@promotor/contracts';
import { FlowContact } from '@promotor/promotor-flow-fixtures';

export default function PipelinePage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<FlowContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuContact, setMenuContact] = useState<{ id: string; name: string } | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const list = await contactQueries.listContacts(undefined, undefined);
      setContacts(list);
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
    } catch (err: any) {
      alert(err?.message || 'Gagal memindahkan tahap kontak');
    } finally {
      setIsMoving(false);
      setMenuContact(null);
    }
  };

  if (error) {
    return (
      <AppShell showBottomNav={true} fullWidth={true}>
        <PageHeader kicker="PromotorFlow" title="Pipeline" sub="Papan visual tahap konversi kontak" />
        <ErrorState title="Terjadi Kesalahan" detail={error} onRetry={loadData} />
      </AppShell>
    );
  }

  if (!contacts) {
    return (
      <AppShell showBottomNav={true} fullWidth={true}>
        <PageHeader kicker="PromotorFlow" title="Pipeline" sub="Memuat data prospek..." />
        <LoadingRows rows={6} />
      </AppShell>
    );
  }

  const grouped = groupContactsByStage(contacts);

  return (
    <AppShell showBottomNav={true} fullWidth={true}>
      <PageHeader
        kicker="PromotorFlow"
        title="Pipeline"
        sub={`${contacts.length} kontak terkelola · geser kartu atau tekan pindah tahap`}
      />

      <div
        style={{
          display: 'flex',
          gap: '14px',
          overflowX: 'auto',
          padding: '16px 20px 40px',
          alignItems: 'flex-start',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {PIPELINE_STAGES.map((stage) => {
          const list = grouped[stage] || [];
          const isCompleted = stage === 'COMPLETED';
          const isLost = stage === 'LOST';

          return (
            <section
              key={stage}
              style={{
                minWidth: '260px',
                width: '260px',
                flex: '0 0 260px',
                backgroundColor: 'var(--surface-muted, #F8FAFC)',
                border: '1px solid var(--line, #E2E8F0)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 180px)',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-muted, #F8FAFC)';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = 'var(--surface-muted, #F8FAFC)';
                const contactId = e.dataTransfer.getData('text/contact-id');
                if (contactId) {
                  void moveTo(contactId, stage);
                }
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--line, #E2E8F0)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>
                  {STAGE_LABELS[stage]}
                </div>
                <span
                  style={{
                    backgroundColor: isCompleted ? '#DCFCE7' : isLost ? '#FEE2E2' : '#E2E8F0',
                    color: isCompleted ? '#15803D' : isLost ? '#B91C1C' : '#475569',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  {list.length}
                </span>
              </div>

              {/* Cards Container */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {list.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 12px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: 'var(--muted, #94A3B8)',
                      fontStyle: 'italic',
                    }}
                  >
                    Tidak ada prospek
                  </div>
                ) : (
                  list.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/contact-id', c.id);
                      }}
                      onClick={() => router.push(`/app/contacts/${c.id}`)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--line, #E2E8F0)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        cursor: 'grab',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        transition: 'box-shadow 0.15s, border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                          {c.name}
                        </div>
                        {c.classification === 'CLIENT' && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#047857',
                              backgroundColor: '#ECFDF5',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            KLIEN
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--muted, #64748B)', marginTop: '3px' }}>
                        {formatPhoneDisplay(c.phoneE164)}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: '1px dashed var(--line, #F1F5F9)',
                        }}
                      >
                        <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                          {c.sourceChannel || 'MANUAL'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuContact({ id: c.id, name: c.name });
                          }}
                          style={{
                            border: '1px solid #CBD5E1',
                            borderRadius: '4px',
                            backgroundColor: '#F8FAFC',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          Pindah tahap
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Stage Transition Sheet / Dialog */}
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
                  className="btn btn-secondary btn-sm"
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
    </AppShell>
  );
}
