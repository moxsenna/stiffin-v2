'use client';

/**
 * Feed "Balasan masuk" di halaman WhatsApp.
 * Menampilkan pesan yang diterima gateway, dengan nama kontak yang sudah
 * digabung oleh backend.
 * Selama feed terlihat dan ada pesan belum dibaca, pesan ditandai sudah dibaca.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useWhatsAppInbox } from './use-whatsapp-inbox';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(diffMs / 3600_000);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(diffMs / (24 * 3600_000));
  if (days < 7) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function WhatsAppInbox() {
  const { messages, markRead } = useWhatsAppInbox(15_000);
  const [, forceTick] = useState(0);
  const markReadAttemptedRef = useRef(false);

  // Selama feed terlihat dan ada pesan belum dibaca, tandai dibaca sekali per kemunculan pesan baru.
  useEffect(() => {
    const list = messages ?? [];
    const hasUnread = list.some((m) => !m.isRead);

    if (hasUnread && !markReadAttemptedRef.current) {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        markReadAttemptedRef.current = true;
        void markRead();
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const currentList = messages ?? [];
        if (currentList.some((m) => !m.isRead)) {
          markReadAttemptedRef.current = true;
          void markRead();
        }
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [messages, markRead]);

  // Re-render tiap 60 detik supaya waktu relatif tetap mutakhir.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const list = messages ?? [];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '4px 2px 10px',
        }}
      >
        <span
          style={{
            font: '700 15px/20px var(--font-sans, Inter, system-ui, sans-serif)',
            color: 'var(--ink, #191918)',
          }}
        >
          Balasan Masuk
        </span>
        <span
          style={{
            font: '400 12px/16px var(--font-sans, Inter, system-ui, sans-serif)',
            color: 'var(--muted-strong, #71706B)',
          }}
        >
          {list.length > 0 ? `${list.length} pesan` : null}
        </span>
      </div>

      {list.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px dashed var(--border, #D5D3CE)',
            borderRadius: 12,
            padding: '24px 16px',
            textAlign: 'center',
            font: '400 13px/19px var(--font-sans, Inter, system-ui, sans-serif)',
            color: 'var(--muted-strong, #71706B)',
          }}
        >
          Belum ada balasan masuk. Saat klien membalas WhatsApp Anda, pesan akan muncul di sini.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((m) => {
            const senderName = m.contactName || (m.phoneE164.startsWith('+') ? m.phoneE164 : `+${m.phoneE164}`);
            return (
              <div
                key={m.id}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border-soft, #E8E7E3)',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {!m.isRead && (
                      <span
                        aria-hidden
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#167A68',
                          flex: 'none',
                        }}
                      />
                    )}
                    <span
                      style={{
                        font: '600 13.5px/18px var(--font-sans, Inter, system-ui, sans-serif)',
                        color: 'var(--ink, #191918)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {senderName}
                    </span>
                  </div>
                  <span
                    style={{
                      font: '400 11.5px/16px var(--font-sans, Inter, system-ui, sans-serif)',
                      color: 'var(--muted-light, #9C9A94)',
                      flex: 'none',
                    }}
                  >
                    {relativeTime(m.receivedAt)}
                  </span>
                </div>
                <div
                  style={{
                    font: '400 13.5px/20px var(--font-sans, Inter, system-ui, sans-serif)',
                    color: 'var(--text-sub, #3B3A37)',
                    paddingTop: 4,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.text || (m.type !== 'text' ? `[${m.type}]` : '')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
