import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'PromotorFlow — Asisten Bisnis Promotor',
  description: 'Sistem operasional harian promotor untuk kelola prospek, booking, dan aftercare.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f3f2f2',
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
