'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Certificate } from '@promotor/contracts';
import { getPlatformApiClient } from '@/adapters';

type Status =
  | { kind: 'loading' }
  | { kind: 'valid'; certificate: Certificate }
  | { kind: 'not_found' };

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const { serial } = use(params);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await getPlatformApiClient().verifyCertificate(serial);
        if (!cancelled) setStatus({ kind: 'valid', certificate: res.certificate });
      } catch {
        if (!cancelled) setStatus({ kind: 'not_found' });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [serial]);

  return (
    <main
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: '48px 20px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div className="kicker">Verifikasi Sertifikat</div>
      <h1 style={{ font: '800 26px/1.2 var(--font-sans)', marginTop: 8 }}>
        Cek Keaslian Sertifikat
      </h1>

      {status.kind === 'loading' && (
        <p style={{ marginTop: 16, color: 'var(--muted-strong)' }}>Memeriksa serial {serial}…</p>
      )}

      {status.kind === 'valid' && (
        <section
          style={{
            marginTop: 20,
            border: '2px solid #16a34a',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div style={{ fontWeight: 700, color: '#16a34a' }}>Sertifikat Valid</div>
          <dl style={{ marginTop: 12, display: 'grid', gap: 8, fontSize: 14 }}>
            <div>
              <dt style={{ color: 'var(--muted-strong)' }}>Nama penerima</dt>
              <dd style={{ fontWeight: 600 }}>{status.certificate.recipientName}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--muted-strong)' }}>Program</dt>
              <dd style={{ fontWeight: 600 }}>{status.certificate.programTitle}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--muted-strong)' }}>Dibimbing oleh</dt>
              <dd style={{ fontWeight: 600 }}>{status.certificate.promoterName}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--muted-strong)' }}>Diterbitkan</dt>
              <dd style={{ fontWeight: 600 }}>
                {new Date(status.certificate.issuedAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
            <div>
              <dt style={{ color: 'var(--muted-strong)' }}>Serial</dt>
              <dd style={{ fontWeight: 600 }}>{status.certificate.serial}</dd>
            </div>
          </dl>
        </section>
      )}

      {status.kind === 'not_found' && (
        <section
          style={{
            marginTop: 20,
            border: '2px solid #dc2626',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div style={{ fontWeight: 700, color: '#dc2626' }}>Sertifikat tidak ditemukan</div>
          <p style={{ marginTop: 8, fontSize: 14, color: 'var(--muted-strong)' }}>
            Serial {serial} tidak terdaftar. Pastikan QR atau tautan verifikasi benar.
          </p>
        </section>
      )}

      <Link
        href="/"
        className="btn btn-secondary"
        style={{ marginTop: 24, display: 'inline-block' }}
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
