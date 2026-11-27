import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input } from 'antd';
import type { Language } from '../types/auth';

type Release = { versionCode: number; versionName: string; downloadUrl?: string | null };
type RequestRelease = (method: 'GET' | 'PUT' | 'POST', path: string, body?: string) => Promise<Response>;

export function AdminAndroidReleasePage({ language, request }: { language: Language; request: RequestRelease }) {
  const [published, setPublished] = useState<Release | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [busy, setBusy] = useState<'load' | 'save' | 'push' | null>('load');
  const [result, setResult] = useState<'saved' | 'sent' | 'failed' | null>(null);
  const ru = language === 'ru';

  useEffect(() => {
    let active = true;
    void request('GET', '/api/site/android-release').then(async response => {
      if (!response.ok) throw new Error();
      const release: Release = await response.json();
      if (active) {
        setPublished(release);
        setCode(String(release.versionCode));
        setName(release.versionName);
        setDownloadUrl(release.downloadUrl ?? '');
      }
    }).catch(() => { if (active) setResult('failed'); })
      .finally(() => { if (active) setBusy(null); });
    return () => { active = false; };
  }, [request]);

  const versionCode = Number(code);
  const url = downloadUrl.trim();
  const validUrl = !url || /^https:\/\/[^\s/]+/i.test(url) && !/\s/.test(url);
  const valid = /^\d+$/.test(code) && versionCode >= 1 && versionCode <= 2_100_000_000 && name.trim().length > 0;
  const changed = published?.versionCode !== versionCode || published.versionName !== name.trim() || (published.downloadUrl ?? '') !== url;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!published || busy || !valid || !validUrl || !changed) return;
    setBusy('save');
    setResult(null);
    try {
      const response = await request('PUT', '/api/admin/android-release', JSON.stringify({ versionCode, versionName: name.trim(), downloadUrl: url }));
      if (!response.ok) throw new Error();
      setPublished(await response.json());
      setResult('saved');
    } catch {
      setResult('failed');
    } finally {
      setBusy(null);
    }
  }

  async function announce() {
    if (!published || busy || changed) return;
    setBusy('push');
    setResult(null);
    try {
      const response = await request('POST', '/api/admin/android-release/announce');
      if (!response.ok) throw new Error();
      setResult('sent');
    } catch {
      setResult('failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h1 className="text-xl font-semibold">{ru ? 'Обновления Android' : 'Android yangilanishlari'}</h1>
        {published && <p className="mt-2 text-sm text-slate-600">
          {ru ? 'Опубликована версия' : 'E’lon qilingan versiya'} {published.versionName} ({published.versionCode})
        </p>}
        <p className="mt-2 text-sm text-slate-600">{ru
          ? 'Укажите название и код опубликованной версии Android.'
          : 'E’lon qilingan Android versiyasining nomi va kodini kiriting.'}</p>
        <form className="mt-5 space-y-4" onSubmit={save}>
          <label className="block text-sm font-medium">
            {ru ? 'Название версии' : 'Versiya nomi'}
            <Input className="mt-1" value={name} maxLength={40} placeholder="1.3"
              disabled={!!busy || !published} onChange={event => setName(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            {ru ? 'Код версии (versionCode)' : 'Versiya kodi (versionCode)'}
            <Input className="mt-1" value={code} inputMode="numeric" maxLength={10} placeholder="4"
              disabled={!!busy || !published} onChange={event => setCode(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            {ru ? 'HTTPS-ссылка для скачивания Android' : 'Android uchun HTTPS yuklab olish havolasi'}
            <Input className="mt-1" value={downloadUrl} maxLength={2048} inputMode="url"
              placeholder="https://play.google.com/store/apps/details?id=uz.osonmarket24.app"
              disabled={!!busy || !published} onChange={event => setDownloadUrl(event.target.value)} />
            <span className="mt-1 block font-normal text-slate-600">
              {ru ? 'Ссылка на Google Play или APK. Пустое поле возвращает стандартную ссылку.'
                : 'Google Play yoki APK havolasi. Bo‘sh qoldirsangiz, standart havola ishlatiladi.'}
            </span>
            {!validUrl && <span className="mt-1 block text-red-600">
              {ru ? 'Введите ссылку HTTPS.' : 'HTTPS havolasini kiriting.'}
            </span>}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="primary" htmlType="submit" loading={busy === 'save'} disabled={!!busy || !published || !valid || !validUrl || !changed}>
              {ru ? 'Обновить версию' : 'Versiyani yangilash'}
            </Button>
            <Button loading={busy === 'push'} disabled={!!busy || !published || changed} onClick={() => void announce()}>
              {ru ? 'Отправить уведомление' : 'Bildirishnoma yuborish'}
            </Button>
          </div>
        </form>
        {result && <p className="mt-4 text-sm" role={result === 'failed' ? 'alert' : 'status'}>
          {result === 'saved' ? (ru ? 'Версия сохранена.' : 'Versiya saqlandi.')
            : result === 'sent' ? (ru ? 'Уведомление отправлено.' : 'Bildirishnoma yuborildi.')
            : (ru ? 'Не удалось выполнить запрос.' : 'So‘rovni bajarib bo‘lmadi.')}
        </p>}
      </section>
    </main>
  );
}
