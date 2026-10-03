'use client';

/**
 * Badge jumlah balasan WhatsApp belum dibaca untuk header halaman Hari Ini.
 * Polling setiap 20 detik saat tab terlihat.
 * Tidak pernah menandai dibaca (hanya halaman inbox yang menandai dibaca).
 * Sembunyi jika tidak ada pesan belum dibaca.
 */

import React from 'react';
import Link from 'next/link';
import { useWhatsAppInbox } from './use-whatsapp-inbox';

export function WhatsAppReplyBadge() {
  const { unreadCount } = useWhatsAppInbox(20_000);

  if (unreadCount <= 0) return null;

  return (
    <Link
      href="/app/settings/whatsapp"
      aria-label={`${unreadCount} balasan WhatsApp belum dibaca`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 10px',
        borderRadius: 8,
        background: 'rgba(22, 122, 104, 0.1)',
        border: '1px solid rgba(22, 122, 104, 0.2)',
        textDecoration: 'none',
        font: '600 12px/16px var(--font-sans, Inter, system-ui, sans-serif)',
        color: '#167A68',
        whiteSpace: 'nowrap',
        transition: 'background-color 0.15s ease',
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12.5 7A5.5 5.5 0 1 1 7 1.5c2.6 0 4.8 1.7 5.4 4" />
        <path d="M12.6 1.5v3h-3" />
      </svg>
      <span>{unreadCount} balasan</span>
    </Link>
  );
}
