'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PlusIcon, ChevronRightIcon, WhatsAppIcon } from '@/components/foundation/icons';
import { WhatsAppBottomSheet } from '@/components/today/WhatsAppBottomSheet';
import { DevControlsOverlay } from '@/components/dev/DevControlsOverlay';
import {
  nextActionQueries,
  messagingQueries,
  messagingCommands,
  promotorClassQueries,
  promotorClassCommands,
  settingsCommands,
  clock,
} from '@/lib/container';
import { TodayQueue, TodayQueueItem } from '@/modules/next-actions/queries';
import { DemoScenarioPreset } from '@/modules/promotorclass/ports';

export default function TodayPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<TodayQueue | null>(null);
  const [activeWaItem, setActiveWaItem] = useState<{
    item: TodayQueueItem;
    draft: string;
    waUrl: string;
  } | null>(null);
  const [currentPreset, setCurrentPreset] = useState<DemoScenarioPreset>('BUNDLE_AVAILABLE');
  const [tick, setTick] = useState(0);

  const loadData = useCallback(async () => {
    const q = await nextActionQueries.getTodayQueue();
    setQueue(q);

    const intState = await promotorClassQueries.getIntegrationState();
    if (intState.scenarioPreset) {
      setCurrentPreset(intState.scenarioPreset);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, tick]);

  const handleOpenWa = async (item: TodayQueueItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const draft = await messagingQueries.generateDraftMessage(
      item.action.actionType,
      item.contactName,
      { serviceTitle: item.action.title }
    );
    const waUrl = messagingQueries.buildWhatsAppUrl(item.contactPhone, draft);
    setActiveWaItem({ item, draft, waUrl });
  };

  const handleConfirmWASent = async (scheduleNextDays?: number) => {
    if (!activeWaItem) return;
    await messagingCommands.confirmWhatsAppSent({
      contactId: activeWaItem.item.action.contactId,
      actionId: activeWaItem.item.action.id,
      messageText: activeWaItem.draft,
      scheduleNextFollowUpDays: scheduleNextDays,
    });
    setActiveWaItem(null);
    loadData();
  };

  const handleSelectPreset = async (preset: DemoScenarioPreset) => {
    await promotorClassCommands.setDemoScenario(preset);
    loadData();
  };

  const handleResetDemo = async () => {
    await settingsCommands.resetDemo();
    loadData();
  };

  const forceRefresh = () => setTick((t) => t + 1);

  const formattedDate = clock.formatDayDate();

  return (
    <AppShell showBottomNav={true}>
      <div style={{ padding: '20px 16px 0' }}>
        {/* Top Header Bar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
              Hari ini
            </h1>
            <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 500 }}>
              {formattedDate}
            </div>
          </div>

          <Link
            href="/app/contacts/new"
            aria-label="Tambah kontak baru"
            className="touch-target"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xs)',
              textDecoration: 'none',
            }}
          >
            <PlusIcon size={20} color="#FFFFFF" />
          </Link>
        </div>

        {/* Summary Status Strip */}
        <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', paddingBottom: '16px', fontWeight: 550 }}>
          {queue ? (
            <>
              <span className="tabular-nums">{queue.totalActiveCount}</span> tindakan ·{' '}
              {queue.overdueCount > 0 ? (
                <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
                  <span className="tabular-nums">{queue.overdueCount}</span> terlambat
                </span>
              ) : (
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>semua tepat waktu</span>
              )}
            </>
          ) : (
            'Memuat antrean tindakan...'
          )}
        </div>
      </div>

      {/* Terlambat Section */}
      {queue && queue.overdue.length > 0 && (
        <section style={{ marginBottom: '24px', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--color-danger)', letterSpacing: '-0.01em' }}>
              Terlambat ({queue.overdue.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {queue.overdue.map((item) => (
              <div
                key={item.action.id}
                onClick={() => router.push(`/app/contacts/${item.action.contactId}`)}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-danger-border)',
                  padding: '14px 16px',
                  boxShadow: 'var(--shadow-xs)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'transform var(--duration-fast) var(--ease-spring)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                      {item.contactName}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 780,
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--color-danger-soft)',
                        color: 'var(--color-danger)',
                      }}
                    >
                      Terlambat
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    {item.action.subtitle || item.sourceChannel || 'Follow-up'}
                  </div>
                  <div style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                    {item.action.title}
                  </div>
                </div>

                <button
                  onClick={(e) => handleOpenWa(item, e)}
                  aria-label={`Kirim WhatsApp ke ${item.contactName}`}
                  className="touch-target"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-primary-border)',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    fontWeight: 780,
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <WhatsAppIcon size={16} color="var(--color-primary)" />
                  <span>WA</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hari Ini Section */}
      <section style={{ marginBottom: '24px', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            Jadwal Hari Ini ({queue ? queue.today.length : 0})
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {queue && queue.today.length > 0 ? (
            queue.today.map((item) => (
              <div
                key={item.action.id}
                onClick={() => router.push(`/app/contacts/${item.action.contactId}`)}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-divider)',
                  padding: '14px 16px',
                  boxShadow: 'var(--shadow-xs)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'transform var(--duration-fast) var(--ease-spring)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                      {item.contactName}
                    </span>
                    <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 650 }}>
                      {clock.formatTime(item.action.dueAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    {item.action.subtitle || 'Prospek'}
                  </div>
                  <div style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                    {item.action.title}
                  </div>
                </div>

                <button
                  onClick={(e) => handleOpenWa(item, e)}
                  aria-label={`Kirim WhatsApp ke ${item.contactName}`}
                  className="touch-target"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-primary-border)',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    fontWeight: 780,
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <WhatsAppIcon size={16} color="var(--color-primary)" />
                  <span>WA</span>
                </button>
              </div>
            ))
          ) : (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-divider)',
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: '13.5px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              Belum ada tindakan jatuh tempo hari ini.
            </div>
          )}
        </div>
      </section>

      {/* Berikutnya Section */}
      {queue && queue.upcoming.length > 0 && (
        <section style={{ marginBottom: '24px', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              Akan Datang ({queue.upcoming.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {queue.upcoming.map((item) => (
              <div
                key={item.action.id}
                onClick={() => router.push(`/app/contacts/${item.action.contactId}`)}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-divider)',
                  padding: '14px 16px',
                  boxShadow: 'var(--shadow-xs)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'transform var(--duration-fast) var(--ease-spring)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                      {item.contactName}
                    </span>
                    <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                      {clock.formatDayDate(item.action.dueAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    {item.action.subtitle || 'Mendatang'}
                  </div>
                  <div style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', fontWeight: 550 }}>
                    {item.action.title}
                  </div>
                </div>
                <ChevronRightIcon size={16} color="var(--color-text-tertiary)" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* WhatsApp Bottom Sheet Modal */}
      {activeWaItem && (
        <WhatsAppBottomSheet
          isOpen={!!activeWaItem}
          contactName={activeWaItem.item.contactName}
          phoneE164={activeWaItem.item.contactPhone}
          initialDraft={activeWaItem.draft}
          waUrl={activeWaItem.waUrl}
          onClose={() => setActiveWaItem(null)}
          onConfirmSent={handleConfirmWASent}
        />
      )}

      {/* Dev Controls Overlay */}
      <DevControlsOverlay
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        onResetDemo={handleResetDemo}
        onRefresh={forceRefresh}
      />
    </AppShell>
  );
}
