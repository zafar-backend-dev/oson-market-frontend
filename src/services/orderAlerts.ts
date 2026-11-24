import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Language } from '../types/auth';

const CHANNEL = 'oson_order_updates';
const CHAT_CHANNEL = 'oson_chat_messages';
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
    await LocalNotifications.createChannel({
      id: CHAT_CHANNEL,
      name: language === 'ru' ? 'Сообщения чата' : 'Chat xabarlari',
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
  return showAlert(CHANNEL,
    language === 'ru' ? `Статус заказа: ${status}` : `Buyurtma holati: ${status}`,
    { orderId }, notificationId);
}

export async function showChatAlert(messageId: string, language: Language): Promise<void> {
  return showAlert(CHAT_CHANNEL,
    language === 'ru' ? 'Новое сообщение от администратора.' : 'Admin sizga yangi xabar yubordi.',
    { type: 'CHAT_MESSAGE', messageId }, 'chat-' + messageId);
}

async function showAlert(channelId: string, body: string, extra: Record<string, string>,
                         notificationId?: string): Promise<void> {
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
  try {
    await LocalNotifications.schedule({
      notifications: [{ id: nextId, title: 'Oson Market', body, channelId, extra }],
    });
  } catch (error) {
    if (notificationId) shownNotifications.delete(notificationId);
    throw error;
  }
}

const ORDER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function watchOrderAlertTaps(openPath: (path: string) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let active = true;
  const open = (data?: { type?: unknown; messageId?: unknown; orderId?: unknown }) => {
    if (!active || !data) return;
    if (data.type === 'CHAT_MESSAGE' && typeof data.messageId === 'string' && /^[1-9]\d*$/.test(data.messageId)) {
      openPath('/chat');
    } else if (typeof data.orderId === 'string' && ORDER_ID_PATTERN.test(data.orderId)) {
      openPath('/orders/' + data.orderId);
    }
  };
  const listeners = [
    LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => open(notification.extra)),
  ];
  if (Capacitor.getPlatform() === 'android') {
    listeners.push(PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => open(notification.data)));
  }
  for (const listener of listeners) void listener.catch(() => {});
  return () => {
    active = false;
    for (const listener of listeners) void listener.then(handle => handle.remove()).catch(() => {});
  };
}
