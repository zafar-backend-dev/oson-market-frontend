import { LegalMarkdown } from './LegalMarkdown';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Language } from '../types/auth';

type Revision = { active: boolean; version: string; contentUz: string; contentRu: string; publishedAt: string };
type Deletion = { accountId: string; verifiedAt: string | null; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' };
type Request = (method: 'GET' | 'POST', path: string, body?: string) => Promise<Response>;

export function AdminLegalPage({ language, request }: { language: Language; request: Request }) {
  const ru = language === 'ru';
  const deletionStates = ru
    ? { PENDING: 'Ожидает обработки', PROCESSING: 'На обработке', COMPLETED: 'Удалён', FAILED: 'Повторная попытка запланирована' }
    : { PENDING: 'Kutilmoqda', PROCESSING: 'Bajarilmoqda', COMPLETED: 'O‘chirildi', FAILED: 'O‘chirishda xato' };
  const [kind, setKind] = useState<'privacy' | 'terms' | 'delete'>('privacy');
  const [history, setHistory] = useState<Revision[]>([]);
  const [rows, setRows] = useState<Deletion[]>([]);
  const [processing, setProcessing] = useState<string>();
  const [deletionError, setDeletionError] = useState(false);
  const [version, setVersion] = useState('');
  const [contentUz, setContentUz] = useState('');
  const [contentRu, setContentRu] = useState('');
  const dirty = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingDeletions, setLoadingDeletions] = useState(true);
  const [current, setCurrent] = useState<Revision | null>(null);
  const [currentError, setCurrentError] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [deletionLoadError, setDeletionLoadError] = useState(false);
  const path = '/api/admin/legal/' + kind;

  useEffect(() => {
    let active = true;
    setLoadingCurrent(true);
    setCurrentError(false);
    void request('GET', '/api/site/legal/' + kind).then(async response => {
      if (!response.ok) throw Error();
      const latest: Revision | null = response.status === 204 ? null : await response.json();
      if (!active) return;
      setCurrent(latest);
      if (!dirty.current) {
        setContentUz(latest?.contentUz ?? '');
        setContentRu(latest?.contentRu ?? '');
      }
    }).catch(() => { if (active) setCurrentError(true); })
      .finally(() => { if (active) setLoadingCurrent(false); });
    return () => { active = false; };
  }, [kind, request]);

  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    setHistoryError(false);
    void request('GET', path).then(async response => {
      if (!response.ok) throw Error();
      const revisions: Revision[] = await response.json();
      if (active) setHistory(revisions);
    }).catch(() => { if (active) setHistoryError(true); })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [path, request]);

  useEffect(() => {
    let active = true;
    setLoadingDeletions(true);
    setDeletionLoadError(false);
    void request('GET', '/api/admin/account-deletion-requests').then(async response => {
      if (!response.ok) throw Error();
      const deletions: Deletion[] = await response.json();
      if (active) setRows(deletions);
    }).catch(() => { if (active) setDeletionLoadError(true); })
      .finally(() => { if (active) setLoadingDeletions(false); });
    return () => { active = false; };
  }, [request]);

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (busy || loadingCurrent) return;
    setBusy(true);
    setSuccess(false);
    setError('');
    try {
      const response = await request('POST', path, JSON.stringify({ version, contentUz, contentRu }));
      if (!response.ok) {
        setError(response.status === 409
          ? (ru ? 'Эта версия документа уже опубликована.' : 'Bu hujjat versiyasi avval nashr qilingan.')
          : (ru ? 'Не удалось опубликовать документ.' : 'Hujjatni nashr qilib bo‘lmadi.'));
        return;
      }
      const published: Revision = await response.json();
      setVersion('');
      const updates = await Promise.allSettled([
        request('GET', '/api/site/legal/' + kind).then(async result => {
          if (result.status !== 200) throw Error();
          const latest: Revision = await result.json();
          if (latest.version !== published.version && !latest.active) throw Error();
          setCurrent(latest);
          dirty.current = false;
          setContentUz(latest.contentUz);
          setContentRu(latest.contentRu);
          setCurrentError(false);
        }),
        request('GET', path).then(async result => {
          if (!result.ok) throw Error();
          const revisions: Revision[] = await result.json();
          if (!revisions.some(revision => revision.version === published.version)) throw Error();
          setHistory(revisions);
          setHistoryError(false);
        }),
      ]);
      setCurrentError(updates[0].status === 'rejected');
      setHistoryError(updates[1].status === 'rejected');
      setSuccess(updates.every(result => result.status === 'fulfilled'));
      if (updates.some(result => result.status === 'rejected')) {
        setError(ru ? 'Версия сохранена, но обновить данные не удалось. Обновите страницу.'
          : 'Versiya saqlandi, lekin ma’lumotlarni qayta yuklab bo‘lmadi. Sahifani yangilang.');
      }
    } catch {
      setError(ru ? 'Не удалось выполнить запрос.' : 'So‘rovni bajarib bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  }

  async function complete(row: Deletion) {
    if (processing) return;
    setProcessing(row.accountId);
    setDeletionError(false);
    try {
      const response = await request('POST', '/api/admin/account-deletion-requests/' + row.accountId + '/complete',
        JSON.stringify({ obligationsSettled: true }));
      if (!response.ok) throw new Error();
      setRows(previous => previous.map(item => item.accountId === row.accountId ? { ...item, status: response.status === 204 ? 'COMPLETED' : 'PROCESSING' } : item));
    } catch {
      setDeletionError(true);
    } finally {
      setProcessing(undefined);
    }
  }

  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <h1 className="text-2xl font-bold">{ru ? 'Правовые документы' : 'Huquqiy hujjatlar'}</h1>
    <form className="grid gap-4 rounded-xl border p-5" onSubmit={publish}>
      <label className="grid gap-1">{ru ? 'Документ' : 'Hujjat'}
        <select className="rounded border p-2" value={kind} disabled={busy} onChange={e => {
          dirty.current = false;
          setKind(e.target.value as typeof kind);
          setCurrent(null);
          setHistory([]);
          setVersion('');
          setContentUz('');
          setContentRu('');
          setError('');
          setSuccess(false);
        }}>
          <option value="privacy">{ru ? 'Политика конфиденциальности' : 'Maxfiylik siyosati'}</option>
          <option value="terms">{ru ? 'Условия использования' : 'Foydalanish shartlari'}</option>
          <option value="delete">{ru ? 'Удаление аккаунта' : 'Hisobni o‘chirish'}</option>
        </select>
      </label>
      <p>{ru ? 'Действующая версия' : 'Amaldagi versiya'} · {loadingCurrent ? (ru ? 'Загрузка…' : 'Yuklanmoqda…')
        : currentError ? (ru ? 'Не удалось загрузить документ.' : 'Amaldagi hujjat yuklanmadi.')
        : current ? current.version + ' · ' + new Date(current.publishedAt).toLocaleString(language) : '—'}</p>
      <label className="grid gap-1">{ru ? 'Новая версия' : 'Yangi versiya'}
        <input className="rounded border p-2" value={version} onChange={e => setVersion(e.target.value)} maxLength={40} pattern={'[A-Za-z0-9._\\-]{1,40}'} required />
      </label>
      <label className="grid gap-1">{ru ? 'Текст на узбекском' : 'O‘zbekcha matn'}
        <textarea className="rounded border p-2" rows={7} value={contentUz} disabled={busy || loadingCurrent} onChange={e => { dirty.current = true; setContentUz(e.target.value); }} maxLength={30000} required />
      </label>
      <label className="grid gap-1">{ru ? 'Текст на русском' : 'Ruscha matn'}
        <textarea className="rounded border p-2" rows={7} value={contentRu} disabled={busy || loadingCurrent} onChange={e => { dirty.current = true; setContentRu(e.target.value); }} maxLength={30000} required />
      </label>
      <button className="w-fit rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-60" disabled={busy || loadingCurrent}>
        {ru ? 'Опубликовать' : 'Nashr qilish'}
      </button>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{ru ? 'Документ опубликован.' : 'Hujjat nashr qilindi.'}</p>}
    </form>
    <section className="rounded-xl border p-5">
      <h2 className="font-semibold">{ru ? 'История версий' : 'Versiyalar tarixi'}</h2>
      {loadingHistory && <p role="status">{ru ? 'Загрузка…' : 'Yuklanmoqda…'}</p>}
      {historyError && <p role="alert">{ru ? 'История версий недоступна.' : 'Versiyalar tarixini yuklab bo‘lmadi.'}</p>}
      {history.map(revision => <details key={revision.version} className="mt-3">
        <summary>{revision.version} · {new Date(revision.publishedAt).toLocaleString(language)} · {revision.active ? (ru ? 'Активна' : 'Faol') : (ru ? 'Архив' : 'Arxiv')}</summary>
        <LegalMarkdown text={ru ? revision.contentRu : revision.contentUz} />
      </details>)}
    </section>
    <section className="rounded-xl border p-5">
      <h2 className="font-semibold">{ru ? 'Запросы на удаление аккаунта' : 'Hisobni o‘chirish so‘rovlari'}</h2>
      <ul className="space-y-2">
        {loadingDeletions && <li role="status">{ru ? 'Загрузка…' : 'Yuklanmoqda…'}</li>}
        {deletionLoadError && <li role="alert">{ru ? 'Запросы на удаление недоступны.' : 'O‘chirish so‘rovlari yuklanmadi.'}</li>}
        {!loadingDeletions && !deletionLoadError && rows.length === 0 && <li>{ru ? 'Запросов пока нет.' : 'Hozircha so‘rovlar yo‘q.'}</li>}
        {deletionError && <li role="alert">{ru ? 'Удаление не завершено. Проверьте заказы и повторите попытку.' : 'Hisob o‘chirilmadi. Buyurtmalarni tekshirib, qayta urining.'}</li>}
        {rows.map(row => <li key={row.accountId} className="break-all">
          {row.accountId} · {row.verifiedAt ? new Date(row.verifiedAt).toLocaleString(language) : '—'} · {deletionStates[row.status]}
          {row.status !== 'COMPLETED' && <button type="button" className="ml-3 rounded border px-2 py-1 text-red-700"
            disabled={!!processing} onClick={() => void complete(row)}>
            {ru ? 'Повторить проверку' : 'O‘chirishni yakunlash'}
          </button>}
        </li>)}
      </ul>
    </section>
  </main>;
}
