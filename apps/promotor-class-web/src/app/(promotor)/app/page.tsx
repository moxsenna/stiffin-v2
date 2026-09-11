'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { LearnerDetail } from '@/components/promotor/LearnerDetail';
import { WhatsAppDraftSheet } from '@/components/promotor/WhatsAppDraftSheet';
import { PageHeader, SectionHead, EmptyState, ErrorState, LoadingRows } from '@/components/ui';
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

function signalTagClass(level: string): string {
  if (level === 'Minat tinggi') return 'tag tag-hot';
  if (level === 'Minat sedang') return 'tag tag-warm';
  return 'tag tag-cold';
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
     <PageHeader
        kicker="PromotorClass"
        title="Beranda"
        sub={signals ? `${signals.length} peserta perlu perhatian` : 'Memuat sinyal belajar...'}
        action={
          isDevelopmentEnv ? (
            <button
              type="button"
              onClick={() =>setIsDevMode(!isDevMode)}
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'center' }}
            >
             {isDevMode ? 'Sembunyikan Dev Tools' : 'Dev Tools'}
            </button>
         ) : undefined
        }
      />

     {summary && (
       <section style={{ marginBottom: 22 }}>
         <div
           style={{
             background: 'linear-gradient(160deg, #2563EB 0%, #1D4ED8 82%)',
             borderRadius: 16,
             padding: '18px 20px 16px',
             color: '#FFFFFF',
             boxShadow: '0 14px 30px -14px rgba(29, 78, 216, 0.55)',
           }}
         >
           <div
             style={{
               font: '800 10.5px/1 var(--font-sans)',
               letterSpacing: '0.09em',
               textTransform: 'uppercase',
               color: 'rgba(255, 255, 255, 0.75)',
             }}
           >
             Estimasi omzet bulan ini
           </div>
           <div
             style={{
               font: '850 clamp(26px, 7vw, 31px)/1.2 var(--font-sans)',
               letterSpacing: '-0.025em',
               marginTop: 7,
             }}
           >
             {formatIDR(summary.monthlyOmzet)}
           </div>
           <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.22)', margin: '14px 0 12px' }} />
           <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
             <div>
               <div style={{ font: '600 10.5px/1.4 var(--font-sans)', color: 'rgba(255, 255, 255, 0.72)' }}>Peserta</div>
               <div style={{ font: '800 14.5px/1.4 var(--font-sans)' }}>{summary.pesertaCount}</div>
             </div>
             <div>
               <div style={{ font: '600 10.5px/1.4 var(--font-sans)', color: 'rgba(255, 255, 255, 0.72)' }}>Penyelesaian</div>
               <div style={{ font: '800 14.5px/1.4 var(--font-sans)' }}>{summary.completionPercent}%</div>
             </div>
             <div>
               <div style={{ font: '600 10.5px/1.4 var(--font-sans)', color: 'rgba(255, 255, 255, 0.72)' }}>Pertumbuhan</div>
               <div style={{ font: '800 14.5px/1.4 var(--font-sans)' }}>
                 {summary.growthPercent >= 0 ? '+' : ''}
                 {summary.growthPercent}%
               </div>
             </div>
           </div>
         </div>
       </section>
     )}
     {summary && summary.programAktif.length > 0 && (
       <section style={{ marginBottom: 6 }}>
         <SectionHead label="Program Edukasi Aktif" />
         <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0 4px' }}>
           {summary.programAktif.map((p) => (
             <div
               key={p.id}
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: 13,
                 backgroundColor: '#FFFFFF',
                 border: '1px solid var(--color-divider, #E2E8F0)',
                 borderRadius: 14,
                 padding: '12px 14px',
                 boxShadow: '0 4px 14px -6px rgba(11, 15, 25, 0.08)',
               }}
             >
               <div
                 aria-hidden="true"
                 style={{
                   width: 46,
                   height: 46,
                   flex: 'none',
                   borderRadius: 12,
                   background: 'linear-gradient(150deg, var(--accent-soft, #DBEAFE) 0%, #EFF6FF 100%)',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                 }}
               >
                 <ActivityGlyph />
               </div>
               <div style={{ minWidth: 0 }}>
                 <span
                   style={{
                     display: 'inline-flex',
                     alignItems: 'center',
                     gap: 4,
                     padding: '3px 8px',
                     borderRadius: 9999,
                     font: '700 9.5px/1 var(--font-sans)',
                     letterSpacing: '0.02em',
                     backgroundColor: '#ECFDF5',
                     color: '#047857',
                   }}
                 >
                   <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#059669' }} />
                   Aktif Berjalan
                 </span>
                 <div
                   style={{
                     font: '700 14px/1.35 var(--font-sans)',
                     letterSpacing: '-0.01em',
                     color: 'var(--text-main, #0B0F19)',
                     marginTop: 5,
                     overflow: 'hidden',
                     textOverflow: 'ellipsis',
                     whiteSpace: 'nowrap',
                   }}
                 >
                   {p.title}
                 </div>
                 <div className="row-meta" style={{ marginTop: 2 }}>
                   {formatIDR(p.priceAmount)} · {p.pesertaCount} Peserta Terdaftar
                 </div>
               </div>
             </div>
           ))}
         </div>
       </section>
     )}

     {isDevelopmentEnv && isDevMode && (
        <div className="section-block">
         <div className="kicker kicker-accent">Mode QA / Simulator Integrasi</div>
         <p className="muted-note" style={{ marginTop: 6 }}>
           Status Koneksi PromotorFlow: <strong>Sistem Berjalan Normal (AVAILABLE)</strong>
         </p>
       </div>
     )}

      {loadError && (
        <ErrorState title="Gagal memuat sinyal belajar" detail={loadError} onRetry={() =>loadData()} />
     )}

      {!signals && !loadError && (
        <>
         <SectionHead label="Perlu perhatian" />
         <LoadingRows rows={3} />
       </>
     )}

      {signals && signals.length >0 && (
        <>
         <SectionHead label="Perlu perhatian" count={`${signals.length}`} />
         {signals.map(sig =>{
            const contact = contactMap.get(sig.contactId);
            if (!contact) return null;

            return (
              <div key={sig.id} style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                 <span style={{ font: '700 16px/1.2 var(--font-sans)', letterSpacing: '-0.01em' }}>{contact.name}</span>
                 <span className={signalTagClass(sig.signalLevel)} style={{ flex: 'none' }}>{sig.signalLevel}</span>
               </div>
               <div style={{ marginTop: 8, font: '600 12px/1.35 var(--font-sans)', color: 'var(--accent-dark)' }}>
                 {sig.primaryReason}
                </div>
                <div className="row-meta">
                  Skor minat: {sig.intentScore}/100
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setSelectedContactId(sig.contactId)}>
                    Lihat peserta
                  </button>
                  {sig.recommendedActionType === 'WHATSAPP_REPLY' && (
                    <button
                      type="button"
                      className="btn btn-accent btn-sm"
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
        <EmptyState
          title="Tidak ada yang perlu perhatian"
          explanation="Sinyal belajar dari aktivitas peserta akan muncul di sini saat ada yang bisa ditindaklanjuti."
        />
      )}

      {(atRiskLearners.length > 0) && (
        <section style={{ marginTop: 16 }}>
          <SectionHead title="Peserta Macet" subtitle={`Progres < 50% & tidak aktif — momen emas disapa via WA`} />
          {atRiskLearners.map((l: any) => (
            <div key={l.contactId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid var(--border)', marginTop: 8 }}>
              <div>
                <strong style={{ font: '600 14px/1.3 var(--font-sans)' }}>{l.name}</strong>
                <div className="kicker kicker-muted">{l.programTitle} · {l.progressPercent}% · macet {l.daysInactive ?? 'beberapa'} hari</div>
              </div>
              <button type="button" className="btn btn-accent btn-sm"
                onClick={() => openWaSheet({ contactName: l.name, phoneE164: l.phoneE164 ?? l.phone, initialDraft: buildNudgeMessage(l) })}>
                Kirim WA
              </button>
            </div>
          ))}
        </section>
      )}

      {summary && summary.aktivitasTerbaru.length > 0 && (
        <>
          <SectionHead label="Aktivitas Learner Terbaru" />
          <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0 8px' }}>
            {summary.aktivitasTerbaru.map((act) => {
              const tone = ACTIVITY_TONE[act.kind] ?? ACTIVITY_TONE.reflection;
              const initial = (act.actorName ?? act.summary).trim().charAt(0).toUpperCase();
              return (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 2px',
                    borderBottom: '1px solid var(--line, #E2E8F0)',
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
                        font: '700 13px/1.35 var(--font-sans)',
                        color: 'var(--text-main, #0B0F19)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {act.actorName ?? 'Peserta'}
                    </div>
                    <div
                      className="row-meta"
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
                        font: '700 9.5px/1 var(--font-sans)',
                        letterSpacing: '0.02em',
                        backgroundColor: tone.pillBg,
                        color: tone.pillColor,
                      }}
                    >
                      {tone.label}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{ font: '500 10px/1.4 var(--font-sans)', color: 'var(--muted-light, #94A3B8)' }}
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
          <SectionHead label="Aktivitas pembelajaran terbaru" />
          <div style={{ padding: '10px 18px' }}>
            {activityItems.slice(0, 10).map((act) => (
              <div key={act.id} className="timeline-row">
                <div className="timeline-body">
                  <div className="timeline-title">{act.summary}</div>
                </div>
                <div style={{ marginLeft: 'auto', font: '500 10px/1.4 var(--font-sans)', color: 'var(--muted-light)', flex: 'none' }} className="tabular-nums">
                  {act.timeAgo}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ height: 24 }} />

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
    </PromotorShell>
 );
}
