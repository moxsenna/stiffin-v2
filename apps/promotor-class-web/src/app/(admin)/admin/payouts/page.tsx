'use client';

import React, { useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { formatIDR, formatTimeAgo } from '@promotor/platform-core';

export default function AdminPayoutsPage() {
  const { client, adminKey } = useAdmin();
  const [batches, setBatches] = useState<any[]>([]);
  const [escrow, setEscrow] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Approve Modal State
  const [approvingBatch, setApprovingBatch] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Reject Modal State
  const [rejectingBatch, setRejectingBatch] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setActionError('');
    try {
      const [batchesRes, escrowRes] = await Promise.all([
        client.adminListPayoutBatches(statusFilter, adminKey),
        client.adminGetEscrowSummary(adminKey),
      ]);
      setBatches(batchesRes.batches || []);
      setEscrow(escrowRes.escrow || null);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memuat data pencairan dan escrow.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [statusFilter, adminKey]);

  const handleApprove = async () => {
    if (!approvingBatch) return;
    setIsApproving(true);
    setActionError('');
    setActionSuccess('');
    try {
      await client.adminApprovePayoutBatch(approvingBatch.id, proofUrl || undefined, adminKey);
      setActionSuccess(`Batch pencairan ${approvingBatch.id.slice(0, 8)} berhasil disetujui & ditandai lunas.`);
      setApprovingBatch(null);
      setProofUrl('');
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'Gagal menyetujui batch pencairan.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingBatch) return;
    if (!rejectReason.trim()) {
      setActionError('Wajib menyertakan alasan penolakan pencairan.');
      return;
    }
    setIsRejecting(true);
    setActionError('');
    setActionSuccess('');
    try {
      await client.adminRejectPayoutBatch(rejectingBatch.id, rejectReason.trim(), adminKey);
      setActionSuccess(`Batch pencairan ${rejectingBatch.id.slice(0, 8)} telah ditolak dan pesanan dikembalikan ke saldo siap cair.`);
      setRejectingBatch(null);
      setRejectReason('');
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'Gagal menolak batch pencairan.');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            Payout & Arus Kas Platform
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            Monitor saldo mengendap (escrow), komisi platform, dan persetujuan pencairan dana promotor
          </p>
        </div>
        <button
          onClick={load}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            color: '#CBD5E1',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
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

      {/* 1. Escrow Tracker Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Held Balance / Pending Escrow */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>TOTAL ESCROW MENGENDAP</div>
          <div style={{ fontSize: '24px', fontWeight: 850, color: '#F59E0B', marginTop: '6px' }}>
            {formatIDR(escrow?.totalEscrowPending ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Dana aman tersimpan di platform
          </div>
        </div>

        {/* Antrean Pencairan */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>DALAM PROSES PENCAIRAN</div>
          <div style={{ fontSize: '24px', fontWeight: 850, color: '#38BDF8', marginTop: '6px' }}>
            {formatIDR(escrow?.totalInBatches ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Batch diajukan menunggu verifikasi/transfer
          </div>
        </div>

        {/* Settled Disbursed */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>PENCAIRAN SUDAH DITRANSFER</div>
          <div style={{ fontSize: '24px', fontWeight: 850, color: '#10B981', marginTop: '6px' }}>
            {formatIDR(escrow?.totalSettledPaid ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Total dana tuntas diterima promotor
          </div>
        </div>

        {/* Platform Take-Rate Revenue */}
        <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>KOMISI BERSIH PLATFORM</div>
          <div style={{ fontSize: '24px', fontWeight: 850, color: '#A855F7', marginTop: '6px' }}>
            {formatIDR(escrow?.totalPlatformFees ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Take-rate & transaction fee Ralivo
          </div>
        </div>
      </div>

      {/* 2. Payout Batches Table */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>Antrean Permintaan Pencairan Dana</div>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Verifikasi rekening penerima dan eksekusi settlement</div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'DRAFT', 'PROCESSING', 'PAID', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: statusFilter === st ? '1px solid #3B82F6' : '1px solid #334155',
                  backgroundColor: statusFilter === st ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: statusFilter === st ? '#60A5FA' : '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                {st === 'all' ? 'Semua Status' : st}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Memuat daftar antrean batch...
          </div>
        ) : batches.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Tidak ada batch pencairan dengan filter ini.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px' }}>Batch ID</th>
                  <th style={{ padding: '10px 12px' }}>Organisasi</th>
                  <th style={{ padding: '10px 12px' }}>Rekening Tujuan</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Nominal Bersih</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Waktu Pengajuan</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Aksi Settlement</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b: any) => {
                  const isSettled = b.status === 'PAID';
                  const isPending = b.status === 'DRAFT' || b.status === 'PROCESSING';
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #1E293B', color: '#E2E8F0' }}>
                      <td style={{ padding: '14px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#93C5FD' }}>
                        {b.id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 600 }}>
                        {b.organizationName || b.organizationId}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{b.bankName} — {b.accountNumber}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>a.n. {b.accountHolder}</div>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 800, color: '#34D399', fontSize: '14px' }}>
                        {formatIDR(b.netAmount)}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isSettled ? 'rgba(16, 185, 129, 0.15)' : isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isSettled ? '#34D399' : isPending ? '#FBBF24' : '#F87171',
                            border: `1px solid ${isSettled ? 'rgba(16, 185, 129, 0.3)' : isPending ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          }}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', fontSize: '12px', color: '#64748B' }}>
                        {formatTimeAgo(b.createdAt)}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setApprovingBatch(b);
                                setProofUrl('');
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#10B981',
                                color: '#FFFFFF',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Approve / Bayar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingBatch(b);
                                setRejectReason('');
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: '#F87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Tolak
                            </button>
                          </div>
                        ) : isSettled ? (
                          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>Telah Cair ✓</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Dibatalkan</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Approve Payout */}
      {approvingBatch && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', color: '#FFFFFF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 12px 0' }}>Verifikasi & Setujui Pencairan</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Pastikan dana sebesar <strong style={{ color: '#34D399' }}>{formatIDR(approvingBatch.netAmount)}</strong> telah ditransfer ke rekening:
            </p>

            <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: '#070B14', border: '1px solid #1E293B', marginBottom: '16px', fontSize: '13px' }}>
              <div><strong>Bank:</strong> {approvingBatch.bankName}</div>
              <div><strong>Nomor Rekening:</strong> {approvingBatch.accountNumber}</div>
              <div><strong>Pemilik Rekening:</strong> {approvingBatch.accountHolder}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                URL Bukti Transfer / Catatan Referensi (Opsional)
              </label>
              <input
                type="text"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://... atau Ref: TRX-123456"
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
                onClick={() => setApprovingBatch(null)}
                disabled={isApproving}
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
                onClick={handleApprove}
                disabled={isApproving}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#10B981',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isApproving ? 'not-allowed' : 'pointer',
                }}
              >
                {isApproving ? 'Memproses...' : 'Tandai Selesai Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reject Payout */}
      {rejectingBatch && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', color: '#FFFFFF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 12px 0', color: '#F87171' }}>Tolak Permintaan Pencairan</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Batch ini akan dibatalkan, dan seluruh pesanan yang terkandung di dalamnya akan dikembalikan statusnya menjadi &quot;SIAP DICAIRKAN&quot; sehingga promotor dapat mengajukan ulang.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Alasan Penolakan (Wajib)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Nomor rekening tidak cocok dengan nama promotor, silakan perbarui data rekening..."
                rows={3}
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
                onClick={() => setRejectingBatch(null)}
                disabled={isRejecting}
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
                onClick={handleReject}
                disabled={isRejecting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isRejecting ? 'not-allowed' : 'pointer',
                }}
              >
                {isRejecting ? 'Menolak...' : 'Konfirmasi Tolak Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
