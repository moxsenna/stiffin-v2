import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/app',
    name: 'Ralivo Flow — Pipeline & Daily Execution OS',
    short_name: 'Ralivo Flow',
    description: 'Sistem operasional harian promotor untuk kelola prospek, booking, dan aftercare STIFIn',
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
    ],
  };
}
