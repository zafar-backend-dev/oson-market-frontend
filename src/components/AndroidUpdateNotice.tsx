import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Modal } from 'antd';
import { API_BASE_URL, PUBLIC_SITE_ORIGIN } from '../constants';
import type { Language } from '../types/auth';

interface AndroidRelease {
  downloadUrl?: string | null;
  versionCode: number;
  versionName: string;
  minimumVersionCode: number;
}

export function AndroidUpdateNotice({ language }: { language: Language }) {
  const [update, setUpdate] = useState<(AndroidRelease & { required: boolean }) | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState(0);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const ru = language === 'ru';

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let active = true;
    let pending = false;
    const abort = new AbortController();
    const appInfo = App.getInfo();
    const check = async () => {
      if (!active || pending) return;
      pending = true;
      try {
        const installed = Number((await appInfo).build);
        if (!Number.isSafeInteger(installed) || installed < 1) return;
        const response = await fetch(API_BASE_URL + '/api/site/android-release', {
          cache: 'no-store',
          signal: abort.signal,
        });
        if (!response.ok) return;
        const release: AndroidRelease = await response.json();
        if (!Number.isSafeInteger(release.versionCode) || typeof release.versionName !== 'string'
          || !Number.isSafeInteger(release.minimumVersionCode) || release.minimumVersionCode < 0
          || release.minimumVersionCode > release.versionCode) return;
        if (active) {
          setUpdate(release.versionCode !== installed
            ? { ...release, required: release.minimumVersionCode > installed }
            : null);
        }
      } catch {
        // Temporary network failures are retried when the app resumes.
      } finally {
        pending = false;
      }
    };

    const listeners = [
      App.addListener('resume', () => void check()),
      PushNotifications.addListener('pushNotificationReceived', ({ data }) => {
        if (data?.type === 'ANDROID_UPDATE') void check();
      }),
      PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        if (notification.data?.type === 'ANDROID_UPDATE') void check();
      }),
    ];
    void check();
    const refresh = window.setInterval(() => { if (!document.hidden) void check(); }, 60_000);
    return () => {
      window.clearInterval(refresh);
      active = false;
      abort.abort();
      for (const listener of listeners) void listener.then(handle => handle.remove()).catch(() => {});
    };
  }, []);

  if (!update || (!update.required && dismissedVersion === update.versionCode)) return null;

  const download = async () => {
    setDownloadFailed(false);
    const downloadPage = PUBLIC_SITE_ORIGIN + '/download';
    const url = update.downloadUrl && /^https:\/\//i.test(update.downloadUrl) ? update.downloadUrl : downloadPage;
    try {
      await Browser.open({ url });
    } catch {
      if (url !== downloadPage) {
        try {
          await Browser.open({ url: downloadPage });
          return;
        } catch {
          // Show the error if Android could not open either URL.
        }
      }
      setDownloadFailed(true);
    }
  };

  return (
    <Modal open centered closable={!update.required} mask={{ closable: false }} keyboard={!update.required}
      title={ru ? 'Доступна новая версия' : 'Yangi versiya mavjud'}
      okText={ru ? 'Обновить' : 'Yangilash'}
      cancelText={ru ? 'Позже' : 'Keyinroq'}
      cancelButtonProps={{ style: update.required ? { display: 'none' } : undefined }}
      onOk={download}
      onCancel={() => { if (!update.required) setDismissedVersion(update.versionCode); }}>
      <p>{update.required
        ? (ru ? 'Обновите Oson Market, чтобы продолжить.' : 'Davom etish uchun Oson Market ilovasini yangilang.')
        : (ru ? 'Обновите Oson Market до последней версии.' : 'Oson Market ilovasining yangi versiyasini yuklab oling.')}</p>
      <p className="mt-2 text-sm text-slate-500">Oson Market {update.versionName}</p>
      {downloadFailed && <p role="alert">{ru ? 'Не удалось открыть загрузку.' : 'Yuklab olishni ochib bo‘lmadi.'}</p>}
    </Modal>
  );
}
