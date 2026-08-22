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

      // In mock mode, create initial lead action and activity in local store
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
      <div style={{ backgroundColor: 'var(--color-canvas)', minHeight: '100vh', padding: '0 0 24px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => router.back()}
            aria-label="Kembali"
            className="touch-target"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface-hover)',
              border: '1px solid var(--color-divider)',
            }}
          >
            <ChevronLeftIcon size={18} />
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Tambah Prospek Baru
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              role="alert"
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-danger-soft)',
                border: '1px solid var(--color-danger-border)',
                color: 'var(--color-danger)',
                fontSize: '13.5px',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {existingContact && (
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--color-primary)' }}>
                Kontak Sudah Terdaftar
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                Nomor WhatsApp ini sudah terdaftar sebagai <strong>{existingContact.name}</strong> ({formatPhoneDisplay(existingContact.phoneE164)}).
              </div>
              <button
                type="button"
                onClick={() => router.push(`/app/contacts/${existingContact.id}`)}
                className="touch-target"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontWeight: 780,
                  fontSize: '13.5px',
                  alignSelf: 'flex-start',
                  padding: '8px 18px',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                Buka Kontak Existing →
              </button>
            </div>
          )}

          {/* Form Card */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Ayu Rahma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-strong)',
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  backgroundColor: 'var(--color-canvas)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Nomor WhatsApp / HP *
              </label>
              <input
                type="tel"
                required
                placeholder="0812 3456 7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-strong)',
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  backgroundColor: 'var(--color-canvas)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Sumber Lead / Channel
              </label>
              <select
                value={sourceChannel}
                onChange={(e) => setSourceChannel(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-strong)',
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-canvas)',
                  outline: 'none',
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

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Catatan Kebutuhan Prospek
              </label>
              <textarea
                placeholder="Contoh: Anak kelas 9, bingung pilih jurusan SMA. Tanya jadwal sesi akhir pekan."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-strong)',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: 'var(--color-text-primary)',
                  resize: 'vertical',
                  backgroundColor: 'var(--color-canvas)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="touch-target-primary"
            style={{
              width: '100%',
              backgroundColor: isSubmitting ? 'var(--color-border-strong)' : 'var(--color-primary)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontWeight: 780,
              fontSize: '14.5px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-sm)',
              marginTop: '6px',
            }}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Prospek →'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
