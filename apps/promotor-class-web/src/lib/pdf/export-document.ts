// PDF Document Exporter for Syllabus and Verified Certificate

export interface SyllabusExportData {
  programTitle: string;
  promoterName?: string;
  modules: Array<{
    title: string;
    lessons: Array<{ title: string; duration?: string }>;
  }>;
}

export interface CertificateExportData {
  serialNumber: string;
  recipientName: string;
  programTitle: string;
  issuedAt: string;
  verificationUrl?: string;
}

export function exportSyllabusToPdf(data: SyllabusExportData): void {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Silabus - ${data.programTitle}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #0F172A; }
        h1 { font-size: 24px; color: #0D52FF; margin-bottom: 4px; }
        .meta { color: #64748B; font-size: 14px; margin-bottom: 24px; }
        .module { margin-bottom: 20px; border-left: 3px solid #0D52FF; padding-left: 12px; }
        .module-title { font-weight: 700; font-size: 16px; margin-bottom: 6px; }
        .lesson-item { font-size: 13.5px; color: #334155; padding: 4px 0; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${data.programTitle}</h1>
      <div class="meta">Silabus Resmi Kursus & Mentoring${data.promoterName ? ` • Oleh ${data.promoterName}` : ''}</div>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin-bottom: 20px;" />
      ${data.modules
        .map(
          (m, i) => `
        <div class="module">
          <div class="module-title">Modul ${i + 1}: ${m.title}</div>
          ${m.lessons.map((l, j) => `<div class="lesson-item">${i + 1}.${j + 1} ${l.title}</div>`).join('')}
        </div>
      `
        )
        .join('')}
      <script>
        window.onload = () => { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function exportCertificateToPdf(data: CertificateExportData): void {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Sertifikat - ${data.recipientName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, serif; padding: 40px; text-align: center; color: #0F172A; background: #FAFAFA; }
        .cert-card { border: 4px double #0D52FF; padding: 48px 32px; border-radius: 12px; background: #FFFFFF; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .kicker { font-size: 14px; letter-spacing: 0.15em; text-transform: uppercase; color: #0D52FF; font-weight: 700; }
        h1 { font-size: 32px; margin: 16px 0; color: #0A0A0A; }
        .name { font-size: 28px; font-weight: 800; color: #0D52FF; border-bottom: 2px solid #E2E8F0; display: inline-block; padding-bottom: 8px; margin: 20px 0; }
        .body { font-size: 16px; line-height: 1.6; color: #475569; max-width: 600px; margin: 0 auto; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; color: #64748B; }
        @media print { body { padding: 0; background: #FFF; } .cert-card { box-shadow: none; border-width: 2px; } }
      </style>
    </head>
    <body>
      <div class="cert-card">
        <div class="kicker">SERTIFIKAT KELULUSAN</div>
        <h1>Ralivo Promotor Academy</h1>
        <p class="body">Diberikan secara terhormat kepada:</p>
        <div class="name">${data.recipientName}</div>
        <p class="body">Telah berhasil menyelesaikan seluruh kurikulum dan evaluasi program pembelajaran:</p>
        <h2 style="font-size: 20px; color: #0F172A; margin: 12px 0;">${data.programTitle}</h2>
        <div class="footer">
          <div>
            <div>Nomor Seri: <strong>${data.serialNumber}</strong></div>
            <div>Diterbitkan: ${new Date(data.issuedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
          </div>
          <div>
            <div style="font-weight: 700; color: #0D52FF;">TERVERIFIKASI DIGITAL</div>
            <div>${data.verificationUrl || 'ralivo.biz.id/verify'}</div>
          </div>
        </div>
      </div>
      <script>
        window.onload = () => { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
