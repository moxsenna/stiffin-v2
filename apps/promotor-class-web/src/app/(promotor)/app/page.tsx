'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

  useEffect(() => {
    Promise.all([
      getLearningSignalsQuery(),
      getContactsQuery(),
      getReflectionsQuery(),
      getEnrollmentsQuery(),
    ]).then(([sigData, conData, reflData, enrData]) => {
      setSignals(sigData || []);
      setContacts(conData || []);
      setReflections(reflData || []);
      setEnrollments(enrData || []);
    });
  }, []);

  const contactMap = new Map(contacts.map(c => [c.id, c]));
  const selectedContact = selectedContactId ? contactMap.get(selectedContactId) : null;

  const highIntentCount = signals.filter(s => s.signalLevel === 'Minat tinggi' || s.intentScore >= 70).length;

  const activityItems = reflections.slice(0, 10).map(refl => {
    const contact = contactMap.get(refl.contactId);
    const learnerName = contact ? contact.name : 'Peserta';
    return {
      id: refl.id,
      learnerName,
      summary: `${learnerName} mengirimkan refleksi belajar baru`,
      timeAgo: formatTimeAgo(refl.submittedAt),
      timestamp: refl.submittedAt,
    };
  });

  return (
    <PromotorShell>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Welcome Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #06B6D4 100%)',
            borderRadius: 'var(--border-radius-xl)',
            padding: '32px 36px',
            color: '#FFFFFF',
            marginBottom: '32px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: 'var(--border-radius-full)', backgroundColor: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34D399' }} />
              Live Workspace Dashboard
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.035em', margin: '0 0 8px', lineHeight: 1.2 }}>
              Selamat Datang di PromotorClass
            </h1>
            <p style={{ fontSize: '14.5px', opacity: 0.92, lineHeight: 1.6, margin: '0 0 20px', fontWeight: 500 }}>
              Pantau progres materi peserta, deteksi sinyal niat beli tes STIFIn secara real-time, dan konversi leads secara otomatis.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link
                href="/app/programs"
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--color-primary)',
                  fontWeight: 800,
                  fontSize: '13px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Kelola Program & Materi →
              </Link>
              <Link
                href="/app/learners"
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  fontWeight: 750,
                  fontSize: '13px',
                  textDecoration: 'none',
                  backdropFilter: 'blur(8px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Lihat Semua Peserta ({contacts.length})
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Metric Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 650, color: 'var(--color-text-muted)' }}>Hot Leads / Minat Tinggi</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--color-status-danger-bg)', color: 'var(--color-status-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🔥
              </span>
            </div>
            <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
              {highIntentCount}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Siap di-closing ke Tes STIFIn
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 650, color: 'var(--color-text-muted)' }}>Total Peserta Belajar</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </span>
            </div>
            <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
              {contacts.length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {enrollments.length} pendaftaran terdata
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 650, color: 'var(--color-text-muted)' }}>Lembar Refleksi Masuk</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--color-accent-cyan-light)', color: 'var(--color-accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
            </div>
            <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
              {reflections.length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Wawasan langsung dari calon klien
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 650, color: 'var(--color-text-muted)' }}>Tingkat Konversi Sinyal</span>
              <span style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--color-accent-emerald-light)', color: 'var(--color-accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ⚡
              </span>
            </div>
            <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-status-success)', letterSpacing: '-0.02em' }}>
              {contacts.length > 0 ? Math.round((highIntentCount / contacts.length) * 100) : 0}%
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Rasio intent tinggi dari total peserta
            </div>
          </div>
        </div>

        {/* 2-Column Main Section: Follow-up Queue & Real-time Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Left Column: Follow-up Queue */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 850, color: 'var(--color-text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                  Antrean Follow-up Sinyal
                </h2>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--border-radius-full)', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                  {signals.length}
                </span>
              </div>
              <Link href="/app/activity" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>
                Lihat Semua →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {signals.length === 0 ? (
                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--border-radius-lg)',
                    border: '1px solid var(--color-divider)',
                    padding: '36px 20px',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: '13.5px',
                  }}
                >
                  Belum ada sinyal follow-up mendesak saat ini. Bagikan tautan program ke calon klien untuk mulai mengumpulkan sinyal!
                </div>
              ) : (
                signals.map(sig => {
                  const contact = contactMap.get(sig.contactId);
                  if (!contact) return null;

                  const isHot = sig.signalLevel === 'Minat tinggi' || sig.intentScore >= 70;

                  return (
                    <div
                      key={sig.id}
                      onClick={() => setSelectedContactId(sig.contactId)}
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        padding: '16px 18px',
                        borderRadius: 'var(--border-radius-lg)',
                        border: '1px solid var(--color-divider)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: 'var(--shadow-xs)',
                        transition: 'all var(--duration-fast) ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: isHot ? 'var(--color-status-danger-bg)' : 'var(--color-primary-light)',
                            color: isHot ? 'var(--color-status-danger)' : 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '14px',
                            flexShrink: 0,
                          }}
                        >
                          {contact.name.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {contact.name}
                            </span>
                            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                              {formatPhoneDisplay(contact.phoneE164)}
                            </span>
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--color-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sig.primaryReason}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 'var(--border-radius-full)',
                            backgroundColor: isHot ? 'var(--color-status-danger-bg)' : 'var(--color-canvas-subtle)',
                            color: isHot ? 'var(--color-status-danger)' : 'var(--color-text-muted)',
                            border: isHot ? '1px solid var(--color-status-danger-border)' : '1px solid var(--color-divider)',
                          }}
                        >
                          {sig.signalLevel}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 650 }} className="tabular-nums">
                          Skor {sig.intentScore}/100
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Real-time Activity Log */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 850, color: 'var(--color-text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                Aktivitas Belajar Terkini
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activityItems.length === 0 ? (
                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--border-radius-lg)',
                    border: '1px solid var(--color-divider)',
                    padding: '36px 20px',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: '13px',
                  }}
                >
                  Belum ada aktivitas pembelajaran baru yang tercatat.
                </div>
              ) : (
                activityItems.map(act => (
                  <div
                    key={act.id}
                    style={{
                      padding: '14px 16px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--color-text-body)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {act.summary}
                      </span>
                    </div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11.5px', flexShrink: 0 }} className="tabular-nums">
                      {act.timeAgo}
                    </span>
                  </div>
                ))
              )}
            </div>
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
