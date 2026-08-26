'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHead, EmptyState, ErrorState, LoadingRows, Toast, useToast } from '@/components/ui';
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

type QueueGroup = { key: 'overdue' | 'today' | 'upcoming'; label: string; items: TodayQueueItem[] };

export default function TodayPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<TodayQueue | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeWaItem, setActiveWaItem] = useState<{
    item: TodayQueueItem;
    draft: string;
    waUrl: string;
  } | null>(null);
  const [toast, showToast] = useToast();
  const [currentPreset, setCurrentPreset] = useState<DemoScenarioPreset>('BUNDLE_AVAILABLE');
  const [tick, setTick] = useState(0);

  const loadData = useCallback(async () =>{
    setLoadError(null);
    try {
      const q = await nextActionQueries.getTodayQueue();
      setQueue(q);

      const intState = await promotorClassQueries.getIntegrationState();
      if (intState.scenarioPreset) {
        setCurrentPreset(intState.scenarioPreset);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat tindakan.');
    }
  }, []);

  useEffect(() =>{
    loadData();
  }, [loadData, tick]);

  const handleOpenWa = async (item: TodayQueueItem, e: React.MouseEvent) =>{
    e.stopPropagation();
    try {
      const draft = await messagingQueries.generateDraftMessage(
        item.action.actionType,
        item.contactName,
        { serviceTitle: item.action.title }
      );
      const waUrl = messagingQueries.buildWhatsAppUrl(item.contactPhone, draft);
      setActiveWaItem({ item, draft, waUrl });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyiapkan draf pesan.');
    }
  };

  const handleConfirmWASent = async (scheduleNextDays?: number) =>{
    if (!activeWaItem) return;
    await messagingCommands.confirmWhatsAppSent({
      contactId: activeWaItem.item.action.contactId,
      actionId: activeWaItem.item.action.id,
      messageText: activeWaItem.draft,
      scheduleNextFollowUpDays: scheduleNextDays,
    });
    setActiveWaItem(null);
    showToast('Tindakan selesai · Next Action berikutnya dibuat');
    loadData();
  };

  const handleSelectPreset = async (preset: DemoScenarioPreset) =>{
    await promotorClassCommands.setDemoScenario(preset);
    loadData();
  };

  const handleResetDemo = async () =>{
    await settingsCommands.resetDemo();
    loadData();
  };

  const forceRefresh = () =>setTick((t) =>t + 1);

  const dateKicker = clock.formatDayDate();

  const groups: QueueGroup[] = queue
    ? ([
        { key: 'overdue', label: 'Terlambat', items: queue.overdue },
        { key: 'today', label: 'Hari ini', items: queue.today },
        { key: 'upcoming', label: 'Berikutnya', items: queue.upcoming },
      ] as QueueGroup[]).filter((g) =>g.items.length >0)
    : [];

  const renderRow = (item: TodayQueueItem, groupKey: QueueGroup['key']) =>(
    <div className="split-row" key={item.action.id}>
     <button
        type="button"
        className="split-row-main"
        onClick={() =>router.push(`/app/contacts/${item.action.contactId}`)}
      >
       <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
         <span style={{ font: "700 15px/1.2 var(--font-sans)", letterSpacing: '-0.01em' }}>{item.contactName}</span>
         <span
            style={{
              font: '600 11px/1 var(--font-sans)',
              color: groupKey === 'overdue' ? 'var(--accent-dark)' : 'var(--muted)',
              flex: 'none',
            }}
          >
           {groupKey === 'upcoming'
              ? clock.formatDayDate(item.action.dueAt)
              : clock.formatTime(item.action.dueAt)}
          </span>
       </div>
       <div className="row-meta">{item.action.subtitle || item.sourceChannel || 'Follow-up'}</div>
       <div style={{ marginTop: 8, font: '600 13px/1.3 var(--font-sans)', color: 'var(--ink)' }}>
         {item.action.title}
        </div>
     </button>
     <button type="button" className="row-action" onClick={(e) =>handleOpenWa(item, e)} aria-label={`Kirim WhatsApp ke ${item.contactName}`}>
       WA
      </button>
   </div>
 );

  return (
    <AppShell showBottomNav={true}>
     <PageHeader
        kicker={dateKicker}
        kickerAccent
        title="Hari ini"
        sub={
          queue
            ? `${queue.totalActiveCount} tindakan · ${queue.overdueCount} terlambat`
            : 'Memuat tindakan...'
        }
        action={
          <Link href="/app/contacts/new" aria-label="Tambah kontak" className="header-action">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
             <line x1="12" y1="5" x2="12" y2="19" />
             <line x1="5" y1="12" x2="19" y2="12" />
           </svg>
         </Link>
       }
      />

     {loadError && <ErrorState title="Gagal memuat antrian" detail={loadError} onRetry={() =>loadData()} />}

      {!queue && !loadError && (
        <>
         <LoadingRows rows={4} />
         <LoadingRows rows={3} />
       </>
     )}

      {queue && groups.length === 0 && !loadError && (
        <EmptyState
          title="Tidak ada tindakan aktif"
          explanation="Semua Next Action sudah ditangani. Tindakan baru muncul otomatis dari prospek dan sinyal belajar."
          action={
            <Link href="/app/contacts" className="btn btn-secondary btn-sm">
             Lihat kontak
            </Link>
         }
        />
     )}

      {groups.map((group) =>(
        <section key={group.key}>
         <SectionHead label={group.label} count={`${group.items.length} tindakan`} />
         {group.items.map((item) =>renderRow(item, group.key))}
        </section>
     ))}

      {queue && groups.length >0 && (
        <div style={{ padding: 18, borderBottom: 'var(--sep-strong)' }}>
         <div className="muted-note">
           Setiap tindakan yang selesai membuat Next Action berikutnya. Tidak ada pesan yang dikirim tanpa Anda.
          </div>
       </div>
     )}
      <div style={{ height: 24 }} />

     <WhatsAppBottomSheet
        isOpen={!!activeWaItem}
        contactName={activeWaItem?.item.contactName ?? ''}
        phoneE164={activeWaItem?.item.contactPhone ?? ''}
        initialDraft={activeWaItem?.draft ?? ''}
        waUrl={activeWaItem?.waUrl ?? ''}
        onClose={() =>setActiveWaItem(null)}
        onConfirmSent={handleConfirmWASent}
      />

     <Toast message={toast} />

     <DevControlsOverlay
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        onResetDemo={handleResetDemo}
        onRefresh={forceRefresh}
      />
   </AppShell>
 );
}
