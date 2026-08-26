'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { LearnerDetail } from '@/components/promotor/LearnerDetail';
import { WhatsAppDraftSheet } from '@/components/promotor/WhatsAppDraftSheet';
import { PageHeader, SectionHead, SegmentedControl, ProgressBar, EmptyState, ErrorState, LoadingRows } from '@/components/ui';
import { getContactsQuery } from '@/modules/contacts/queries';
import { getEnrollmentsQuery } from '@/modules/enrollments/queries';
import { getLearningSignalsQuery } from '@/modules/signals/queries';
import { getProgramsQuery } from '@/modules/programs/queries';
import { Contact, Enrollment, Program, LearningSignal } from '@promotor/contracts';
import { formatPhoneDisplay } from '@promotor/platform-core';

type LearnerFilter = 'semua' | 'Minat tinggi' | 'Minat sedang' | 'Minat rendah';

function intentTagClass(level: string): string {
  if (level === 'Minat tinggi') return 'tag tag-hot';
  if (level === 'Minat sedang') return 'tag tag-warm';
  return 'tag tag-cold';
}

export default function LearnersPage() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [signals, setSignals] = useState<LearningSignal[]>([]);
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());
  const [selectedFilter, setSelectedFilter] = useState<LearnerFilter>('semua');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<{ isOpen: boolean; contact: Contact | null; message: string }>({
    isOpen: false,
    contact: null,
    message: '',
  });

  const loadData = React.useCallback(async () =>{
    setLoadError(null);
    try {
      const [conData, enrData, sigData, progData] = await Promise.all([
        getContactsQuery(),
        getEnrollmentsQuery(),
        getLearningSignalsQuery(),
        getProgramsQuery(),
      ]);
      setContacts(conData);
      setEnrollments(enrData);
      setSignals(sigData);

      const pMap = new Map<string, Program>();
      progData.forEach((p: Program) =>pMap.set(p.id, p));
      setProgramsMap(pMap);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat peserta.');
    }
  }, []);

  useEffect(() =>{
    loadData();
  }, [loadData]);

  const handleOpenDraft = (contact: Contact, message: string) =>{
    setDraftState({ isOpen: true, contact, message });
  };

  const getSignalForContact = (contactId: string) =>{
    return signals.find(s =>s.contactId === contactId);
  };

  const getEnrollmentForContact = (contactId: string) =>{
    return enrollments.find(e =>e.contactId === contactId);
  };

  const enrolledContactIds = new Set(enrollments.map(e =>e.contactId));
  const learnerContacts = contacts ? contacts.filter(c =>enrolledContactIds.has(c.id)) : [];

  const filteredContacts = learnerContacts.filter(c =>{
    const enr = getEnrollmentForContact(c.id);
    const sig = getSignalForContact(c.id);
    const intentLabel = ((enr as any)?.intentLabel || 'COLD').toUpperCase();
    const effectiveSignalLevel =
      sig?.signalLevel ||
      (intentLabel === 'HOT'
        ? 'Minat tinggi'
        : intentLabel === 'WARM'
        ? 'Minat sedang'
        : 'Minat rendah');

    if (selectedFilter === 'semua') return true;
    return effectiveSignalLevel === selectedFilter;
  });

  return (
    <PromotorShell>
     <PageHeader
        kicker="PromotorClass"
        title="Daftar Peserta & Follow-up"
        sub={contacts ? `${filteredContacts.length} peserta pembelajaran` : 'Memuat peserta...'}
      />

     <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
       <SegmentedControl
          ariaLabel="Filter tingkat minat"
          options={[
            { label: 'Semua', value: 'semua' },
            { label: 'Minat tinggi', value: 'Minat tinggi' },
            { label: 'Minat sedang', value: 'Minat sedang' },
            { label: 'Minat rendah', value: 'Minat rendah' },
          ]}
          value={selectedFilter}
          onChange={(v) =>setSelectedFilter(v as LearnerFilter)}
        />
     </div>

     {loadError && <ErrorState title="Gagal memuat peserta" detail={loadError} onRetry={() =>loadData()} />}

      {!contacts && !loadError && (
        <>
         <SectionHead label="Peserta" />
         <LoadingRows rows={4} />
       </>
     )}

      {contacts && filteredContacts.length === 0 && !loadError && (
        <EmptyState
          title="Belum ada peserta pembelajaran yang terdaftar"
          explanation="Peserta muncul setelah kontak didaftarkan ke program kelas."
        />
     )}

      {contacts && filteredContacts.length >0 && (
        <>
         <SectionHead label="Peserta" count={`${filteredContacts.length}`} />
         {filteredContacts.map(contact =>{
            const sig = getSignalForContact(contact.id);
            const enr = getEnrollmentForContact(contact.id);
            const prog = enr ? programsMap.get(enr.programId) : undefined;
            const intentLabel = ((enr as any)?.intentLabel || 'COLD').toUpperCase();
            const effectiveSignalLevel =
              sig?.signalLevel ||
              (intentLabel === 'HOT'
                ? 'Minat tinggi'
                : intentLabel === 'WARM'
                ? 'Minat sedang'
                : 'Minat rendah');

            const reasonDisplay =
              sig?.primaryReason ||
              (prog ? `Terdaftar pada ${prog.title}` : 'Peserta terdaftar');

            return (
              <div
                key={contact.id}
                data-testid="learner-item"
                onClick={() =>setSelectedContact(contact)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>{
                  if (e.key === 'Enter' || e.key === ' ') setSelectedContact(contact);
                }}
                style={{
                  minHeight: 44,
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--line)',
                  cursor: 'pointer',
                  background: 'var(--surface)',
                }}
              >
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                 <span style={{ font: '700 15px/1.2 var(--font-sans)' }}>{contact.name}</span>
                 <span className={intentTagClass(effectiveSignalLevel)} style={{ flex: 'none' }}>{effectiveSignalLevel}</span>
               </div>
               <div className="row-meta">
                 {formatPhoneDisplay(contact.phoneE164)} · {prog ? prog.title : 'Program tidak diketahui'}
                </div>
               <div style={{ marginTop: 4, font: '400 11px/1.45 var(--font-sans)', color: 'var(--muted-strong)' }}>
                 Alasan: {reasonDisplay}
                </div>
               {enr && (
                  <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 9 }}>
                   <ProgressBar pct={enr.progressPercent} thin label={`Progres ${enr.progressPercent}%`} />
                   <span style={{ font: '700 11px/1 var(--font-sans)', whiteSpace: 'nowrap' }} className="tabular-nums">
                     Progres: {enr.progressPercent}%
                    </span>
                 </div>
               )}
              </div>
           );
          })}
        </>
     )}
      <div style={{ height: 24 }} />

     {selectedContact && (
        <div data-testid="learner-drawer-container">
         <LearnerDetail
            contact={selectedContact}
            enrollment={getEnrollmentForContact(selectedContact.id)}
            program={programsMap.get(getEnrollmentForContact(selectedContact.id)?.programId || '')}
            signal={getSignalForContact(selectedContact.id)}
            onOpenWhatsAppDraft={handleOpenDraft}
            onClose={() =>setSelectedContact(null)}
          />
       </div>
     )}

      {draftState.isOpen && (
        <WhatsAppDraftSheet
          contact={draftState.contact}
          initialMessage={draftState.message}
          onClose={() =>setDraftState({ ...draftState, isOpen: false })}
        />
     )}
    </PromotorShell>
 );
}
