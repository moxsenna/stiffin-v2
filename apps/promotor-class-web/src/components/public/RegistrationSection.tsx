'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicProgramDetail } from '@/modules/public-storefront/types';
import { getEnrollmentRepository, getPaymentRepository } from '@/adapters';
import { setActiveLearnerSession } from '@/lib/session';
import { PublicPaymentInfo, CreatePublicPurchaseResponse, PurchaseMethod } from '@promotor/contracts';

interface RegistrationSectionProps {
  detail: PublicProgramDetail;
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function RegistrationSection({ detail }: RegistrationSectionProps) {
  const { program, isRegistrationAllowed, registrationStatusNotice, promoter } = detail;

  const isPaidProgram = program.pricing === 'one_time' && (program.priceAmount || 0) > 0;
  const isAftersales = program.programType === 'aftersales';

  // Free Registration Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEnrollmentId, setCreatedEnrollmentId] = useState<string | null>(null);

  // Paid Commerce Form States
  const [paymentInfo, setPaymentInfo] = useState<PublicPaymentInfo | null>(null);
  const hasBankAccounts = paymentInfo?.bankAccounts && paymentInfo.bankAccounts.length > 0;
  const isBankTransferAvailable = ((program as any).bankTransferEnabled ?? true) && (paymentInfo === null || Boolean(hasBankAccounts));
  const isWhatsAppAvailable = (program as any).whatsAppEnabled ?? true;

  const [chosenMethod, setChosenMethod] = useState<PurchaseMethod>('WHATSAPP');
  const [buyerNote, setBuyerNote] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | undefined>(undefined);
  const [purchaseResult, setPurchaseResult] = useState<CreatePublicPurchaseResponse | null>(null);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    if (isPaidProgram) {
      const repo = getPaymentRepository();
      repo
        .getPublicPaymentInfo(promoter.workspaceSlug)
        .then((info) => {
          setPaymentInfo(info);
          if (info.bankAccounts && info.bankAccounts.length > 0) {
            setSelectedBankAccountId(info.bankAccounts[0].id);
            if (isBankTransferAvailable) {
              setChosenMethod('BANK_TRANSFER');
            }
          } else {
            setChosenMethod('WHATSAPP');
          }
        })
        .catch((err) => {
          console.warn('[RegistrationSection] Failed to load payment info:', err);
        });
    }
  }, [isPaidProgram, promoter.workspaceSlug]);

  const handleFreeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRegistrationAllowed) return;

    setError(null);
    setLoading(true);

    try {
      const enrollmentRepo = getEnrollmentRepository();
      const res = await enrollmentRepo.registerPublicLearner({
        workspaceSlug: promoter.workspaceSlug,
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
        workspaceSlug: promoter.workspaceSlug,
      });

      setCreatedEnrollmentId(res.enrollmentId);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat pendaftaran. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const paymentRepo = getPaymentRepository();
      const res = await paymentRepo.createPublicPurchaseRequest(
        promoter.workspaceSlug,
        program.programSlug,
        {
          name: name.trim(),
          phone: phone.trim(),
          purchaseMethod: chosenMethod,
          bankAccountId: chosenMethod === 'BANK_TRANSFER' ? selectedBankAccountId : undefined,
          buyerNote: buyerNote.trim() || undefined,
        }
      );

      setPurchaseResult(res);

      // If WhatsApp method, auto-open deep link if available
      const waUrl = res.whatsappPurchaseUrl || res.paymentInstructions?.whatsappConfirmationUrl;
      if (chosenMethod === 'WHATSAPP' && waUrl) {
        window.open(waUrl, '_blank');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses pesanan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, type: 'ref' | 'bank', id?: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'ref') {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } else if (id) {
      setCopiedBankId(id);
      setTimeout(() => setCopiedBankId(null), 2000);
    }
  };

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
        {/* Left Column: Copy & Program Value */}
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
            {isPaidProgram ? 'Pemesanan & Akses Program' : isAftersales ? 'Akses Peserta Tes' : 'Akses Ruang Belajar'}
          </div>

          <h2
            style={{
              fontSize: 'clamp(24px, 3.5vw, 34px)',
              letterSpacing: '-0.04em',
              marginBottom: '14px',
              fontWeight: 780,
              lineHeight: 1.18,
            }}
          >
            {isPaidProgram
              ? `Dapatkan akses lengkap materi "${program.title}"`
              : isAftersales
              ? 'Program pendampingan lanjutan khusus peserta tes STIFIn'
              : 'Mulai kenali dan optimalkan potensi genetik Anda sekarang.'}
          </h2>

          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '14.5px',
              lineHeight: 1.65,
              marginBottom: '20px',
            }}
          >
            {isPaidProgram
              ? 'Pilih metode pembayaran yang memudahkan Anda (Transfer Bank atau WhatsApp). Pesanan Anda akan diverifikasi langsung oleh promotor dan akses kelas akan segera diaktifkan.'
              : 'Masukkan nama dan nomor WhatsApp aktif Anda. Materi pembelajaran langsung terbuka dan progres Anda tersimpan dengan rapi di aplikasi.'}
          </p>

          {isPaidProgram && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                border: '1px solid var(--color-divider)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 750 }}>
                Investasi Pembelajaran
              </div>
              <div style={{ fontSize: '24px', fontWeight: 850, color: 'var(--accent-dark)' }}>
                {formatIDR(program.priceAmount || 0)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                ✓ Akses penuh seluruh modul &amp; materi • ✓ Pendampingan &amp; konsultasi
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Form / Confirmation Screen */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderRadius: '0px',
            padding: '24px',
          }}
        >
          {/* CASE 1: FREE PROGRAM SUCCESS */}
          {createdEnrollmentId ? (
            <div
              style={{
                border: '1px solid #cfded3',
                backgroundColor: '#f4f8f5',
                padding: '24px',
                borderRadius: '0px',
              }}
            >
              <strong
                style={{
                  display: 'block',
                  color: 'var(--accent-dark)',
                  marginBottom: '8px',
                  fontSize: '17px',
                }}
              >
                Pendaftaran Berhasil!
              </strong>
              <p style={{ fontSize: '14px', color: '#55544f', marginBottom: '20px', lineHeight: 1.5 }}>
                Program telah berhasil ditambahkan ke ruang belajar Anda.
              </p>
              <Link
                href={`/learn/programs/${createdEnrollmentId}`}
                className="touch-target-primary"
                style={{
                  width: '100%',
                  minHeight: '48px',
                  borderRadius: '0px',
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
          ) : isPaidProgram ? (
            /* CASE 2: PAID PROGRAM FLOW */
            purchaseResult ? (
              /* SUB-CASE 2A: PURCHASE REQUEST SUBMITTED (PAYMENT INSTRUCTIONS) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Pesanan Berhasil Diajukan
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                    Instruksi Pembayaran &amp; Konfirmasi
                  </h3>
                </div>

                {/* Reference Box */}
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#FEF3C7',
                    border: '1.5px dashed #D97706',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 750, textTransform: 'uppercase' }}>
                      Kode Pesanan Anda
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#78350F' }}>
                      {purchaseResult.purchaseRequest.purchaseReference}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(purchaseResult.purchaseRequest.purchaseReference, 'ref')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D97706',
                      color: '#92400E',
                      fontSize: '12px',
                      fontWeight: 750,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedRef ? '✓ Tersalin' : 'Salin Kode'}
                  </button>
                </div>

                {/* Amount */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-divider)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Total yang harus dibayar:</span>
                  <span style={{ fontSize: '16px', fontWeight: 850, color: 'var(--color-text-main)' }}>
                    {formatIDR(purchaseResult.purchaseRequest.priceAmount)}
                  </span>
                </div>

                {/* BANK TRANSFER INSTRUCTIONS */}
                {purchaseResult.purchaseRequest.purchaseMethod === 'BANK_TRANSFER' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 750 }}>
                      Rekening Transfer Tujuan:
                    </div>

                    {purchaseResult.paymentInstructions?.bankAccounts && purchaseResult.paymentInstructions.bankAccounts.length > 0 ? (
                      purchaseResult.paymentInstructions.bankAccounts.map((b) => (
                        <div
                          key={b.id}
                          style={{
                            padding: '12px 14px',
                            backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                            border: '1px solid var(--color-divider)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 800 }}>{b.bankName}</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', marginTop: '2px' }}>
                              {b.accountNumber}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                              a.n. {b.accountHolderName}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyText(b.accountNumber, 'bank', b.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-divider)',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {copiedBankId === b.id ? '✓ Tersalin' : 'Salin No. Rek'}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                        Hubungi promotor untuk informasi rekening.
                      </div>
                    )}

                    <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginTop: '4px' }}>
                      <strong>Langkah Selanjutnya:</strong>
                      <ol style={{ paddingLeft: '18px', margin: '6px 0 0 0' }}>
                        <li>Transfer sesuai nominal di atas ke salah satu rekening.</li>
                        <li>Klik tombol konfirmasi di bawah untuk mengirim bukti transfer ke WhatsApp promotor.</li>
                        <li>Promotor akan menyetujui pesanan Anda dan akses materi akan otomatis aktif.</li>
                      </ol>
                    </div>

                    {purchaseResult.paymentInstructions?.whatsappConfirmationUrl && (
                      <a
                        href={purchaseResult.paymentInstructions.whatsappConfirmationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="touch-target-primary"
                        style={{
                          marginTop: '8px',
                          minHeight: '46px',
                          backgroundColor: '#166534',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '14px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>💬</span>
                        <span>Konfirmasi via WhatsApp Sekarang →</span>
                      </a>
                    )}
                  </div>
                )}

                {/* WHATSAPP METHOD INSTRUCTIONS */}
                {purchaseResult.purchaseRequest.purchaseMethod === 'WHATSAPP' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                      Pesanan Anda telah tercatat. Silakan lanjutkan transaksi dan konfirmasi dengan promotor melalui percakapan WhatsApp.
                    </p>

                    {(purchaseResult.whatsappPurchaseUrl || purchaseResult.paymentInstructions?.whatsappConfirmationUrl) && (
                      <a
                        href={purchaseResult.whatsappPurchaseUrl || purchaseResult.paymentInstructions?.whatsappConfirmationUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="touch-target-primary"
                        style={{
                          minHeight: '46px',
                          backgroundColor: '#166534',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '14px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>💬</span>
                        <span>Buka Chat WhatsApp Promotor →</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* SUB-CASE 2B: PAID PURCHASE FORM */
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '6px', fontWeight: 800 }}>
                  Formulir Pemesanan Kelas
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
                  Lengkapi data pemesan untuk pengaktifan akses materi pembelajaran.
                </p>

                {error && (
                  <div
                    style={{
                      backgroundColor: '#FDF2F2',
                      border: '1px solid #F8B4B4',
                      color: '#9B1C1C',
                      padding: '10px 12px',
                      borderRadius: '0px',
                      fontSize: '13px',
                      marginBottom: '14px',
                    }}
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handlePaidSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 750, marginBottom: '6px' }}>
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
                        minHeight: '44px',
                        border: '1px solid var(--color-divider)',
                        borderRadius: '0px',
                        padding: '0 14px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: 'var(--color-surface)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 750, marginBottom: '6px' }}>
                      Nomor WhatsApp Aktif *
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
                        minHeight: '44px',
                        border: '1px solid var(--color-divider)',
                        borderRadius: '0px',
                        padding: '0 14px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: 'var(--color-surface)',
                      }}
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 750, marginBottom: '6px' }}>
                      Pilih Metode Pembelian *
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {isBankTransferAvailable && (
                        <div
                          onClick={() => setChosenMethod('BANK_TRANSFER')}
                          style={{
                            padding: '12px 14px',
                            border:
                              chosenMethod === 'BANK_TRANSFER'
                                ? '2px solid var(--accent-dark)'
                                : '1px solid var(--color-divider)',
                            backgroundColor:
                              chosenMethod === 'BANK_TRANSFER' ? 'var(--color-bg-subtle, #f8fafc)' : 'var(--color-surface)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={chosenMethod === 'BANK_TRANSFER'}
                            onChange={() => setChosenMethod('BANK_TRANSFER')}
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 750 }}>🏦 Transfer Bank (Manual)</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                              Tampilkan nomor rekening dan konfirmasi bukti transfer via WhatsApp
                            </div>
                          </div>
                        </div>
                      )}

                      {isWhatsAppAvailable && (
                        <div
                          onClick={() => setChosenMethod('WHATSAPP')}
                          style={{
                            padding: '12px 14px',
                            border:
                              chosenMethod === 'WHATSAPP'
                                ? '2px solid var(--accent-dark)'
                                : '1px solid var(--color-divider)',
                            backgroundColor:
                              chosenMethod === 'WHATSAPP' ? 'var(--color-bg-subtle, #f8fafc)' : 'var(--color-surface)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={chosenMethod === 'WHATSAPP'}
                            onChange={() => setChosenMethod('WHATSAPP')}
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 750 }}>📱 WhatsApp Langsung</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                              Buka WhatsApp promotor dengan pesan pemesanan dan kode otomatis
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bank Account Selection if multiple */}
                  {chosenMethod === 'BANK_TRANSFER' && paymentInfo?.bankAccounts && paymentInfo.bankAccounts.length > 1 && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 750, marginBottom: '6px' }}>
                        Pilih Rekening Tujuan Transfer:
                      </label>
                      <select
                        value={selectedBankAccountId}
                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '40px',
                          border: '1px solid var(--color-divider)',
                          padding: '0 10px',
                          fontSize: '13px',
                          backgroundColor: 'var(--color-surface)',
                        }}
                      >
                        {paymentInfo.bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountNumber} (a.n. {b.accountHolderName})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 750, marginBottom: '6px' }}>
                      Catatan Pembeli (Opsional)
                    </label>
                    <input
                      type="text"
                      value={buyerNote}
                      onChange={(e) => setBuyerNote(e.target.value)}
                      placeholder="Contoh: Nama pengirim rekening jika beda"
                      style={{
                        width: '100%',
                        minHeight: '40px',
                        border: '1px solid var(--color-divider)',
                        padding: '0 12px',
                        fontSize: '13px',
                        outline: 'none',
                        backgroundColor: 'var(--color-surface)',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="touch-target-primary"
                    style={{
                      width: '100%',
                      minHeight: '48px',
                      borderRadius: '0px',
                      backgroundColor: 'var(--accent-dark)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '14.5px',
                      border: 0,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      marginTop: '4px',
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading
                      ? 'Memproses pesanan...'
                      : chosenMethod === 'BANK_TRANSFER'
                      ? 'Lanjutkan ke Pembayaran Transfer Bank →'
                      : 'Beli & Chat via WhatsApp →'}
                  </button>

                  <div style={{ fontSize: '11px', color: '#929087', lineHeight: 1.5, marginTop: '4px' }}>
                    Akses kelas akan segera aktif setelah promotor memverifikasi konfirmasi pembayaran Anda.
                  </div>
                </form>
              </div>
            )
          ) : isRegistrationAllowed ? (
            /* CASE 3: FREE / LEAD MAGNET REGISTRATION FORM */
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '6px', fontWeight: 750 }}>
                Daftar &amp; Buka Akses
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.55,
                  marginBottom: '18px',
                }}
              >
                Program ini gratis untuk umum &amp; calon peserta STIFIn. Materi langsung dapat diakses setelah mendaftar.
              </p>

              {error && (
                <div
                  style={{
                    backgroundColor: '#FDF2F2',
                    border: '1px solid #F8B4B4',
                    color: '#9B1C1C',
                    padding: '10px 12px',
                    borderRadius: '0px',
                    fontSize: '13px',
                    marginBottom: '14px',
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleFreeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 750, marginBottom: '6px' }}>
                    Nama lengkap *
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
                      border: '1px solid var(--color-divider)',
                      borderRadius: '0px',
                      padding: '0 14px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 750, marginBottom: '6px' }}>
                    Nomor WhatsApp *
                  </label>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812 3456 7890"
                    style={{
                      width: '100%',
                      minHeight: '46px',
                      border: '1px solid var(--color-divider)',
                      borderRadius: '0px',
                      padding: '0 14px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    borderRadius: '0px',
                    backgroundColor: 'var(--accent-dark)',
                    color: '#FFFFFF',
                    fontWeight: 780,
                    fontSize: '14px',
                    border: 0,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '4px',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Memproses pendaftaran...' : 'Daftar & mulai belajar'}
                </button>

                <div style={{ fontSize: '11px', color: '#929087', lineHeight: 1.5, marginTop: '8px' }}>
                  Dengan mendaftar, Anda menyetujui penggunaan data untuk akses program dan komunikasi terkait pembelajaran.
                </div>
              </form>
            </div>
          ) : (
            /* CASE 4: AFTERSALES OR RESTRICTED ACCESS */
            <div
              style={{
                backgroundColor: 'var(--color-surface-muted)',
                padding: '20px',
                borderRadius: '0px',
                border: '1px solid var(--color-divider)',
              }}
            >
              <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 750 }}>
                {program.programType === 'aftersales' ? 'Khusus Peserta Tes STIFIn' : 'Informasi Pendaftaran'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                {registrationStatusNotice ||
                  'Pendaftaran mandiri secara umum tidak tersedia untuk materi ini.'}
              </p>
              {promoter.whatsappPhoneE164 ? (
                <a
                  href={`https://wa.me/${promoter.whatsappPhoneE164.replace(/\+/g, '')}?text=Saya%20ingin%20tanya%20akses%20program%20ini`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: '44px',
                    borderRadius: '0px',
                    backgroundColor: 'var(--accent-dark)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    textDecoration: 'none',
                    marginTop: '12px',
                  }}
                >
                  Hubungi Promotor via WhatsApp
                </a>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: '44px',
                    borderRadius: '0px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    color: 'var(--color-text-main)',
                    fontWeight: 700,
                    fontSize: '13px',
                    marginTop: '12px',
                  }}
                >
                  Hubungi Promotor untuk Akses
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
