'use client';

import React, { useEffect, useState } from 'react';
import { getPlatformApiClient } from '@/adapters';
import type { BankAccount } from '@promotor/contracts';

const POPULAR_BANKS = ['BCA', 'Mandiri', 'BNI', 'BRI', 'BSI', 'CIMB Niaga'];

export function BankAccountsSection() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await getPlatformApiClient().listBankAccounts();
      setAccounts(res.accounts ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanBank = bankName.trim();
    const cleanNumber = accountNumber.trim().replace(/\s+/g, '');
    const cleanHolder = accountHolderName.trim();

    if (!cleanBank) {
      setFormError('Nama bank wajib diisi.');
      return;
    }
    if (!cleanNumber || cleanNumber.length < 5) {
      setFormError('Nomor rekening tidak valid (minimal 5 digit).');
      return;
    }
    if (!cleanHolder || cleanHolder.length < 3) {
      setFormError('Nama pemilik rekening wajib diisi lengkap.');
      return;
    }

    setIsSubmitting(true);
    try {
      await getPlatformApiClient().createBankAccount({
        bankName: cleanBank,
        accountNumber: cleanNumber,
        accountHolderName: cleanHolder,
      });
      setBankName('');
      setAccountNumber('');
      setAccountHolderName('');
      setIsAdding(false);
      setSuccessMessage('Rekening pencairan berhasil ditambahkan.');
      setTimeout(() => setSuccessMessage(null), 3500);
      await load();
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan rekening pencairan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus rekening ini?')) return;
    setDeletingId(id);
    try {
      await getPlatformApiClient().deleteBankAccount(id);
      setSuccessMessage('Rekening berhasil dihapus.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus rekening.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
              Rekening Pencairan
            </h2>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
            Rekening bank tujuan untuk transfer hasil penjualan kelas berbayar.
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setFormError(null);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent)',
              color: '#FFFFFF',
              border: 0,
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Rekening
          </button>
        )}
      </div>

      {successMessage && (
        <div
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Account List */}
      <div style={{ marginTop: '20px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ height: '64px', backgroundColor: '#F8FAFC', borderRadius: '10px', animation: 'pulse 1.5s infinite' }} />
          </div>
        ) : accounts.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px dashed #CBD5E1',
            }}
          >
            <div style={{ color: '#94A3B8', marginBottom: '8px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
              Belum ada rekening pencairan
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', maxWidth: '360px', margin: '4px auto 0' }}>
              Tambahkan minimal 1 rekening bank aktif sebelum mengajukan pencairan dana penjualan program kelas Anda.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {accounts.map((acc) => (
              <div
                key={acc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  backgroundColor: 'var(--canvas)',
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--accent-soft)',
                      border: '1px solid var(--line)',
                      color: 'var(--accent-dark)',
                      fontSize: '12px',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    {acc.bankName}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                      {acc.accountNumber}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      a.n. <strong style={{ color: 'var(--muted-strong)' }}>{acc.accountHolderName}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(acc.id)}
                  disabled={deletingId === acc.id}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--surface-muted)',
                    color: 'var(--muted-light)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#DC2626';
                    e.currentTarget.style.borderColor = '#FEE2E2';
                    e.currentTarget.style.backgroundColor = '#FEF2F2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94A3B8';
                    e.currentTarget.style.borderColor = '#F1F5F9';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {deletingId === acc.id ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Card Form */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          style={{
            marginTop: '20px',
            padding: '18px 20px',
            backgroundColor: 'var(--canvas)',
            borderRadius: '12px',
            border: '1px solid var(--accent-soft)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-dark)' }}>
              Tambah Rekening Baru
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              style={{
                background: 'none',
                border: 0,
                color: 'var(--muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              Batal
            </button>
          </div>

          {formError && (
            <div
              style={{
                marginBottom: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                color: 'var(--color-status-danger)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {formError}
            </div>
          )}

          {/* Quick Bank Chips */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted-strong)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Pilih Bank Cepat
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {POPULAR_BANKS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBankName(b)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: bankName.toUpperCase() === b.toUpperCase() ? '1px solid var(--accent)' : '1px solid var(--line)',
                    backgroundColor: bankName.toUpperCase() === b.toUpperCase() ? 'var(--accent-soft)' : 'var(--surface)',
                    color: bankName.toUpperCase() === b.toUpperCase() ? 'var(--accent-dark)' : 'var(--muted-strong)',
                    cursor: 'pointer',
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Nama Bank
              </label>
              <input
                type="text"
                placeholder="Contoh: BCA / Mandiri / BNI"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--surface)',
                  fontSize: '14px',
                  color: 'var(--ink)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted-strong)', marginBottom: '6px' }}>
                Nomor Rekening
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="1234567890"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--surface)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  color: 'var(--ink)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted-strong)', marginBottom: '6px' }}>
                Nama Pemilik Rekening
              </label>
              <input
                type="text"
                placeholder="Sesuai buku tabungan"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--surface)',
                  fontSize: '14px',
                  color: 'var(--ink)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line)')}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--surface)',
                color: 'var(--muted)',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 0,
                backgroundColor: 'var(--accent)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Rekening'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
