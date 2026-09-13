'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader } from '@/components/ui';
import { getPlatformApiClient } from '@/adapters';
import { formatIDR, formatTimeAgo } from '@promotor/platform-core';

export default function PayoutsPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bankId, setBankId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const api = getPlatformApiClient();
      const [b, a, banksRes] = await Promise.all([
        api.listPayouts().catch(() => ({ batches: [] })),
        api.listAvailableOrders().catch(() => ({ orders: [] })),
        api.listBankAccounts().catch(() => ({ accounts: [] })),
      ]);
      setBatches(b.batches ?? []);
      setAvailable((a as any).orders ?? []);
      setBanks(banksRes.accounts ?? []);
      if (!bankId && banksRes.accounts?.[0]) {
        setBankId(banksRes.accounts[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleToggleSelect = (orderId: string) => {
    setSelected((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selected.length === available.length) {
      setSelected([]);
    } else {
      setSelected(available.map((o) => o.id));
    }
  };

  const submitRequest = async () => {
    setMessage(null);
    if (selected.length === 0) {
      setMessage({ type: 'error', text: 'Pilih minimal 1 pesanan untuk diajukan pencairan.' });
      return;
    }
    if (!bankId) {
      setMessage({ type: 'error', text: 'Pilih rekening tujuan pencairan terlebih dahulu.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await getPlatformApiClient().createPayout({ orderIds: selected, bankAccountId: bankId });
      setMessage({ type: 'success', text: `Pengajuan pencairan untuk ${selected.length} pesanan berhasil diajukan.` });
      setSelected([]);
      await load();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Gagal mengajukan pencairan dana.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSelectedAmount = available
    .filter((o) => selected.includes(o.id))
    .reduce((sum, o) => sum + (o.netAmount ?? o.amount), 0);

  const totalAvailableAmount = available.reduce((sum, o) => sum + (o.netAmount ?? o.amount), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TRANSFERRED':
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', label: 'Ditransfer' };
      case 'APPROVED':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'Disetujui' };
      case 'REJECTED':
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', label: 'Ditolak' };
      case 'REQUESTED':
      default:
        return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', label: 'Menunggu Transfer' };
    }
  };

  return (
    <PromotorShell>
      <PageHeader
        kicker="Ralivo Class"
        title="Pencairan Dana"
        sub="Pencairan saldo hasil penjualan program kelas berbayar ke rekening bank Anda"
      />

      <div style={{ padding: '0 16px 32px', maxWidth: '860px', margin: '0 auto' }}>
        {message && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              color: message.type === 'success' ? '#065F46' : '#991B1B',
              border: `1px solid ${message.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {message.text}
          </div>
        )}

        {/* 1. Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>SIAP DICAIRKAN</div>
            <div style={{ fontSize: '24px', fontWeight: 850, color: '#059669', marginTop: '4px' }}>
              {formatIDR(totalAvailableAmount)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              {available.length} pesanan lunas
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>BATCH PENCAIRAN</div>
            <div style={{ fontSize: '24px', fontWeight: 850, color: '#0F172A', marginTop: '4px' }}>
              {batches.length}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Total riwayat permohonan
            </div>
          </div>
        </div>

        {/* 2. Order Siap Cair Section */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '22px',
            marginBottom: '28px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Pesanan Siap Cair ({available.length})
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0' }}>
                Pilih pesanan yang ingin Anda cairkan ke rekening bank.
              </p>
            </div>

            {available.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                {selected.length === available.length ? 'Batalkan Semua' : 'Pilih Semua'}
              </button>
            )}
          </div>

          {banks.length === 0 && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '13px', color: '#92400E' }}>
                <strong>Rekening belum ada:</strong> Anda wajib menambahkan rekening bank sebelum dapat mengajukan pencairan.
              </div>
              <Link
                href="/app/settings"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Atur Rekening →
              </Link>
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              Memuat daftar pesanan...
            </div>
          ) : available.length === 0 ? (
            <div
              style={{
                padding: '32px 20px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                border: '1px dashed #CBD5E1',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                Tidak ada pesanan siap cair
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                Pesanan dari peserta kelas berbayar yang lunas dan belum dicairkan akan muncul di sini.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {available.map((o: any) => {
                const isChecked = selected.includes(o.id);
                return (
                  <div
                    key={o.id}
                    onClick={() => handleToggleSelect(o.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: isChecked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: isChecked ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by row click
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563EB' }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.reference} · <span style={{ color: '#475569' }}>{o.buyerName}</span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                          {o.programTitle || 'Kelas Berbayar'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                        {formatIDR(o.netAmount ?? o.amount)}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '2px' }}>
                        Net setelah fee platform
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submission Bar */}
          {available.length > 0 && banks.length > 0 && (
            <div
              style={{
                marginTop: '20px',
                paddingTop: '18px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Rekening Tujuan
                </label>
                <select
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    color: '#0F172A',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  {banks.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountNumber} ({b.accountHolderName})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Total Dipilih ({selected.length})</div>
                  <div style={{ fontSize: '18px', fontWeight: 850, color: '#0F172A' }}>
                    {formatIDR(totalSelectedAmount)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submitRequest}
                  disabled={selected.length === 0 || isSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 0,
                    backgroundColor: selected.length === 0 ? '#94A3B8' : '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: selected.length > 0 ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                    transition: 'background-color 0.15s',
                  }}
                >
                  {isSubmitting ? 'Mengajukan...' : `Ajukan Pencairan (${selected.length}) →`}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 3. Riwayat Batch Section */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '22px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Riwayat Batch Pencairan
          </h2>

          {batches.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              Belum ada riwayat batch pencairan dana.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {batches.map((b: any) => {
                const badge = getStatusBadge(b.status);
                return (
                  <div
                    key={b.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 850, color: '#0F172A' }}>
                          {formatIDR(b.totalNet)}
                        </span>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                        {b.orderCount} pesanan · Diajukan {formatTimeAgo(b.createdAt)}
                      </div>
                      {b.rejectionReason && (
                        <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px', fontWeight: 600 }}>
                          Alasan: {b.rejectionReason}
                        </div>
                      )}
                    </div>

                    {b.proofUrl && (
                      <a
                        href={b.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#2563EB',
                          fontSize: '12px',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        Lihat Bukti Transfer ↗
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </PromotorShell>
  );
}
