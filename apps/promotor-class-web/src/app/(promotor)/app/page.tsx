'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { LearnerDetail } from '@/components/promotor/LearnerDetail';
import { WhatsAppDraftSheet } from '@/components/promotor/WhatsAppDraftSheet';
import { getLearningSignalsQuery } from '@/modules/signals/queries';
import { getContactsQuery } from '@/modules/contacts/queries';
import { getReflectionsQuery } from '@/modules/reflections/queries';
import { getEnrollmentsQuery } from '@/modules/enrollments/queries';
import { LearningSignal, Contact, Reflection, Enrollment } from '@promotor/contracts';
import { formatTimeAgo, formatPhoneDisplay } from '@promotor/platform-core';

export default function PromotorHomePage() {
  const [signals, setSignals] = useState<LearningSignal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [whatsAppDraftContact, setWhatsAppDraftContact] = useState<Contact | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    Promise.all([
      getLearningSignalsQuery(),
      getContactsQuery(),
      getReflectionsQuery(),
      getEnrollmentsQuery(),
    ]).then(([sigData, conData, reflData, enrData]) => {
      setSignals(sigData);
      setContacts(conData);
      setReflections(reflData);
      setEnrollments(enrData);
    });
  }, []);

  const contactMap = new Map(contacts.map(c => [c.id, c]));
  const selectedContact = selectedContactId ? contactMap.get(selectedContactId) : null;

  // Resolve dynamic activity timeline from real persistent reflections
  const activityItems = reflections.map(refl => {
    const contact = contactMap.get(refl.contactId);
    const learnerName = contact ? contact.name : 'Peserta';
    return {
      id: refl.id,
      learnerName,
      summary: `${learnerName} mengirimkan refleksi pembelajaran`,
      timeAgo: formatTimeAgo(refl.submittedAt),
      timestamp: refl.submittedAt,
    };
  });

  return (
    <PromotorShell>
      <div style={{ padding: '16px' }}>
        {/* Header & Dev Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>Beranda Promotor</h1>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {signals.length} peserta aktif memerlukan perhatian
            </p>
          </div>

          <button
            onClick={() => setIsDevMode(!isDevMode)}
            style={{ fontSize: '11px', color: 'var(--color-text-subtle)', textDecoration: 'underline' }}
          >
            {isDevMode ? 'Sembunyikan Dev Tools' : 'Dev Tools'}
          </button>
        </div>

        {/* Development Only Tools */}
        {isDevMode && (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px dashed var(--color-divider)',
              marginBottom: '16px',
              fontSize: '12px',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Mode QA / Simulator Integrasi</div>
            <div style={{ color: 'var(--color-text-muted)' }}>
              Status Koneksi PromotorFlow: <strong>Sistem Berjalan Normal (AVAILABLE)</strong>
            </div>
          </div>
        )}

        {/* Work Queue Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: 'var(--color-text-main)' }}>
            Perlu Perhatian ({signals.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {signals.map(sig => {
              const contact = contactMap.get(sig.contactId);
              if (!contact) return null;

              return (
                <div
                  key={sig.id}
                  onClick={() => setSelectedContactId(sig.contactId)}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    padding: '14px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-divider)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>
                      {contact.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                      {formatPhoneDisplay(contact.phoneE164)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-main)' }}>
                      <strong>{sig.primaryReason}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 'var(--border-radius-full)',
                        backgroundColor: sig.signalLevel === 'Minat tinggi' ? 'var(--color-primary-light)' : 'var(--color-canvas)',
                        color: sig.signalLevel === 'Minat tinggi' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      }}
                    >
                      {sig.signalLevel}
                    </span>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '4px' }} className="tabular-nums">
                      Skor: {sig.intentScore}/100
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Activity Log */}
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Aktivitas Pembelajaran Terbaru</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activityItems.map(act => (
              <div
                key={act.id}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <span>{act.summary}</span>
                <span style={{ color: 'var(--color-text-subtle)' }} className="tabular-nums">
                  {act.timeAgo}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Participant Detail Drawer */}
        {selectedContact && (
          <LearnerDetail
            contact={selectedContact}
            onClose={() => setSelectedContactId(null)}
            onOpenWhatsAppDraft={c => {
              setSelectedContactId(null);
              setWhatsAppDraftContact(c);
            }}
          />
        )}

        {/* WhatsApp Draft Sheet */}
        {whatsAppDraftContact && (
          <WhatsAppDraftSheet
            contact={whatsAppDraftContact}
            onClose={() => setWhatsAppDraftContact(null)}
          />
        )}
      </div>
    </PromotorShell>
  );
}
