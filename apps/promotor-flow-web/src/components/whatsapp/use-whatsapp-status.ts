'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messagingRepo } from '@/lib/container';
import type { WaStatusResponse, WaStage } from '@promotor/contracts';

const IDLE_STAGE: WaStage[] = ['not_connected', 'needs_pairing', 'error', 'unconfigured'];

/**
 * Polling status koneksi WhatsApp via MessagingPort.
 * Poll hanya saat tab terlihat; interval bisa dilewati lewat resetKey.
 */
export function useWhatsAppStatus(intervalMs = 30_000, resetKey: unknown = null) {
  const [status, setStatus] = useState<WaStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tickRef = useRef(0);

  const refresh = useCallback(async () => {
    const tick = ++tickRef.current;
    try {
      const data = await messagingRepo.getWhatsAppStatus();
      if (tick === tickRef.current) {
        setStatus(data);
        setIsLoading(false);
      }
    } catch {
      if (tick === tickRef.current) {
        setStatus({ stage: 'error', phone: null, deviceId: null });
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();

    if (typeof document === 'undefined' || typeof document.hasFocus !== 'function') {
      const t = setInterval(() => void refresh(), intervalMs);
      return () => clearInterval(t);
    }

    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, intervalMs, resetKey]);

  return {
    status,
    isLoading,
    refresh,
    isIdle: (s: WaStatusResponse | null) => !s || IDLE_STAGE.includes(s.stage),
  };
}
