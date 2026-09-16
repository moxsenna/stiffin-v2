'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicProgramDetail } from '@/modules/public-storefront/types';
import { getEnrollmentRepository, getPlatformApiClient } from '@/adapters';
import { setActiveLearnerSession } from '@/lib/session';
import { useCountdown } from '@/components/pwa/pwa';
import { formatIDR } from '@promotor/platform-core';

interface RegistrationSectionProps {
  detail: PublicProgramDetail;
}

type PayMethod = 'qris' | 'va' | 'ewallet';

const PAY_METHODS: Array<{ id: PayMethod; title: string; desc: string; badge?: string }> = [
  { id: 'qris', title: 'QRIS Instant', desc: 'Scan via m-banking / e-wallet • GoPay, OVO, DANA, ShopeePay, BCA Mobile, Livin', badge: 'REKOMENDASI • Bebas Admin' },
  { id: 'va', title: 'Virtual Account Bank', desc: 'BCA, Mandiri, BNI, BRI, Permata • verifikasi otomatis 24/7' },
  { id: 'ewallet', title: 'E-Wallet Direct Debit', desc: 'GoPay, ShopeePay, OVO, DANA (1-Klik)' },
];

const HOLD_SECONDS = 15 * 60;

export function RegistrationSection({ detail }: RegistrationSectionProps) {
  const { program } = detail;
  const isPaid = program.pricing === 'one_time';
  const price = program.priceAmount || 0;
  const variants = program.variants ?? [];
  const defaultVariant = variants.find((v) => v.isDefault) || variants[0];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(defaultVariant?.id ?? null);
  const [couponCodeInput, setCouponCodeInput] = useState('RALIVOEARLY');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number; finalAmount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('qris');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEnrollmentId, setCreatedEnrollmentId] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<{ reference: string; checkoutUrl?: string | null; freeCheckout?: boolean } | null>(null);
  const hold = useCountdown(HOLD_SECONDS, isPaid && !checkoutResult && !createdEnrollmentId);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const listPrice = selectedVariant ? selectedVariant.priceAmount : price;
  const earlyBird = Math.round(listPrice * 0.4);
  const afterEarly = listPrice - earlyBird;
  const voucherCut = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const currentPrice = appliedCoupon ? appliedCoupon.finalAmount : afterEarly;

  useEffect(() => {
    setSelectedVariantId(defaultVariant?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program.programSlug]);

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
    } catch (err: unknown) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Gagal memverifikasi kupon');
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
          setAppliedCoupon({ code: appliedCoupon.code, discountAmount: quote.discountAmount, finalAmount: quote.finalAmount });
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
          setCheckoutResult({ reference: res.reference, checkoutUrl: null, freeCheckout: true });
          return;
        }
        window.location.href = res.checkoutUrl;
        return;
      }
      const enrollmentRepo = getEnrollmentRepository();
      const res = await enrollmentRepo.registerPublicLearner({
        workspaceSlug: detail.promoter.workspaceSlug,
        programSlug: program.programSlug,
        name: name.trim(),
        phoneRaw: phone.trim(),
      });
      if (res.accessToken) {
        try {
          await enrollmentRepo.redeemToken(res.accessToken);
        } catch (redeemErr) {
          console.warn('[RegistrationSection] Token auto-redemption notice:', redeemErr);
        }
      }
      setActiveLearnerSession({ contactId: res.contactId, workspaceSlug: detail.promoter.workspaceSlug });
      setCreatedEnrollmentId(res.enrollmentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses pendaftaran. Silakan coba lagi.');
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

  /* ---------- success states ---------- */
  if (createdEnrollmentId) {
    return (
      <section id="register" aria-label="Pendaftaran berhasil">
        <div className="pwa-card pwa-card-pad" style={{ borderColor: '#A7F3D0', background: '#F0FDF4' }}>
          <strong style={{ display: 'block', color: 'var(--pwa-success)', fontSize: 18 }}>Pendaftaran Berhasil!</strong>
          <p className="pwa-muted" style={{ marginTop: 6 }}>Program telah ditambahkan ke ruang belajar Anda.</p>
          <Link href={`/learn/programs/${createdEnrollmentId}`} className="pwa-cta" style={{ marginTop: 16 }}>
            Mulai belajar sekarang →
          </Link>
        </div>
      </section>
    );
  }

  if (checkoutResult) {
    return (
      <section id="register" aria-label="Pesanan diajukan">
        <div className="pwa-card pwa-card-pad">
          <div style={{ fontSize: 16, fontWeight: 850 }}>
            {checkoutResult.freeCheckout ? 'Akses Gratis Berhasil Diaktifkan!' : 'Pesanan Berhasil Diajukan'}
          </div>
          <div className="pwa-muted" style={{ marginTop: 6 }}>
            Kode Referensi Pesanan: <strong>{checkoutResult.reference}</strong>
            {checkoutResult.freeCheckout && <span style={{ display: 'block', marginTop: 6, color: 'var(--pwa-success)', fontWeight: 700 }}>Kupon 100% diskon diterapkan.</span>}
          </div>
          {checkoutResult.checkoutUrl ? (
            <a href={checkoutResult.checkoutUrl} className="pwa-cta" style={{ marginTop: 14 }}>Lanjutkan Pembayaran →</a>
          ) : (
            <Link href="/learn" className="pwa-cta" style={{ marginTop: 14 }}>Buka Ruang Belajar Sekarang →</Link>
          )}
        </div>
      </section>
    );
  }

  /* ---------- checkout flow ---------- */
  return (
    <section id="register" aria-label={isPaid ? 'Checkout & Enrollment' : 'Daftar & Buka Akses'}>
      <div className="pwa-muted" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
        {isPaid ? 'LANGKAH 2 DARI 2' : 'AKSES RUANG BELAJAR GRATIS'}
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 850, letterSpacing: '-0.02em', margin: '4px 0 0' }}>
        {isPaid ? 'Checkout & Enrollment' : 'Daftar & Buka Akses'}
      </h2>

      {isPaid && (
        <div className="pwa-card" style={{ marginTop: 10, padding: 12, borderRadius: 16, borderColor: '#FDE68A', background: '#FFFBEB' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Slot Kursi Ditahan Sementara</div>
          <div style={{ fontSize: 11.5, color: '#92400E' }}>Selesaikan pendaftaran sebelum kedaluwarsa</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', marginTop: 8, background: '#FEF3C7', borderRadius: 8, padding: '6px 10px', fontSize: 22, fontWeight: 800, letterSpacing: '0.04em', color: '#92400E' }} className="tabular-nums" role="timer" aria-live="polite">
            {hold.mm}:{hold.ss}
          </div>
        </div>
      )}

      {/* Ringkasan pesanan — Pencil spec: white card radius 16 */}
      <div className="pwa-card" style={{ marginTop: 10, padding: 14, borderRadius: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="pwa-pill pwa-pill-dark">INTENSIVE COHORT</span>
          <span className="pwa-pill pwa-pill-blue">BATCH #12 • LIVE ONLINE</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 8, color: '#0F172A' }}>{program.title}</div>
        <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Mulai 10 Mar 2025 • 8 Pekan • 19:30 - 21:30 WIB</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {['16 Sesi Live', 'Mentoring 1-on-1', 'Sertifikat PWA'].map((t) => (
            <span key={t} className="pwa-pill" style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#475569', minHeight: 24, padding: '0 8px', borderRadius: 999, fontSize: 10.5 }}>{t}</span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
        {/* Paket */}
        {isPaid && variants.length > 0 && (
          <div role="radiogroup" aria-label="Pilih paket kelas">
            <label className="pwa-label">Pilih paket kelas</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {variants.map((v) => {
                const selected = selectedVariantId === v.id;
                return (
                  <label
                    key={v.id}
                    className="pwa-card"
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      borderColor: selected ? 'var(--pwa-primary)' : 'var(--pwa-border)',
                      boxShadow: selected ? '0 0 0 3px rgba(13,82,255,0.14)' : undefined,
                    }}
                  >
                    <input type="radio" name="variant" value={v.id} checked={selected} onChange={() => handleVariantSelect(v.id)} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <strong style={{ fontSize: 13 }}>{v.label} {v.isDefault ? '⭐' : ''}</strong>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--pwa-primary)' }}>{formatIDR(v.priceAmount)}</span>
                      </span>
                      {v.description && <span className="pwa-muted" style={{ display: 'block', marginTop: 2 }}>{v.description}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Data peserta */}
        <div style={{ marginTop: 12 }}>
          <label className="pwa-label" htmlFor="co-name">Nama Lengkap *</label>
          <input id="co-name" required className="pwa-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Budi Wicaksono" autoComplete="name" />
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="pwa-label" htmlFor="co-phone">Nomor WhatsApp *</label>
          <input id="co-phone" required type="tel" inputMode="tel" className="pwa-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contoh: 081234567890" autoComplete="tel" />
        </div>
        {isPaid && (
          <div style={{ marginTop: 10 }}>
            <label className="pwa-label" htmlFor="co-email">Email notifikasi (opsional)</label>
            <input id="co-email" type="email" className="pwa-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="budi@example.com" autoComplete="email" />
          </div>
        )}

        {/* Voucher — Pencil spec: white card 16, input 42px #F8FAFC, Pakai #EFF6FF */}
        {isPaid && (
          <div className="pwa-card" style={{ marginTop: 12, padding: 14, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 13, color: '#0F172A' }}>Kupon & Voucher Diskon</strong>
              <span className="pwa-pill pwa-pill-green">1 Kupon Tersedia</span>
            </div>
            {appliedCoupon ? (
              <div className="pwa-nested" style={{ marginTop: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', background: '#ECFDF5', borderColor: '#A7F3D0' }}>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--pwa-success)', fontSize: 13 }}>✓ {appliedCoupon.code} Terpasang</div>
                  <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>Memotong {formatIDR(appliedCoupon.discountAmount)}</div>
                </div>
                <button type="button" onClick={handleRemoveCoupon} style={{ border: 0, background: 'none', color: 'var(--pwa-danger)', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>
                  Hapus
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="pwa-input"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="RALIVOEARLY"
                    aria-label="Kode kupon"
                    style={{ fontFamily: 'monospace', fontWeight: 700, minHeight: 42, background: '#F8FAFC' }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isCheckingCoupon || !couponCodeInput.trim()}
                    style={{ flex: 'none', minHeight: 42, padding: '0 14px', borderRadius: 10, border: 0, background: '#EFF6FF', color: '#0D52FF', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                  >
                    {isCheckingCoupon ? 'Cek...' : 'Pakai'}
                  </button>
                </div>
                {couponError && <div style={{ color: 'var(--pwa-danger)', fontSize: 11.5, marginTop: 6, fontWeight: 700 }}>{couponError}</div>}
              </div>
            )}
          </div>
        )}

        {/* Metode pembayaran */}
        {isPaid && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <strong style={{ fontSize: 13.5 }}>Metode Pembayaran</strong>
              <span className="pwa-muted" style={{ fontSize: 11 }}>Verifikasi Otomatis 24/7</span>
            </div>
            <div role="radiogroup" aria-label="Metode pembayaran" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {PAY_METHODS.map((m) => {
                const selected = payMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPayMethod(m.id)}
                    className="pwa-card"
                    style={{
                      padding: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderColor: selected ? '#0D52FF' : '#E2E8F0',
                      background: selected ? '#EFF6FF' : '#fff',
                      boxShadow: selected ? '0 0 0 3px rgba(13,82,255,0.14)' : undefined,
                      font: 'inherit',
                      color: 'inherit',
                      width: '100%',
                    }}
                  >
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 13.5 }}>{m.title}</strong>
                      {m.badge && <span className="pwa-pill pwa-pill-green">{m.badge}</span>}
                      {selected && <span className="pwa-pill pwa-pill-blue">Dipilih ✓</span>}
                    </span>
                    <span className="pwa-muted" style={{ display: 'block', marginTop: 3 }}>{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Rincian */}
        {isPaid && (
          <div className="pwa-card pwa-card-pad" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 13.5 }}>Rincian Pembayaran</strong>
              <span className="pwa-muted" style={{ fontSize: 11 }}>Invoice Resmi</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <div className="pwa-row"><span className="pwa-muted">Harga Normal Cohort #12</span><strong className="tabular-nums">{formatIDR(listPrice)}</strong></div>
              <div className="pwa-row"><span className="pwa-muted">Diskon Early Bird Cohort</span><strong className="tabular-nums" style={{ color: 'var(--pwa-success)' }}>-{formatIDR(earlyBird)}</strong></div>
              {voucherCut > 0 && (
                <div className="pwa-row"><span className="pwa-muted">Voucher {appliedCoupon?.code}</span><strong className="tabular-nums" style={{ color: 'var(--pwa-success)' }}>-{formatIDR(voucherCut)}</strong></div>
              )}
              <div className="pwa-row"><span className="pwa-muted">Biaya Layanan LMS & Sertifikasi</span><strong style={{ color: 'var(--pwa-success)' }}>Gratis</strong></div>
              <div className="pwa-row" style={{ borderTop: '1px solid var(--pwa-border)', marginTop: 4, paddingTop: 12 }}>
                <span><strong>Total Investasi Belajar</strong><span className="pwa-muted" style={{ display: 'block', fontSize: 11 }}>Sudah termasuk PPN & akses LMS</span></span>
                <strong className="tabular-nums" style={{ fontSize: 18 }}>{formatIDR(currentPrice)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Garansi — Pencil spec: white card, green shield */}
        {isPaid && (
          <div className="pwa-card" style={{ marginTop: 10, padding: 12, borderRadius: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, background: '#ECFDF5', color: '#059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🛡</span>
            <span>
              <strong style={{ fontSize: 13, color: '#0F172A' }}>100% Garansi Uang Kembali 7 Hari</strong>
              <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>Refund tanpa syarat bila sesi awal tidak sesuai ekspektasi.</div>
            </span>
          </div>
        )}

        {error && (
          <div className="pwa-card" role="alert" style={{ marginTop: 10, padding: '10px 12px', borderColor: '#FECACA', background: '#FEF2F2', color: '#9B1C1C', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || (isPaid && hold.left <= 0)} className="pwa-cta" style={{ marginTop: 12, minHeight: 50, borderRadius: 12, fontSize: 14 }}>
          {loading ? 'Memproses...' : isPaid ? `Bayar Sekarang • ${formatIDR(currentPrice)}` : 'Daftar & Mulai Belajar Gratis →'}
        </button>
        {isPaid && (
          <>
            <div className="pwa-muted" style={{ textAlign: 'center', marginTop: 8, fontSize: 11 }}>
              Enkripsi 256-bit SSL • Mitra Pembayaran Resmi Bank Indonesia
            </div>
            <div className="pwa-muted" style={{ textAlign: 'center', marginTop: 4, fontSize: 11 }}>
              Akses instan LMS PWA & Komunitas Discord setelah bayar.
            </div>
          </>
        )}

        {isPaid && waInquiryUrl && (
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <a href={waInquiryUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--pwa-muted)', fontWeight: 600 }}>
              Punya pertanyaan? <span style={{ color: 'var(--pwa-success)', textDecoration: 'underline' }}>Chat Promotor via WhatsApp ↗</span>
            </a>
          </div>
        )}
        <div className="pwa-muted" style={{ fontSize: 11, marginTop: 8 }}>
          Dengan melanjutkan, Anda menyetujui syarat & ketentuan akses materi ruang belajar.
        </div>
      </form>
    </section>
  );
}
