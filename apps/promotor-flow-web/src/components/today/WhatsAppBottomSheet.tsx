'use client';

import React, { useState, useEffect } from 'react';
import { WhatsAppIcon } from '../foundation/icons';

export interface WhatsAppBottomSheetProps {
  isOpen: boolean;
  contactName: string;
  phoneE164: string;
  initialDraft: string;
  waUrl: string;
  onClose: () => void;
  onConfirmSent: (scheduleNextDays?: number) => Promise<void>;
}

export const WhatsAppBottomSheet: React.FC<WhatsAppBottomSheetProps> = ({
  isOpen,
  contactName,
  phoneE164,
  initialDraft,
  waUrl,
  onClose,
  onConfirmSent,
}) => {
  const [draft, setDraft] = useState(initialDraft);
  const [hasOpenedWa, setHasOpenedWa] = useState(false);
  const [nextFollowUpDays, setNextFollowUpDays] = useState<number | undefined>(2);

  useEffect(() => {
    setDraft(initialDraft);
    setHasOpenedWa(false);
    setNextFollowUpDays(2);
  }, [initialDraft, isOpen]);

  if (!isOpen) return null;

  const handleOpenWa = () => {
    const cleanDigits = phoneE164.replace(/\+/g, '').replace(/[\s\-]/g, '');
    const currentWaUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(draft)}`;
    window.open(currentWaUrl, '_blank');
    setHasOpenedWa(true);
  };

  const handleConfirm = async () => {
    await onConfirmSent(nextFollowUpDays);
    onClose();
  };

  return (
    <>
      <div className="sheet-overlay active" onClick={onClose} />
      <div className="bottom-sheet active">
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              Kirim Pesan WhatsApp
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
              Ke: <strong style={{ color: 'var(--color-text-primary)' }}>{contactName}</strong> ({phoneE164})
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="touch-target"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-hover)',
              border: '1px solid var(--color-divider)',
              fontSize: '13px',
              color: 'var(--color-text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {!hasOpenedWa ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Draf Pesan Tindak Lanjut
              </label>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-strong)',
                  fontSize: '14px',
                  lineHeight: 1.55,
                  color: 'var(--color-text-primary)',
                  resize: 'vertical',
                  backgroundColor: 'var(--color-canvas)',
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={handleOpenWa}
              className="touch-target-primary"
              style={{
                width: '100%',
                backgroundColor: '#25D366',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                fontWeight: 780,
                fontSize: '14.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <WhatsAppIcon size={20} color="#FFFFFF" />
              <span>Buka di WhatsApp</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '4px' }}>
            <div style={{ fontSize: '15.5px', fontWeight: 780, color: 'var(--color-text-primary)', textAlign: 'center' }}>
              Pesan sudah dikirim di WhatsApp?
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 750, color: 'var(--color-text-secondary)', marginBottom: '8px', textAlign: 'center' }}>
                Jadwalkan Follow-up Berikutnya
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: '2 Hari', value: 2 },
                  { label: '5 Hari', value: 5 },
                  { label: '1 Minggu', value: 7 },
                  { label: 'Selesai', value: undefined },
                ].map((opt) => {
                  const isSelected = nextFollowUpDays === opt.value;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setNextFollowUpDays(opt.value)}
                      className="touch-target"
                      style={{
                        padding: '8px 4px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--color-divider)',
                        backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        fontWeight: isSelected ? 780 : 600,
                        fontSize: '12.5px',
                        transition: 'all var(--duration-fast) ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '6px' }}>
              <button
                onClick={() => setHasOpenedWa(false)}
                className="touch-target-primary"
                style={{
                  flex: 1,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-strong)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Belum
              </button>

              <button
                onClick={handleConfirm}
                className="touch-target-primary"
                style={{
                  flex: 2,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  fontWeight: 780,
                  fontSize: '14px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                ✓ Ya, Sudah Dikirim
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
