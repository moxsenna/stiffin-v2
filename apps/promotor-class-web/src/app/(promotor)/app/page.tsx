'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { MockStateStore } from '@/adapters/mock/mock-state-store';
import { contactRepository } from '@/adapters/mock/contact-repository';
import { learnerRepository } from '@/adapters/mock/learner-repository';
import { programRepository } from '@/adapters/mock/program-repository';
import { promotorFlowAdapter } from '@/adapters/mock/promotorflow-adapter';
import { LearnerDetail } from '@/components/promotor/LearnerDetail';
import { WhatsAppDraftSheet } from '@/components/promotor/WhatsAppDraftSheet';
import { Contact, Enrollment, Program, LearningSignal, IntegrationMode } from '@promotor/contracts';
import { SEED_PROGRAMS } from '@promotor/promotor-class-fixtures';
import { formatPhoneDisplay, formatTimeAgo } from '@promotor/platform-core';

export default function PromotorHomePage() {
  const [signals, setSignals] = useState<LearningSignal[]>([]);
  const [contactsMap, setContactsMap] = useState<Map<string, Contact>>(new Map());
  const [enrollmentsMap, setEnrollmentsMap] = useState<Map<string, Enrollment>>(new Map());
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [draftState, setDraftState] = useState<{ isOpen: boolean; contact: Contact | null; message: string }>({
    isOpen: false,
    contact: null,
    message: '',
  });
  const [integrationMode, setIntegrationMode] = useState<IntegrationMode>('BUNDLE_AVAILABLE');

  const loadData = async () => {
    const state = MockStateStore.getState();
    setSignals(state.learningSignals);
    setIntegrationMode(state.entitlements.integrationMode);

    const cMap = new Map<string, Contact>();
    state.contacts.forEach((c: Contact) => cMap.set(c.id, c));
    setContactsMap(cMap);

    const eMap = new Map<string, Enrollment>();
    state.enrollments.forEach((e: Enrollment) => eMap.set(e.id, e));
    setEnrollmentsMap(eMap);

    const pMap = new Map<string, Program>();
    state.programs.forEach((p: Program) => pMap.set(p.id, p));
    setProgramsMap(pMap);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleIntegrationMode = (mode: IntegrationMode) => {
    promotorFlowAdapter.setIntegrationMode(mode);
    setIntegrationMode(mode);
  };

  const handleOpenDraft = (contact: Contact, message: string) => {
    setDraftState({ isOpen: true, contact, message });
  };

  return (
    <PromotorShell>
      <div style={{ padding: '16px' }}>
        {/* Anti-Dashboardification Header: One-line compact summary */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-main)' }}>
            Beranda Operasional
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            174 peserta aktif · 32 baru bulan ini · penyelesaian 67%
          </div>
        </div>

        {/* Integration Mode Switcher (For Testing Scenarios) */}
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--color-divider)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Skenario Integrasi:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['CLASS_ONLY', 'BUNDLE_AVAILABLE', 'BUNDLE_FLOW_UNAVAILABLE'] as IntegrationMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => handleToggleIntegrationMode(mode)}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: integrationMode === mode ? 'var(--color-primary)' : 'var(--color-canvas)',
                  color: integrationMode === mode ? '#FFF' : 'var(--color-text-main)',
                  border: '1px solid var(--color-divider)',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Work Queue Section */}
        <section>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--color-text-main)' }}>
            Perlu Perhatian
          </h2>

          {signals.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)' }}>
              Tidak ada antrean follow-up saat ini. Semua peserta berjalan lancar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {signals.map(sig => {
                const contact = contactsMap.get(sig.contactId);
                const enrollment = enrollmentsMap.get(sig.enrollmentId);
                const program = enrollment ? programsMap.get(enrollment.programId) : undefined;

                if (!contact) return null;

                const isSelected = selectedContact?.id === contact.id;

                return (
                  <div
                    key={sig.id}
                    onClick={() => setSelectedContact(contact)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--color-divider)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>{contact.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {formatPhoneDisplay(contact.phone)}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-main)' }}>
                        {sig.primaryReason}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--border-radius-sm)',
                          backgroundColor:
                            sig.minatStatus === 'Minat tinggi'
                              ? 'var(--color-status-success-bg)'
                              : 'var(--color-status-warning-bg)',
                          color:
                            sig.minatStatus === 'Minat tinggi'
                              ? 'var(--color-status-success)'
                              : 'var(--color-status-warning)',
                        }}
                      >
                        {sig.minatStatus}
                      </span>
                      <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                        {formatTimeAgo(sig.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Desktop Side Panel Drawer for Selected Learner */}
        {selectedContact && (
          <div className={`side-panel ${selectedContact ? 'active' : ''}`}>
            <LearnerDetail
              contact={selectedContact}
              enrollment={Array.from(enrollmentsMap.values()).find(e => e.contactId === selectedContact.id)}
              program={programsMap.get(SEED_PROGRAMS[0].id)}
              signal={signals.find(s => s.contactId === selectedContact.id)}
              onOpenWhatsAppDraft={handleOpenDraft}
              onClose={() => setSelectedContact(null)}
            />
          </div>
        )}

        {/* WhatsApp Draft Sheet */}
        <WhatsAppDraftSheet
          contact={draftState.contact}
          initialMessage={draftState.message}
          isOpen={draftState.isOpen}
          onClose={() => setDraftState({ ...draftState, isOpen: false })}
        />
      </div>
    </PromotorShell>
  );
}
