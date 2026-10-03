'use client';

/**
 * QR pairing in-app untuk wakonek.
 * Alur: POST /v1/devices/:id/pairing (pairing token, browser-safe)
 * + SSE /v1/devices/:id/pairing/events?token= untuk QR & status.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface WaPairingQrProps {
  gatewayUrl: string;
  deviceId: string;
  pairingToken: string;
  onConnected: (phone: string) => void;
  onFailed?: (message: string) => void;
}

export function WaPairingQr({
  gatewayUrl,
  deviceId,
  pairingToken,
  onConnected,
  onFailed,
}: WaPairingQrProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [connected, setConnected] = useState(false);
  const [runId, setRunId] = useState(0);

  const onConnectedRef = useRef(onConnected);
  const onFailedRef = useRef(onFailed);
  onConnectedRef.current = onConnected;
  onFailedRef.current = onFailed;

  const regenerate = useCallback(() => {
    setQr(null);
    setExpired(false);
    setRunId((n) => n + 1);
  }, []);

  useEffect(() => {
    const base = gatewayUrl.replace(/\/+$/, '');
    let disposed = false;

    fetch(`${base}/v1/devices/${encodeURIComponent(deviceId)}/pairing`, {
      method: 'POST',
      headers: { 'x-pairing-token': pairingToken },
    })
      .then((res) => {
        if (!res.ok && !disposed) {
          onFailedRef.current?.(`Gagal memulai sesi pairing (${res.status})`);
        }
      })
      .catch((err) => {
        if (!disposed) onFailedRef.current?.(err instanceof Error ? err.message : String(err));
      });

    const sseUrl = `${base}/v1/devices/${encodeURIComponent(deviceId)}/pairing/events?token=${encodeURIComponent(pairingToken)}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('qr', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.qr) {
          setQr(data.qr);
          setExpired(false);
        }
      } catch {
        // ignore invalid chunk
      }
    });

    eventSource.addEventListener('status', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.status === 'disconnected' || data.status === 'logged_out') {
          setExpired(true);
        }
      } catch {
        // ignore
      }
    });

    eventSource.addEventListener('connected', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setConnected(true);
        onConnectedRef.current?.(data.phone ?? '');
      } catch {
        // ignore
      }
    });

    eventSource.onerror = () => {
      // EventSource reconnects automatically
    };

    return () => {
      disposed = true;
      eventSource.close();
    };
  }, [gatewayUrl, deviceId, pairingToken, runId]);

  if (connected) {
    return (
      <div style={{ padding: '28px 16px', textAlign: 'center' }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 12px',
            borderRadius: '50%',
            background: 'var(--color-accent-soft, #E6F2EF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#167A68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 13.5l5 5L20.5 8" />
          </svg>
        </div>
        <div style={{ font: '600 17px/24px var(--font-sans, Inter, system-ui, sans-serif)', color: '#191918' }}>
          WhatsApp terhubung
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div style={{ padding: '28px 16px', textAlign: 'center' }}>
        <div style={{ font: '600 15px/22px var(--font-sans, Inter, system-ui, sans-serif)', color: '#B54708', marginBottom: 6 }}>
          Kode QR kedaluwarsa
        </div>
        <div style={{ font: '400 13px/19px var(--font-sans, Inter, system-ui, sans-serif)', color: '#71706B', marginBottom: 16 }}>
          Sesi QR berakhir sebelum dipindai. Buat kode baru untuk melanjutkan.
        </div>
        <button
          type="button"
          onClick={regenerate}
          className="btn btn-secondary"
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            font: '600 13px/18px var(--font-sans, Inter, system-ui, sans-serif)',
          }}
        >
          Buat QR baru
        </button>
      </div>
    );
  }

  if (qr) {
    return (
      <div style={{ padding: '20px 16px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            padding: 12,
            background: '#fff',
            border: '1px solid #E8E7E3',
            borderRadius: 12,
          }}
        >
          <QRCodeSVG value={qr} size={200} />
        </div>
        <div style={{ font: '400 13px/19px var(--font-sans, Inter, system-ui, sans-serif)', color: '#71706B', maxWidth: 280, margin: '12px auto 0' }}>
          Buka <strong>WhatsApp &gt; Perangkat Tertaut &gt; Tautkan Perangkat</strong>, lalu pindai kode di atas. Kode diperbarui otomatis tiap ±20–60 detik.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 16px', textAlign: 'center' }}>
      <div style={{ font: '400 14px/20px var(--font-sans, Inter, system-ui, sans-serif)', color: '#71706B' }}>
        Menyiapkan kode QR…
      </div>
    </div>
  );
}
