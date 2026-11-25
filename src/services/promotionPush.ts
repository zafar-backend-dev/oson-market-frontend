import { App } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import type { Language } from '../types/auth';
import { showPromotionAlert } from './orderAlerts';

const PromotionPush = registerPlugin<{ subscribe(): Promise<void> }>('PromotionPush');

export function startPromotionPush(language: Language): () => void {
  if (Capacitor.getPlatform() !== 'android') return () => {};
  let active = true;
  const subscribe = async () => {
    await LocalNotifications.createChannel({
      id: 'oson_promotions',
      name: language === 'ru' ? 'Акции' : 'Aksiyalar',
      importance: 4,
      visibility: 0,
    });
    const permission = await PushNotifications.checkPermissions();
    const result = permission.receive.startsWith('prompt') ? await PushNotifications.requestPermissions() : permission;
    if (active && result.receive === 'granted') await PromotionPush.subscribe();
  };
  const listeners = [
    PushNotifications.addListener('pushNotificationReceived', ({ title, body, data }) => {
      if (!active || data?.type !== 'PROMOTION' || typeof data.id !== 'string' ||
          typeof data.target !== 'string' || !/^\/products\/[A-Za-z0-9_-]{1,210}$/.test(data.target)) return;
      void showPromotionAlert(data.id, (language === 'ru' ? data.titleRu : title) || 'Oson Market',
        (language === 'ru' ? data.bodyRu : body) || '', data.target).catch(() => {});
    }),
    App.addListener('resume', () => { void subscribe().catch(() => {}); }),
  ];
  void Promise.all(listeners).then(subscribe).catch(() => {});
  return () => {
    active = false;
    for (const listener of listeners) void listener.then(handle => handle.remove()).catch(() => {});
  };
}
