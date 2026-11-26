import { useState } from 'react';
import { Download, MessageCircle, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Language } from '../types/auth';

export function AppDownloadPage({ language, apkUrl, chat = false }: {
  language: Language;
  apkUrl: string;
  chat?: boolean;
}) {
  const ru = language === 'ru';
  const [choose, setChoose] = useState(false);
  const [iphone, setIphone] = useState(false);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-green-50 text-green-700">
          {chat ? <MessageCircle aria-hidden="true" /> : <Smartphone aria-hidden="true" />}
        </span>
        <h1 className="text-2xl font-semibold text-slate-900">
          {chat ? (ru ? 'Чат с администратором' : 'Admin bilan chat')
            : (ru ? 'Приложение Oson Market' : 'Oson Market ilovasi')}
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
            <button type="button" aria-expanded={choose} onClick={() => setChoose(!choose)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800">
              <Download size={18} aria-hidden="true" />{ru ? 'Скачать приложение' : 'Ilovani yuklab olish'}
            </button>
            {choose && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {apkUrl ? <a href={apkUrl} download className="rounded-xl border border-green-200 px-4 py-3 text-center font-medium text-green-800">Android</a>
                  : <span className="rounded-xl border border-slate-200 px-4 py-3 text-center text-slate-500">Android</span>}
                <button type="button" onClick={() => setIphone(true)}
                  className="rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-800">iPhone</button>
              </div>
            )}
            {choose && iphone && <p role="status" className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{ru
              ? 'Версия для iPhone пока недоступна. Вы можете пользоваться сайтом Oson Market.'
              : 'iPhone uchun ilova hozircha mavjud emas. Oson Market saytidan foydalanishingiz mumkin.'}</p>}
          </>
        )}
        <Link to="/" className="mt-6 block text-sm text-slate-600 underline">{ru ? 'К товарам' : 'Mahsulotlarga qaytish'}</Link>
      </section>
    </main>
  );
}
