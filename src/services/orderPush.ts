import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { API_BASE_URL } from '../constants';
import type { Language } from '../types/auth';
import { getOrderStatusLabel } from '../utils/orderStatus';
import { enableOrderAlerts, showChatAlert, showOrderAlert } from './orderAlerts';

const DEVICE_KEY = 'oson_market_order_push_token';
const deviceUrl = new URL('/api/orders/notifications/device', API_BASE_URL).href;

export function startOrderPush(language: Language, accessToken: () => string | null): () => void {
  if (Capacitor.getPlatform() !== 'android') return () => {};
  let active = true;

  const register = async () => {
    await enableOrderAlerts(language);
    if (!active || !accessToken()) return;
    const { receive } = await PushNotifications.checkPermissions();
    if (receive === 'granted') await PushNotifications.register();
  };
  const listeners = [
    PushNotifications.addListener('registration', ({ value }) => {
      const token = accessToken();
      if (!active || !token) return;
      localStorage.setItem(DEVICE_KEY, value);
      void fetch(deviceUrl, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: value, language }),
      }).catch(() => {});
    }),
    PushNotifications.addListener('pushNotificationReceived', ({ data }) => {
      if (!active || !accessToken()) return;
      if (data?.type === 'CHAT_MESSAGE' && typeof data.messageId === 'string' && /^[1-9]\d*$/.test(data.messageId)) {
        void showChatAlert(data.messageId, language).catch(() => {});
        return;
      }
      if (typeof data?.orderId !== 'string' || typeof data.notificationId !== 'string'
          || typeof data.status !== 'string') return;
      void showOrderAlert(data.orderId, getOrderStatusLabel(data.status, language), language, data.notificationId)
        .catch(() => {});
    }),
    App.addListener('resume', () => { void register().catch(() => {}); }),
  ];
  void Promise.all(listeners).then(register).catch(() => {});

  return () => {
    active = false;
    for (const listener of listeners) void listener.then(handle => handle.remove()).catch(() => {});
  };
}

export async function unregisterOrderPush(accessToken: string | null): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  const token = localStorage.getItem(DEVICE_KEY);
  localStorage.removeItem(DEVICE_KEY);
  const remove = token && accessToken ? fetch(deviceUrl + '/remove', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    signal: AbortSignal.timeout(2500),
  }) : Promise.resolve();
  await Promise.allSettled([remove, PushNotifications.unregister()]);
}
