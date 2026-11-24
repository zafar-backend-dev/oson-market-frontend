import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Language } from '../types/auth';

const CHANNEL = 'oson_order_updates';
const shownNotifications = new Set<string>();
let nextId = Math.floor(Date.now() % 2_000_000_000);

export async function enableOrderAlerts(language: Language): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: language === 'ru' ? '\u0417\u0430\u043a\u0430\u0437\u044b' : 'Buyurtmalar',
      importance: 5,
      visibility: 0,
      vibration: true,
    });
  }
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
    await LocalNotifications.requestPermissions();
  }
}

export async function showOrderAlert(orderId: string, status: string, language: Language, notificationId?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') return;
  if (notificationId) {
    if (shownNotifications.has(notificationId)) return;
    shownNotifications.add(notificationId);
    if (shownNotifications.size > 500) {
      const oldest = shownNotifications.values().next().value;
      if (oldest) shownNotifications.delete(oldest);
    }
  }
  nextId = (nextId + 1) % 2_000_000_000;
  await LocalNotifications.schedule({
    notifications: [{ id: nextId, title: 'Oson Market',
      body: language === 'ru' ? `\u0421\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u043a\u0430\u0437\u0430: ${status}` : `Buyurtma holati: ${status}`,
      channelId: CHANNEL, extra: { orderId } }],
  });
}

const ORDER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function watchOrderAlertTaps(openOrder: (path: string) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let active = true;
  const open = (orderId: unknown) => {
    if (active && typeof orderId === 'string' && ORDER_ID_PATTERN.test(orderId)) {
      openOrder('/orders/' + orderId);
    }
  };
  const listeners = [
    LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => open(notification.extra?.orderId)),
  ];
  if (Capacitor.getPlatform() === 'android') {
    listeners.push(PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => open(notification.data?.orderId)));
  }
  for (const listener of listeners) void listener.catch(() => {});
  return () => {
    active = false;
    for (const listener of listeners) void listener.then(handle => handle.remove()).catch(() => {});
  };
}
