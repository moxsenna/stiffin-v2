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
      <PageHeader kicker="Kontak" title="Tambah Prospek Baru" onBack={() => router.back()} />

      <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#dc2626',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {existingContact && (
          <div
            className="hv-card"
            style={{
              padding: '16px',
              background: 'rgba(245, 158, 11, 0.06)',
              borderColor: 'rgba(245, 158, 11, 0.3)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#d97706' }}>
              Kontak sudah ada
            </div>
            <div style={{ marginTop: 8, font: '400 13px/1.5 var(--font-sans)', color: 'var(--ink)' }}>
              Nomor WhatsApp ini sudah terdaftar sebagai <strong>{existingContact.name}</strong> ({formatPhoneDisplay(existingContact.phoneE164)}).
            </div>
            <button
              type="button"
              onClick={() => router.push(`/app/contacts/${existingContact.id}`)}
              className="hv-btn-primary"
              style={{ marginTop: 12, padding: '8px 16px', fontSize: '13px' }}
            >
              Buka Kontak Existing →
            </button>
          </div>
        )}

        <div className="hv-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="field-label" htmlFor="contact-name" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--muted-strong)' }}>
              Nama lengkap *
            </label>
            <input
              id="contact-name"
              type="text"
              className="hv-input"
              placeholder="Contoh: Rian Pratama"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="contact-phone" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--muted-strong)' }}>
              Nomor WhatsApp / HP *
            </label>
            <input
              id="contact-phone"
              type="tel"
              className="hv-input"
              placeholder="08121110001 atau +62812..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="contact-source" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--muted-strong)' }}>
              Sumber / channel
            </label>
            <select
              id="contact-source"
              className="hv-select"
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value)}
            >
              <option value="Instagram">Instagram</option>
              <option value="Google">Google Search</option>
              <option value="TikTok">TikTok</option>
              <option value="Referral">Referral / Rekomendasi</option>
              <option value="WhatsApp Direct">WhatsApp Direct</option>
              <option value="Event Offline">Event / Workshop Offline</option>
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="contact-notes" style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--muted-strong)' }}>
              Catatan kebutuhan prospek
            </label>
            <textarea
              id="contact-notes"
              className="hv-textarea"
              rows={3}
              placeholder="Contoh: anak kelas 9, bingung pilih jurusan SMA, prefer jadwal sesi weekend."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="hv-btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '15px' }}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Prospek'}
        </button>
      </form>
    </AppShell>
  );
}
