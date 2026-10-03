'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui';
import { messagingRepo } from '@/lib/container';
import { useWhatsAppStatus, WaPairingQr, WhatsAppInbox, WaStatusPill } from '@/components/whatsapp';

type LocalStage = 'idle' | 'pairing' | 'error';

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  const { status, refresh } = useWhatsAppStatus(20_000);
  const [local, setLocal] = useState<LocalStage>('idle');
  const [pairing, setPairing] = useState<{ deviceId: string; pairingToken: string; gatewayUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const startPairing = useCallback(async () => {
    setError(null);
    setIsStarting(true);
    try {
      const res = await messagingRepo.startWhatsAppPairing();
      if (res.stage === 'unconfigured') {
        setError('Wakonek gateway belum dikonfigurasi di server API.');
        setLocal('error');
        return;
      }
      if (res.deviceId && res.pairingToken && res.gatewayUrl) {
        setPairing({
          deviceId: res.deviceId,
          pairingToken: res.pairingToken,
          gatewayUrl: res.gatewayUrl,
        });
        setLocal('pairing');
      } else {
        setError('Data pairing tidak lengkap dari gateway.');
        setLocal('error');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memulai pairing WhatsApp');
      setLocal('error');
    } finally {
      setIsStarting(false);
    }
  }, []);

  const cancelPairing = useCallback(() => {
    setPairing(null);
    setLocal('idle');
    void refresh();
  }, [refresh]);

  const onConnected = useCallback(
    (_phone: string) => {
      setPairing(null);
      setLocal('idle');
      void refresh();
    },
    [refresh]
  );

  const stage = status?.stage ?? 'not_connected';
  const phone = status?.phone ?? null;

  return (
    <AppShell showBottomNav={true}>
      <PageHeader
        kicker="Pengaturan"
        title="Koneksi WhatsApp"
        sub="Hubungkan perangkat WhatsApp untuk kirim pesan follow-up langsung dan terima balasan."
        backLabel="Lainnya"
        onBack={() => router.push('/app/more')}
        action={<WaStatusPill />}
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Connection Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {local === 'pairing' && pairing ? (
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--border-soft, #E8E7E3)',
                borderRadius: 12,
                overflow: 'hidden',
                padding: '16px',
              }}
            >
              <WaPairingQr
                gatewayUrl={pairing.gatewayUrl}
                deviceId={pairing.deviceId}
                pairingToken={pairing.pairingToken}
                onConnected={onConnected}
                onFailed={(message) => {
                  setError(message);
                  setPairing(null);
                  setLocal('error');
                }}
              />
              <button
                type="button"
                onClick={cancelPairing}
                className="btn btn-ghost btn-block"
                style={{ marginTop: 12 }}
              >
                Batal
              </button>
            </div>
          ) : stage === 'unconfigured' ? (
            <StatusCard
              title="Belum dikonfigurasi"
              desc="Kredensial Wakonek gateway belum terkonfigurasi di server API (WAKONEK_API_KEY, WAKONEK_GATEWAY_URL)."
              tone="warning"
            />
          ) : stage === 'connected' ? (
            <StatusCard
              title="WhatsApp terhubung"
              desc={
                phone
                  ? `Pesan dikirim dari nomor ${phone}. Anda dapat mengirim pesan langsung dari aplikasi.`
                  : 'Pesan akan terkirim dari nomor WhatsApp Anda.'
              }
              tone="success"
            />
          ) : stage === 'disconnected' ? (
            <>
              <StatusCard
                title="WhatsApp terputus"
                desc="Koneksi ke WhatsApp terputus. Gateway mencoba menyambung otomatis, atau hubungkan ulang sekarang."
                tone="warning"
              />
              <button
                type="button"
                onClick={startPairing}
                disabled={isStarting}
                className="btn btn-secondary btn-block"
              >
                {isStarting ? 'Menyiapkan…' : 'Sambungkan ulang'}
              </button>
            </>
          ) : stage === 'error' || local === 'error' ? (
            <>
              <StatusCard
                title="Gagal memeriksa status"
                desc={error ?? 'Gateway WhatsApp tidak terjangkau atau sesi bermasalah.'}
                tone="warning"
              />
              <button
                type="button"
                onClick={() => {
                  setLocal('idle');
                  setError(null);
                  void refresh();
                }}
                className="btn btn-secondary btn-block"
              >
                Coba lagi
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid var(--border-soft, #E8E7E3)',
                  borderRadius: 12,
                  padding: '24px 16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    font: '700 16px/22px var(--font-sans, Inter, system-ui, sans-serif)',
                    color: 'var(--ink, #191918)',
                    marginBottom: 8,
                  }}
                >
                  WhatsApp belum terhubung
                </div>
                <div
                  style={{
                    font: '400 13px/19px var(--font-sans, Inter, system-ui, sans-serif)',
                    color: 'var(--muted-strong, #71706B)',
                    maxWidth: 340,
                    margin: '0 auto',
                  }}
                >
                  Hubungkan nomor WhatsApp Anda sekali saja. Setelah itu, follow-up, reminder jadwal,
                  dan aftercare bisa dikirim langsung dari Ralivo Flow tanpa berpindah aplikasi.
                </div>
              </div>
              <button
                type="button"
                onClick={startPairing}
                disabled={isStarting}
                className="btn btn-primary btn-block"
              >
                {isStarting ? 'Menyiapkan sesi QR…' : 'Hubungkan WhatsApp'}
              </button>
              {error && (
                <div
                  style={{
                    font: '400 13px/19px var(--font-sans, Inter, system-ui, sans-serif)',
                    color: '#B42318',
                    textAlign: 'center',
                  }}
                >
                  {error}
                </div>
              )}
            </>
          )}
        </section>

        {/* Inbox Feed Section */}
        <section
          style={{
            borderTop: '1px solid var(--border-soft, #E8E7E3)',
            paddingTop: 16,
          }}
        >
          <WhatsAppInbox />
        </section>

        <div style={{ height: 24 }} />
      </div>
    </AppShell>
  );
}

function StatusCard({
  title,
  desc,
  tone,
}: {
  title: string;
  desc: string;
  tone?: 'success' | 'warning';
}) {
  const dotColor = tone === 'success' ? '#067647' : tone === 'warning' ? '#B54708' : '#71706B';
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border-soft, #E8E7E3)',
        borderRadius: 12,
        padding: '24px 16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dotColor,
            flex: 'none',
          }}
        />
        <span
          style={{
            font: '700 16px/24px var(--font-sans, Inter, system-ui, sans-serif)',
            color: 'var(--ink, #191918)',
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          font: '400 13px/19px var(--font-sans, Inter, system-ui, sans-serif)',
          color: 'var(--muted-strong, #71706B)',
          maxWidth: 340,
          margin: '0 auto',
        }}
      >
        {desc}
      </div>
    </div>
  );
}
