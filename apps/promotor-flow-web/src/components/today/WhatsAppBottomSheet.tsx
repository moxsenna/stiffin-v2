'use client';

import React, { useState, useEffect } from 'react';
import { BottomSheet } from '../ui';
import type { ContactWaOutcome, MessageTemplateTone } from '@promotor/contracts';

export interface WhatsAppBottomSheetProps {
  isOpen: boolean;
  contactName: string;
  phoneE164: string;
  initialDraft: string;
  waUrl: string;
  initialTone?: MessageTemplateTone;
  onRegenerateDraft?: (tone: MessageTemplateTone) => string | Promise<string>;
  onClose: () => void;
  onConfirmSent: (scheduleNextDays?: number, outcome?: ContactWaOutcome) => Promise<void>;
  onDraftError?: (message: string) => void;
}

export const WhatsAppBottomSheet: React.FC<WhatsAppBottomSheetProps> = ({
  isOpen,
  contactName,
  phoneE164,
  initialDraft,
  waUrl,
  initialTone,
  onRegenerateDraft,
  onClose,
  onConfirmSent,
}) => {
  const [draft, setDraft] = useState(initialDraft);
  const [tone, setTone] = useState<MessageTemplateTone | undefined>(initialTone);
  const [hasOpenedWa, setHasOpenedWa] = useState(false);
  const [nextFollowUpDays, setNextFollowUpDays] = useState<number | undefined>(2);
  const [delayTouched, setDelayTouched] = useState(false);
  const [outcome, setOutcome] = useState<ContactWaOutcome | undefined>(undefined);

  useEffect(() => {
    setDraft(initialDraft);
    setTone(initialTone);
    setHasOpenedWa(false);
    setNextFollowUpDays(2);
    setDelayTouched(false);
    setOutcome(undefined);
  }, [initialDraft, initialTone, isOpen]);

  if (!isOpen) return null;

  const handleToneChange = async (t: MessageTemplateTone) => {
    setTone(t);
    if (onRegenerateDraft) {
      const next = await onRegenerateDraft(t);
      if (next !== undefined) {
        setDraft(next);
      }
    }
  };

  const handleOpenWa = () => {
    const cleanDigits = phoneE164.replace(/\+/g, '').replace(/[\s\-]/g, '');
    const currentWaUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(draft)}`;
    window.open(currentWaUrl, '_blank');
    setHasOpenedWa(true);
  };

  const handleConfirm = async () => {
    const systemScheduled = outcome === 'INTERESTED_TEST' || outcome === 'ASK_SCHEDULE';
    // WAIT_PAYDAY defaults to 3d and NO_RESPONSE to 2d on the backend. Only send
    // an explicit delay when the user touched the picker, otherwise let the
    // backend outcome default apply.
    const useOutcomeDefault =
      (outcome === 'WAIT_PAYDAY' || outcome === 'NO_RESPONSE') && !delayTouched;
    await onConfirmSent(systemScheduled || useOutcomeDefault ? undefined : nextFollowUpDays, outcome);
    onClose();
  };

  const showDelayPicker = outcome !== 'INTERESTED_TEST' && outcome !== 'ASK_SCHEDULE';

  return (
    <BottomSheet open={isOpen} onClose={onClose} labelledBy="wa-sheet-title">
      {!hasOpenedWa ? (
        <>
          <h2 id="wa-sheet-title" style={{ font: '700 16px/1.3 var(--font-sans)', marginBottom: 8 }}>
            Kirim WhatsApp
          </h2>
          <div className="kicker kicker-muted">
            Draf pesan · {contactName}
          </div>

          <div className="segmented" style={{ marginTop: 8 }} role="group" aria-label="Nada pesan">
            {(['FORMAL', 'HANGAT', 'URGENT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={tone === t ? 'is-active' : undefined}
                aria-pressed={tone === t}
                onClick={() => handleToneChange(t)}
              >
                {t === 'FORMAL' ? 'Formal' : t === 'HANGAT' ? 'Hangat' : 'Urgent'}
              </button>
            ))}
          </div>

          <textarea
            aria-label="Draf pesan WhatsApp"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="textarea"
            style={{ marginTop: 12 }}
          />
          <div style={{ marginTop: 10, font: '400 11px/1.45 var(--font-sans)', color: 'var(--muted-strong)' }}>
            Pesan dibuka di WhatsApp. Anda yang menekan kirim.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="button" className="btn btn-accent" onClick={handleOpenWa}>
              Buka WhatsApp
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Batal
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 id="wa-sheet-title" className="sheet-title-lg">
            Pesan sudah terkirim?
          </h2>
         <div className="sheet-explain">
           Jika sudah, tindakan ditutup dan Next Action berikutnya dibuat otomatis.
          </div>

         <div style={{ marginTop: 14 }}>
           <div className="field-label">Apa hasil chat barusan?</div>
           <div className="segmented">
             {[
               { label: 'Tertarik Tes STIFIn', value: 'INTERESTED_TEST' as const },
               { label: 'Minta Jadwal', value: 'ASK_SCHEDULE' as const },
               { label: 'Tunggu Gajian', value: 'WAIT_PAYDAY' as const },
               { label: 'Tidak Merespons', value: 'NO_RESPONSE' as const },
             ].map((opt) => (
               <button
                 key={opt.value}
                 type="button"
                 className={outcome === opt.value ? 'is-active' : undefined}
                 aria-pressed={outcome === opt.value}
                 onClick={() => setOutcome(outcome === opt.value ? undefined : opt.value)}
               >
                 {opt.label}
               </button>
             ))}
           </div>
         </div>

         {showDelayPicker && (
         <div style={{ marginTop: 14 }}>
           <div className="field-label">Jadwalkan follow-up berikutnya</div>
           <div className="segmented">
             {[
                { label: '2 Hari', value: 2 as number | undefined },
                { label: '5 Hari', value: 5 },
                { label: '1 Minggu', value: 7 },
                { label: 'Tidak', value: undefined },
              ].map((opt) =>(
                <button
                  key={opt.label}
                  type="button"
                  className={nextFollowUpDays === opt.value ? 'is-active' : undefined}
                  aria-pressed={nextFollowUpDays === opt.value}
                  onClick={() =>{setNextFollowUpDays(opt.value); setDelayTouched(true);}}
                >
                 {opt.label}
                </button>
             ))}
            </div>
         </div>
         )}

         <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
           <button type="button" className="btn btn-primary" onClick={handleConfirm}>
             Ya, Sudah Dikirim
            </button>
           <button type="button" className="btn btn-secondary" onClick={() =>setHasOpenedWa(false)}>
             Belum
            </button>
         </div>
       </>
     )}
    </BottomSheet>
 );
};
