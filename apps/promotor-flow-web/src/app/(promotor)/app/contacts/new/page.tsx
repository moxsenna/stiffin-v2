'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui';
import { contactCommands, nextActionCommands, activityCommands, clock } from '@/lib/container';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { formatPhoneDisplay } from '@promotor/platform-core';

export default function AddContactPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sourceChannel, setSourceChannel] = useState('Instagram');
  const [notes, setNotes] = useState('');
  const [existingContact, setExistingContact] = useState<FlowContact | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setError('');
    setExistingContact(null);

    if (!name.trim()) {
      setError('Nama kontak wajib diisi.');
      return;
    }

    if (!phone.trim()) {
      setError('Nomor WhatsApp / HP wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await contactCommands.createContact({
        name,
        rawPhone: phone,
        sourceChannel,
        notes,
      });

      if (result.isExisting) {
        setExistingContact(result.contact);
        setIsSubmitting(false);
        return;
      }

      if (process.env.NEXT_PUBLIC_API_MODE !== 'http') {
        const newContact = result.contact;
        await nextActionCommands.scheduleNextAction({
          contactId: newContact.id,
          actionType: 'CONTACT_LEAD',
          title: 'Hubungi prospek baru',
          subtitle: `${newContact.name} · ${sourceChannel}`,
          dueAt: clock.nowIso(),
          source: 'PROMOTORFLOW',
        });

        await activityCommands.appendActivity({
          contactId: newContact.id,
          title: 'Prospek baru ditambahkan',
          detail: `Channel: ${sourceChannel}`,
          timestamp: clock.nowIso(),
          type: 'CONTACT_CREATED',
        });
      }

      router.push(`/app/contacts/${result.contact.id}`);
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan kontak.');
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell showBottomNav={false}>
     <PageHeader kicker="Kontak" title="Tambah Prospek Baru" onBack={() =>router.back()} />

     <form onSubmit={handleSubmit} style={{ padding: '18px', display: 'flex', flexDirection: 'column' }}>
       {error && (
          <div className="field-error" role="alert" style={{ marginBottom: 14 }}>
           {error}
          </div>
       )}

        {existingContact && (
          <div className="section-block" style={{ padding: 14 }}>
           <div className="kicker kicker-accent">Kontak sudah ada</div>
           <div style={{ marginTop: 8, font: '400 13px/1.5 var(--font-sans)' }}>
             Nomor WhatsApp ini sudah terdaftar sebagai <strong>{existingContact.name}</strong>({formatPhoneDisplay(existingContact.phoneE164)}).
            </div>
           <button
              type="button"
              onClick={() =>router.push(`/app/contacts/${existingContact.id}`)}
              className="btn btn-primary btn-sm"
              style={{ marginTop: 12 }}
            >
             Buka Kontak Existing
            </button>
         </div>
       )}

        <div className="form-section">
         <label className="field-label" htmlFor="contact-name">Nama lengkap *</label>
         <input
            id="contact-name"
            type="text"
            className="input"
            placeholder="Nama lengkap prospek"
            value={name}
            onChange={(e) =>setName(e.target.value)}
          />

         <label className="field-label" htmlFor="contact-phone" style={{ marginTop: 16 }}>Nomor WhatsApp / HP *</label>
         <input
            id="contact-phone"
            type="text"
            className="input"
            placeholder="08121110001 atau +62812..."
            value={phone}
            onChange={(e) =>setPhone(e.target.value)}
          />
       </div>

       <div className="form-section">
         <label className="field-label" htmlFor="contact-source">Sumber / channel</label>
         <select
            id="contact-source"
            className="select"
            value={sourceChannel}
            onChange={(e) =>setSourceChannel(e.target.value)}
          >
           <option value="Instagram">Instagram</option>
           <option value="Google">Google Search</option>
           <option value="TikTok">TikTok</option>
           <option value="Referral">Referral / Rekomendasi</option>
           <option value="WhatsApp Direct">WhatsApp Direct</option>
           <option value="Event Offline">Event / Workshop Offline</option>
         </select>

         <label className="field-label" htmlFor="contact-notes" style={{ marginTop: 16 }}>Catatan kebutuhan prospek</label>
         <textarea
            id="contact-notes"
            className="textarea"
            rows={3}
            placeholder="Contoh: anak kelas 9, bingung pilih SMA, tanya jadwal weekend."
            value={notes}
            onChange={(e) =>setNotes(e.target.value)}
          />
       </div>

       <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-block" style={{ marginTop: 20 }}>
         {isSubmitting ? 'Menyimpan...' : 'Simpan Prospek'}
        </button>
     </form>
   </AppShell>
 );
}
