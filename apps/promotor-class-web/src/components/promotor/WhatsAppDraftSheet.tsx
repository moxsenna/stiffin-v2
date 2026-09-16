'use client';

import React, { useState } from 'react';
import { Contact } from '@promotor/contracts';
import { BottomSheet } from '@/components/ui';

interface WhatsAppDraftSheetProps {
  contact: Contact | null;
  initialMessage?: string;
  onClose: () => void;
}

export function WhatsAppDraftSheet({ contact, initialMessage = '', onClose }: WhatsAppDraftSheetProps) {
  const [message, setMessage] = useState(
    initialMessage || (contact ? `Halo ${contact.name}, semoga kabarnya baik.` : '')
  );

  if (!contact) return null;

  const cleanPhone = (contact.phoneE164 || '').replace(/\D/g, '');
  const isValidPhone = cleanPhone.length >= 8;
  const waUrl = isValidPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : '#';

  return (
    <BottomSheet open={!!contact} onClose={onClose} labelledBy="wa-draft-title">
      <div id="wa-draft-title" className="pwa-kicker">
        Kirim WhatsApp · Draf pesan
      </div>
      <div style={{ marginTop: 10, fontSize: 14, fontWeight: 800 }}>Penerima: {contact.name}</div>
      <div className="pwa-muted">{contact.phoneE164}</div>

      <label className="pwa-label" htmlFor="wa-draft-message" style={{ marginTop: 14 }}>
        Draf pesan
      </label>
      <textarea
        id="wa-draft-message"
        aria-label="Draf pesan WhatsApp"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        className="pwa-input"
      />

      {!isValidPhone && (
        <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: 700 }}>
          Nomor WhatsApp peserta tidak valid atau belum lengkap.
        </p>
      )}

      <p className="pwa-muted" style={{ marginTop: 10 }}>
        Pesan dibuka di WhatsApp. Anda yang menekan kirim.
      </p>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {isValidPhone ? (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="pwa-cta" style={{ flex: 1 }}>
            Buka di WhatsApp
          </a>
        ) : (
          <button type="button" disabled className="pwa-cta" style={{ flex: 1 }}>
            Nomor Tidak Valid
          </button>
        )}
        <button type="button" onClick={onClose} className="pwa-btn-secondary">
          Batal
        </button>
      </div>
    </BottomSheet>
  );
}
