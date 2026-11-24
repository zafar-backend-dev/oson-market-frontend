import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

import { PUBLIC_SITE_ORIGIN } from '../constants';

const MOBILE_CALLBACK_PATH = '/auth/mobile/google/callback';
const KEY = 'oson_market_mobile_google_attempt';
const TTL = 10 * 60_000;

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getMobileGoogleVerifier(): string | null {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const pending = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return pending && pending.expiresAt > Date.now() && /^[A-Za-z0-9_-]{43}$/.test(pending.verifier)
      ? pending.verifier
      : null;
  } catch {
    return null;
  }
}

export function clearMobileGoogleAttempt(): void {
  localStorage.removeItem(KEY);
}

export async function startGoogleLogin(authorizationUrl: string, language: 'uz' | 'ru'): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    window.location.assign(authorizationUrl);
    return;
  }
  try {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const verifier = base64url(bytes);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const url = new URL(authorizationUrl);
    url.searchParams.set('mobileChallenge', base64url(new Uint8Array(digest)));
    localStorage.setItem(KEY, JSON.stringify({ verifier, expiresAt: Date.now() + TTL }));
    await Browser.open({ url: url.href });
  } catch {
    clearMobileGoogleAttempt();
    window.alert(language === 'ru' ? 'Не удалось открыть вход через Google.' : 'Google orqali kirishni ochib bo‘lmadi.');
  }
}

export function watchMobileLinks(navigate: (path: string) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let active = true;
  let handledGoogleSearch = '';

  const receive = (raw: string) => {
    if (!active) return;
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return;
    }
    if (url.origin !== PUBLIC_SITE_ORIGIN || url.username || url.password) return;

    if (/^\/products\/[^/]+\/?$/.test(url.pathname) || url.pathname === '/') {
      navigate(url.pathname + url.search + url.hash);
      return;
    }

    if (url.pathname !== MOBILE_CALLBACK_PATH || !url.search
      || handledGoogleSearch === url.search || !getMobileGoogleVerifier()) return;
    handledGoogleSearch = url.search;
    void Browser.close().catch(() => {});
    navigate('/auth/google/callback' + url.search);
  };

  let receivedWhileStarting = false;
  const listener = App.addListener('appUrlOpen', ({ url }) => {
    receivedWhileStarting = true;
    receive(url);
  });
  void listener.then(() => App.getLaunchUrl()).then(value => {
    if (!receivedWhileStarting && value?.url) receive(value.url);
  }).catch(() => {});

  return () => {
    active = false;
    void listener.then(handle => handle.remove()).catch(() => {});
  };
}
