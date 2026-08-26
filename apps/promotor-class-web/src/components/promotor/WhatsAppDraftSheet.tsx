'use client';

import React, { useState } from 'react';
import { Contact } from '@promotor/contracts';
import { BottomSheet } from '@/components/ui';

interface WhatsAppDraftSheetProps {
  contact: Contact | null;
  initialMessage?: string;
  onClose: () =>void;
}

export function WhatsAppDraftSheet({
  contact,
  initialMessage = '',
  onClose,
}: WhatsAppDraftSheetProps) {
  const [message, setMessage] = useState(
    initialMessage || (contact ? `Halo ${contact.name}, salam dari STIFIn Parenting.` : '')
  );

  if (!contact) return null;

  const cleanPhone = contact.phoneE164.replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return (
    <BottomSheet open={!!contact} onClose={onClose} labelledBy="wa-draft-title">
     <div id="wa-draft-title" className="kicker kicker-muted">Kirim WhatsApp · Draf pesan</div>
     <div style={{ marginTop: 10, font: '600 14px/1.3 var(--font-sans)' }}>
       Penerima: {contact.name}
      </div>
     <div className="row-meta">{contact.phoneE164}</div>

     <textarea
        aria-label="Draf pesan WhatsApp"
        value={message}
        onChange={(e) =>setMessage(e.target.value)}
        rows={5}
        className="textarea"
        style={{ marginTop: 12 }}
      />

     <p className="sheet-explain">Pesan dibuka di WhatsApp. Anda yang menekan kirim.</p>

     <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
       <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
         Buka di WhatsApp
        </a>
       <button type="button" onClick={onClose} className="btn btn-ghost">
         Batal
        </button>
     </div>
   </BottomSheet>
 );
}
