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
import { LearningSignal, Contact, Reflection, Enrollment } from '@promotor/contracts';
import { formatTimeAgo } from '@promotor/platform-core';

function signalTagClass(level: string): string {
  if (level === 'Minat tinggi') return 'tag tag-hot';
  if (level === 'Minat sedang') return 'tag tag-warm';
  return 'tag tag-cold';
}

export default function PromotorHomePage() {
  const [signals, setSignals] = useState<LearningSignal[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [enrollments] = useState<Enrollment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [whatsAppDraftContact, setWhatsAppDraftContact] = useState<Contact | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  const isDevelopmentEnv = process.env.NODE_ENV === 'development';

  const loadData = React.useCallback(async () =>{
    setLoadError(null);
    try {
      const [sigData, conData, reflData, enrData] = await Promise.all([
        getLearningSignalsQuery(),
        getContactsQuery(),
        getReflectionsQuery(),
        getEnrollmentsQuery(),
      ]);
      setSignals(sigData);
      setContacts(conData);
      setReflections(reflData);
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
               <div style={{ marginTop: 12 }}>
                 <button type="button" className="btn btn-primary btn-sm" onClick={() =>setSelectedContactId(sig.contactId)}>
                   Lihat learner
                  </button>
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

      {activityItems.length >0 && (
        <>
         <SectionHead label="Aktivitas pembelajaran terbaru" />
         <div style={{ padding: '10px 18px' }}>
           {activityItems.slice(0, 10).map(act =>(
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
          onOpenWhatsAppDraft={c =>{
            setSelectedContactId(null);
            setWhatsAppDraftContact(c);
          }}
        />
     )}

      {whatsAppDraftContact && (
        <WhatsAppDraftSheet
          contact={whatsAppDraftContact}
          onClose={() =>setWhatsAppDraftContact(null)}
        />
     )}
    </PromotorShell>
 );
}
