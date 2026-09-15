'use client';

import React, { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { formatTimeAgo } from '@promotor/platform-core';

export default function AdminHelpdeskPage() {
  const { client, adminKey } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Profile correction modal
  const [editingContact, setEditingContact] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Manual enrollment modal
  const [enrollingContact, setEnrollingContact] = useState<any>(null);
  const [programId, setProgramId] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setActionError('');
    setActionSuccess('');
    setHasSearched(true);
    try {
      const res = await client.adminSearchContacts(searchQuery.trim(), adminKey);
      setContacts(res.contacts || []);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal mencari data peserta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editingContact) return;
    setIsUpdatingProfile(true);
    setActionError('');
    setActionSuccess('');
    try {
      await client.adminUpdateContact(
        editingContact.id,
        {
          name: editName.trim() || undefined,
          email: editEmail.trim() || undefined,
          phoneRaw: editPhone.trim() || undefined,
        },
        adminKey
      );
      setActionSuccess(`Data kontak peserta ${editingContact.name} berhasil diperbarui.`);
      setEditingContact(null);
      // Re-run search
      const res = await client.adminSearchContacts(searchQuery.trim(), adminKey);
      setContacts(res.contacts || []);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memperbarui profil peserta.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleGrantEnrollment = async () => {
    if (!enrollingContact || !programId.trim()) {
      setActionError('Wajib memasukkan ID Program yang valid.');
      return;
    }
    setIsEnrolling(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await client.adminEnrollContact(enrollingContact.id, programId.trim(), adminKey);
      setActionSuccess(`Akses program berhasil diberikan kepada ${enrollingContact.name} (Enrollment ID: ${res.enrollmentId.slice(0, 8)}).`);
      setEnrollingContact(null);
      setProgramId('');
      // Re-run search
      const updated = await client.adminSearchContacts(searchQuery.trim(), adminKey);
      setContacts(updated.contacts || []);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memberikan akses program manual.');
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            Helpdesk Peserta Global
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            Pencarian kontak lintas ruang seluruh tenant, koreksi data salah ketik (email/HP), dan akses program manual
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34D399', fontSize: '13px', marginBottom: '20px' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {actionError && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', fontSize: '13px', marginBottom: '20px' }}>
          ✕ {actionError}
        </div>
      )}

      {/* Global Search Bar */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor WhatsApp (08... / 62...), alamat email, atau nama peserta..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#090D16',
              border: '1px solid #334155',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Mencari...' : 'Cari Peserta 🔍'}
          </button>
        </form>
      </div>

      {/* Results Table */}
      {hasSearched && (
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginBottom: '16px' }}>
            Hasil Pencarian Kontak ({contacts.length})
          </div>

          {isLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              Memindai basis data kontak seluruh tenant...
            </div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              Tidak ditemukan data peserta dengan kata kunci tersebut.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '10px 12px' }}>Nama Peserta</th>
                    <th style={{ padding: '10px 12px' }}>Email & WhatsApp</th>
                    <th style={{ padding: '10px 12px' }}>Organisasi Promotor</th>
                    <th style={{ padding: '10px 12px' }}>Program Terdaftar</th>
                    <th style={{ padding: '10px 12px' }}>Terdaftar</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Aksi Helpdesk</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #1E293B', color: '#E2E8F0' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>ID: {c.id.slice(0, 8)}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ color: '#93C5FD' }}>{c.email || '—'}</div>
                        <div style={{ fontSize: '12px', color: '#34D399', fontWeight: 600 }}>{c.phoneE164 || '—'}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{c.organizationName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>slug: {c.organizationSlug}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {(!c.enrollments || c.enrollments.length === 0) ? (
                          <span style={{ color: '#64748B', fontSize: '12px' }}>Belum ada program</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {c.enrollments.map((enr: any) => (
                              <span
                                key={enr.id}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                                  color: '#38BDF8',
                                  border: '1px solid rgba(56, 189, 248, 0.2)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                {enr.programTitle}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '12px', color: '#64748B' }}>
                        {formatTimeAgo(c.createdAt)}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContact(c);
                              setEditName(c.name || '');
                              setEditEmail(c.email || '');
                              setEditPhone(c.phoneE164 || '');
                            }}
                            title="Koreksi nama, email, atau nomor HP peserta yang salah ketik"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#1E293B',
                              color: '#CBD5E1',
                              border: '1px solid #334155',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ Koreksi
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEnrollingContact(c);
                              setProgramId('');
                            }}
                            title="Beri akses program secara manual (transfer offline / resolusi CS)"
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#2563EB',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            + Akses Kelas
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Koreksi Data Peserta */}
      {editingContact && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', color: '#FFFFFF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 12px 0' }}>Koreksi Data Peserta</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Perbarui nama, alamat email, atau nomor WhatsApp yang keliru saat proses checkout tanpa perlu modifikasi database mentah.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Nama Lengkap
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#090D16',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Email Peserta
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#090D16',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Nomor WhatsApp (E.164 atau format lokal)
              </label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#090D16',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                disabled={isUpdatingProfile}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  color: '#CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isUpdatingProfile}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isUpdatingProfile ? 'not-allowed' : 'pointer',
                }}
              >
                {isUpdatingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Beri Akses Program Manual */}
      {enrollingContact && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', color: '#FFFFFF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 12px 0' }}>Beri Akses Program Manual</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Terbitkan hak akses (Enrollment) materi kelas secara manual untuk <strong>{enrollingContact.name}</strong> di organisasi <strong>{enrollingContact.organizationName}</strong>.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Program ID (UUID Program)
              </label>
              <input
                type="text"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                placeholder="Masukkan Program UUID..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#090D16',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEnrollingContact(null)}
                disabled={isEnrolling}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  color: '#CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleGrantEnrollment}
                disabled={isEnrolling}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#10B981',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isEnrolling ? 'not-allowed' : 'pointer',
                }}
              >
                {isEnrolling ? 'Menerbitkan...' : 'Terbitkan Akses Instan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
