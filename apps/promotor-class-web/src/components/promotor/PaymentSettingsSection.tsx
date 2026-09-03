'use client';

import React, { useState, useEffect } from 'react';
import { getPaymentRepository } from '@/adapters';
import { OrganizationBankAccount, OrganizationPaymentSettings } from '@promotor/contracts';

const BANK_PRESETS = [
  'BCA (Bank Central Asia)',
  'Bank Mandiri',
  'BNI (Bank Negara Indonesia)',
  'BRI (Bank Rakyat Indonesia)',
  'BSI (Bank Syariah Indonesia)',
  'CIMB Niaga',
  'Bank Permata',
  'Bank Danamon',
  'Bank Jago',
  'SeaBank',
  'Lainnya',
];

export function PaymentSettingsSection() {
  const [settings, setSettings] = useState<OrganizationPaymentSettings | null>(null);
  const [salesWhatsApp, setSalesWhatsApp] = useState('');
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [whatsAppFeedback, setWhatsAppFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [bankAccounts, setBankAccounts] = useState<OrganizationBankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add/Edit Bank modal/form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bankName, setBankName] = useState('BCA (Bank Central Asia)');
  const [customBankName, setCustomBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankFeedback, setBankFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const repo = getPaymentRepository();
      const res = await repo.getPaymentSettings();
      setSettings(res.settings);
      setSalesWhatsApp(res.settings.salesWhatsAppNumber || '');

      // In HTTP mode or mock, fetch public or bank accounts
      const publicInfo = await repo.getPublicPaymentInfo('current');
      if (publicInfo && publicInfo.bankAccounts) {
        setBankAccounts(
          publicInfo.bankAccounts.map((b, idx) => ({
            id: b.id,
            organizationId: res.settings.organizationId,
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            accountHolderName: b.accountHolderName,
            isActive: true,
            sortOrder: idx + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        );
      }
    } catch (err: any) {
      console.error('Failed to load payment settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsApp(true);
    setWhatsAppFeedback(null);
    try {
      const repo = getPaymentRepository();
      const res = await repo.updatePaymentSettings({
        salesWhatsAppNumber: salesWhatsApp.trim() || null,
      });
      setSettings(res.settings);
      setSalesWhatsApp(res.settings.salesWhatsAppNumber || '');
      setWhatsAppFeedback({ type: 'success', message: 'Nomor WhatsApp penjualan berhasil disimpan.' });
      setTimeout(() => setWhatsAppFeedback(null), 4000);
    } catch (err: any) {
      setWhatsAppFeedback({ type: 'error', message: err?.message || 'Gagal menyimpan nomor WhatsApp penjualan.' });
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  const handleOpenAddForm = () => {
    setEditingId(null);
    setBankName('BCA (Bank Central Asia)');
    setCustomBankName('');
    setAccountNumber('');
    setAccountHolderName('');
    setIsActive(true);
    setBankFeedback(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (b: OrganizationBankAccount) => {
    setEditingId(b.id);
    if (BANK_PRESETS.includes(b.bankName)) {
      setBankName(b.bankName);
      setCustomBankName('');
    } else {
      setBankName('Lainnya');
      setCustomBankName(b.bankName);
    }
    setAccountNumber(b.accountNumber);
    setAccountHolderName(b.accountHolderName);
    setIsActive(b.isActive);
    setBankFeedback(null);
    setIsFormOpen(true);
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBankName = bankName === 'Lainnya' ? customBankName.trim() : bankName;
    if (!effectiveBankName) {
      setBankFeedback({ type: 'error', message: 'Nama bank wajib diisi.' });
      return;
    }
    if (!accountNumber.trim()) {
      setBankFeedback({ type: 'error', message: 'Nomor rekening wajib diisi.' });
      return;
    }
    if (!accountHolderName.trim()) {
      setBankFeedback({ type: 'error', message: 'Nama pemilik rekening wajib diisi.' });
      return;
    }

    setIsSavingBank(true);
    setBankFeedback(null);
    try {
      const repo = getPaymentRepository();
      if (editingId) {
        await repo.updateBankAccount(editingId, {
          bankName: effectiveBankName,
          accountNumber: accountNumber.trim(),
          accountHolderName: accountHolderName.trim(),
          isActive,
        });
      } else {
        await repo.createBankAccount({
          bankName: effectiveBankName,
          accountNumber: accountNumber.trim(),
          accountHolderName: accountHolderName.trim(),
          isActive,
        });
      }
      setIsFormOpen(false);
      await loadData();
    } catch (err: any) {
      setBankFeedback({ type: 'error', message: err?.message || 'Gagal menyimpan rekening bank.' });
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleDeleteBankAccount = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus rekening ${name}?`)) return;
    try {
      const repo = getPaymentRepository();
      await repo.deleteBankAccount(id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus rekening bank.');
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: '0px',
        border: '1px solid var(--color-divider)',
        padding: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>
            Metode Pembayaran &amp; Rekening Bank
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
            Konfigurasikan nomor WhatsApp penjualan dan nomor rekening bank untuk menerima pembayaran kelas berbayar.
          </p>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 750,
            padding: '3px 8px',
            backgroundColor: 'var(--color-surface-hover)',
            border: '1px solid var(--color-divider)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Commerce Manual
        </span>
      </div>

      {isLoading ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', padding: '16px 0' }}>
          Memuat konfigurasi pembayaran...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SUB-SECTION 1: WhatsApp Penjualan */}
          <div style={{ padding: '18px', backgroundColor: 'var(--color-bg-subtle, #f8fafc)', border: '1px solid var(--color-divider)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 780, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📱</span> Nomor WhatsApp Penjualan &amp; Konfirmasi
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: '14px', lineHeight: 1.45 }}>
              Nomor WhatsApp tujuan yang akan menerima pesan calon pembeli saat memilih metode <strong>Beli via WhatsApp</strong> atau mengirim <strong>Konfirmasi Transfer Bank</strong>.
            </p>

            <form onSubmit={handleSaveWhatsApp} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap', maxWidth: '500px' }}>
              <div style={{ flex: '1 1 240px' }}>
                <input
                  type="tel"
                  value={salesWhatsApp}
                  onChange={(e) => setSalesWhatsApp(e.target.value)}
                  placeholder="Contoh: 081298765432 atau +6281298765432"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    backgroundColor: 'var(--color-surface)',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isSavingWhatsApp}
                className="touch-target-primary"
                style={{
                  padding: '0 16px',
                  height: '38px',
                  backgroundColor: 'var(--accent-dark)',
                  color: '#FFFFFF',
                  borderRadius: '0px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 750,
                  cursor: isSavingWhatsApp ? 'wait' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSavingWhatsApp ? 'Menyimpan...' : 'Simpan Nomor WA'}
              </button>
            </form>

            {whatsAppFeedback && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  fontSize: '12.5px',
                  fontWeight: 650,
                  backgroundColor: whatsAppFeedback.type === 'success' ? '#eef8f2' : 'rgba(225, 29, 72, 0.08)',
                  border: `1px solid ${whatsAppFeedback.type === 'success' ? '#b8d4c5' : 'var(--color-status-danger, #e11d48)'}`,
                  color: whatsAppFeedback.type === 'success' ? '#166534' : 'var(--color-status-danger, #e11d48)',
                }}
              >
                {whatsAppFeedback.type === 'success' ? '✓ ' : '✕ '}
                {whatsAppFeedback.message}
              </div>
            )}
          </div>

          {/* SUB-SECTION 2: Rekening Bank Pengajar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 780, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏦</span> Rekening Bank Penerima Transfer
              </h3>
              {!isFormOpen && (
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    fontSize: '12.5px',
                    fontWeight: 750,
                    cursor: 'pointer',
                  }}
                >
                  + Tambah Rekening
                </button>
              )}
            </div>

            {/* List of Bank Accounts */}
            {bankAccounts.length === 0 && !isFormOpen ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                  border: '1px dashed var(--color-divider)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                  Belum ada rekening bank yang ditambahkan
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                  Tambahkan minimal 1 rekening bank aktif agar learner dapat memilih jalur pembayaran transfer bank.
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--accent-dark)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 750,
                    cursor: 'pointer',
                  }}
                >
                  + Tambah Rekening Bank Sekarang
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bankAccounts.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-divider)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                          {b.bankName}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 750,
                            padding: '2px 6px',
                            backgroundColor: b.isActive ? '#eef8f2' : '#f1f5f9',
                            color: b.isActive ? '#166534' : '#64748b',
                            border: `1px solid ${b.isActive ? '#b8d4c5' : '#cbd5e1'}`,
                          }}
                        >
                          {b.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                        {b.accountNumber}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        a.n. {b.accountHolderName}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(b)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-divider)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBankAccount(b.id, `${b.bankName} - ${b.accountNumber}`)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'rgba(225, 29, 72, 0.06)',
                          border: '1px solid rgba(225, 29, 72, 0.2)',
                          color: 'var(--color-status-danger, #e11d48)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* In-place Add/Edit Form Modal */}
            {isFormOpen && (
              <form
                onSubmit={handleSaveBankAccount}
                style={{
                  marginTop: '16px',
                  padding: '20px',
                  backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                  border: '1px solid var(--accent-dark)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-dark)' }}>
                  {editingId ? 'Edit Rekening Bank' : 'Tambah Rekening Bank Baru'}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 750, marginBottom: '6px' }}>
                    Nama Bank / Dompet:
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '0px',
                      border: '1px solid var(--color-divider)',
                      fontSize: '13px',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  >
                    {BANK_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {bankName === 'Lainnya' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 750, marginBottom: '6px' }}>
                      Ketik Nama Bank:
                    </label>
                    <input
                      type="text"
                      value={customBankName}
                      onChange={(e) => setCustomBankName(e.target.value)}
                      placeholder="Contoh: Bank Mega, GoPay, OVO"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '0px',
                        border: '1px solid var(--color-divider)',
                        fontSize: '13px',
                        backgroundColor: 'var(--color-surface)',
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 750, marginBottom: '6px' }}>
                    Nomor Rekening:
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Contoh: 1234567890"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '0px',
                      border: '1px solid var(--color-divider)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 750, marginBottom: '6px' }}>
                    Nama Pemilik Rekening (Atas Nama):
                  </label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Contoh: Rina Prameswari"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '0px',
                      border: '1px solid var(--color-divider)',
                      fontSize: '13px',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isActiveCheck" style={{ fontSize: '13px', fontWeight: 650, cursor: 'pointer' }}>
                    Tampilkan rekening ini sebagai opsi pembayaran aktif
                  </label>
                </div>

                {bankFeedback && (
                  <div
                    style={{
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      fontWeight: 650,
                      backgroundColor: bankFeedback.type === 'success' ? '#eef8f2' : 'rgba(225, 29, 72, 0.08)',
                      border: `1px solid ${bankFeedback.type === 'success' ? '#b8d4c5' : 'var(--color-status-danger, #e11d48)'}`,
                      color: bankFeedback.type === 'success' ? '#166534' : 'var(--color-status-danger, #e11d48)',
                    }}
                  >
                    {bankFeedback.type === 'success' ? '✓ ' : '✕ '}
                    {bankFeedback.message}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="submit"
                    disabled={isSavingBank}
                    style={{
                      padding: '8px 18px',
                      backgroundColor: 'var(--accent-dark)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 750,
                      cursor: isSavingBank ? 'wait' : 'pointer',
                    }}
                  >
                    {isSavingBank ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Rekening'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-divider)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
