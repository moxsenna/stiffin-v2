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
  const [searchQuery, setSearchQuery] = useState('');
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
      setContacts(conData || []);
      setEnrollments(enrData || []);
      setSignals(sigData || []);

      const pMap = new Map<string, Program>();
      (progData || []).forEach((p: Program) => pMap.set(p.id, p));
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

  const enrolledContactIds = new Set(enrollments.map(e => e.contactId));
  const learnerContacts = contacts.filter(c => enrolledContactIds.has(c.id) || signals.some(s => s.contactId === c.id));

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

    if (selectedFilter !== 'semua' && effectiveSignalLevel !== selectedFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phoneE164.includes(q);
    }

    return true;
  });

  return (
    <PromotorShell>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Header Title & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', padding: '2px 8px', borderRadius: 'var(--border-radius-full)' }}>
                Learners CRM & Leads
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.035em', color: 'var(--color-text-main)', margin: '0 0 6px' }}>
              Daftar Peserta & Progres
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, fontWeight: 500 }}>
              Pantau kepuasan belajar dan konversi peserta menjadi klien Tes STIFIn.
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '320px' }}>
            <input
              type="text"
              placeholder="Cari nama, no HP, atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                minHeight: '42px',
                padding: '8px 14px',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: 'var(--shadow-xs)',
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { id: 'semua', label: 'Semua Peserta' },
            { id: 'Minat tinggi', label: '🔥 Minat Tinggi (Hot)' },
            { id: 'Minat sedang', label: '⚡ Minat Sedang (Warm)' },
            { id: 'Minat rendah', label: '❄️ Minat Rendah (Cold)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--border-radius-full)',
                backgroundColor: selectedFilter === tab.id ? 'var(--color-primary)' : 'var(--color-surface)',
                color: selectedFilter === tab.id ? '#FFFFFF' : 'var(--color-text-body)',
                border: selectedFilter === tab.id ? '1px solid var(--color-primary)' : '1px solid var(--color-divider)',
                fontSize: '12.5px',
                fontWeight: selectedFilter === tab.id ? 750 : 550,
                cursor: 'pointer',
                boxShadow: selectedFilter === tab.id ? 'var(--shadow-xs)' : 'none',
                transition: 'all var(--duration-fast) ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Learners Grid / List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredContacts.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '14px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius-xl)',
                border: '1px solid var(--color-divider)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Tidak ditemukan peserta dengan kriteria filter saat ini.
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

              const isHigh = effectiveSignalLevel === 'Minat tinggi';
              const isMedium = effectiveSignalLevel === 'Minat sedang';

              return (
                <div
                  key={contact.id}
                  data-testid="learner-item"
                  onClick={() => setSelectedContact(contact)}
                  style={{
                    padding: '18px 22px',
                    backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    borderRadius: 'var(--border-radius-lg)',
                    border: isSelected ? '1px solid var(--color-primary-border)' : '1px solid var(--color-divider)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all var(--duration-fast) var(--ease-spring)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: isHigh ? 'var(--color-status-danger-bg)' : 'var(--color-primary-light)',
                        color: isHigh ? 'var(--color-status-danger)' : 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 850,
                        fontSize: '15px',
                        flexShrink: 0,
                      }}
                    >
                      {contact.name.charAt(0)}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                          {contact.name}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {formatPhoneDisplay(contact.phoneE164)}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-body)' }}>
                        {reasonDisplay}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 'var(--border-radius-full)',
                        backgroundColor: isHigh
                          ? 'var(--color-status-danger-bg)'
                          : isMedium
                          ? 'var(--color-status-warning-bg)'
                          : 'var(--color-canvas-subtle)',
                        color: isHigh
                          ? 'var(--color-status-danger)'
                          : isMedium
                          ? 'var(--color-status-warning)'
                          : 'var(--color-text-muted)',
                        border: isHigh
                          ? '1px solid var(--color-status-danger-border)'
                          : isMedium
                          ? '1px solid var(--color-status-warning-border)'
                          : '1px solid var(--color-divider)',
                      }}
                    >
                      {effectiveSignalLevel}
                    </span>
                    {enr && (
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        <div style={{ width: '60px', height: '5px', borderRadius: '3px', backgroundColor: 'var(--color-canvas-subtle)', overflow: 'hidden' }}>
                          <div style={{ width: `${enr.progressPercent}%`, height: '100%', backgroundColor: 'var(--color-primary)' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 800 }} className="tabular-nums">
                          {enr.progressPercent}%
                        </span>
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
          <div data-testid="learner-drawer-container" className="side-panel active" style={{ zIndex: 1200 }}>
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
