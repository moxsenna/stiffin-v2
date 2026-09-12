'use client';
import React from 'react';
import { supportWaUrl } from '@/config/support';

const COPY = {
  FLOW: {
    title: 'Aktifkan PromotorFlow',
    body: 'Sinyal Peserta ini bisa berubah jadi tindak lanjut terjadwal otomatis — Flow mengingatkan siapa yang harus dihubungi berikutnya, dari prospek sampai aftercare.',
    price: 'Tambah Rp 50.000/bulan',
  },
  CLASS: {
    title: 'Aktifkan PromotorClass',
    body: 'Ubah prospek dan booking menjadi program edukasi berbayar — materi, refleksi, sertifikat, dan pembayaran dalam satu tempat.',
    price: 'Mulai Rp 99.000/bulan',
  },
} as const;

export function UpsellSheet({ product, onClose }: { product: 'FLOW' | 'CLASS'; onClose: () => void }) {
  const copy = COPY[product];
  const waUrl = supportWaUrl(
    `Halo Tim Ralivo, saya ingin mengaktifkan ${product === 'FLOW' ? 'PromotorFlow' : 'PromotorClass'} untuk akun saya.`
  );
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 15, 25, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          maxWidth: 420,
          width: '100%',
          padding: 24,
          boxShadow: '0 20px 40px -16px rgba(11, 15, 25, 0.35)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 850, margin: '0 0 8px', color: '#0B0F19', letterSpacing: '-0.02em' }}>
          {copy.title}
        </h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#475569', margin: '0 0 12px' }}>{copy.body}</p>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1D4ED8', marginBottom: 16 }}>{copy.price}</div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '12px 16px',
            borderRadius: 10,
            background: '#2563EB',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: 14,
            textDecoration: 'none',
            marginBottom: 10,
          }}
        >
          Aktifkan via WhatsApp
        </a>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            color: '#475569',
          }}
        >
          Nanti saja
        </button>
      </div>
    </div>
  );
}
