import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Talira Flow — Asisten Bisnis & CRM Promotor',
  description: 'Sistem operasional harian promotor untuk kelola prospek, booking, dan aftercare. Antrean Today 1-tap WA, booking 14-hari, aftercare D+7.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.webp', sizes: '32x32', type: 'image/webp' },
      { url: '/favicon-16x16.webp', sizes: '16x16', type: 'image/webp' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Talira Flow — Asisten Bisnis & CRM Promotor',
    description: 'Antrean Today, booking 14-hari, dan aftercare D+7 untuk promotor.',
    type: 'website',
    locale: 'id_ID',
    images: [{ url: '/logo-dark.webp', width: 480, height: 160, alt: 'Talira Flow' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Talira Flow',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
