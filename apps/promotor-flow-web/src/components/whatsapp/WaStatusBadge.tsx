'use client';

/**
 * Badge status koneksi WhatsApp untuk header halaman.
 * Kompak: titik berwarna + label pendek, klik → /app/settings/whatsapp.
 */

import React from 'react';
import Link from 'next/link';
import { WaStatusPill } from './WaStatusPill';
import { useWhatsAppStatus } from './use-whatsapp-status';

export function WaStatusBadge() {
  useWhatsAppStatus(30_000);

  return (
    <Link
      href="/app/settings/whatsapp"
      aria-label="Buka pengaturan koneksi WhatsApp"
      style={{ textDecoration: 'none', display: 'inline-flex' }}
    >
      <WaStatusPill />
    </Link>
  );
}
