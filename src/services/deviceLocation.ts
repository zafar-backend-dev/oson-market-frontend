import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const options = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 };

export function supportsLocation(): boolean {
  return Capacitor.isNativePlatform()
    ? Capacitor.isPluginAvailable('Geolocation')
    : typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
}

export async function getCurrentLocation() {
  if (!Capacitor.isNativePlatform()) {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  let permissions = await Geolocation.checkPermissions();
  if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
    permissions = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
  }
  if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
    throw new Error('LOCATION_PERMISSION_DENIED');
  }

  return Geolocation.getCurrentPosition({
    ...options,
    enableHighAccuracy: permissions.location === 'granted',
  });
}

export function locationErrorMessage(error: unknown, language: 'uz' | 'ru', deniedMessage: string): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  if (code === 'OS-PLUG-GLOC-0007') {
    return language === 'ru'
      ? 'Включите геолокацию в настройках телефона и попробуйте снова.'
      : 'Telefon sozlamalarida joylashuv xizmatini yoqing va qayta urinib ko‘ring.';
  }
  if (code === 1 || code === 'OS-PLUG-GLOC-0003'
      || (error instanceof Error && error.message === 'LOCATION_PERMISSION_DENIED')) {
    return deniedMessage;
  }
  return language === 'ru'
    ? 'Не удалось определить местоположение. Попробуйте снова или выберите точку на карте.'
    : 'Joylashuv aniqlanmadi. Qayta urinib ko‘ring yoki xaritadan nuqta tanlang.';
}
