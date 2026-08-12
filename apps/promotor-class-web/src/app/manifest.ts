import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'PromotorClass',
    short_name: 'PromotorClass',
    description: 'Client Education OS & Intent Signal Engine untuk Promotor STIFIn',
    start_url: '/learn',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F7F5',
    theme_color: '#286344',
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
