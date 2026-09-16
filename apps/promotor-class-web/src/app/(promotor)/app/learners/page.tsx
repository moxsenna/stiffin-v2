'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { LearnerDetail } from '@/components/promotor/LearnerDetail';
import { WhatsAppDraftSheet } from '@/components/promotor/WhatsAppDraftSheet';
import { BroadcastReminderSheet } from '@/components/promotor/BroadcastReminderSheet';
import { PwaLogo, PwaChips, PwaProgress } from '@/components/pwa/pwa';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui';
import { getContactsQuery } from '@/modules/contacts/queries';
import { getEnrollmentsQuery } from '@/modules/enrollments/queries';
import { getLearningSignalsQuery } from '@/modules/signals/queries';
import { getProgramsQuery } from '@/modules/programs/queries';
import { Contact, Enrollment, Program, LearningSignal } from '@promotor/contracts';
import { formatPhoneDisplay } from '@promotor/platform-core';

type LearnerFilter = 'semua' | 'Minat tinggi' | 'Minat sedang' | 'Minat rendah';

function intentPillClass(level: string): string {
  if (level === 'Minat tinggi') return 'intent-hot';
  if (level === 'Minat sedang') return 'intent-warm';
  return 'intent-cold';
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

const FILTER_CHIPS: Array<{ label: string; value: LearnerFilter }> = [
  { label: 'Semua', value: 'semua' },
  { label: 'Minat tinggi', value: 'Minat tinggi' },
  { label: 'Minat sedang', value: 'Minat sedang' },
  { label: 'Minat rendah', value: 'Minat rendah' },
];

export default function LearnersPage() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [signals, setSignals] = useState<LearningSignal[]>([]);
  const [programsMap, setProgramsMap] = useState<Map<string, Program>>(new Map());
  const [selectedFilter, setSelectedFilter] = useState<LearnerFilter>('semua');
  const [query, setQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<{ isOpen: boolean; contact: Contact | null; message: string }>({
    isOpen: false,
    contact: null,
    message: '',
  });
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  const loadData = React.useCallback(async () => {
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
      progData.forEach((p: Program) => pMap.set(p.id, p));
      setProgramsMap(pMap);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat peserta.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDraft = (contact: Contact, message: string) => {
    setDraftState({ isOpen: true, contact, message });
  };

  const getSignalForContact = (contactId: string) => {
    return signals.find((s) => s.contactId === contactId);
  };

  const getEnrollmentForContact = (contactId: string) => {
    return enrollments.find((e) => e.contactId === contactId);
  };

  const enrolledContactIds = new Set(enrollments.map((e) => e.contactId));
  const learnerContacts = contacts ? contacts.filter((c) => enrolledContactIds.has(c.id)) : [];

  const q = query.trim().toLowerCase();

  const filteredContacts = learnerContacts
    .filter((c) => {
      const enr = getEnrollmentForContact(c.id);
      const sig = getSignalForContact(c.id);
      const intentLabel = ((enr as any)?.intentLabel || 'COLD').toUpperCase();
      const effectiveSignalLevel =
        sig?.signalLevel ||
        (intentLabel === 'HOT' ? 'Minat tinggi' : intentLabel === 'WARM' ? 'Minat sedang' : 'Minat rendah');

      if (selectedFilter === 'semua') return true;
      return effectiveSignalLevel === selectedFilter;
    })
    .filter((c) => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.phoneE164.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
    });

  const hotCount = learnerContacts.filter((c) => {
    const sig = getSignalForContact(c.id);
    const enr = getEnrollmentForContact(c.id);
    const intentLabel = ((enr as any)?.intentLabel || 'COLD').toUpperCase();
    return (sig?.signalLevel || (intentLabel === 'HOT' ? 'Minat tinggi' : '')) === 'Minat tinggi';
  }).length;

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
    .filter((l) => l.progressPercent < 50 && l.learningStatus !== 'COMPLETED' && l.legacyStatus !== 'selesai');

  return (
    <PromotorShell>
      <div className="pwa-screen pwa-screen-pad-dock" style={{ minHeight: '100dvh' }}>
        <div className="promotor-top">
          <div className="promotor-brandrow">
            <PwaLogo />
            <div style={{ minWidth: 0 }}>
              <div className="promotor-brandname">Ralivo Class</div>
              <div className="promotor-brandtag">Promotor workspace · follow-up peserta</div>
            </div>
          </div>
          <h1 className="promotor-title">Daftar Peserta &amp; Follow-up</h1>
          <div className="promotor-sub">
            {contacts ? `${filteredContacts.length} peserta pembelajaran` : 'Memuat peserta...'}
          </div>

          <div className="promo-stats" aria-label="Ringkasan peserta">
            <div className="promo-stat">
              <div className="promo-stat-num">{learnerContacts.length}</div>
              <div className="promo-stat-label">Total peserta</div>
            </div>
            <div className="promo-stat">
              <div className="promo-stat-num" style={{ color: 'var(--pwa-primary)' }}>
                {hotCount}
              </div>
              <div className="promo-stat-label">Minat tinggi</div>
            </div>
            <div className="promo-stat">
              <div className="promo-stat-num" style={{ color: 'var(--pwa-warning)' }}>
                {reminderCandidates.length}
              </div>
              <div className="promo-stat-label">Perlu pengingat</div>
            </div>
          </div>
        </div>

        <div className="promotor-wrap">
          <div className="pwa-search" role="search" style={{ marginTop: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" style={{ flex: 'none' }}>
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama atau nomor peserta..."
              aria-label="Cari peserta"
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <PwaChips
              items={FILTER_CHIPS.map((f) => f.label)}
              active={FILTER_CHIPS.find((f) => f.value === selectedFilter)?.label ?? 'Semua'}
              onChange={(label) => {
                const found = FILTER_CHIPS.find((f) => f.label === label);
                if (found) setSelectedFilter(found.value);
              }}
            />
          </div>

          <button
            type="button"
            className="pwa-cta"
            style={{ marginTop: 12 }}
            disabled={reminderCandidates.length === 0}
            onClick={() => setIsBroadcastOpen(true)}
          >
            Broadcast Pengingat{reminderCandidates.length > 0 ? ` (${reminderCandidates.length})` : ''}
          </button>

          {loadError && (
            <div style={{ marginTop: 12 }}>
              <ErrorState title="Gagal memuat peserta" detail={loadError} onRetry={() => loadData()} />
            </div>
          )}

          {!contacts && !loadError && (
            <div style={{ marginTop: 12 }}>
              <LoadingRows rows={4} />
            </div>
          )}

          {contacts && filteredContacts.length === 0 && !loadError && (
            <div style={{ marginTop: 12 }} className="pwa-card pwa-card-pad">
              <EmptyState
                title="Belum ada peserta pembelajaran yang terdaftar"
                explanation="Peserta muncul setelah kontak didaftarkan ke program kelas."
              />
            </div>
          )}

          {contacts && filteredContacts.length > 0 && (
            <>
              <div className="pwa-section-head">
                <h2 className="pwa-section-title">Peserta</h2>
                <span className="pwa-muted tabular-nums" style={{ fontWeight: 800, fontSize: 12 }}>
                  {filteredContacts.length}
                </span>
              </div>

              {filteredContacts.map((contact) => {
                const sig = getSignalForContact(contact.id);
                const enr = getEnrollmentForContact(contact.id);
                const prog = enr ? programsMap.get(enr.programId) : undefined;
                const intentLabel = ((enr as any)?.intentLabel || 'COLD').toUpperCase();
                const effectiveSignalLevel =
                  sig?.signalLevel ||
                  (intentLabel === 'HOT' ? 'Minat tinggi' : intentLabel === 'WARM' ? 'Minat sedang' : 'Minat rendah');

                const reasonDisplay =
                  sig?.primaryReason || (prog ? `Terdaftar pada ${prog.title}` : 'Peserta terdaftar');

                const isSelected = selectedContact?.id === contact.id;
                const pct = Math.max(0, Math.min(100, Math.round(Number(enr?.progressPercent ?? 0))));

                return (
                  <div key={contact.id} className={isSelected ? 'pwa-card learner-card is-open' : 'pwa-card learner-card'}>
                    <button
                      type="button"
                      data-testid="learner-item"
                      onClick={() => setSelectedContact(isSelected ? null : contact)}
                      aria-expanded={isSelected}
                      aria-label={`Detail peserta ${contact.name}`}
                      className="learner-head"
                    >
                      <span className="avatar-initial" aria-hidden="true">
                        {initialsOf(contact.name)}
                      </span>
                      <span className="learner-main">
                        <span className="learner-namerow">
                          <span className="learner-name">{contact.name}</span>
                          <span className={intentPillClass(effectiveSignalLevel)}>{effectiveSignalLevel}</span>
                        </span>
                        <span className="learner-meta">
                          {formatPhoneDisplay(contact.phoneE164)} · {prog ? prog.title : 'Program tidak diketahui'}
                        </span>
                        <span className="learner-reason">Alasan: {reasonDisplay}</span>
                        {enr && (
                          <span className="learner-progress">
                            <PwaProgress pct={pct} />
                            <span className="learner-pct tabular-nums">Progres: {pct}%</span>
                          </span>
                        )}
                      </span>
                      <span className="learner-chevron" aria-hidden="true">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </button>

                    {isSelected && (
                      <div
                        data-testid="learner-drawer-container"
                        className="learner-drawer"
                        role="region"
                        aria-label={`Detail peserta ${contact.name}`}
                      >
                        <LearnerDetail
                          contact={selectedContact!}
                          enrollment={getEnrollmentForContact(selectedContact!.id)}
                          program={programsMap.get(getEnrollmentForContact(selectedContact!.id)?.programId || '')}
                          signal={getSignalForContact(selectedContact!.id)}
                          onOpenWhatsAppDraft={handleOpenDraft}
                          onClose={() => setSelectedContact(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
          <div style={{ height: 12 }} />
        </div>

        {draftState.isOpen && (
          <WhatsAppDraftSheet
            contact={draftState.contact}
            initialMessage={draftState.message}
            onClose={() => setDraftState({ ...draftState, isOpen: false })}
          />
        )}

        {isBroadcastOpen && (
          <BroadcastReminderSheet
            isOpen={isBroadcastOpen}
            learners={reminderCandidates}
            onClose={() => setIsBroadcastOpen(false)}
          />
        )}
      </div>
    </PromotorShell>
  );
}
