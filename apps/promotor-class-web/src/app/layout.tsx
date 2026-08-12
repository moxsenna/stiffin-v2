import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'PromotorClass — Client Education OS',
  description: 'Mengubah aktivitas belajar peserta menjadi sinyal intent dan aksi bisnis promotor.',
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
