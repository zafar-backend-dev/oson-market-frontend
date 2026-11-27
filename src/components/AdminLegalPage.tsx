import { useEffect, useState, type FormEvent } from 'react';
import type { Language } from '../types/auth';

type Revision = { version: string; contentUz: string; contentRu: string; publishedAt: string };
type Deletion = { accountId: string; verifiedAt: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' };
type Request = (method: 'GET' | 'POST', path: string, body?: string) => Promise<Response>;

export function AdminLegalPage({ language, request }: { language: Language; request: Request }) {
  const ru = language === 'ru';
  const deletionStates = ru
    ? { PENDING: 'Ожидает обработки', PROCESSING: 'На обработке', COMPLETED: 'Удалён', FAILED: 'Ошибка удаления' }
    : { PENDING: 'Kutilmoqda', PROCESSING: 'Bajarilmoqda', COMPLETED: 'O‘chirildi', FAILED: 'O‘chirishda xato' };
  const [kind, setKind] = useState<'privacy' | 'terms' | 'delete'>('privacy');
  const [history, setHistory] = useState<Revision[]>([]);
  const [rows, setRows] = useState<Deletion[]>([]);
  const [processing, setProcessing] = useState<string>();
  const [deletionError, setDeletionError] = useState(false);
  const [version, setVersion] = useState('');
  const [contentUz, setContentUz] = useState('');
  const [contentRu, setContentRu] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(true);
  const path = '/api/admin/legal/' + kind;

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(false);
    setVersion('');
    setHistory([]);
    setContentUz('');
    setContentRu('');
    void Promise.all([request('GET', path), request('GET', '/api/admin/account-deletion-requests')])
      .then(async responses => {
        if (responses.some(response => !response.ok)) throw Error();
        const [revisions, deletions]: [Revision[], Deletion[]] = await Promise.all(responses.map(r => r.json())) as [Revision[], Deletion[]];
        if (!active) return;
        setHistory(revisions);
        setRows(deletions);
        setContentUz(revisions[0]?.contentUz ?? '');
        setContentRu(revisions[0]?.contentRu ?? '');
      }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [path, request]);

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await request('POST', path, JSON.stringify({ version, contentUz, contentRu }));
      if (!response.ok) throw Error();
      const published: Revision = await response.json();
      setHistory(previous => [published, ...previous]);
      setVersion('');
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function complete(row: Deletion) {
    if (processing || !window.confirm(ru
      ? 'Подтвердите, что заказы и расчёты завершены. Аккаунт и персональные данные будут удалены.'
      : 'Buyurtmalar va hisob-kitoblar yakunlanganini tasdiqlang. Hisob va shaxsiy ma’lumotlar o‘chiriladi.')) return;
    setProcessing(row.accountId);
    setDeletionError(false);
    try {
      const response = await request('POST', '/api/admin/account-deletion-requests/' + row.accountId + '/complete',
        JSON.stringify({ obligationsSettled: true }));
      if (!response.ok) throw new Error();
      setRows(previous => previous.map(item => item.accountId === row.accountId ? { ...item, status: 'COMPLETED' } : item));
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
        <select className="rounded border p-2" value={kind} disabled={busy} onChange={e => setKind(e.target.value as typeof kind)}>
          <option value="privacy">{ru ? 'Политика конфиденциальности' : 'Maxfiylik siyosati'}</option>
          <option value="terms">{ru ? 'Условия использования' : 'Foydalanish shartlari'}</option>
          <option value="delete">{ru ? 'Удаление аккаунта' : 'Hisobni o‘chirish'}</option>
        </select>
      </label>
      <label className="grid gap-1">{ru ? 'Новая версия' : 'Yangi versiya'}
        <input className="rounded border p-2" value={version} onChange={e => setVersion(e.target.value)} maxLength={40} pattern="[A-Za-z0-9._-]+" required />
      </label>
      <label className="grid gap-1">{ru ? 'Текст на узбекском' : 'O‘zbekcha matn'}
        <textarea className="rounded border p-2" rows={7} value={contentUz} onChange={e => setContentUz(e.target.value)} maxLength={30000} required />
      </label>
      <label className="grid gap-1">{ru ? 'Текст на русском' : 'Ruscha matn'}
        <textarea className="rounded border p-2" rows={7} value={contentRu} onChange={e => setContentRu(e.target.value)} maxLength={30000} required />
      </label>
      <button className="w-fit rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-60" disabled={busy}>
        {ru ? 'Опубликовать' : 'Nashr qilish'}
      </button>
      {error && <p role="alert">{ru ? 'Не удалось выполнить запрос.' : 'So‘rovni bajarib bo‘lmadi.'}</p>}
    </form>
    <section className="rounded-xl border p-5">
      <h2 className="font-semibold">{ru ? 'История версий' : 'Versiyalar tarixi'}</h2>
      {history.map(revision => <details key={revision.version} className="mt-3">
        <summary>{revision.version} · {new Date(revision.publishedAt).toLocaleString(language)}</summary>
        <p className="mt-2 whitespace-pre-wrap">{ru ? revision.contentRu : revision.contentUz}</p>
      </details>)}
    </section>
    <section className="rounded-xl border p-5">
      <h2 className="font-semibold">{ru ? 'Запросы на удаление аккаунта' : 'Hisobni o‘chirish so‘rovlari'}</h2>
      <ul className="space-y-2">
        {deletionError && <li role="alert">{ru ? 'Удаление не завершено. Проверьте заказы и повторите попытку.' : 'Hisob o‘chirilmadi. Buyurtmalarni tekshirib, qayta urining.'}</li>}
        {rows.map(row => <li key={row.accountId} className="break-all">
          {row.accountId} · {new Date(row.verifiedAt).toLocaleString(language)} · {deletionStates[row.status]}
          {row.status !== 'COMPLETED' && <button type="button" className="ml-3 rounded border px-2 py-1 text-red-700"
            disabled={!!processing} onClick={() => void complete(row)}>
            {ru ? 'Завершить удаление' : 'O‘chirishni yakunlash'}
          </button>}
        </li>)}
      </ul>
    </section>
  </main>;
}
