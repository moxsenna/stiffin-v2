'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { LearnerDetail } from '@/components/promotor/LearnerDetail';
import { WhatsAppDraftSheet } from '@/components/promotor/WhatsAppDraftSheet';
import { BridgeTeaserCard } from '@/components/promotor/BridgeTeaserCard';
import { UpsellSheet } from '@/components/promotor/UpsellSheet';
import { PwaLogo } from '@/components/pwa/pwa';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui';
import { getLearningSignalsQuery } from '@/modules/signals/queries';
import { getContactsQuery } from '@/modules/contacts/queries';
import { getReflectionsQuery } from '@/modules/reflections/queries';
import { getEnrollmentsQuery } from '@/modules/enrollments/queries';
import { getPlatformApiClient } from '@/adapters';
import { LearningSignal, Contact, Reflection, Enrollment, LearnerSummaryItem, DashboardSummary } from '@promotor/contracts';
import { formatTimeAgo, formatIDR } from '@promotor/platform-core';

type SignalWithAction = LearningSignal & {
  type?: string;
  recommendedActionType?: string;
  metadata?: Record<string, unknown>;
};

function buildNudgeMessage(l: { name: string; programTitle: string }): string {
  return `Halo Kak ${l.name} 😊 Semangat belajarnya! Terakhir Kakak berhenti di program "${l.programTitle}". Ada yang bisa saya bantu biar lancar lagi? Materinya menarik lho, tinggal sedikit lagi ✨`;
}

function intentPillClass(level: string): string {
  if (level === 'Minat tinggi') return 'intent-hot';
  if (level === 'Minat sedang') return 'intent-warm';
  return 'intent-cold';
}

function ActivityGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 6.5C5.5 5.4 7.8 5.4 9.8 6.5V18.2C7.8 17.1 5.5 17.1 3.5 18.2V6.5Z"
        stroke="#1D4ED8"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14.2 6.5C16.2 5.4 18.5 5.4 20.5 6.5V18.2C18.5 17.1 16.2 17.1 14.2 18.2V6.5Z"
        stroke="#1D4ED8"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.8 6.5C11 7.2 13 7.2 14.2 6.5" stroke="#1D4ED8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const ACTIVITY_TONE: Record<string, { avatarBg: string; avatarColor: string; pillBg: string; pillColor: string; label: string }> = {
  payment: { avatarBg: '#ECFDF5', avatarColor: '#047857', pillBg: '#ECFDF5', pillColor: '#047857', label: 'Lunas' },
  enrollment: { avatarBg: 'var(--accent-soft, #DBEAFE)', avatarColor: '#1D4ED8', pillBg: 'var(--accent-soft, #DBEAFE)', pillColor: '#1D4ED8', label: 'Baru Masuk' },
  reflection: { avatarBg: '#FFFBEB', avatarColor: '#92400E', pillBg: '#FFFBEB', pillColor: '#92400E', label: 'Refleksi' },
};

export default function PromotorHomePage() {
  const [signals, setSignals] = useState<SignalWithAction[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [enrollments] = useState<Enrollment[]>([]);
  const [atRiskLearners, setAtRiskLearners] = useState<LearnerSummaryItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [whatsAppDraftContact, setWhatsAppDraftContact] = useState<Contact | null>(null);
  const [whatsAppDraftMessage, setWhatsAppDraftMessage] = useState<string | undefined>(undefined);
  const [isDevMode, setIsDevMode] = useState(false);
  const [flowUpsellOpen, setFlowUpsellOpen] = useState(false);

  const isDevelopmentEnv = process.env.NODE_ENV === 'development';

  const openWaSheet = ({ contactName, phoneE164, initialDraft }: { contactName: string; phoneE164?: string; initialDraft: string }) => {
    setWhatsAppDraftContact({
      id: `learner-atrisk-${Date.now()}`,
      organizationId: '',
      name: contactName,
      phoneE164: phoneE164 || '',
      createdAt: new Date().toISOString(),
    });
    setWhatsAppDraftMessage(initialDraft);
  };

  const loadData = React.useCallback(async () =>{
    setLoadError(null);
    try {
      const [sigData, conData, reflData, enrData, atRiskData, sumData] = await Promise.all([
        getLearningSignalsQuery(),
        getContactsQuery(),
        getReflectionsQuery(),
        getEnrollmentsQuery(),
        getPlatformApiClient().listClassLearners({ learningStatus: 'AT_RISK' }).catch(() => ({ learners: [], total: 0 })),
        getPlatformApiClient().getDashboardSummary().catch(() => null),
      ]);
      setSignals(sigData as SignalWithAction[]);
      setContacts(conData);
      setReflections(reflData);
      setAtRiskLearners(atRiskData?.learners ?? []);
      setSummary(sumData);
      void enrData;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat sinyal belajar.');
    }
  }, []);

  useEffect(() =>{
    loadData();
  }, [loadData]);

  const contactMap = new Map(contacts.map(c =>[c.id, c]));
  const selectedContact = selectedContactId ? contactMap.get(selectedContactId) : null;

  const activityItems = reflections.map(refl =>{
    const contact = contactMap.get(refl.contactId);
    const learnerName = contact ? contact.name : 'Peserta';
    return {
      id: refl.id,
      summary: `${learnerName} mengirimkan refleksi pembelajaran`,
      timeAgo: formatTimeAgo(refl.submittedAt),
    };
  });

  return (
    <PromotorShell>
      <div className="pwa-screen pwa-screen-pad-dock" style={{ minHeight: '100dvh' }}>
        <div className="promotor-top">
          <div className="promotor-brandrow">
            <PwaLogo />
            <div style={{ minWidth: 0 }}>
              <div className="promotor-brandname">Ralivo Class</div>
              <div className="promotor-brandtag">Promotor workspace · ringkasan bisnis</div>
            </div>
          </div>
          <h1 className="promotor-title">Beranda</h1>
          <div className="promotor-sub">
            {signals ? `${signals.length} peserta perlu perhatian` : 'Memuat sinyal belajar...'}
          </div>

          {summary && (
            <div className="pwa-card pwa-card-pad" style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--pwa-muted)' }}>
                Estimasi omzet bulan ini
              </div>
              <div className="tabular-nums" style={{ fontSize: 26, fontWeight: 850, letterSpacing: '-0.025em', marginTop: 6 }}>
                {formatIDR(summary.monthlyOmzet)}
              </div>
              <div className="promo-stats" style={{ marginTop: 10 }}>
                <div className="promo-stat">
                  <div className="promo-stat-num tabular-nums">{summary.pesertaCount}</div>
                  <div className="promo-stat-label">Peserta</div>
                </div>
                <div className="promo-stat">
                  <div className="promo-stat-num tabular-nums">{summary.completionPercent}%</div>
                  <div className="promo-stat-label">Penyelesaian</div>
                </div>
                <div className="promo-stat">
                  <div className="promo-stat-num tabular-nums" style={{ color: 'var(--pwa-primary)' }}>
                    {summary.growthPercent >= 0 ? '+' : ''}{summary.growthPercent}%
                  </div>
                  <div className="promo-stat-label">Pertumbuhan</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="promotor-wrap">
          {isDevelopmentEnv && (
            <div style={{ marginTop: 4 }}>
              <button type="button" className="pwa-btn-secondary" onClick={() =>setIsDevMode(!isDevMode)}>
                {isDevMode ? 'Sembunyikan Dev Tools' : 'Dev Tools'}
              </button>
            </div>
          )}

          {isDevelopmentEnv && isDevMode && (
            <div className="pwa-nested" style={{ marginTop: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pwa-primary)' }}>
                Mode QA / Simulator Integrasi
              </div>
              <p className="muted-note" style={{ marginTop: 6 }}>
                Status Koneksi Ralivo Flow: <strong>Sistem Berjalan Normal (AVAILABLE)</strong>
              </p>
            </div>
          )}

          {summary && summary.programAktif.length > 0 && (
            <>
              <div className="pwa-section-head">
                <h2 className="pwa-section-title">Program edukasi aktif</h2>
                <Link href="/app/programs" className="pwa-section-link">Kelola →</Link>
              </div>
              {summary.programAktif.map((p) => (
                <div key={p.id} className="pwa-card pwa-card-pad" style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div
                      aria-hidden="true"
                      style={{
                        width: 46,
                        height: 46,
                        flex: 'none',
                        borderRadius: 12,
                        background: 'var(--pwa-canvas)',
                        border: '1px solid var(--pwa-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ActivityGlyph />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span className="pwa-pill-green">Aktif berjalan</span>
                      <div className="learner-name" style={{ marginTop: 5 }}>
                        {p.title}
                      </div>
                      <div className="learner-meta">
                        {formatIDR(p.priceAmount)} · {p.pesertaCount} peserta terdaftar
                      </div>
                    </div>
                    <Link
                      href={`/app/programs/${p.id}`}
                      className="pwa-section-link"
                      style={{ flex: 'none' }}
                      aria-label={`Kelola ${p.title}`}
                    >
                      Kelola →
                    </Link>
                  </div>
                </div>
              ))}
            </>
          )}

          <BridgeTeaserCard />

          {loadError && (
            <div style={{ marginTop: 12 }}>
              <ErrorState title="Gagal memuat sinyal belajar" detail={loadError} onRetry={() =>loadData()} />
            </div>
          )}

          {!signals && !loadError && (
            <>
              <div className="pwa-section-head">
                <h2 className="pwa-section-title">Perlu perhatian</h2>
              </div>
              <LoadingRows rows={3} />
            </>
          )}

          {signals && signals.length > 0 && (
            <>
              <div className="pwa-section-head">
                <h2 className="pwa-section-title">Perlu perhatian</h2>
                <span className="pwa-muted tabular-nums" style={{ fontWeight: 800, fontSize: 12 }}>
                  {signals.length}
                </span>
              </div>
              {signals.map(sig =>{
                const contact = contactMap.get(sig.contactId);
                if (!contact) return null;

                return (
                  <div key={sig.id} className="pwa-card pwa-card-pad" style={{ marginTop: 10 }}>
                    <div className="learner-namerow">
                      <span className="learner-name">{contact.name}</span>
                      <span className={intentPillClass(sig.signalLevel)}>{sig.signalLevel}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, lineHeight: 1.4, color: 'var(--pwa-primary)' }}>
                      {sig.primaryReason}
                    </div>
                    <div className="learner-meta">
                      Skor minat: {sig.intentScore}/100
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="pwa-btn-primary" onClick={() => setSelectedContactId(sig.contactId)}>
                        Lihat peserta
                      </button>
                      {sig.recommendedActionType === 'WHATSAPP_REPLY' && (
                        <button
                          type="button"
                          className="pwa-btn-soft"
                          onClick={() =>{
                            const learnerName = contact.name || 'Peserta';
                            const lessonTitle = (sig.metadata?.lessonTitle as string | undefined) || 'materi';
                            const draft = `Halo Kak ${learnerName}, terima kasih refleksinya di ${lessonTitle}! Sangat mendalam. Boleh saya bantu jalankan penerapannya di rumah? 😊`;
                            setWhatsAppDraftMessage(draft);
                            setWhatsAppDraftContact(contact);
                          }}
                        >
                          Kirim WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {signals && signals.length === 0 && !loadError && (
            <div style={{ marginTop: 12 }} className="pwa-card pwa-card-pad">
              <EmptyState
                title="Tidak ada yang perlu perhatian"
                explanation="Sinyal belajar dari aktivitas peserta akan muncul di sini saat ada yang bisa ditindaklanjuti."
              />
            </div>
          )}

          {(atRiskLearners.length > 0) && (
            <>
              <div className="pwa-section-head">
                <h2 className="pwa-section-title">Peserta macet</h2>
                <span className="pwa-muted tabular-nums" style={{ fontWeight: 800, fontSize: 12 }}>
                  {atRiskLearners.length}
                </span>
              </div>
              <div className="pwa-muted" style={{ fontSize: 11.5, margin: '-6px 0 2px' }}>
                Progres &lt; 50% &amp; tidak aktif — momen emas disapa via WA
              </div>
              {atRiskLearners.map((l: any) => (
                <div key={l.contactId} className="pwa-card pwa-card-pad" style={{ marginTop: 10 }}>
                  <div className="learner-namerow">
                    <span className="learner-name">{l.name}</span>
                  </div>
                  <div className="learner-meta">
                    {l.programTitle} · {l.progressPercent}% · macet {l.daysInactive ?? 'beberapa'} hari
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="pwa-btn-primary"
                      onClick={() => openWaSheet({ contactName: l.name, phoneE164: l.phoneE164 ?? l.phone, initialDraft: buildNudgeMessage(l) })}
                    >
                      Kirim WA
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        getPlatformApiClient().recordBridgeMetric('upgrade_started', { product: 'FLOW', surface: 'macet_chip' }).catch(() => null);
                        setFlowUpsellOpen(true);
                      }}
                      aria-label="Jadwalkan otomatis via Flow"
                      title="Jadwalkan otomatis via Flow"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 10px', minHeight: 32, borderRadius: 8, border: '1px dashed #93C5FD', background: '#EFF6FF', color: '#1D4ED8', font: '700 11px/1 var(--font-sans)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="9" rx="2" stroke="#1D4ED8" strokeWidth="1.8" />
                        <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      Otomatis via Flow
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {summary && summary.aktivitasTerbaru.length > 0 && (
            <>
              <div className="pwa-section-head">
                <h2 className="pwa-section-title">Aktivitas peserta terbaru</h2>
              </div>
              <div className="pwa-card" style={{ marginTop: 10, padding: '4px 14px' }}>
                {summary.aktivitasTerbaru.map((act, idx, arr) => {
                  const tone = ACTIVITY_TONE[act.kind] ?? ACTIVITY_TONE.reflection;
                  const initial = (act.actorName ?? act.summary).trim().charAt(0).toUpperCase();
                  return (
                    <div
                      key={act.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 0',
                        borderBottom: idx < arr.length - 1 ? '1px solid var(--pwa-border)' : '0',
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          width: 34,
                          height: 34,
                          flex: 'none',
                          borderRadius: '50%',
                          backgroundColor: tone.avatarBg,
                          color: tone.avatarColor,
                          font: '800 13px/34px var(--font-sans)',
                          textAlign: 'center',
                        }}
                      >
                        {initial}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            lineHeight: 1.35,
                            color: 'var(--pwa-text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {act.actorName ?? 'Peserta'}
                        </div>
                        <div
                          className="learner-meta"
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {act.detail ?? act.summary}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flex: 'none' }}>
                        <span
                          style={{
                            padding: '4px 9px',
                            borderRadius: 9999,
                            fontSize: 9.5,
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            backgroundColor: tone.pillBg,
                            color: tone.pillColor,
                          }}
                        >
                          {tone.label}
                        </span>
                        <span
                          className="tabular-nums"
                          style={{ fontSize: 10, fontWeight: 500, color: 'var(--pwa-subtle)' }}
                        >
                          {formatTimeAgo(act.occurredAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!summary && activityItems.length > 0 && (
            <>
              <div className="pwa-section-head">
                <h2 className="pwa-section-title">Aktivitas pembelajaran terbaru</h2>
              </div>
              <div className="pwa-card" style={{ marginTop: 10, padding: '4px 14px' }}>
                {activityItems.slice(0, 10).map((act, idx, arr) => (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 0',
                      borderBottom: idx < Math.min(arr.length, 10) - 1 ? '1px solid var(--pwa-border)' : '0',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
                      {act.summary}
                    </div>
                    <div className="tabular-nums" style={{ fontSize: 10, fontWeight: 500, color: 'var(--pwa-subtle)', flex: 'none' }}>
                      {act.timeAgo}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ height: 12 }} />
        </div>

        {selectedContact && (
          <LearnerDetail
            contact={selectedContact}
            onClose={() =>setSelectedContactId(null)}
            onOpenWhatsAppDraft={(c, msg) =>{
              setSelectedContactId(null);
              setWhatsAppDraftMessage(msg);
              setWhatsAppDraftContact(c);
            }}
          />
        )}

        {whatsAppDraftContact && (
          <WhatsAppDraftSheet
            key={whatsAppDraftContact.id + (whatsAppDraftMessage ?? '')}
            contact={whatsAppDraftContact}
            initialMessage={whatsAppDraftMessage}
            onClose={() =>{
              setWhatsAppDraftContact(null);
              setWhatsAppDraftMessage(undefined);
            }}
          />
        )}

        {flowUpsellOpen && <UpsellSheet product="FLOW" onClose={() => setFlowUpsellOpen(false)} />}
      </div>
    </PromotorShell>
 );
}
