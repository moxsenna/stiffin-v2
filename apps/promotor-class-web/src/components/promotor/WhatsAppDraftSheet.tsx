'use client';

import React, { useState } from 'react';
import { Contact } from '@promotor/contracts';

interface WhatsAppDraftSheetProps {
  contact: Contact | null;
  initialMessage: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppDraftSheet({
  contact,
  initialMessage,
  isOpen,
  onClose,
}: WhatsAppDraftSheetProps) {
  const [message, setMessage] = useState(initialMessage);

  if (!isOpen || !contact) return null;

  const encodedMessage = encodeURIComponent(message);
  const cleanPhone = contact.phone.replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

  return (
    <>
      <div className={`sheet-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <div className={`bottom-sheet ${isOpen ? 'active' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Draf Pesan WhatsApp</h3>
          <button onClick={onClose} style={{ padding: '4px 8px', fontSize: '14px' }}>✕</button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
          Penerima: <strong>{contact.name}</strong> ({contact.phone})
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--color-divider)',
            fontSize: '13px',
            resize: 'vertical',
            marginBottom: '16px',
          }}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            className="touch-target-primary"
            style={{
              flex: 1,
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-md)',
              fontWeight: 600,
            }}
          >
            Batal
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="touch-target-primary"
            style={{
              flex: 2,
              backgroundColor: '#25D366', // WhatsApp green
              color: '#FFF',
              borderRadius: 'var(--border-radius-md)',
              fontWeight: 700,
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Buka di WhatsApp
          </a>
        </div>
      </div>
    </>
  );
}
