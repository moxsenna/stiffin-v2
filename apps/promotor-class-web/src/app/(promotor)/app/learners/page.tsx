'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { LearnerDetail } from '@/components/promotor/LearnerDetail';
import { WhatsAppDraftSheet } from '@/components/promotor/WhatsAppDraftSheet';
import { getContactsQuery } from '@/modules/contacts/queries';
import { getEnrollmentsQuery } from '@/modules/enrollments/queries';
import { getLearningSignalsQuery } from '@/modules/signals/queries';
import { getProgramsQuery } from '@/modules/programs/queries';
import { Contact, Enrollment, Program, LearningSignal } from '@promotor/contracts';
import { formatPhoneDisplay } from '@promotor/platform-core';

export default function LearnersPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [signals, setSignals] = useState<LearningSignal[]>([]);
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());
  const [selectedFilter, setSelectedFilter] = useState<'semua' | 'Minat tinggi' | 'Minat sedang' | 'Minat rendah'>('semua');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [draftState, setDraftState] = useState<{ isOpen: boolean; contact: Contact | null; message: string }>({
    isOpen: false,
    contact: null,
    message: '',
  });

  useEffect(() => {
    Promise.all([
      getContactsQuery(),
      getEnrollmentsQuery(),
      getLearningSignalsQuery(),
      getProgramsQuery(),
    ]).then(([conData, enrData, sigData, progData]) => {
      setContacts(conData);
      setEnrollments(enrData);
      setSignals(sigData);

      const pMap = new Map<string, Program>();
      progData.forEach((p: Program) => pMap.set(p.id, p));
      setProgramsMap(pMap);
    });
  }, []);

  const handleOpenDraft = (contact: Contact, message: string) => {
    setDraftState({ isOpen: true, contact, message });
  };

  const getSignalForContact = (contactId: string) => {
    return signals.find(s => s.contactId === contactId);
  };

  const getEnrollmentForContact = (contactId: string) => {
    return enrollments.find(e => e.contactId === contactId);
  };

  // Class Learners = Contacts that have Class enrollment(s)
  const enrolledContactIds = new Set(enrollments.map(e => e.contactId));
  const learnerContacts = contacts.filter(c => enrolledContactIds.has(c.id));

  const filteredContacts = learnerContacts.filter(c => {
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
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Daftar Peserta & Follow-up</h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Filter berdasarkan tingkat minat & lihat detail refleksi
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['semua', 'Minat tinggi', 'Minat sedang', 'Minat rendah'] as const).map(filterVal => (
            <button
              key={filterVal}
              onClick={() => setSelectedFilter(filterVal)}
              className="touch-target"
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--border-radius-full)',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: selectedFilter === filterVal ? 'var(--color-primary)' : 'var(--color-surface)',
                color: selectedFilter === filterVal ? '#FFF' : 'var(--color-text-main)',
                border: '1px solid var(--color-divider)',
              }}
            >
              {filterVal === 'semua' ? 'Semua Peserta' : filterVal}
            </button>
          ))}
        </div>

        {/* Learners List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredContacts.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-divider)' }}>
              Belum ada peserta pembelajaran yang terdaftar.
            </div>
          ) : (
            filteredContacts.map(contact => {
              const sig = getSignalForContact(contact.id);
              const enr = getEnrollmentForContact(contact.id);
              const isSelected = selectedContact?.id === contact.id;
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
                  onClick={() => setSelectedContact(contact)}
                  style={{
                    padding: '14px 16px',
                    backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--color-divider)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>{contact.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {formatPhoneDisplay(contact.phoneE164)}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                      Alasan: {reasonDisplay}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--border-radius-sm)',
                        backgroundColor:
                          effectiveSignalLevel === 'Minat tinggi'
                            ? 'var(--color-status-success-bg)'
                            : effectiveSignalLevel === 'Minat sedang'
                            ? 'var(--color-status-warning-bg)'
                            : 'var(--color-canvas)',
                        color:
                          effectiveSignalLevel === 'Minat tinggi'
                            ? 'var(--color-status-success)'
                            : effectiveSignalLevel === 'Minat sedang'
                            ? 'var(--color-status-warning)'
                            : 'var(--color-text-muted)',
                      }}
                    >
                      {effectiveSignalLevel}
                    </span>
                    {enr && (
                      <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600, marginTop: '2px' }}>
                        Progres: {enr.progressPercent}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Side Panel Drawer for Desktop / Full view */}
        {selectedContact && (
          <div data-testid="learner-drawer-container">
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

        {/* WhatsApp Draft Sheet */}
        {draftState.isOpen && (
          <WhatsAppDraftSheet
            contact={draftState.contact}
            initialMessage={draftState.message}
            onClose={() => setDraftState({ ...draftState, isOpen: false })}
          />
        )}
      </div>
    </PromotorShell>
  );
}
