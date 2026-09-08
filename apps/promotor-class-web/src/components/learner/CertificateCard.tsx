'use client';

import React from 'react';
import type { Certificate } from '@promotor/contracts';
import { renderCertificateCanvas, downloadCanvasPng } from '@/lib/certificate/certificate-canvas';

export function CertificateCard({
  certificate,
  verifyUrl,
}: {
  certificate: Certificate;
  verifyUrl: string;
}) {
  const handleDownload = async () => {
    const canvas = await renderCertificateCanvas(certificate, verifyUrl);
    downloadCanvasPng(canvas, `sertifikat-${certificate.serial}.png`);
  };
  const handlePrint = async () => {
    const canvas = await renderCertificateCanvas(certificate, verifyUrl);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<html><head><title>Sertifikat ${certificate.serial}</title></head>` +
        `<body style="margin:0"><img src="${canvas.toDataURL('image/png')}" style="width:100%" onload="window.print()" /></body></html>`
    );
    win.document.close();
  };

  return (
    <section style={{ marginTop: 24, border: '2px solid var(--accent)', padding: 16 }}>
      <div className="kicker">Sertifikat Digital</div>
      <h2 style={{ font: '700 18px/1.4 var(--font-sans)', marginTop: 4 }}>
        Selamat, {certificate.recipientName}!
      </h2>
      <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
        Serial <strong>{certificate.serial}</strong> — bagikan ke WhatsApp Status / Instagram Story /
        LinkedIn.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={handleDownload}>
          Unduh PNG
        </button>
        <button type="button" className="btn btn-secondary" onClick={handlePrint}>
          Cetak / Simpan PDF
        </button>
      </div>
      <p
        style={{
          font: '400 11px/1.4 var(--font-sans)',
          color: 'var(--muted-strong)',
          marginTop: 8,
          overflowWrap: 'anywhere',
        }}
      >
        Verifikasi keaslian: {verifyUrl}
      </p>
    </section>
  );
}
