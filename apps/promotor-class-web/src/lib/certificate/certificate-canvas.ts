import type { Certificate } from '@promotor/contracts';
import QRCode from 'qrcode';

const W = 1200;
const H = 900;

export async function renderCertificateCanvas(
  cert: Certificate,
  verifyUrl: string
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // background + double border
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#2563eb';
  ctx.font = '700 26px Archivo, sans-serif';
  ctx.fillText('SERTIFIKAT PENYELESAIAN', W / 2, 130);

  ctx.fillStyle = '#334155';
  ctx.font = '400 18px Archivo, sans-serif';
  ctx.fillText('Diberikan dengan bangga kepada', W / 2, 200);

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 56px Archivo, sans-serif';
  ctx.fillText(cert.recipientName, W / 2, 290);

  ctx.fillStyle = '#334155';
  ctx.font = '400 20px Archivo, sans-serif';
  ctx.fillText('atas keikutsertaan dan penyelesaian program', W / 2, 350);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 34px Archivo, sans-serif';
  ctx.fillText(cert.programTitle, W / 2, 410);

  ctx.font = '400 18px Archivo, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Dibimbing oleh ${cert.promoterName}`, W / 2, 480);

  const issued = new Date(cert.issuedAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  ctx.fillText(`Diterbitkan ${issued}`, W / 2, 520);

  // QR verifikasi
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 180 });
  const qr = new Image();
  await new Promise<void>((resolve, reject) => {
    qr.onload = () => resolve();
    qr.onerror = () => reject(new Error('Gagal memuat QR verifikasi'));
    qr.src = qrDataUrl;
  });
  ctx.drawImage(qr, W / 2 - 90, 590, 180, 180);
  ctx.font = '400 14px Archivo, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Serial: ${cert.serial}`, W / 2, 800);
  ctx.fillText('Pindai QR untuk verifikasi keaslian', W / 2, 824);

  return canvas;
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
