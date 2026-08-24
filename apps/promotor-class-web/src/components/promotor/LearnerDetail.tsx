'use client';

import React from 'react';
import { Contact, Enrollment, Program, LearningSignal } from '@promotor/contracts';
import { formatPhoneDisplay } from '@promotor/platform-core';

interface LearnerDetailProps {
  contact: Contact;
  enrollment?: Enrollment;
  program?: Program;
  signal?: LearningSignal;
  onOpenWhatsAppDraft: (contact: Contact, message: string) =>void;
  onClose?: () =>void;
}

export function LearnerDetail({
  contact,
  enrollment,
  program,
  signal,
  onOpenWhatsAppDraft,
  onClose,
}: LearnerDetailProps) {
  const signalLevel = signal?.signalLevel || 'Minat sedang';
  const primaryReason = signal?.primaryReason || 'Memulai pembelajaran';
  const rawQuote = signal?.rawReflectionQuote;

  const intentTagClass =
    signalLevel === 'Minat tinggi' ? 'tag tag-hot' : signalLevel === 'Minat sedang' ? 'tag tag-warm' : 'tag tag-cold';

  const programTitle = program?.title || 'Program Belajar';
  const defaultDraftMessage = `Halo ${contact.name}, saya promotor Anda dari program "${programTitle}". Saya memperhatikan Anda telah ${primaryReason.toLowerCase()}. Bagaimana perkembangan belajar Anda saat ini?`;

  return (
    <div className="side-panel active" style={{ background: 'var(--surface)', padding: 0, display: 'flex', flexDirection: 'column' }}>
     <div style={{ borderBottom: 'var(--sep-strong)', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
       <div style={{ minWidth: 0 }}>
         <div className="kicker kicker-muted">Detail learner</div>
         <h2 style={{ font: '800 22px/1.1 var(--font-sans)', letterSpacing: '-0.02em', marginTop: 7 }}>{contact.name}</h2>
         <div className="row-meta">{formatPhoneDisplay(contact.phoneE164)}</div>
       </div>
       {onClose && (
          <button type="button" onClick={onClose} aria-label="Tutup detail learner" className="header-action" style={{ width: 40, height: 40 }}>
           ✕
          </button>
       )}
      </div>

     <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
         <div>
           <div className="kicker kicker-muted">Intent score</div>
           <div style={{ marginTop: 8, font: '800 40px/1 var(--font-sans)', letterSpacing: '-0.04em' }} className="tabular-nums">
             {signal?.intentScore ?? '—'}
            </div>
         </div>
         <span className={intentTagClass}>{signalLevel}</span>
       </div>
       {signal?.intentScore !== undefined && (
          <>
           <div className="progress progress-thick" style={{ marginTop: 12 }} role="progressbar" aria-valuenow={signal.intentScore} aria-valuemin={0} aria-valuemax={100} aria-label={`Intent score ${signal.intentScore}`}>
             <span className="progress-fill progress-accent" style={{ width: `${signal.intentScore}%` }} />
           </div>
           <div style={{ marginTop: 10, font: '400 11px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
             Alasan: {primaryReason}
            </div>
         </>
       )}
      </div>

     {rawQuote && (
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
         <div className="kicker kicker-muted">Refleksi terakhir</div>
         <blockquote className="quote-block" style={{ marginTop: 11 }}>
           &ldquo;{rawQuote}&rdquo;
          </blockquote>
       </div>
     )}

      {enrollment && (
        <div style={{ padding: '16px 18px', borderBottom: '2px solid var(--ink)' }}>
         <div className="kicker kicker-muted" style={{ marginBottom: 12 }}>Progres pembelajaran</div>
         <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
           <div className="progress progress-thin" style={{ flex: 1 }}>
             <span className="progress-fill" style={{ width: `${enrollment.progressPercent}%` }} />
           </div>
           <span style={{ font: '700 11px/1 var(--font-sans)' }} className="tabular-nums">
             Progres: {enrollment.progressPercent}%
            </span>
         </div>
         <div className="row-meta" style={{ marginTop: 8 }}>Program: {programTitle}</div>
       </div>
     )}

      <div style={{ padding: 18 }}>
       <button
          type="button"
          onClick={() =>onOpenWhatsAppDraft(contact, defaultDraftMessage)}
          className="btn btn-primary btn-block"
        >
         Buat Draf WhatsApp
        </button>
     </div>
   </div>
 );
}
