import fs from 'node:fs';

const pdfExportFile = 'src/lib/pdf/export-document.ts';
const landingFile = 'src/app/(public)/p/[workspaceSlug]/[programSlug]/PublicLandingClient.tsx';

if (!fs.existsSync(pdfExportFile) || !fs.existsSync(landingFile)) {
  console.error('Missing export-document.ts or PublicLandingClient.tsx');
  process.exit(1);
}

const pdfContent = fs.readFileSync(pdfExportFile, 'utf8');
const landingContent = fs.readFileSync(landingFile, 'utf8');

const hasSyllabusExport = pdfContent.includes('exportSyllabusToPdf');
const hasCertificateExport = pdfContent.includes('exportCertificateToPdf');
const hasTrailerSupport = landingContent.includes('trailerVideoUrl') || landingContent.includes('videoUrl');

if (!hasSyllabusExport || !hasCertificateExport) {
  console.error('PDF export missing exportSyllabusToPdf or exportCertificateToPdf');
  process.exit(1);
}
if (!hasTrailerSupport) {
  console.error('Trailer video URL not supported in landing client');
  process.exit(1);
}

console.log('GATECHECK trailer pdf passed');
