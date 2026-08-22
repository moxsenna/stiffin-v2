import type { Metadata, Viewport } from 'next';
import '@/styles/tokens.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'PromotorFlow — Pipeline & Daily Execution OS',
  description: 'Sistem operasional harian promotor untuk kelola prospek, booking, dan aftercare STIFIn.',
  appleWebApp: {
    capable: true,
    title: 'PromotorFlow',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#125E51',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
