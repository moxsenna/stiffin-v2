'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ChevronLeftIcon } from '@/components/foundation/icons';
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

  const handleSubmit = async (e: React.FormEvent) => {
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
        organizationId: 'org_rina_stifin',
        name,
        rawPhone: phone,
        sourceChannel,
        notes,
      });

      if (result.isExisting) {
        // Surface existing canonical contact
        setExistingContact(result.contact);
        setIsSubmitting(false);
        return;
      }

      // Initial lead action created automatically
      const newContact = result.contact;
      await nextActionCommands.scheduleNextAction({
        organizationId: 'org_rina_stifin',
        contactId: newContact.id,
        actionType: 'CONTACT_LEAD',
        title: 'Hubungi prospek baru',
        subtitle: `${newContact.name} · ${sourceChannel}`,
        dueAt: clock.nowIso(),
        source: 'PROMOTORFLOW',
      });

      await activityCommands.appendActivity({
        organizationId: 'org_rina_stifin',
        contactId: newContact.id,
        title: 'Prospek baru ditambahkan',
        detail: `Channel: ${sourceChannel}`,
        timestamp: clock.nowIso(),
        type: 'CONTACT_CREATED',
      });

      router.push(`/app/contacts/${newContact.id}`);
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan kontak.');
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell showBottomNav={false}>
      <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', padding: '0 0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderBottom: '1px solid #E8E7E3' }}>
          <button
            onClick={() => router.back()}
            style={{
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              color: '#191918',
            }}
          >
            <ChevronLeftIcon size={20} />
          </button>
          <span style={{ font: '600 17px Inter, sans-serif', color: '#191918' }}>Tambah Prospek Baru</span>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: '#FEF3F2', color: '#B42318', font: '400 13.5px Inter, sans-serif' }}>
              {error}
            </div>
          )}

          {existingContact && (
            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#EAF5F2', border: '1px solid #167A68', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ font: '600 14px Inter, sans-serif', color: '#167A68' }}>Kontak Sudah Ada</div>
              <div style={{ font: '400 13.5px Inter, sans-serif', color: '#191918' }}>
                Nomor WhatsApp ini sudah terdaftar sebagai <strong>{existingContact.name}</strong> ({formatPhoneDisplay(existingContact.phoneE164)}).
              </div>
              <button
                type="button"
                onClick={() => router.push(`/app/contacts/${existingContact.id}`)}
                style={{
                  height: '38px',
                  backgroundColor: '#167A68',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  font: '600 13.5px Inter, sans-serif',
                  alignSelf: 'flex-start',
                  padding: '0 16px',
                }}
              >
                Buka Kontak Existing
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ font: '600 12.5px Inter, sans-serif', color: '#71706B' }}>NAMA LENGKAP *</label>
            <input
              type="text"
              placeholder="Contoh: Ayu Rahma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                height: '42px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #D5D3CE',
                font: '400 14px Inter, sans-serif',
                color: '#191918',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ font: '600 12.5px Inter, sans-serif', color: '#71706B' }}>NOMOR WHATSAPP / HP *</label>
            <input
              type="text"
              placeholder="Contoh: 08121110001 atau +62812..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                height: '42px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #D5D3CE',
                font: '400 14px Inter, sans-serif',
                color: '#191918',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ font: '600 12.5px Inter, sans-serif', color: '#71706B' }}>SUMBER / CHANNEL</label>
            <select
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value)}
              style={{
                height: '42px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #D5D3CE',
                font: '400 14px Inter, sans-serif',
                color: '#191918',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="Instagram">Instagram</option>
              <option value="Google">Google Search</option>
              <option value="TikTok">TikTok</option>
              <option value="Referral">Referral / Rekomendasi</option>
              <option value="WhatsApp Direct">WhatsApp Direct</option>
              <option value="Event Offline">Event / Workshop Offline</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ font: '600 12.5px Inter, sans-serif', color: '#71706B' }}>CATATAN KEBUTUHAN PROSPEK</label>
            <textarea
              placeholder="Contoh: Anak kelas 9, bingung pilih SMA. Tanya jadwal weekend."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #D5D3CE',
                font: '400 14px Inter, sans-serif',
                color: '#191918',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              height: '46px',
              backgroundColor: '#167A68',
              color: '#FFFFFF',
              borderRadius: '8px',
              border: 'none',
              font: '600 15px Inter, sans-serif',
              marginTop: '12px',
            }}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Prospek'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
