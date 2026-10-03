// Push Notification and Local Schedule Reminder Manager for PWA

export interface LocalReminderOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  triggerAt?: Date | number;
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn('[PushManager] Notification permission request failed:', err);
    return 'denied';
  }
}

export async function scheduleLocalReminder(
  title: string,
  options?: Partial<LocalReminderOptions>
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const perm = await requestNotificationPermission();
  if (perm !== 'granted') {
    return false;
  }

  const fire = () => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body: options?.body || 'Pengingat sesi belajar Anda dari Ralivo',
            icon: options?.icon || '/icons/icon-192x192.png',
            badge: options?.badge || '/icons/icon-192x192.png',
            tag: options?.tag || `reminder-${Date.now()}`,
            data: options?.data,
          });
        });
      } else {
        new Notification(title, {
          body: options?.body || 'Pengingat sesi belajar Anda dari Ralivo',
          icon: options?.icon || '/icons/icon-192x192.png',
          tag: options?.tag || `reminder-${Date.now()}`,
        });
      }
    } catch (err) {
      console.warn('[PushManager] Failed to fire local reminder:', err);
    }
  };

  if (options?.triggerAt) {
    const targetMs = typeof options.triggerAt === 'number' ? options.triggerAt : options.triggerAt.getTime();
    const delayMs = Math.max(0, targetMs - Date.now());
    setTimeout(fire, delayMs);
  } else {
    fire();
  }

  return true;
}
