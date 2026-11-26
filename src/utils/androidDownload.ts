import { Capacitor } from '@capacitor/core';

export function canOfferAndroidDownload(): boolean {
  return !Capacitor.isNativePlatform() && /Android|iPhone|iPod/i.test(navigator.userAgent);
}
