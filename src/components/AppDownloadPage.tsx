import { SiteLogo } from './SiteLogo';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Language } from '../types/auth';

export function AppDownloadPage({ language, apkUrl, chat = false }: {
  language: Language;
  apkUrl: string;
  chat?: boolean;
}) {
  const ru = language === 'ru';
  const [platform, setPlatform] = useState<'android' | 'iphone'>('android');

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex min-h-28 items-center justify-center rounded-2xl bg-[#f7f6f2] p-4">
          <SiteLogo language={language} size="xl" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {chat ? (ru ? 'Чат с администратором' : 'Admin bilan chat')
            : (ru ? 'Скачать приложение' : 'Ilovani yuklab olish')}
        </h1>
        {chat ? (
          <>
            <p className="mt-2 text-slate-600">{ru
              ? 'Чтобы написать администратору, скачайте приложение Oson Market и откройте раздел «Чат».'
              : 'Admin bilan yozishish uchun Oson Market ilovasini yuklab oling va «Chat» bo‘limiga kiring.'}</p>
            <Link className="mt-5 inline-flex rounded-xl bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800"
              to="/download">{ru ? 'Скачать приложение' : 'Ilovani yuklab olish'}</Link>
          </>
        ) : (
          <>
            <label className="mt-5 block text-sm font-medium text-slate-700">
              {ru ? 'Устройство' : 'Qurilma'}
              <select value={platform} onChange={event => setPlatform(event.target.value === 'iphone' ? 'iphone' : 'android')}
                className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900">
                <option value="android">Android</option>
                <option value="iphone">iPhone</option>
              </select>
            </label>
            {platform === 'iphone' ? <p role="status" className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
              {ru ? 'Версия для iPhone пока недоступна. Вы можете пользоваться сайтом Oson Market.'
                : 'iPhone uchun ilova hozircha mavjud emas. Oson Market saytidan foydalanishingiz mumkin.'}
            </p> : apkUrl ? <a href={apkUrl} download
              className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800 hover:text-white">
              <Download size={18} aria-hidden="true" />{ru ? 'Скачать для Android' : 'Android uchun yuklab olish'}
            </a> : <p role="status" className="mt-3 text-sm text-slate-600">
              {ru ? 'Загрузка пока недоступна.' : 'Yuklab olish hozircha mavjud emas.'}
            </p>}
          </>
        )}
        <Link to="/" className="mt-6 block text-sm text-slate-600 underline">{ru ? 'К товарам' : 'Mahsulotlarga qaytish'}</Link>
      </section>
    </main>
  );
}
