import React from 'react';
import '../styles/globals.css';

export const metadata = {
  title: 'PromotorFlow — Asisten Bisnis Promotor',
  description: 'Sistem operasional harian promotor untuk kelola prospek, booking, dan aftercare.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
