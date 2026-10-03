'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { BrandKicker, EmptyState, ErrorState, LoadingRows, Toast, useToast } from '@/components/ui';
import { WhatsAppBottomSheet } from '@/components/today/WhatsAppBottomSheet';
import { WhatsAppReplyBadge } from '@/components/whatsapp';
import { DevControlsOverlay } from '@/components/dev/DevControlsOverlay';
import {
  nextActionQueries,
  messagingQueries,
  messagingCommands,
  promotorClassQueries,
  promotorClassCommands,
  settingsCommands,
  settingsQueries,
  revenueQueries,
  clock,
} from '@/lib/container';
import { getSession } from '@/lib/auth';
import { TodayQueue, TodayQueueItem } from '@/modules/next-actions/queries';
import { DemoScenarioPreset } from '@/modules/promotorclass/ports';
import type { ContactWaOutcome, RevenueSummary } from '@promotor/contracts';

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
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [classSignalCount, setClassSignalCount] = useState(0);
  const [bookingSlug, setBookingSlug] = useState<string>('anda');

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const q = await nextActionQueries.getTodayQueue();
      setQueue(q);

      try {
        const s = await revenueQueries.getRevenueSummary('MONTH');
        setSummary(s);
      } catch {
        setSummary(null);
      }

      const intState = await promotorClassQueries.getIntegrationState();
      if (intState.scenarioPreset) {
        setCurrentPreset(intState.scenarioPreset);
      }
      try {
        const classItems = q.today
          .concat(q.overdue)
          .concat(q.upcoming)
          .filter((i) => i.action.source === 'PROMOTORCLASS');
        setClassSignalCount(classItems.length);
      } catch {
        setClassSignalCount(0);
      }

      try {
        const sess = await getSession();
        if (sess?.organization?.slug) setBookingSlug(sess.organization.slug);
      } catch {
        /* keep default slug */
      }
      try {
        await settingsQueries.getSettings();
      } catch {
        /* settings unavailable in degraded mode — booking link falls back to slug */
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat tindakan.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, tick]);

  const buildDraftContext = (item: TodayQueueItem) => ({
    serviceTitle: item.action.title,
    bookingLink: messagingQueries.buildBookingLink(bookingSlug),
  });

  const handleOpenWa = async (item: TodayQueueItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const draft = await messagingQueries.generateDraftMessage(
        item.action.actionType,
        item.contactName,
        buildDraftContext(item)
      );
      const waUrl = messagingQueries.buildWhatsAppUrl(item.contactPhone, draft);
      setActiveWaItem({ item, draft, waUrl });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyiapkan draf pesan.');
    }
  };

  const handleConfirmWASent = async (scheduleNextDays?: number, outcome?: ContactWaOutcome) => {
    if (!activeWaItem) return;
    await messagingCommands.confirmWhatsAppSent({
      contactId: activeWaItem.item.action.contactId,
      actionId: activeWaItem.item.action.id,
      messageText: activeWaItem.draft,
      scheduleNextFollowUpDays: scheduleNextDays,
      outcome,
    });
    setActiveWaItem(null);
    showToast('Tindakan selesai · Next Action berikutnya dibuat');
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

  const dateKicker = clock.formatDayDate();

  const groups: QueueGroup[] = queue
    ? ([
        { key: 'overdue', label: 'Terlambat', items: queue.overdue },
        { key: 'today', label: 'Hari ini', items: queue.today },
        { key: 'upcoming', label: 'Berikutnya', items: queue.upcoming },
      ] as QueueGroup[]).filter((g) => g.items.length > 0)
    : [];

  const renderRow = (item: TodayQueueItem, groupKey: QueueGroup['key']) => (
    <article className="hv-card" key={item.action.id} style={{ gap: 8 }}>
      <button
        type="button"
        onClick={() => router.push(`/app/contacts/${item.action.contactId}`)}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          border: 0,
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
          <span className="hv-contact-card-name">{item.contactName}</span>
          <span
            style={{
              fontSize: 11,
              lineHeight: 1,
              fontWeight: 600,
              color: groupKey === 'overdue' ? 'var(--hv-danger)' : 'var(--hv-muted)',
              flex: 'none',
            }}
          >
            {groupKey === 'upcoming'
              ? clock.formatDayDate(item.action.dueAt)
              : clock.formatTime(item.action.dueAt)}
          </span>
        </div>
        <div className="hv-contact-card-meta" style={{ marginTop: 3 }}>
          {item.action.subtitle || item.sourceChannel || 'Follow-up'}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.35, fontWeight: 600, color: 'var(--hv-text)' }}>
          {item.action.title}
        </div>
        {item.action.source === 'PROMOTORCLASS' && (
          <span className="hv-tone-badge hv-tone-badge-class" style={{ marginTop: 6, display: 'inline-block' }}>
            Sinyal Class
          </span>
        )}
      </button>
      <div className="hv-actions-row">
        <button
          type="button"
          className="hv-wa-btn"
          onClick={(e) => handleOpenWa(item, e)}
          aria-label={`Kirim WhatsApp ke ${item.contactName}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.65 15.02L2 22l5.12-1.32A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.04.79.81-2.96-.2-.31A8.2 8.2 0 1 1 12 20.2zm4.46-6.07c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06a6.66 6.66 0 0 1-1.96-1.21 7.4 7.4 0 0 1-1.36-1.69c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.74-1.79-.2-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.43-.59 1.63-1.15.2-.56.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z" />
          </svg>
          <span>Kirim ke WhatsApp</span>
        </button>
      </div>
    </article>
  );

  return (
    <AppShell showBottomNav={true}>
      <div className="hv-page">
        <div className="hv-topnav">
          <div>
            <BrandKicker />
            <h1 className="hv-page-title">Today Action Queue</h1>
            <div className="hv-page-sub">
              {dateKicker}
              {queue ? ` · ${queue.totalActiveCount} tindakan · ${queue.overdueCount} terlambat` : ' · Memuat tindakan...'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WhatsAppReplyBadge />
            <Link href="/app/contacts/new" aria-label="Tambah kontak" className="hv-cta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Baru</span>
            </Link>
          </div>
        </div>

        <div className="hv-column">
          {loadError && <ErrorState title="Gagal memuat antrian" detail={loadError} onRetry={() => loadData()} />}

          {summary && (
            <section className="hv-revenue-banner" aria-label="Estimasi omzet bulanan">
              <div className="hv-banner-kicker">Estimasi omzet bulan ini</div>
              <div className="hv-revenue-amount tabular-nums">
                Rp {summary.grossAmount.toLocaleString('id-ID')}
              </div>
              <div className="hv-revenue-note">
                {summary.paidCount} tes ter-closing
                {summary.commissionPercent > 0
                  ? ` · estimasi komisi ${summary.commissionPercent}% = Rp ${summary.estimatedCommission.toLocaleString('id-ID')}`
                  : ''}
              </div>
              <span className="hv-class-signal">
                <span className="hv-live-dot" aria-hidden="true" />
                {classSignalCount > 0
                  ? `${classSignalCount} sinyal real-time dari Ralivo Class`
                  : 'Terhubung real-time ke Ralivo Class'}
              </span>
            </section>
          )}

          {!queue && !loadError && <LoadingRows rows={4} />}

          {queue && groups.length === 0 && !loadError && (
            <EmptyState
              title="Tidak ada tindakan aktif"
              explanation="Semua Next Action sudah ditangani. Tindakan baru muncul otomatis dari prospek dan sinyal belajar."
              action={
                <Link href="/app/contacts" className="hv-btn-sec">
                  Lihat kontak
                </Link>
              }
            />
          )}

          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <div className="hv-week-subhead" style={{ marginBottom: 8 }}>
                <span className="hv-week-label">{group.label}</span>
                <span className="hv-week-stats">{group.items.length} tindakan</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.items.map((item) => renderRow(item, group.key))}
              </div>
            </section>
          ))}

          {queue && groups.length > 0 && (
            <p className="hv-page-sub" style={{ marginTop: 2 }}>
              Setiap tindakan yang selesai membuat Next Action berikutnya. Tidak ada pesan yang dikirim tanpa Anda.
            </p>
          )}
        </div>
      </div>

      <WhatsAppBottomSheet
        isOpen={!!activeWaItem}
        contactId={activeWaItem?.item.action.contactId}
        nextActionId={activeWaItem?.item.action.id}
        contactName={activeWaItem?.item.contactName ?? ''}
        phoneE164={activeWaItem?.item.contactPhone ?? ''}
        initialDraft={activeWaItem?.draft ?? ''}
        waUrl={activeWaItem?.waUrl ?? ''}
        onRegenerateDraft={(t) =>
          activeWaItem
            ? messagingQueries.generateDraftMessage(
                activeWaItem.item.action.actionType,
                activeWaItem.item.contactName,
                buildDraftContext(activeWaItem.item),
                t
              )
            : ''
        }
        onClose={() => setActiveWaItem(null)}
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
