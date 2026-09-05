import type { Metadata, Viewport } from 'next';
import '@/styles/tokens.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Ralivo Class — Client Education OS',
  description: 'Mengubah aktivitas belajar peserta menjadi sinyal intent dan aksi bisnis promotor. Program edukasi, refleksi, intent HOT/WARM/COLD, dan follow-up dalam satu tempat.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Ralivo Class — Client Education OS',
    description: 'Program edukasi, refleksi, intent scoring, dan follow-up 1-tap untuk promotor STIFIn.',
    type: 'website',
    locale: 'id_ID',
  },
  appleWebApp: {
    capable: true,
    title: 'Ralivo Class',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
