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
  store,
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
    const q = await nextActionQueries.getTodayQueue('org_rina_stifin');
    setQueue(q);

    const intState = await promotorClassQueries.getIntegrationState();
    setCurrentPreset(intState.scenarioPreset);
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = store.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
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
      organizationId: 'org_rina_stifin',
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
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ font: '700 24px/29px Inter, sans-serif', color: '#191918' }}>Hari ini</h1>
          <div style={{ font: '400 14px/20px Inter, sans-serif', color: '#71706B', paddingTop: '2px' }}>
            {formattedDate}
          </div>
        </div>
        <Link
          href="/app/contacts/new"
          aria-label="Tambah kontak"
          style={{
            width: '44px',
            height: '44px',
            margin: '-8px -10px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#191918',
            textDecoration: 'none',
          }}
        >
          <PlusIcon size={20} color="#191918" />
        </Link>
      </div>

      <div style={{ font: '450 13px/18px Inter, sans-serif', color: '#71706B', padding: '10px 16px 0' }}>
        {queue ? (
          <>
            {queue.totalActiveCount} tindakan ·{' '}
            {queue.overdueCount > 0 ? (
              <span style={{ color: '#B42318' }}>{queue.overdueCount} terlambat</span>
            ) : (
              <span style={{ color: '#067647' }}>semua tepat waktu</span>
            )}
          </>
        ) : (
          'Memuat tindakan...'
        )}
      </div>

      {/* Terlambat Section */}
      {queue && queue.overdue.length > 0 && (
        <>
          <div style={{ font: '600 11px/16px Inter, sans-serif', letterSpacing: '.07em', color: '#B42318', textTransform: 'uppercase', padding: '24px 16px 8px' }}>
            Terlambat
          </div>
          <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E7E3' }}>
            {queue.overdue.map((item) => (
              <div
                key={item.action.id}
                onClick={() => router.push(`/app/contacts/${item.action.contactId}`)}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '13px 16px',
                  borderBottom: '1px solid #E8E7E3',
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ font: '600 15.5px/21px Inter, sans-serif', color: '#191918' }}>{item.contactName}</span>
                    <span style={{ font: '500 12.5px/21px Inter, sans-serif', color: '#B42318', whiteSpace: 'nowrap' }}>
                      Terlambat
                    </span>
                  </div>
                  <div style={{ font: '400 13px/18px Inter, sans-serif', color: '#71706B' }}>
                    {item.action.subtitle || item.sourceChannel || 'Follow-up'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingTop: '3px' }}>
                    <span style={{ font: '400 13.5px/19px Inter, sans-serif', color: '#191918' }}>{item.action.title}</span>
                    <button
                      onClick={(e) => handleOpenWa(item, e)}
                      aria-label="Kirim WhatsApp"
                      style={{
                        padding: '0 10px',
                        height: '30px',
                        border: '1px solid #D5D3CE',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        font: '600 12.5px Inter, sans-serif',
                        color: '#167A68',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      WA
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Hari ini Section */}
      <div style={{ font: '600 11px/16px Inter, sans-serif', letterSpacing: '.07em', color: '#9C9A94', textTransform: 'uppercase', padding: '24px 16px 8px' }}>
        Hari ini
      </div>
      <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E7E3' }}>
        {queue && queue.today.length > 0 ? (
          queue.today.map((item) => (
            <div
              key={item.action.id}
              onClick={() => router.push(`/app/contacts/${item.action.contactId}`)}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '13px 16px',
                borderBottom: '1px solid #E8E7E3',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ font: '600 15.5px/21px Inter, sans-serif', color: '#191918' }}>{item.contactName}</span>
                  <span style={{ font: '500 12.5px/21px Inter, sans-serif', color: '#191918', whiteSpace: 'nowrap' }}>
                    {clock.formatTime(item.action.dueAt)}
                  </span>
                </div>
                <div style={{ font: '400 13px/18px Inter, sans-serif', color: '#71706B' }}>
                  {item.action.subtitle || 'Prospek'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingTop: '3px' }}>
                  <span style={{ font: '400 13.5px/19px Inter, sans-serif', color: '#191918' }}>{item.action.title}</span>
                  <button
                    onClick={(e) => handleOpenWa(item, e)}
                    aria-label="Kirim WhatsApp"
                    style={{
                      padding: '0 10px',
                      height: '30px',
                      border: '1px solid #D5D3CE',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      font: '600 12.5px Inter, sans-serif',
                      color: '#167A68',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    WA
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '20px 16px', color: '#71706B', font: '400 14px Inter, sans-serif', textAlign: 'center' }}>
            Belum ada tindakan jatuh tempo hari ini.
          </div>
        )}
      </div>

      {/* Berikutnya Section */}
      {queue && queue.upcoming.length > 0 && (
        <>
          <div style={{ font: '600 11px/16px Inter, sans-serif', letterSpacing: '.07em', color: '#9C9A94', textTransform: 'uppercase', padding: '24px 16px 8px' }}>
            Berikutnya
          </div>
          <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E7E3' }}>
            {queue.upcoming.map((item) => (
              <div
                key={item.action.id}
                onClick={() => router.push(`/app/contacts/${item.action.contactId}`)}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '13px 16px',
                  borderBottom: '1px solid #E8E7E3',
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ font: '600 15.5px/21px Inter, sans-serif', color: '#191918' }}>{item.contactName}</span>
                    <span style={{ font: '500 12.5px/21px Inter, sans-serif', color: '#9C9A94', whiteSpace: 'nowrap' }}>
                      {clock.formatDayDate(item.action.dueAt)}
                    </span>
                  </div>
                  <div style={{ font: '400 13px/18px Inter, sans-serif', color: '#71706B' }}>
                    {item.action.subtitle || 'Mendatang'}
                  </div>
                  <div style={{ font: '400 13.5px/19px Inter, sans-serif', color: '#191918', paddingTop: '3px' }}>
                    {item.action.title}
                  </div>
                </div>
                <ChevronRightIcon size={16} color="#C6C4BE" />
              </div>
            ))}
          </div>
        </>
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
