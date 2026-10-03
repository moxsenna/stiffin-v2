'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messagingRepo } from '@/lib/container';
import type { WaInboxMessage } from '@promotor/contracts';

/**
 * Polling feed balasan masuk via MessagingPort.
 * Polling berjalan setiap intervalMs ketika tab terlihat.
 */
export function useWhatsAppInbox(intervalMs = 15_000) {
  const [messages, setMessages] = useState<WaInboxMessage[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tickRef = useRef(0);

  const refresh = useCallback(async () => {
    const tick = ++tickRef.current;
    try {
      const data = await messagingRepo.listWhatsAppInbox();
      if (tick === tickRef.current) {
        setMessages(data);
        setIsLoading(false);
      }
    } catch {
      if (tick === tickRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const markRead = useCallback(async () => {
    try {
      await messagingRepo.markWhatsAppInboxRead();
      setMessages((prev) => (prev ? prev.map((m) => ({ ...m, isRead: true })) : prev));
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    void refresh();

    const t = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void refresh();
      }
    }, intervalMs);

    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void refresh();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, intervalMs]);

  const unreadCount = messages?.filter((m) => !m.isRead).length ?? 0;

  return {
    messages,
    isLoading,
    unreadCount,
    markRead,
    refresh,
  };
}
