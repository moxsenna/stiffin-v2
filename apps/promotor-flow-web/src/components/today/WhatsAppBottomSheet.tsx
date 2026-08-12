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
    // Recalculate WA URL with current draft text
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '20px 20px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ font: '600 16px/22px Inter, sans-serif', color: '#191918' }}>Kirim WhatsApp</div>
            <div style={{ font: '400 13px/18px Inter, sans-serif', color: '#71706B' }}>
              Ke: {contactName} ({phoneE164})
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: '#9C9A94',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {!hasOpenedWa ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ font: '600 12px/16px Inter, sans-serif', color: '#71706B' }}>DRAFT PESAN</label>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #D5D3CE',
                  font: '400 14px/20px Inter, sans-serif',
                  color: '#191918',
                  resize: 'vertical',
                  backgroundColor: '#F7F7F5',
                }}
              />
            </div>

            <button
              onClick={handleOpenWa}
              style={{
                width: '100%',
                height: '46px',
                backgroundColor: '#167A68',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                font: '600 15px Inter, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <WhatsAppIcon size={20} color="#FFF" />
              <span>Buka WhatsApp</span>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
            <div style={{ font: '600 16px/22px Inter, sans-serif', color: '#191918', textAlign: 'center' }}>
              Pesan sudah dikirim di WhatsApp?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ font: '600 12px/16px Inter, sans-serif', color: '#71706B' }}>
                JADWALKAN FOLLOW-UP BERIKUTNYA
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { label: '2 Hari', value: 2 },
                  { label: '5 Hari', value: 5 },
                  { label: '1 Minggu', value: 7 },
                  { label: 'Tidak', value: undefined },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setNextFollowUpDays(opt.value)}
                    style={{
                      flex: 1,
                      height: '36px',
                      borderRadius: '6px',
                      border: nextFollowUpDays === opt.value ? '2px solid #167A68' : '1px solid #E8E7E3',
                      backgroundColor: nextFollowUpDays === opt.value ? '#EAF5F2' : '#FFFFFF',
                      color: nextFollowUpDays === opt.value ? '#167A68' : '#191918',
                      font: '500 13px Inter, sans-serif',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
              <button
                onClick={() => setHasOpenedWa(false)}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #D5D3CE',
                  backgroundColor: '#FFFFFF',
                  color: '#71706B',
                  font: '500 14px Inter, sans-serif',
                }}
              >
                Belum
              </button>

              <button
                onClick={handleConfirm}
                style={{
                  flex: 2,
                  height: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#167A68',
                  color: '#FFFFFF',
                  font: '600 14px Inter, sans-serif',
                }}
              >
                Ya, Sudah Dikirim
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
