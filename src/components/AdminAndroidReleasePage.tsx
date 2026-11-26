import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input } from 'antd';
import type { Language } from '../types/auth';

type Release = { versionCode: number; versionName: string };
type RequestRelease = (method: 'GET' | 'PUT' | 'POST', path: string, body?: string) => Promise<Response>;

export function AdminAndroidReleasePage({ language, request }: { language: Language; request: RequestRelease }) {
  const [published, setPublished] = useState<Release | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
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
      }
    }).catch(() => { if (active) setResult('failed'); })
      .finally(() => { if (active) setBusy(null); });
    return () => { active = false; };
  }, [request]);

  const versionCode = Number(code);
  const valid = /^\d+$/.test(code) && versionCode >= 1 && versionCode <= 2_100_000_000 && name.trim().length > 0;
  const changed = published?.versionCode !== versionCode || published.versionName !== name.trim();

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!published || busy || !valid || !changed) return;
    setBusy('save');
    setResult(null);
    try {
      const response = await request('PUT', '/api/admin/android-release', JSON.stringify({ versionCode, versionName: name.trim() }));
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
          ? 'Загрузите APK на сайт и укажите название и код версии из APK.'
          : 'APK’ni saytga joylang va APK ichidagi versiya nomi hamda kodini kiriting.'}</p>
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
          <div className="flex flex-wrap gap-2">
            <Button type="primary" htmlType="submit" loading={busy === 'save'} disabled={!!busy || !published || !valid || !changed}>
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
