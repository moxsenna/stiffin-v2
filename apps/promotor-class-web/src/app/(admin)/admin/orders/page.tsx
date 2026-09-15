'use client';

import React, { useEffect, useState } from 'react';
import { useAdmin } from '../AdminContext';
import { formatIDR, formatTimeAgo } from '@promotor/platform-core';

export default function AdminOrdersPage() {
  const { client, adminKey } = useAdmin();
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Force-paid modal
  const [forcePaidOrder, setForcePaidOrder] = useState<any>(null);
  const [isForcePaying, setIsForcePaying] = useState(false);

  // Refund modal
  const [refundingOrder, setRefundingOrder] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setActionError('');
    try {
      const res = await client.adminListOrders({ status: statusFilter, q: searchQuery || undefined }, adminKey);
      setOrders(res.orders || []);
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memuat daftar pesanan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [statusFilter, adminKey]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void load();
  };

  const handleForcePaid = async () => {
    if (!forcePaidOrder) return;
    setIsForcePaying(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await client.adminForcePaidOrder(forcePaidOrder.id, adminKey);
      setActionSuccess(`Pesanan ${forcePaidOrder.orderNumber || forcePaidOrder.id.slice(0, 8)} berhasil dipaksa lunas. Hak akses materi telah diterbitkan (Enrollment ID: ${res.enrollmentId || 'OK'}).`);
      setForcePaidOrder(null);
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'Gagal mengubah status pesanan ke lunas.');
    } finally {
      setIsForcePaying(false);
    }
  };

  const handleRefund = async () => {
    if (!refundingOrder) return;
    setIsRefunding(true);
    setActionError('');
    setActionSuccess('');
    try {
      await client.adminRefundOrder(refundingOrder.id, refundReason || undefined, adminKey);
      setActionSuccess(`Pesanan ${refundingOrder.orderNumber || refundingOrder.id.slice(0, 8)} berhasil direfund dan akses materi peserta telah dicabut.`);
      setRefundingOrder(null);
      setRefundReason('');
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'Gagal memproses refund pesanan.');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            Payment Ops & Global Order Stream
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            Pantau realtime transaksi Paycore seluruh promotor, eksekusi manual force-paid dan pengembalian dana (refund)
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

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari order no, nama pembeli, email, atau no WhatsApp..."
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#090D16',
                border: '1px solid #334155',
                color: '#FFFFFF',
                fontSize: '13px',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cari
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTimeout(() => void load(), 0);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#334155',
                  color: '#CBD5E1',
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            )}
          </form>

          {/* Status Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['all', 'PENDING', 'PAID', 'REFUNDED', 'EXPIRED', 'FAILED'].map((st) => (
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
      </div>

      {/* Orders Table */}
      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px' }}>
        {isLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Memuat transaksi order stream...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Tidak ada transaksi yang cocok dengan filter atau pencarian.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 12px' }}>Order ID</th>
                  <th style={{ padding: '10px 12px' }}>Organisasi Promotor</th>
                  <th style={{ padding: '10px 12px' }}>Pembeli & Kontak</th>
                  <th style={{ padding: '10px 12px' }}>Program</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Nominal</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Waktu</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Aksi PayOps</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord: any) => {
                  const isPaid = ord.status === 'PAID';
                  const isPending = ord.status === 'PENDING' || ord.status === 'FAILED';
                  return (
                    <tr key={ord.id} style={{ borderBottom: '1px solid #1E293B', color: '#E2E8F0' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#93C5FD' }}>
                        {ord.orderNumber || ord.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>
                        {ord.organizationName}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{ord.customerName}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{ord.customerEmail}</div>
                        {ord.customerPhone && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{ord.customerPhone}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#CBD5E1' }}>{ord.programTitle}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#FFFFFF' }}>
                        {formatIDR(ord.amount)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              isPaid
                                ? 'rgba(16, 185, 129, 0.15)'
                                : ord.status === 'REFUNDED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              isPaid
                                ? '#34D399'
                                : ord.status === 'REFUNDED'
                                ? '#F87171'
                                : '#FBBF24',
                            border: `1px solid ${
                              isPaid
                                ? 'rgba(16, 185, 129, 0.3)'
                                : ord.status === 'REFUNDED'
                                ? 'rgba(239, 68, 68, 0.3)'
                                : 'rgba(245, 158, 11, 0.3)'
                            }`,
                          }}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#64748B' }}>
                        {formatTimeAgo(ord.createdAt)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => setForcePaidOrder(ord)}
                              title="Paksa lunas jika transfer bank sudah masuk tapi webhook telat"
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
                              ⚡ Force Paid
                            </button>
                          )}
                          {isPaid && (
                            <button
                              type="button"
                              onClick={() => {
                                setRefundingOrder(ord);
                                setRefundReason('');
                              }}
                              title="Batalkan pesanan dan cabut akses materi peserta"
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: '#F87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              ↩ Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Force Paid Confirmation Modal */}
      {forcePaidOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', color: '#FFFFFF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 12px 0', color: '#60A5FA' }}>Konfirmasi Manual Force-Paid</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Gunakan fitur ini jika pembeli sudah transfer manual atau callback gateway terlambat. Sistem akan:
            </p>

            <ul style={{ fontSize: '12px', color: '#CBD5E1', paddingLeft: '20px', marginBottom: '16px', lineHeight: 1.6 }}>
              <li>Mengubah status pesanan menjadi <strong>PAID</strong> secara instan.</li>
              <li>Mencatat penerimaan fee platform Paycore.</li>
              <li>Membuat hak akses (Enrollment) materi kelas untuk pembeli sehingga langsung bisa belajar di <code>/learn</code>.</li>
            </ul>

            <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: '#070B14', border: '1px solid #1E293B', marginBottom: '20px', fontSize: '13px' }}>
              <div><strong>Order No:</strong> {forcePaidOrder.orderNumber || forcePaidOrder.id}</div>
              <div><strong>Pembeli:</strong> {forcePaidOrder.customerName} ({forcePaidOrder.customerEmail})</div>
              <div><strong>Nominal:</strong> {formatIDR(forcePaidOrder.amount)}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setForcePaidOrder(null)}
                disabled={isForcePaying}
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
                onClick={handleForcePaid}
                disabled={isForcePaying}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isForcePaying ? 'not-allowed' : 'pointer',
                }}
              >
                {isForcePaying ? 'Memproses...' : 'Paksa Lunas Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {refundingOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', color: '#FFFFFF' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 12px 0', color: '#F87171' }}>Konfirmasi Refund Pesanan</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Pesanan ini akan ditandai sebagai <strong>REFUNDED</strong>. Akses materi peserta di <code>/learn</code> akan segera dicabut secara otomatis.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                Alasan Refund (Opsional)
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Contoh: Permintaan pembeli / salah transfer..."
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
                onClick={() => setRefundingOrder(null)}
                disabled={isRefunding}
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
                onClick={handleRefund}
                disabled={isRefunding}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isRefunding ? 'not-allowed' : 'pointer',
                }}
              >
                {isRefunding ? 'Memproses...' : 'Konfirmasi Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
