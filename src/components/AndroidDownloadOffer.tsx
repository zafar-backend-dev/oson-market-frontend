import { Link } from 'react-router-dom';
import { canOfferAndroidDownload } from '../utils/androidDownload';
import { useState } from 'react';
import { Modal } from 'antd';
import { Download, Smartphone } from 'lucide-react';
import { ANDROID_APK_URL } from '../constants';
import type { Language } from '../types/auth';

const DISMISS_KEY = 'oson-market-android-offer-dismissed';

export function AndroidDownloadOffer({ guest, language }: { guest: boolean; language: Language }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // The offer remains dismissed until the page is reloaded.
    }
  }

  if (!guest || !ANDROID_APK_URL || !canOfferAndroidDownload() || dismissed) return null;
  const russian = language === 'ru';
  return <Modal open centered width={420} footer={null} onCancel={dismiss}
    title={russian ? 'Oson Market для Android' : 'Android uchun Oson Market ilovasi'}>
    <div className="mt-4 flex items-center gap-4">
      <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-green-50 text-green-700">
        <Smartphone size={26} aria-hidden="true" />
      </div>
      <p className="text-slate-700">
        {russian ? 'Открывайте каталог, отслеживайте заказы и получайте уведомления на Android.'
          : 'Android telefoningizda katalogni ko‘ring, buyurtmalarni kuzating va bildirishnomalarni oling.'}
      </p>
    </div>
    <Link to="/download" onClick={dismiss}
      className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-4 font-semibold text-white hover:bg-green-800 hover:text-white">
      <Download size={18} aria-hidden="true" />
      {russian ? 'Скачать для Android' : 'Ilovani yuklab olish'}
    </Link>
  </Modal>;
}
