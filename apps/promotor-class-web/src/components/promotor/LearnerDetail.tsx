'use client';

import React, { useEffect, useState } from 'react';
import { Contact, Enrollment, Program, LearningSignal, IntentBreakdownItem, JourneyItem } from '@promotor/contracts';
import { formatPhoneDisplay } from '@promotor/platform-core';
import { getPlatformApiClient } from '@/adapters';
import { JourneyTimeline } from './JourneyTimeline';
import { PwaProgress } from '@/components/pwa/pwa';

interface LearnerDetailProps {
  contact: Contact;
  enrollment?: Enrollment;
  learner?: { intentBreakdown?: IntentBreakdownItem[] | null };
  program?: Program;
  signal?: LearningSignal;
  onOpenWhatsAppDraft: (contact: Contact, message: string) => void;
  onClose?: () => void;
}

export function LearnerDetail({
  contact,
  enrollment,
  learner: learnerProp,
  program,
  signal,
  onOpenWhatsAppDraft,
  onClose,
}: LearnerDetailProps) {
  const learner = learnerProp ?? enrollment ?? {};
  const signalLevel = signal?.signalLevel || 'Minat sedang';
  const primaryReason = signal?.primaryReason || 'Memulai pembelajaran';
  const rawQuote = signal?.rawReflectionQuote;

  const intentClass =
    signalLevel === 'Minat tinggi' ? 'intent-hot' : signalLevel === 'Minat sedang' ? 'intent-warm' : 'intent-cold';

  const programTitle = program?.title || 'Program Belajar';
  const defaultDraftMessage = `Halo ${contact.name}, saya promotor Anda dari program "${programTitle}". Saya memperhatikan Anda telah ${primaryReason.toLowerCase()}. Bagaimana perkembangan belajar Anda saat ini?`;

  const [journey, setJourney] = useState<JourneyItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    getPlatformApiClient()
      .getContactJourney(contact.id)
      .then((res) => {
        if (alive) setJourney(res.items ?? []);
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [contact.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div className="pwa-kicker">Detail peserta</div>
          <h2 style={{ fontSize: 20, fontWeight: 850, letterSpacing: '-0.02em', margin: '6px 0 0' }}>{contact.name}</h2>
          <div className="pwa-muted" style={{ marginTop: 2 }}>
            {formatPhoneDisplay(contact.phoneE164)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none', alignItems: 'center' }}>
          <span className={intentClass}>{signalLevel}</span>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Tutup detail peserta" className="pwa-icon-btn">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="detail-hero">
        <div className="pwa-kicker">Intent score</div>
        <div className="detail-score tabular-nums" style={{ marginTop: 8 }}>
          {signal?.intentScore ?? '—'}
        </div>
        {(learner.intentBreakdown?.length ?? 0) > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 32, display: 'inline-flex', alignItems: 'center' }}>
              Mengapa skor ini?
            </summary>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {learner.intentBreakdown!.map((b, i) => (
                <li key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>
                  {b.label} <strong>+{b.points}</strong>
                </li>
              ))}
            </ul>
          </details>
        )}
        {signal?.intentScore !== undefined && (
          <>
            <div style={{ marginTop: 12 }}>
              <PwaProgress pct={signal.intentScore} />
            </div>
            <div className="pwa-muted" style={{ marginTop: 10 }}>
              Alasan: {primaryReason}
            </div>
          </>
        )}
      </div>

      {rawQuote && (
        <div>
          <div className="pwa-kicker">Refleksi terakhir</div>
          <blockquote className="detail-quote">&ldquo;{rawQuote}&rdquo;</blockquote>
        </div>
      )}

      {enrollment && (
        <div className="detail-hero">
          <div className="pwa-kicker" style={{ marginBottom: 12 }}>
            Progres pembelajaran
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <PwaProgress pct={enrollment.progressPercent} />
            </div>
            <span className="learner-pct tabular-nums">Progres: {enrollment.progressPercent}%</span>
          </div>
          <div className="pwa-muted" style={{ marginTop: 8 }}>
            Program: {programTitle}
          </div>
        </div>
      )}

      {journey && journey.length > 0 && (
        <div>
          <div className="pwa-kicker" style={{ marginBottom: 4 }}>
            Perjalanan {contact.name}
          </div>
          <JourneyTimeline items={journey} />
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpenWhatsAppDraft(contact, defaultDraftMessage)}
        className="pwa-cta"
      >
        Buat Draf WhatsApp
      </button>
    </div>
  );
}
