'use client';

import React, { useState, useEffect } from 'react';
import { BottomSheet } from '../ui';

export interface WhatsAppBottomSheetProps {
  isOpen: boolean;
  contactName: string;
  phoneE164: string;
  initialDraft: string;
  waUrl: string;
  onClose: () =>void;
  onConfirmSent: (scheduleNextDays?: number) =>Promise<void>;
  onDraftError?: (message: string) =>void;
}

export const WhatsAppBottomSheet: React.FC<WhatsAppBottomSheetProps>= ({
  isOpen,
  contactName,
  phoneE164,
  initialDraft,
  waUrl,
  onClose,
  onConfirmSent,
}) =>{
  const [draft, setDraft] = useState(initialDraft);
  const [hasOpenedWa, setHasOpenedWa] = useState(false);
  const [nextFollowUpDays, setNextFollowUpDays] = useState<number | undefined>(2);

  useEffect(() =>{
    setDraft(initialDraft);
    setHasOpenedWa(false);
    setNextFollowUpDays(2);
  }, [initialDraft, isOpen]);

  if (!isOpen) return null;

  const handleOpenWa = () =>{
    const cleanDigits = phoneE164.replace(/\+/g, '').replace(/[\s\-]/g, '');
    const currentWaUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(draft)}`;
    window.open(currentWaUrl, '_blank');
    setHasOpenedWa(true);
  };

  const handleConfirm = async () =>{
    await onConfirmSent(nextFollowUpDays);
    onClose();
  };

  return (
    <BottomSheet open={isOpen} onClose={onClose} labelledBy="wa-sheet-title">
     {!hasOpenedWa ? (
        <>
         <div id="wa-sheet-title" className="kicker kicker-muted">
           Draf pesan · {contactName}
          </div>
         <textarea
            aria-label="Draf pesan WhatsApp"
            value={draft}
            onChange={(e) =>setDraft(e.target.value)}
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
                  onClick={() =>setNextFollowUpDays(opt.value)}
                >
                 {opt.label}
                </button>
             ))}
            </div>
         </div>

         <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
           <button type="button" className="btn btn-primary" onClick={handleConfirm}>
             Ya, sudah
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
