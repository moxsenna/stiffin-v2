'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicProgramDetail } from '@/modules/public-storefront/types';
import { getEnrollmentRepository, getPlatformApiClient } from '@/adapters';
import { setActiveLearnerSession } from '@/lib/session';
import { formatIDR } from '@promotor/platform-core';

interface RegistrationSectionProps {
  detail: PublicProgramDetail;
}

export function RegistrationSection({ detail }: RegistrationSectionProps) {
  const { program, isRegistrationAllowed } = detail;
  const isPaid = program.pricing === 'one_time';
  const price = program.priceAmount || 0;
  const variants = program.variants ?? [];
  const defaultVariant = variants.find((v) => v.isDefault) || variants[0];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(defaultVariant?.id ?? null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEnrollmentId, setCreatedEnrollmentId] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<{ reference: string; checkoutUrl?: string | null; freeCheckout?: boolean } | null>(null);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const listPrice = selectedVariant ? selectedVariant.priceAmount : price;
  const currentPrice = appliedCoupon ? appliedCoupon.finalAmount : listPrice;

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setCouponError(null);
    setIsCheckingCoupon(true);
    try {
      const api = getPlatformApiClient();
      const quote = await api.getCouponQuote(
        detail.promoter.workspaceSlug,
        program.programSlug,
        couponCodeInput.trim().toUpperCase(),
        selectedVariantId || undefined
      );
      if (quote.valid) {
        setAppliedCoupon({
          code: couponCodeInput.trim().toUpperCase(),
          discountAmount: quote.discountAmount,
          finalAmount: quote.finalAmount,
        });
        setCouponError(null);
      } else {
        setAppliedCoupon(null);
        setCouponError(quote.message);
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Gagal memverifikasi kupon');
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError(null);
  };

  const handleVariantSelect = async (vId: string) => {
    setSelectedVariantId(vId);
    if (appliedCoupon) {
      try {
        const api = getPlatformApiClient();
        const quote = await api.getCouponQuote(
          detail.promoter.workspaceSlug,
          program.programSlug,
          appliedCoupon.code,
          vId
        );
        if (quote.valid) {
          setAppliedCoupon({
            code: appliedCoupon.code,
            discountAmount: quote.discountAmount,
            finalAmount: quote.finalAmount,
          });
        } else {
          setAppliedCoupon(null);
          setCouponError(quote.message);
        }
      } catch {
        setAppliedCoupon(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isPaid) {
        // Paid program checkout via Platform Commerce Engine
        const api = getPlatformApiClient();
        const res = await api.createPaidProgramCheckout(
          detail.promoter.workspaceSlug,
          program.programSlug,
          {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            sourceChannel: 'STOREFRONT',
            variantId: selectedVariantId || undefined,
            couponCode: appliedCoupon ? appliedCoupon.code : undefined,
          }
        );

        if (res.amount === 0 || !res.checkoutUrl) {
          // 100% coupon discount - free checkout bypass succeeded
          setCheckoutResult({
            reference: res.reference,
            checkoutUrl: null,
            freeCheckout: true,
          });
          return;
        }

        // Redirect to Paycore checkout
        window.location.href = res.checkoutUrl;
        return;
      } else {
        // Free program registration
        const enrollmentRepo = getEnrollmentRepository();
        const res = await enrollmentRepo.registerPublicLearner({
          workspaceSlug: detail.promoter.workspaceSlug,
          programSlug: program.programSlug,
          name: name.trim(),
          phoneRaw: phone.trim(),
        });

        // Atomically redeem token to establish secure HttpOnly session cookie
        if (res.accessToken) {
          try {
            await enrollmentRepo.redeemToken(res.accessToken);
          } catch (redeemErr) {
            console.warn('[RegistrationSection] Token auto-redemption notice:', redeemErr);
          }
        }

        // Set active learner session with workspace context
        setActiveLearnerSession({
          contactId: res.contactId,
          workspaceSlug: detail.promoter.workspaceSlug,
        });

        setCreatedEnrollmentId(res.enrollmentId);
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memproses pendaftaran. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const whatsappPhone = detail.promoter.whatsappPhoneE164?.replace(/\D/g, '') || '';
  const waInquiryUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
        `Halo ${detail.promoter.displayName}, saya tertarik dengan materi "${program.title}" (${isPaid ? formatIDR(price) : 'Gratis'}). Bisa info lebih lanjut?`
      )}`
    : null;

  return (
    <section id="register" className="container" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        {/* Copy Column */}
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 820,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent-dark)',
              marginBottom: '12px',
            }}
          >
            {isPaid ? 'Pemesanan & Akses Program' : 'Akses Ruang Belajar Gratis'}
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              letterSpacing: '-0.04em',
              marginBottom: '14px',
              fontWeight: 750,
              lineHeight: 1.15,
            }}
          >
            {isPaid
              ? `Dapatkan akses lengkap materi "${program.title}".`
              : 'Mulai kenali dan optimalkan potensi genetik Anda sekarang.'}
          </h2>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '15px',
              lineHeight: 1.65,
            }}
          >
            {isPaid
              ? 'Lengkapi data pemesan di bawah untuk membuka sesi pembayaran resmi. Setelah pembayaran terkonfirmasi, akses ruang belajar akan otomatis aktif.'
              : 'Masukkan nama dan nomor WhatsApp aktif Anda. Materi pembelajaran langsung terbuka dan progres Anda tersimpan dengan rapi.'}
          </p>

          {isPaid && (
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#F3F4F6',
                borderRadius: '12px',
                display: 'inline-block',
              }}
            >
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>BIAYA INVESTASI KELAS</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <div style={{ fontSize: '26px', fontWeight: 850, color: '#111827' }}>
                  {formatIDR(currentPrice)}
                </div>
                {appliedCoupon && appliedCoupon.discountAmount > 0 && (
                  <div style={{ fontSize: '16px', textDecoration: 'line-through', color: '#9CA3AF' }}>
                    {formatIDR(listPrice)}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                {selectedVariant ? selectedVariant.label : 'Akses materi seumur hidup & pembaruan berkala'}
                {appliedCoupon ? ` · Kupon "${appliedCoupon.code}" Aktif` : ''}
              </div>
            </div>
          )}
        </div>

        {/* Form Card Column */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-divider)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
        >
          {createdEnrollmentId ? (
            <div
              style={{
                border: '1px solid #cfded3',
                backgroundColor: '#f4f8f5',
                padding: '24px',
                borderRadius: '12px',
              }}
            >
              <strong
                style={{
                  display: 'block',
                  color: 'var(--accent-dark)',
                  marginBottom: '6px',
                  fontSize: '18px',
                }}
              >
                Pendaftaran Berhasil!
              </strong>
              <p style={{ fontSize: '14px', color: '#55544f', marginBottom: '20px' }}>
                Program telah ditambahkan ke ruang belajar Anda.
              </p>
              <Link
                href={`/learn/programs/${createdEnrollmentId}`}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--accent-dark)',
                  color: '#FFFFFF',
                  fontWeight: 780,
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Mulai belajar sekarang →
              </Link>
            </div>
          ) : checkoutResult ? (
            <div
              style={{
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                padding: '24px',
                borderRadius: '12px',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
                {checkoutResult.freeCheckout ? 'Akses Gratis Berhasil Diaktifkan!' : 'Pesanan Berhasil Diajukan'}
              </div>
              <div style={{ fontSize: '13px', color: '#4B5563', marginBottom: '14px' }}>
                Kode Referensi Pesanan: <strong>{checkoutResult.reference}</strong>
                {checkoutResult.freeCheckout && (
                  <p style={{ marginTop: '8px', color: '#059669', fontWeight: 600 }}>
                    Kupon 100% diskon diterapkan. Akses materi belajar Anda telah aktif seketika.
                  </p>
                )}
              </div>
              {checkoutResult.checkoutUrl ? (
                <a
                  href={checkoutResult.checkoutUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: '46px',
                    borderRadius: '10px',
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '14px',
                    textDecoration: 'none',
                  }}
                >
                  Lanjutkan Pembayaran →
                </a>
              ) : (
                <Link
                  href="/learn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: '46px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--accent-dark, #059669)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '14px',
                    textDecoration: 'none',
                  }}
                >
                  Buka Ruang Belajar Sekarang →
                </Link>
              )}
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '20px', marginBottom: '6px', fontWeight: 800, color: '#111827' }}>
                {isPaid ? 'Formulir Pembelian Akses' : 'Daftar & Buka Akses'}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.55,
                  marginBottom: '20px',
                }}
              >
                {isPaid
                  ? 'Akses materi akan terverifikasi secara instan setelah pembayaran selesai.'
                  : 'Program ini gratis. Materi langsung dapat diakses setelah mendaftar.'}
              </p>

              {error && (
                <div
                  style={{
                    backgroundColor: '#FDF2F2',
                    border: '1px solid #F8B4B4',
                    color: '#9B1C1C',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {isPaid && variants.length > 0 && (
                  <div role="radiogroup" aria-label="Pilih paket kelas" style={{ marginBottom: '8px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '8px',
                        color: '#374151',
                      }}
                    >
                      PILIH PAKET KELAS *
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {variants.map((v) => (
                        <label
                          key={v.id}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center',
                            padding: '12px 14px',
                            border: '2px solid',
                            borderColor: selectedVariantId === v.id ? 'var(--accent-dark, #4F46E5)' : '#E5E7EB',
                            borderRadius: '8px',
                            backgroundColor: selectedVariantId === v.id ? '#F5F3FF' : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="variant"
                            value={v.id}
                            checked={selectedVariantId === v.id}
                            onChange={() => handleVariantSelect(v.id)}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '13px', color: '#111827' }}>
                                {v.label} {v.isDefault ? '⭐' : ''}
                              </strong>
                              <span style={{ fontSize: '13px', fontWeight: 750, color: 'var(--accent-dark, #4F46E5)' }}>
                                {formatIDR(v.priceAmount)}
                              </span>
                            </div>
                            {v.description && (
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                {v.description}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '6px',
                      color: '#374151',
                    }}
                  >
                    Nama Lengkap *
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    style={{
                      width: '100%',
                      minHeight: '46px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '6px',
                      color: '#374151',
                    }}
                  >
                    Nomor WhatsApp *
                  </label>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    style={{
                      width: '100%',
                      minHeight: '46px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {isPaid && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '6px',
                        color: '#374151',
                      }}
                    >
                      Email Penerima Notifikasi (Opsional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="budi@example.com"
                      style={{
                        width: '100%',
                        minHeight: '46px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        padding: '0 14px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                {isPaid && (
                  <div style={{ marginTop: '2px', marginBottom: '4px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '6px',
                        color: '#374151',
                      }}
                    >
                      Kupon Promo / Diskon
                    </label>
                    {appliedCoupon ? (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          borderRadius: '8px',
                          padding: '10px 14px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#065F46', fontSize: '13px' }}>
                            ✓ Kupon "{appliedCoupon.code}" Aktif
                          </div>
                          <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                            Hemat {formatIDR(appliedCoupon.discountAmount)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          style={{
                            border: 0,
                            background: 'none',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Masukkan kode kupon..."
                            value={couponCodeInput}
                            onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                            style={{
                              flex: 1,
                              minHeight: '42px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              padding: '0 12px',
                              fontSize: '13px',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              boxSizing: 'border-box',
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={isCheckingCoupon || !couponCodeInput.trim()}
                            style={{
                              padding: '0 16px',
                              minHeight: '42px',
                              borderRadius: '8px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: '#F3F4F6',
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#374151',
                              cursor: isCheckingCoupon || !couponCodeInput.trim() ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isCheckingCoupon ? 'Cek...' : 'Terapkan'}
                          </button>
                        </div>
                        {couponError && (
                          <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '6px', fontWeight: 600 }}>
                            {couponError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    borderRadius: '10px',
                    backgroundColor: isPaid ? '#4F46E5' : 'var(--accent-dark)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '14px',
                    border: 0,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '8px',
                    opacity: loading ? 0.7 : 1,
                    transition: 'background-color 0.15s',
                  }}
                >
                  {loading
                    ? 'Memproses...'
                    : isPaid
                    ? currentPrice === 0
                      ? 'Dapatkan Akses Gratis (Kupon 100%) →'
                      : `Beli Sekarang — ${formatIDR(currentPrice)} →`
                    : 'Daftar & Mulai Belajar Gratis →'}
                </button>

                {isPaid && waInquiryUrl && (
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <a
                      href={waInquiryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '13px',
                        color: '#4B5563',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Punya pertanyaan? <span style={{ color: '#059669', textDecoration: 'underline' }}>Chat Promotor via WhatsApp ↗</span>
                    </a>
                  </div>
                )}

                <div style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: 1.5, marginTop: '8px' }}>
                  Dengan melanjutkan, Anda menyetujui syarat & ketentuan akses materi ruang belajar.
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
