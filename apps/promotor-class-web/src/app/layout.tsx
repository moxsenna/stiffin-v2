import type { Metadata, Viewport } from 'next';
import '@/styles/tokens.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'PromotorClass — Client Education OS',
  description: 'Mengubah aktivitas belajar peserta menjadi sinyal intent dan aksi bisnis promotor. Program edukasi, refleksi, intent HOT/WARM/COLD, dan follow-up dalam satu tempat.',
  openGraph: {
    title: 'PromotorClass — Client Education OS',
    description: 'Program edukasi, refleksi, intent scoring, dan follow-up 1-tap untuk promotor STIFIn.',
    type: 'website',
    locale: 'id_ID',
  },
  appleWebApp: {
    capable: true,
    title: 'PromotorClass',
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
