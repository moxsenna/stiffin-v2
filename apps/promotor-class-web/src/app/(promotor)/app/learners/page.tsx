'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { LearnerDetail } from '@/components/promotor/LearnerDetail';
import { WhatsAppDraftSheet } from '@/components/promotor/WhatsAppDraftSheet';
import { BroadcastReminderSheet } from '@/components/promotor/BroadcastReminderSheet';
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
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

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

  const reminderCandidates = learnerContacts
    .map((c) => {
      const enr = getEnrollmentForContact(c.id) as any;
      const prog = enr ? programsMap.get(enr.programId) : undefined;
      return {
        contactId: c.id,
        name: c.name,
        phoneE164: c.phoneE164,
        programTitle: prog ? prog.title : 'Program tidak diketahui',
        progressPercent: Number(enr?.progressPercent ?? 0),
        learningStatus: enr?.learningStatus as string | undefined,
        legacyStatus: enr?.status as string | undefined,
      };
    })
    .filter(
      (l) =>
        l.progressPercent < 50 &&
        l.learningStatus !== 'COMPLETED' &&
        l.legacyStatus !== 'selesai'
    );

  return (
    <PromotorShell>
     <PageHeader
        kicker="Ralivo Class"
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
        <button
          type="button"
          className="btn btn-secondary btn-block"
          style={{ marginTop: 10 }}
          disabled={reminderCandidates.length === 0}
          onClick={() =>setIsBroadcastOpen(true)}
        >
          Broadcast Pengingat{reminderCandidates.length > 0 ? ` (${reminderCandidates.length})` : ''}
        </button>
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

            const isSelected = selectedContact?.id === contact.id;

            return (
              <React.Fragment key={contact.id}>
                <div
                  data-testid="learner-item"
                  onClick={() => setSelectedContact(isSelected ? null : contact)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedContact(isSelected ? null : contact);
                    }
                  }}
                  style={{
                    minHeight: 44,
                    padding: '14px 18px',
                    borderBottom: isSelected ? '1px dashed var(--line)' : '1px solid var(--line)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--surface-hover)' : 'var(--surface)',
                    borderLeft: isSelected ? '4px solid var(--accent)' : '4px solid transparent',
                    transition: 'background-color 0.15s ease, border-left-color 0.15s ease',
                  }}
                >
                 <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                   <span style={{ font: '700 15px/1.2 var(--font-sans)', color: isSelected ? 'var(--accent-dark)' : 'var(--ink)' }}>
                     {contact.name}
                   </span>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
                     <span className={intentTagClass(effectiveSignalLevel)}>{effectiveSignalLevel}</span>
                     <span
                       aria-hidden="true"
                       style={{
                         display: 'inline-flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         width: 22,
                         height: 22,
                         borderRadius: '50%',
                         backgroundColor: isSelected ? 'var(--accent-soft, #dbeafe)' : 'var(--surface-muted, #f1f5f9)',
                         color: isSelected ? 'var(--accent, #2563eb)' : 'var(--muted)',
                         transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)',
                         transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, color 0.2s ease',
                       }}
                     >
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                         <polyline points="6 9 12 15 18 9" />
                       </svg>
                     </span>
                   </div>
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

                {isSelected && (
                  <div
                    data-testid="learner-drawer-container"
                    className="learner-inline-detail-wrapper"
                    role="region"
                    aria-label={`Detail peserta ${contact.name}`}
                    style={{
                      borderBottom: '2px solid var(--ink)',
                      borderLeft: '4px solid var(--accent)',
                      background: 'var(--surface)',
                    }}
                  >
                    <LearnerDetail
                      contact={selectedContact}
                      enrollment={getEnrollmentForContact(selectedContact.id)}
                      program={programsMap.get(getEnrollmentForContact(selectedContact.id)?.programId || '')}
                      signal={getSignalForContact(selectedContact.id)}
                      onOpenWhatsAppDraft={handleOpenDraft}
                      onClose={() => setSelectedContact(null)}
                    />
                  </div>
                )}
              </React.Fragment>
           );
          })}
        </>
     )}
      <div style={{ height: 24 }} />

      {draftState.isOpen && (
        <WhatsAppDraftSheet
          contact={draftState.contact}
          initialMessage={draftState.message}
          onClose={() =>setDraftState({ ...draftState, isOpen: false })}
        />
     )}

      {isBroadcastOpen && (
        <BroadcastReminderSheet
          isOpen={isBroadcastOpen}
          learners={reminderCandidates}
          onClose={() =>setIsBroadcastOpen(false)}
        />
     )}
    </PromotorShell>
 );
}
