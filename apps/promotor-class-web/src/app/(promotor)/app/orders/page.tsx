'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader } from '@/components/ui';
import { getOrderRepository } from '@/adapters';
import { ProgramPurchaseRequest, PurchaseStatus, PurchaseMethod } from '@promotor/contracts';

function formatIDRDisplay(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDateDisplay(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<ProgramPurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'BANK_TRANSFER' | 'WHATSAPP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<ProgramPurchaseRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const repo = getOrderRepository();
      const res = await repo.listOrders();
      setOrders(res.orders || []);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const counts = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'PENDING').length;
    const approved = orders.filter((o) => o.status === 'APPROVED').length;
    const rejected = orders.filter((o) => o.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Status Filter
      if (statusTab !== 'ALL' && o.status !== statusTab) return false;

      // 2. Method Filter
      if (methodFilter !== 'ALL' && o.purchaseMethod !== methodFilter) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = o.buyerName.toLowerCase().includes(q);
        const matchPhone = o.buyerPhone.toLowerCase().includes(q);
        const matchRef = o.purchaseReference.toLowerCase().includes(q);
        const matchTitle = (o.programTitle || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchRef && !matchTitle) return false;
      }

      return true;
    });
  }, [orders, statusTab, methodFilter, searchQuery]);

  const handleApprove = async (order: ProgramPurchaseRequest) => {
    if (
      !confirm(
        `Setujui pesanan ${order.purchaseReference} untuk ${order.buyerName}?\n\nPeserta akan langsung mendapatkan akses ke program "${order.programTitle || 'Program'}" dan terdaftar di Learner.`
      )
    ) {
      return;
    }

    setProcessingId(order.id);
    setFeedback(null);
    try {
      const repo = getOrderRepository();
      const res = await repo.approveOrder(order.id);
      setFeedback({
        type: 'success',
        message: `✓ Akses program berhasil diberikan kepada ${order.buyerName}. Peserta kini aktif.`,
      });
      await loadOrders();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Gagal menyetujui pesanan.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOrder) return;

    setProcessingId(rejectingOrder.id);
    try {
      const repo = getOrderRepository();
      await repo.rejectOrder(rejectingOrder.id, rejectReason.trim() || null);
      setFeedback({
        type: 'success',
        message: `Pesanan ${rejectingOrder.purchaseReference} telah ditolak.`,
      });
      setRejectingOrder(null);
      setRejectReason('');
      await loadOrders();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Gagal menolak pesanan.');
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} disalin: ${text}`);
  };

  return (
    <PromotorShell>
      <div style={{ padding: '24px 16px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <PageHeader
          kicker="Commerce &amp; Pembayaran"
          title="Pesanan &amp; Pembelian Program"
          sub="Kelola konfirmasi transfer bank dan pesanan WhatsApp secara transparan sebelum memberikan akses kelas"
        />

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: feedback.type === 'success' ? '#eef8f2' : 'rgba(225, 29, 72, 0.08)',
              border: `1px solid ${feedback.type === 'success' ? '#b8d4c5' : 'var(--color-status-danger, #e11d48)'}`,
              color: feedback.type === 'success' ? '#166534' : 'var(--color-status-danger, #e11d48)',
              fontSize: '13.5px',
              fontWeight: 700,
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Filters & Status Tabs */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Status Tabs Bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--color-divider)',
              gap: '4px',
              overflowX: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() => setStatusTab('ALL')}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: statusTab === 'ALL' ? '2px solid var(--accent-dark)' : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: statusTab === 'ALL' ? 800 : 600,
                color: statusTab === 'ALL' ? 'var(--accent-dark)' : 'var(--color-text-muted)',
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              Semua Pesanan
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  backgroundColor: 'var(--color-surface-hover)',
                  borderRadius: '0px',
                }}
              >
                {counts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('PENDING')}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: statusTab === 'PENDING' ? '2px solid #D97706' : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: statusTab === 'PENDING' ? 800 : 600,
                color: statusTab === 'PENDING' ? '#B45309' : 'var(--color-text-muted)',
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              Menunggu Persetujuan
              {counts.pending > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    fontWeight: 800,
                    borderRadius: '0px',
                  }}
                >
                  {counts.pending}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('APPROVED')}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: statusTab === 'APPROVED' ? '2px solid #16A34A' : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: statusTab === 'APPROVED' ? 800 : 600,
                color: statusTab === 'APPROVED' ? '#15803D' : 'var(--color-text-muted)',
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              Disetujui &amp; Akses Aktif
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  backgroundColor: 'var(--color-surface-hover)',
                  borderRadius: '0px',
                }}
              >
                {counts.approved}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('REJECTED')}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: statusTab === 'REJECTED' ? '2px solid #E11D48' : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: statusTab === 'REJECTED' ? 800 : 600,
                color: statusTab === 'REJECTED' ? '#BE123C' : 'var(--color-text-muted)',
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              Ditolak
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  backgroundColor: 'var(--color-surface-hover)',
                  borderRadius: '0px',
                }}
              >
                {counts.rejected}
              </span>
            </button>
          </div>

          {/* Search & Channel Filters */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ flex: '1 1 260px' }}>
              <input
                type="text"
                placeholder="Cari nama pembeli, nomor WA, atau kode TLR-..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-divider)',
                  borderRadius: '0px',
                  fontSize: '13px',
                  backgroundColor: 'var(--color-surface)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 650 }}>Metode:</span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as any)}
                style={{
                  padding: '7px 10px',
                  border: '1px solid var(--color-divider)',
                  borderRadius: '0px',
                  fontSize: '12.5px',
                  backgroundColor: 'var(--color-surface)',
                  fontWeight: 650,
                }}
              >
                <option value="ALL">Semua Metode</option>
                <option value="BANK_TRANSFER">Transfer Bank</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List Container */}
        <div style={{ marginTop: '16px' }}>
          {isLoading ? (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                color: 'var(--color-text-muted)',
                fontSize: '13.5px',
              }}
            >
              Memuat daftar pesanan...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: 'var(--color-surface)',
                border: '1px dashed var(--color-divider)',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🛍️</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                Tidak Ada Pesanan
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                {statusTab === 'PENDING'
                  ? 'Saat ini tidak ada pesanan baru yang menunggu persetujuan.'
                  : 'Belum ada data pesanan yang sesuai dengan filter yang dipilih.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredOrders.map((order) => {
                const isPending = order.status === 'PENDING';
                const isApproved = order.status === 'APPROVED';
                const isRejected = order.status === 'REJECTED';
                const isTransfer = order.purchaseMethod === 'BANK_TRANSFER';
                const waClean = order.buyerPhone.replace(/\+/g, '').replace(/[\s\-\(\)]/g, '');

                return (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: isPending ? '1.5px solid #F59E0B' : '1px solid var(--color-divider)',
                      borderRadius: '0px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {/* Top Meta Bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        borderBottom: '1px solid var(--color-divider)',
                        paddingBottom: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Reference Badge */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                            border: '1px solid var(--color-divider)',
                            padding: '3px 8px',
                          }}
                        >
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700 }}>KODE:</span>
                          <span style={{ fontSize: '12.5px', fontWeight: 850, fontFamily: 'monospace', color: 'var(--color-text-main)' }}>
                            {order.purchaseReference}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.purchaseReference, 'Kode pesanan')}
                            title="Salin kode pesanan"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              fontSize: '12px',
                              padding: '0 2px',
                            }}
                          >
                            📋
                          </button>
                        </div>

                        {/* Method Badge */}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 750,
                            padding: '3px 8px',
                            backgroundColor: isTransfer ? '#EEF2FF' : '#F0FDF4',
                            color: isTransfer ? '#4338CA' : '#15803D',
                            border: `1px solid ${isTransfer ? '#C7D2FE' : '#BBF7D0'}`,
                          }}
                        >
                          {isTransfer ? '🏦 Transfer Bank' : '📱 WhatsApp'}
                        </span>

                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {formatDateDisplay(order.createdAt)}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPending && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 800,
                              padding: '3px 10px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FCD34D',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Menunggu Persetujuan
                          </span>
                        )}
                        {isApproved && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 800,
                              padding: '3px 10px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #86EFAC',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            ✓ Disetujui (Akses Aktif)
                          </span>
                        )}
                        {isRejected && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 800,
                              padding: '3px 10px',
                              backgroundColor: '#FEE2E2',
                              color: '#991B1B',
                              border: '1px solid #FCA5A5',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            ✕ Ditolak
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Content: Program & Buyer Info */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '16px',
                        alignItems: 'start',
                      }}
                    >
                      {/* Program & Price */}
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>
                          Program Yang Dipesan
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                          {order.programTitle || 'Program Edukasi'}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 850, color: 'var(--accent-dark)' }}>
                          {formatIDRDisplay(order.priceAmount)}
                        </div>
                        {order.bankAccountDetails?.bankName && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            Tujuan: {order.bankAccountDetails.bankName}
                          </div>
                        )}
                      </div>

                      {/* Buyer Details */}
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>
                          Data Pembeli
                        </div>
                        <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                          {order.buyerName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 650, fontFamily: 'monospace' }}>
                            {order.buyerPhone}
                          </span>
                          <a
                            href={`https://wa.me/${waClean}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '11.5px',
                              padding: '2px 6px',
                              backgroundColor: '#eef8f2',
                              color: '#166534',
                              border: '1px solid #b8d4c5',
                              textDecoration: 'none',
                              fontWeight: 700,
                            }}
                          >
                            Chat WA ↗
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Buyer Note if any */}
                    {order.buyerNote && (
                      <div
                        style={{
                          padding: '10px 14px',
                          backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                          border: '1px solid var(--color-divider)',
                          fontSize: '12.5px',
                        }}
                      >
                        <span style={{ fontWeight: 750, color: 'var(--color-text-main)' }}>Catatan Pembeli: </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{order.buyerNote}</span>
                      </div>
                    )}

                    {/* Rejection Reason if any */}
                    {isRejected && order.rejectionReason && (
                      <div
                        style={{
                          padding: '10px 14px',
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FCA5A5',
                          fontSize: '12.5px',
                          color: '#991B1B',
                        }}
                      >
                        <span style={{ fontWeight: 750 }}>Alasan Penolakan: </span>
                        <span>{order.rejectionReason}</span>
                      </div>
                    )}

                    {/* Approval Info if approved */}
                    {isApproved && order.approvedAt && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Disetujui pada {formatDateDisplay(order.approvedAt)}. Akses kelas langsung aktif untuk peserta ini.
                      </div>
                    )}

                    {/* Action Buttons for PENDING */}
                    {isPending && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: '10px',
                          borderTop: '1px solid var(--color-divider)',
                          paddingTop: '12px',
                          marginTop: '4px',
                        }}
                      >
                        <button
                          type="button"
                          disabled={processingId === order.id}
                          onClick={() => {
                            setRejectingOrder(order);
                            setRejectReason('');
                          }}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--color-divider)',
                            color: 'var(--color-status-danger, #e11d48)',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Tolak Pesanan
                        </button>

                        <button
                          type="button"
                          disabled={processingId === order.id}
                          onClick={() => handleApprove(order)}
                          className="touch-target-primary"
                          style={{
                            padding: '0 20px',
                            height: '38px',
                            backgroundColor: 'var(--accent-dark)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: processingId === order.id ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {processingId === order.id ? (
                            'Memproses Akses...'
                          ) : (
                            <>
                              <span>✓</span>
                              <span>Setujui &amp; Beri Akses</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        {rejectingOrder && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 9999,
            }}
          >
            <form
              onSubmit={handleConfirmReject}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                padding: '24px',
                maxWidth: '480px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-status-danger, #e11d48)' }}>
                Tolak Pesanan {rejectingOrder.purchaseReference}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                Pembeli <strong>{rejectingOrder.buyerName}</strong> tidak akan diberikan akses ke program ini.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  Alasan Penolakan (Opsional):
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Bukti transfer tidak valid atau dana belum masuk rekening"
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setRejectingOrder(null)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectingOrder.id}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: 'var(--color-status-danger, #e11d48)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 750,
                    cursor: 'pointer',
                  }}
                >
                  {processingId === rejectingOrder.id ? 'Memproses...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </PromotorShell>
  );
}
