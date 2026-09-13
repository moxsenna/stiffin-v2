'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader } from '@/components/ui';
import { getPlatformApiClient } from '@/adapters';
import { getProgramsQuery } from '@/modules/programs/queries';
import { PromoCoupon, Program } from '@promotor/contracts';
import { formatIDR, formatTimeAgo } from '@promotor/platform-core';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [programId, setProgramId] = useState<string>('');
  const [maxRedemptions, setMaxRedemptions] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const api = getPlatformApiClient();
      const [couponsRes, progs] = await Promise.all([
        api.listCoupons().catch(() => ({ coupons: [] })),
        getProgramsQuery().catch(() => []),
      ]);
      setCoupons(couponsRes.coupons || []);
      setPrograms(progs || []);
    } catch (err: any) {
      console.error('Failed to load coupons:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleActive = async (coupon: PromoCoupon) => {
    try {
      const api = getPlatformApiClient();
      await api.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status kupon');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!code.trim()) {
      setErrorMessage('Kode kupon wajib diisi');
      return;
    }
    if (discountValue <= 0) {
      setErrorMessage('Besaran diskon harus lebih besar dari 0');
      return;
    }
    if (discountType === 'PERCENT' && discountValue > 100) {
      setErrorMessage('Diskon persentase tidak boleh lebih dari 100%');
      return;
    }

    setIsSubmitting(true);
    try {
      const api = getPlatformApiClient();
      const payload = {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        programId: programId ? programId : undefined,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        isActive: true,
      };

      const res = await api.createCoupon(payload);
      setCoupons((prev) => [res.coupon, ...prev]);
      setIsModalOpen(false);
      // Reset form
      setCode('');
      setDiscountType('PERCENT');
      setDiscountValue(10);
      setProgramId('');
      setMaxRedemptions('');
      setExpiresAt('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat kupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const programMap = new Map(programs.map((p) => [p.id, p.title]));

  return (
    <PromotorShell>
      <PageHeader
        kicker="Ralivo Class"
        title="Kupon Promo"
        sub="Kelola voucher diskon & potongan harga untuk penjualan program Anda"
        action={
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setIsModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
            style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}
          >
            + Buat Kupon
          </button>
        }
      />

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
          Memuat daftar kupon...
        </div>
      ) : coupons.length === 0 ? (
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
            Belum Ada Kupon Promo
          </div>
          <p style={{ fontSize: '13px', color: '#6B7280', maxWidth: '440px', margin: '0 auto 20px' }}>
            Tingkatkan konversi penjualan kelas Anda dengan memberikan voucher diskon persentase atau nominal tunai kepada calon peserta.
          </p>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setIsModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
          >
            + Buat Kupon Pertama
          </button>
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
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Kode Kupon</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Potongan Diskon</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Program</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Penggunaan</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Kedaluwarsa</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: '#4B5563', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const isExpired = coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now();
                  const isExhausted = typeof coupon.maxRedemptions === 'number' && coupon.usedCount >= coupon.maxRedemptions;
                  const discountLabel =
                    coupon.discountType === 'PERCENT'
                      ? `${coupon.discountValue}%`
                      : formatIDR(coupon.discountValue);
                  const programLabel = coupon.programId
                    ? programMap.get(coupon.programId) || 'Program Spesifik'
                    : 'Semua Program';

                  return (
                    <tr
                      key={coupon.id}
                      style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s' }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '14px',
                              color: '#111827',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(coupon.code)}
                            title="Salin kode kupon"
                            style={{
                              border: 0,
                              background: 'none',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              backgroundColor: copiedCode === coupon.code ? '#ECFDF5' : '#F3F4F6',
                              color: copiedCode === coupon.code ? '#059669' : '#6B7280',
                            }}
                          >
                            {copiedCode === coupon.code ? 'Tersalin ✓' : 'Salin'}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#059669' }}>
                        {discountLabel}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#4B5563' }}>
                        {programLabel}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#374151' }}>
                        {coupon.usedCount}
                        {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ' (Tak terbatas)'}
                      </td>
                      <td style={{ padding: '14px 16px', color: isExpired ? '#DC2626' : '#6B7280', fontSize: '12px' }}>
                        {coupon.expiresAt
                          ? new Date(coupon.expiresAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Selamanya'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: !coupon.isActive
                              ? '#F3F4F6'
                              : isExpired || isExhausted
                              ? '#FEF2F2'
                              : '#ECFDF5',
                            color: !coupon.isActive
                              ? '#9CA3AF'
                              : isExpired || isExhausted
                              ? '#991B1B'
                              : '#065F46',
                          }}
                        >
                          {!coupon.isActive
                            ? 'Non-aktif'
                            : isExpired
                            ? 'Kedaluwarsa'
                            : isExhausted
                            ? 'Habis'
                            : 'Aktif'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(coupon)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #D1D5DB',
                            backgroundColor: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: coupon.isActive ? '#DC2626' : '#059669',
                          }}
                        >
                          {coupon.isActive ? 'Nonaktifkan' : 'Aktifkan'}
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

      {/* Create Coupon Modal */}
      {isModalOpen && (
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
              maxWidth: '500px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                Buat Kupon Promo Baru
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ border: 0, background: 'none', fontSize: '20px', cursor: 'pointer', color: '#9CA3AF' }}
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  backgroundColor: '#FEF2F2',
                  color: '#991B1B',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateCoupon} style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                  Kode Kupon *
                </label>
                <input
                  type="text"
                  placeholder="CONTOH: DISKON50, PROMOBERKAH"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                    Tipe Diskon *
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="PERCENT">Persentase (%)</option>
                    <option value="FIXED">Nominal Tunai (Rp)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                    Besaran Potongan *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={discountType === 'PERCENT' ? 100 : 100000000}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                  Berlaku Untuk Program
                </label>
                <select
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="">Semua Program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                    Batas Kuota Pemakaian
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Kosongkan jika tak terbatas"
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                    Tanggal Kedaluwarsa
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', borderRadius: '8px' }}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Buat Kupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PromotorShell>
  );
}
