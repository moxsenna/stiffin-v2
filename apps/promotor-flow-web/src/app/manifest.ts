import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/app',
    name: 'Talira Flow — Asisten Bisnis & CRM Promotor',
    short_name: 'Talira Flow',
    description: 'Sistem operasional harian promotor untuk kelola prospek, booking, dan aftercare',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#F8F8F6',
    theme_color: '#125E51',
    orientation: 'portrait',
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/pwa-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/pwa-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/pwa-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
