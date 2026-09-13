'use client';

import React, { useState } from 'react';
import { getPlatformApiClient } from '@/adapters';

interface UpsellSheetProps {
  product: 'FLOW' | 'CLASS';
  onClose: () => void;
}

export function UpsellSheet({ product, onClose }: { product: 'FLOW' | 'CLASS'; onClose: () => void }) {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFlow = product === 'FLOW';

  const handlePaycoreCheckout = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const api = getPlatformApiClient();
      await api.recordBridgeMetric('upgrade_started', {
        product,
        surface: 'upsell_sheet',
      }).catch(() => null);

      const returnUrl = typeof window !== 'undefined' ? window.location.href : undefined;
      const res = await api.createSubscriptionCheckout({
        planCode: 'SOLO',
        billingCycle,
        returnUrl,
      });

      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        setErrorMessage('Gagal mendapatkan tautan pembayaran Paycore.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat menyiapkan pembayaran.');
      setIsProcessing(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          maxWidth: '460px',
          width: '100%',
          padding: '28px 24px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #E2E8F0',
          position: 'relative',
        }}
      >
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 0,
            color: '#94A3B8',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
            lineHeight: 1,
            borderRadius: '6px',
          }}
        >
          ✕
        </button>

        {/* Product Tag Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1D4ED8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '12px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
          {isFlow ? 'UPGRADE KE RALIVO FLOW' : 'UPGRADE KE RALIVO CLASS'}
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 850, margin: '0 0 8px', color: '#0F172A', letterSpacing: '-0.025em' }}>
          {isFlow ? 'Aktifkan Ralivo Flow' : 'Aktifkan Ralivo Class'}
        </h3>

        <p style={{ fontSize: '13.5px', lineHeight: 1.55, color: '#475569', margin: '0 0 18px' }}>
          {isFlow
            ? 'Ubah sinyal belajar dan refleksi peserta menjadi antrian follow-up WhatsApp terjadwal otomatis agar tidak ada prospek hangat yang terlewat.'
            : 'Miliki portal belajar mandiri, kurikulum terstruktur, penugasan refleksi, dan sertifikat otomatis yang terhubung ke pipeline prospek Anda.'}
        </p>

        {/* Value Bullet Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {(isFlow
            ? [
                'Antrian follow-up harian otomatis dari aktivitas belajar',
                'Pipeline visual prospek STIFIn & kalender booking',
                'Evaluasi berkala D+7 aftersales tanpa repot rekap',
              ]
            : [
                'Jual program kelas berbayar via Paycore tanpa komisi %',
                'Kupon diskon promo & pelacakan omzet realtime',
                'Deteksi prospek minat tinggi dari respon refleksi',
              ]
          ).map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '10px', fontWeight: 900 }}>
                ✓
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Billing Cycle Selector */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setBillingCycle('MONTHLY')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 0,
              backgroundColor: billingCycle === 'MONTHLY' ? '#FFFFFF' : 'transparent',
              color: billingCycle === 'MONTHLY' ? '#0F172A' : '#64748B',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: billingCycle === 'MONTHLY' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            Bulanan (Rp149rb)
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('YEARLY')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 0,
              backgroundColor: billingCycle === 'YEARLY' ? '#FFFFFF' : 'transparent',
              color: billingCycle === 'YEARLY' ? '#0F172A' : '#64748B',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: billingCycle === 'YEARLY' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            Tahunan (Hemat 17%)
          </button>
        </div>

        {/* Pricing Banner */}
        <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Investasi Solo:</span>
              <span style={{ fontSize: '11px', color: '#94A3B8', textDecoration: 'line-through' }}>
                {billingCycle === 'YEARLY' ? 'Rp 1.788.000' : 'Rp 198.000'}
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 850, color: '#0F172A' }}>
              {billingCycle === 'YEARLY' ? 'Rp 1.490.000' : 'Rp 149.000'}
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>
                {billingCycle === 'YEARLY' ? ' / thn' : ' / bln'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
              {billingCycle === 'YEARLY'
                ? '🎉 Add-on dicoret dari Rp 600rb jadi cuma nambah Rp 200rb/thn'
                : '🎉 Add-on dicoret dari Rp 99rb jadi cuma nambah Rp 50rb/bln'}
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, textAlign: 'right' }}>
            Aktivasi Otomatis Paycore
          </div>
        </div>

        {errorMessage && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '12px', fontWeight: 600, marginBottom: '14px' }}>
            {errorMessage}
          </div>
        )}

        {/* Paycore Direct Checkout Button */}
        <button
          type="button"
          onClick={handlePaycoreCheckout}
          disabled={isProcessing}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '10px',
            border: 0,
            background: '#2563EB',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '14px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.28)',
            marginBottom: '10px',
            transition: 'opacity 0.15s',
          }}
        >
          {isProcessing ? 'Menyiapkan Checkout Paycore...' : 'Aktifkan Sekarang via Paycore →'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#94A3B8', marginBottom: '12px' }}>
          Pembayaran instan via QRIS, Virtual Account Bank &amp; E-Wallet
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '9px 16px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            fontWeight: 700,
            fontSize: '12.5px',
            cursor: 'pointer',
            color: '#64748B',
          }}
        >
          Nanti saja
        </button>
      </div>
    </div>
  );
}
