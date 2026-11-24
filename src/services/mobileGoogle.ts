import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const MOBILE_CALLBACK = 'https://oson-market-frontend.vercel.app/auth/mobile/google/callback';
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

export function watchMobileGoogle(onCallback: (search: string) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let active = true;
  let handled = '';
  const receive = (raw: string) => {
    if (!active || !getMobileGoogleVerifier()) return;
    const url = new URL(raw);
    if (url.origin + url.pathname !== MOBILE_CALLBACK || url.username || url.password
      || !url.search || handled === url.search) return;
    handled = url.search;
    void Browser.close().catch(() => {});
    onCallback(url.search);
  };
  const listener = App.addListener('appUrlOpen', ({ url }) => receive(url));
  void listener.then(() => App.getLaunchUrl()).then(value => {
    if (value?.url) receive(value.url);
  }).catch(() => {});
  return () => {
    active = false;
    void listener.then(handle => handle.remove()).catch(() => {});
  };
}
