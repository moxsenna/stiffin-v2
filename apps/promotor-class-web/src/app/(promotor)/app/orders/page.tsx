'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader } from '@/components/ui';
import { getPlatformApiClient } from '@/adapters';
import { OrderItemSummary } from '@promotor/contracts';
import { formatIDR, formatTimeAgo } from '@promotor/platform-core';

type OrderFilterTab = 'ALL' | 'PENDING' | 'PAID' | 'REJECTED';

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<OrderFilterTab>('ALL');
  const [orders, setOrders] = useState<OrderItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderItemSummary | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const api = getPlatformApiClient();
      const statusParam =
        activeTab === 'PENDING'
          ? 'PENDING'
          : activeTab === 'PAID'
          ? 'PAID'
          : activeTab === 'REJECTED'
          ? 'REJECTED'
          : undefined;

      const res = await api.listOrders({ status: statusParam as any, limit: 50, offset: 0 });
      setOrders(res.orders || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      // Fallback empty if mock mode or network error
      setOrders([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const handleReject = async (orderId: string) => {
    if (!rejectReason.trim()) {
      alert('Alasan penolakan wajib diisi');
      return;
    }
    setIsProcessing(true);
    try {
      const api = getPlatformApiClient();
      await api.rejectOrder(orderId, rejectReason);
      setMessage({ type: 'success', text: 'Pesanan berhasil ditolak' });
      setSelectedOrder(null);
      setRejectReason('');
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Gagal menolak pesanan');
    } finally {
      setIsProcessing(false);
    }
  };

  // Metrics
  const paidOrders = orders.filter((o) => o.status === 'PAID' || o.status === 'APPROVED');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount, 0);
  const totalPlatformFees = paidOrders.length * 3000;

  return (
    <PromotorShell>
      <PageHeader
        kicker="PromotorClass"
        title="Pesanan"
        sub="Kelola transaksi, verifikasi pembayaran, dan akses peserta kelas berbayar"
      />

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: message.type === 'success' ? '#065F46' : '#991B1B',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-divider, #E5E7EB)',
            borderRadius: '14px',
            padding: '18px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '6px' }}>
            TOTAL PESANAN
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{total}</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-divider, #E5E7EB)',
            borderRadius: '14px',
            padding: '18px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '6px' }}>
            OMZET LUNAS
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669' }}>
            {formatIDR(totalRevenue)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-divider, #E5E7EB)',
            borderRadius: '14px',
            padding: '18px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '6px' }}>
            BIAYA PLATFORM (RP3.000 / TRANSAKSI)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#4B5563' }}>
            {formatIDR(totalPlatformFees)}
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
            Tanpa persentase platform
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--color-divider, #E5E7EB)',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'ALL', label: 'Semua' },
          { key: 'PENDING', label: 'Menunggu Pembayaran' },
          { key: 'PAID', label: 'Berhasil' },
          { key: 'REJECTED', label: 'Ditolak / Batal' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as OrderFilterTab)}
            style={{
              padding: '10px 16px',
              border: 0,
              backgroundColor: 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-primary, #0284C7)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--color-primary, #0284C7)' : '#6B7280',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List / Table */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
          Memuat daftar pesanan...
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-divider, #E5E7EB)',
            borderRadius: '16px',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
            Belum Ada Pesanan
          </div>
          <p style={{ fontSize: '13px', color: '#6B7280', maxWidth: '400px', margin: '0 auto 20px' }}>
            Transaksi dari pembeli kelas berbayar Anda akan otomatis tercatat di sini secara real-time.
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-divider, #E5E7EB)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Referensi</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Pembeli</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Program</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Nominal</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Waktu</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusColor =
                    order.status === 'PAID' || order.status === 'APPROVED'
                      ? { bg: '#ECFDF5', text: '#065F46', label: 'Lunas' }
                      : order.status === 'PENDING'
                      ? { bg: '#FEF3C7', text: '#92400E', label: 'Menunggu' }
                      : { bg: '#FEE2E2', text: '#991B1B', label: order.status === 'REJECTED' ? 'Ditolak' : 'Batal' };

                  return (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s' }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1F2937' }}>
                        {order.reference}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{order.buyerName}</div>
                        <a
                          href={`https://wa.me/${order.buyerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '11px', color: '#0284C7', textDecoration: 'none' }}
                        >
                          {order.buyerPhone}
                        </a>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#374151' }}>
                        {order.programTitle}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                        {formatIDR(order.amount)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                          }}
                        >
                          {statusColor.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6B7280', fontSize: '12px' }}>
                        {formatTimeAgo(order.createdAt)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #D1D5DB',
                            backgroundColor: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                Detail Pesanan {selectedOrder.reference}
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ border: 0, background: 'none', fontSize: '20px', cursor: 'pointer', color: '#9CA3AF' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px', fontSize: '13px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280' }}>Program</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{selectedOrder.programTitle}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280' }}>Pembeli</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{selectedOrder.buyerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280' }}>Nomor WhatsApp</span>
                <a
                  href={`https://wa.me/${selectedOrder.buyerPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 600, color: '#0284C7', textDecoration: 'none' }}
                >
                  {selectedOrder.buyerPhone} ↗
                </a>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280' }}>Kanal Pembelian</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{selectedOrder.sourceChannel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280' }}>Total Dibayar</span>
                <span style={{ fontWeight: 800, color: '#059669', fontSize: '15px' }}>
                  {formatIDR(selectedOrder.amount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280' }}>Biaya Platform</span>
                <span style={{ fontWeight: 600, color: '#6B7280' }}>
                  {formatIDR(selectedOrder.platformFee)} (Flat)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                <span style={{ color: '#6B7280' }}>Status Transaksi</span>
                <span style={{ fontWeight: 700 }}>{selectedOrder.status}</span>
              </div>
              {selectedOrder.enrollmentId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6B7280' }}>Akses Kelas (Enrollment)</span>
                  <span style={{ fontWeight: 600, color: '#059669' }}>✓ Aktif</span>
                </div>
              )}
            </div>

            {selectedOrder.status === 'PENDING' && (
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  Tolak Pesanan Ini:
                </div>
                <input
                  type="text"
                  placeholder="Masukkan alasan penolakan..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '13px',
                    marginBottom: '12px',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => handleReject(selectedOrder.id)}
                    disabled={isProcessing || !rejectReason.trim()}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 0,
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {isProcessing ? 'Memproses...' : 'Tolak Pesanan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PromotorShell>
  );
}
