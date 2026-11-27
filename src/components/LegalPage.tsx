import { API_BASE_URL } from '../constants';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Language } from '../types/auth';

export function LegalLinks({ language, profile = false }: { language: Language; profile?: boolean }) {
  const ru = language === 'ru';
  const [version, setVersion] = useState('');
  useEffect(() => {
    if (!profile) return;
    let active = true;
    void import('@capacitor/core').then(async ({ Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      if (active) setVersion(info.version);
    }).catch(() => {});
    return () => { active = false; };
  }, [profile]);
  const links = [
    ['/about', ru ? 'О нас' : 'Biz haqimizda'],
    ['/privacy-policy', ru ? 'Политика конфиденциальности' : 'Maxfiylik siyosati'],
    ['/terms', ru ? 'Условия использования' : 'Foydalanish shartlari'],
    ['/delete-account', ru ? 'Удалить аккаунт' : 'Hisobni o‘chirish'],
    ['/contact', profile ? (ru ? 'Помощь' : 'Yordam markazi') : (ru ? 'Связаться с нами' : 'Biz bilan bog‘lanish')],
  ];
  return <nav className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-5 gap-y-3 px-4 py-6 text-sm">
    {links.map(([path, label]) => <Link key={path} to={path} className="underline underline-offset-4">{label}</Link>)}
    {version && <span>{ru ? 'Версия приложения' : 'Ilova versiyasi'} {version}</span>}
  </nav>;
}

type Request = (method: 'POST', path: string, body?: string) => Promise<Response>;

export function LegalPage({ kind, language, request, eligible }: {
  kind: 'privacy' | 'terms' | 'delete' | 'contact' | 'about';
  language: Language;
  request: Request;
  eligible: boolean;
}) {
  const ru = language === 'ru';
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const titles = ru
    ? { privacy: 'Политика конфиденциальности', terms: 'Условия использования', delete: 'Удаление аккаунта', contact: 'Связаться с нами', about: 'О нас' }
    : { privacy: 'Maxfiylik siyosati', terms: 'Foydalanish shartlari', delete: 'Hisobni o‘chirish', contact: 'Biz bilan bog‘lanish', about: 'Biz haqimizda' };

  const [revision, setRevision] = useState<{ version: string; publishedAt: string; contentUz: string; contentRu: string } | null>();
  useEffect(() => {
    if (kind === 'about' || kind === 'contact') return;
    const controller = new AbortController();
    void fetch(API_BASE_URL + '/api/site/legal/' + kind, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (response.status === 204) { setRevision(null); return; }
        if (!response.ok) throw new Error();
        const document = await response.json();
        if (!controller.signal.aborted) setRevision(document);
      }).catch(() => { if (!controller.signal.aborted) setRevision(null); });
    return () => controller.abort();
  }, [kind]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || submitted || !eligible) return;
    setBusy(true);
    setError('');
    try {
      const path = '/api/users/delete-account/';
      const response = challengeId
        ? await request('POST', path + 'verify', JSON.stringify({ challengeId, code }))
        : await request('POST', path + 'request');
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || undefined);
      }
      if (challengeId) setSubmitted(true);
      else setChallengeId((await response.json()).challengeId);
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message
        : ru ? 'Не удалось выполнить запрос.' : 'So‘rovni bajarib bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
    <article className="rounded-2xl border border-slate-200 p-5 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">{titles[kind]}</h1>
      {(kind === 'privacy' || kind === 'terms' || kind === 'delete') && (revision ? <>
        <p className="mb-4 text-sm">{revision.version} · {new Date(revision.publishedAt).toLocaleDateString(language)}</p>
        <p className="mb-5 whitespace-pre-wrap leading-relaxed">{ru ? revision.contentRu : revision.contentUz}</p>
      </> : <p role="status">{revision === undefined ? (ru ? 'Загрузка…' : 'Yuklanmoqda…')
        : (ru ? 'Документ пока недоступен.' : 'Hujjat hozircha mavjud emas.')}</p>)}
      {kind === 'about' && <p>Oson Market</p>}
      {kind === 'contact' && <div className="grid gap-3"><a className="underline" href="mailto:ziyatovzafar98@gmail.com">ziyatovzafar98@gmail.com</a><a className="underline" href="tel:+905427325572">+90 542 732 55 72</a><Link className="underline" to="/chat">{ru ? 'Чат с поддержкой Oson Market' : 'Oson Market yordam xizmati bilan chat'}</Link></div>}
      {kind === 'delete' && <div className="space-y-4">
        <Link className="underline" to="/privacy-policy">{ru ? 'Политика конфиденциальности' : 'Maxfiylik siyosati'}</Link>
        {submitted ? <p role="status">{ru ? 'Запрос подтверждён и зарегистрирован.' : 'So‘rov tasdiqlandi va ro‘yxatga olindi.'}</p>
          : eligible ? <form className="space-y-3" onSubmit={submit}>
            {challengeId && <label className="block">{ru ? 'Код из письма' : 'Emaildagi tasdiqlash kodi'}
              <input className="ml-2 rounded-lg border p-2" value={code} onChange={e => setCode(e.target.value)}
                required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} />
            </label>}
            <button type="submit" disabled={busy} className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-60">
              {challengeId ? (ru ? 'Подтвердить запрос' : 'So‘rovni tasdiqlash') : (ru ? 'Получить код' : 'Kod olish')}
            </button>
            {challengeId && <button type="button" disabled={busy} className="ml-3 underline" onClick={() => { setChallengeId(''); setCode(''); setError(''); }}>
              {ru ? 'Запросить новый код' : 'Yangi kod olish'}
            </button>}
          </form> : eligible === false ? <Link className="underline" to="/auth/sign-in">{ru ? 'Войти в аккаунт' : 'Hisobga kirish'}</Link> : null}
        {error && <p className="text-red-700" role="alert">{error}</p>}
      </div>}
    </article>
  </main>;
}
