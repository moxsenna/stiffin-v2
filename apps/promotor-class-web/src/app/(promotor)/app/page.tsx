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

  const isDevelopmentEnv = process.env.NODE_ENV === 'development';

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
      <div style={{ padding: '24px 20px', maxWidth: '960px', margin: '0 auto' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.025em', marginBottom: '4px', color: 'var(--color-text-main)' }}>
              Beranda Promotor
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', margin: 0 }}>
              {signals.length} peserta dengan sinyal intent tinggi memerlukan perhatian
            </p>
          </div>

          {isDevelopmentEnv && (
            <button
              onClick={() => setIsDevMode(!isDevMode)}
              style={{ fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'underline', padding: '4px 8px' }}
            >
              {isDevMode ? 'Tutup Dev QA' : 'Mode Dev QA'}
            </button>
          )}
        </div>

        {/* Development Mode Inspector */}
        {isDevelopmentEnv && isDevMode && (
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px dashed var(--color-divider)',
              marginBottom: '20px',
              fontSize: '12.5px',
            }}
          >
            <div style={{ fontWeight: 750, marginBottom: '4px' }}>Simulator Integrasi QA</div>
            <div style={{ color: 'var(--color-text-muted)' }}>
              Status Koneksi PromotorFlow: <strong style={{ color: 'var(--color-status-success)' }}>Tersedia (AVAILABLE)</strong>
            </div>
          </div>
        )}

        {/* Work Queue Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>
              Antrean Follow-up ({signals.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {signals.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--border-radius-lg)',
                  border: '1px solid var(--color-divider)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '13.5px',
                }}
              >
                Belum ada sinyal follow-up mendesak saat ini.
              </div>
            ) : (
              signals.map(sig => {
                const contact = contactMap.get(sig.contactId);
                if (!contact) return null;

                const isHot = sig.signalLevel === 'Minat tinggi';

                return (
                  <div
                    key={sig.id}
                    onClick={() => setSelectedContactId(sig.contactId)}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      padding: '16px 20px',
                      borderRadius: 'var(--border-radius-lg)',
                      border: '1px solid var(--color-divider)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: 'var(--shadow-xs)',
                      transition: 'transform var(--duration-fast) var(--ease-spring), border-color var(--duration-fast) ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-main)' }}>
                          {contact.name}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {formatPhoneDisplay(contact.phoneE164)}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-body)' }}>
                        <strong>{sig.primaryReason}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 780,
                          padding: '3px 10px',
                          borderRadius: 'var(--border-radius-full)',
                          backgroundColor: isHot ? 'var(--color-status-success-bg)' : 'var(--color-canvas)',
                          color: isHot ? 'var(--color-status-success)' : 'var(--color-text-muted)',
                          border: isHot ? '1px solid var(--color-status-success-border)' : '1px solid var(--color-divider)',
                        }}
                      >
                        {sig.signalLevel}
                      </span>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 600 }} className="tabular-nums">
                        Skor Intent: {sig.intentScore}/100
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Dynamic Activity Log */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>
            Aktivitas Pembelajaran Terbaru
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activityItems.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--color-divider)',
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '13px',
                }}
              >
                Belum ada aktivitas pembelajaran baru.
              </div>
            ) : (
              activityItems.map(act => (
                <div
                  key={act.id}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-divider)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-body)', fontWeight: 550 }}>{act.summary}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }} className="tabular-nums">
                    {act.timeAgo}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Participant Detail Drawer */}
        {selectedContact && (
          <div className="side-panel active" style={{ zIndex: 1200 }}>
            <LearnerDetail
              contact={selectedContact}
              onClose={() => setSelectedContactId(null)}
              onOpenWhatsAppDraft={c => {
                setSelectedContactId(null);
                setWhatsAppDraftContact(c);
              }}
            />
          </div>
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
