import { useEffect, useState, type FormEvent } from 'react';
import type { Language } from '../types/auth';

type Request = (method: 'GET' | 'POST', path: string, body?: string) => Promise<Response>;
type Archive = { name: string; modifiedAt: string; size: number; integrity: string };
type Event = { id: string; actor: string | null; operation: string; state: string; createdAt: string; result: string | null };
type Settings = { enabled: boolean; time: string; retentionDays: number };
type Dashboard = {
  configured: boolean; settings: Settings; nextBackup: string | null; lastBackup: string | null;
  archiveCount: number; totalBytes: number; freeBytes: number | null; ledgerConfigured: boolean;
  checkpointStatus: string; offsiteStatus: string; archives: Archive[]; events: Event[];
};
type Action = { operation: string; archive?: string; settings?: Settings };
const api = '/api/admin/backups';

export function AdminBackupPage({ language, request }: { language: Language; request: Request }) {
  const ru = language === 'ru';
  const t = (uz: string, russian: string) => ru ? russian : uz;
  const [data, setData] = useState<Dashboard>();
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState('');
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [tab, setTab] = useState<'backup' | 'restore'>('backup');
  const [archive, selectArchive] = useState('');
  const [descending, setDescending] = useState(true);
  const [action, setAction] = useState<Action>();
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: number;
    async function load() {
      try {
        const response = await request('GET', api);
        if (!response.ok) throw Error();
        const next: Dashboard = await response.json();
        if (!alive) return;
        setData(next);
        setRefreshFailed(false);
      } catch {
        if (alive) setRefreshFailed(true);
      } finally {
        if (alive) timer = window.setTimeout(load, 5000);
      }
    }
    void load();
    return () => { alive = false; window.clearTimeout(timer); };
  }, [request]);

  async function post(path: string, body?: object) {
    const response = await request('POST', api + path, body && JSON.stringify(body));
    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw Error(details?.message || t('Amal bajarilmadi.', 'Операция не выполнена.'));
    }
    return response;
  }

  async function requestCode() {
    setBusy(true);
    setError('');
    try {
      const result = await (await post('/otp')).json();
      setChallenge(result.challengeId);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    setBusy(true);
    setError('');
    const otp = { challengeId: challenge, code };
    try {
      if (action.operation === 'SETTINGS') {
        await post('/settings', { ...action.settings, otp });
        setSettings(undefined);
      } else if (action.operation === 'DOWNLOAD') {
        const response = await post('/download', { archive: action.archive, otp });
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = action.archive!;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      } else {
        await post('/jobs', { operation: action.operation, archive: action.archive, otp });
      }
      setAction(undefined);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setChallenge('');
      setCode('');
      setBusy(false);
    }
  }

  const start = (operation: string, name?: string, config?: Settings) => {
    setError('');
    setChallenge('');
    setCode('');
    setAction({ operation, archive: name, settings: config });
  };
  const date = (stamp: string | null) => stamp ? new Date(stamp).toLocaleString(ru ? 'ru-RU' : 'uz-UZ') : '—';
  const bytes = (value: number | null) => value == null ? '—'
    : new Intl.NumberFormat(ru ? 'ru-RU' : 'uz-UZ', { style: 'unit', unit: 'megabyte', maximumFractionDigits: 2 }).format(value / 1_000_000);
  const labels: Record<string, string> = {
    CREATE: t('Backup yaratish', 'Создание копии'), VERIFY: t('Yaxlitlik tekshiruvi', 'Проверка целостности'),
    RESTORE_CHECK: t('Tiklash dry-run', 'Пробная проверка восстановления'), DOWNLOAD: t('Yuklab olish', 'Скачивание'),
    SETTINGS: t('Sozlamalar', 'Настройки'), OTP_REQUEST: t('Tasdiqlash kodi', 'Код подтверждения'),
    ROTATION_PREVIEW: t('Rotatsiya dry-run', 'Пробная ротация'), QUEUED: t('Navbatda', 'В очереди'),
    RUNNING: t('Bajarilmoqda', 'Выполняется'), DONE: t('Bajarildi', 'Выполнено'), FAILED: t('Xato', 'Ошибка'),
    UNKNOWN: t('Tekshirilmagan', 'Не проверено'), VERIFIED: t('Tekshirildi', 'Проверено'),
    UNCONFIGURED: t('Sozlanmagan', 'Не настроено'), INTERRUPTED: t('Jarayon uzildi', 'Операция прервана'),
    TIMED_OUT: t('Vaqt chegarasidan oshdi', 'Истекло время ожидания'),
    CHECKPOINT_FAILED: t('Ledger checkpoint tasdiqlanmadi', 'Контрольная точка реестра не подтверждена'),
    ARCHIVE_CHECK_FAILED: t('Arxiv yaxlitligi tasdiqlanmadi', 'Целостность архива не подтверждена'),
    OPERATION_FAILED: t('Arxiv yoki serverdagi backup vositalarini tekshiring', 'Проверьте архив или серверные средства резервного копирования'),
  };
  const status = (value: string | null) => value ? labels[value] ?? value : '—';
  const pane = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900';
  const button = 'rounded-xl border border-slate-300 px-4 py-2 font-medium disabled:opacity-50 dark:border-slate-600';
  const primary = 'rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50';
  const active = data?.events.find(event => event.state === 'QUEUED' || event.state === 'RUNNING');
  const editing = settings ?? data?.settings;
  const selectedArchive = data?.archives.find(item => item.name === archive);

  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-7 text-slate-900 dark:text-slate-100">
      <h1 className="text-3xl font-semibold">{t('Backup va xavfsizlik', 'Резервное копирование и безопасность')}</h1>
      {refreshFailed && <p role="alert">{t('Holatni yuklab bo‘lmadi. Qayta urinilmoqda.', 'Не удалось загрузить состояние. Повторяем попытку.')}</p>}
      {!data && !refreshFailed && <p>{t('Yuklanmoqda…', 'Загрузка…')}</p>}
      {data && <>
        {!data.configured && <p role="status">{t('Serverda backup amallari hali sozlanmagan.', 'На сервере ещё не настроены операции резервного копирования.')}</p>}
        <section className={pane}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [t('Oxirgi muvaffaqiyatli backup', 'Последняя успешная копия'), date(data.lastBackup)],
              [t('Keyingi backup (mahalliy vaqtda)', 'Следующая копия (местное время)'), date(data.nextBackup)],
              [t('Avtomatik backup', 'Автоматическое копирование'), data.settings.enabled ? t('Yoqilgan', 'Включено') : t('O‘chirilgan', 'Выключено')],
              [t('Jami backup', 'Количество копий'), data.archiveCount],
              [t('Umumiy hajm', 'Общий размер'), bytes(data.totalBytes)],
              [t('Diskdagi bo‘sh joy', 'Свободное место'), bytes(data.freeBytes)],
              [t('Saqlash muddati (kun)', 'Срок хранения (дней)'), data.settings.retentionDays],
              [t('Deletion ledger', 'Реестр удалений'), data.ledgerConfigured ? t('Sozlangan', 'Настроен') : status('UNCONFIGURED')],
              [t('Checkpoint', 'Контрольная точка'), status(data.checkpointStatus)],
              [t('Offsite backup', 'Внешнее хранилище'), status(data.offsiteStatus)],
            ].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
          </dl>
        </section>
        <div className="flex flex-wrap gap-2">
          <button className={tab === 'backup' ? primary : button} onClick={() => setTab('backup')}>{t('Backuplar', 'Резервные копии')}</button>
          <button className={tab === 'restore' ? primary : button} onClick={() => setTab('restore')}>{t('Tiklash tekshiruvi', 'Проверка восстановления')}</button>
        </div>
        {active && <p role="status" className={pane}>{status(active.operation)} · {status(active.state)}<progress className="mt-2 block w-full" /></p>}
        <section className={pane}>
          {tab === 'backup' ? <>
            <div className="mb-4 flex flex-wrap gap-2">
              <button className={primary} disabled={!data.configured || !!active} onClick={() => start('CREATE')}>{status('CREATE')}</button>
              <button className={button} disabled={!data.configured || !!active} onClick={() => start('ROTATION_PREVIEW')}>{status('ROTATION_PREVIEW')}</button>
              <button className={button} onClick={() => setDescending(!descending)}>{t('Sana', 'Дата')} {descending ? '↓' : '↑'}</button>
            </div>
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {(descending ? data.archives : [...data.archives].reverse()).map(item => <li key={item.name} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 break-all">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm">{date(item.modifiedAt)} · {bytes(item.size)} · {item.integrity === 'DONE' ? t('Shifrlangan', 'Зашифровано') : status(item.integrity)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={button} disabled={!data.configured || !!active} onClick={() => start('VERIFY', item.name)}>{status('VERIFY')}</button>
                  <button className={button} disabled={item.integrity !== 'DONE'} onClick={() => start('DOWNLOAD', item.name)}>{status('DOWNLOAD')}</button>
                </div>
              </li>)}
            </ul>
            {!data.archives.length && <p>{t('Backup fayllari topilmadi.', 'Резервные копии не найдены.')}</p>}
          </> : <div className="grid gap-3">
            <label htmlFor="restore-archive">{t('Backup tanlang', 'Выберите копию')}</label>
            <select id="restore-archive" className={button + ' bg-transparent'} value={archive} onChange={event => selectArchive(event.target.value)}>
              <option value="">—</option>
              {data.archives.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
              <button className={button} disabled={!data.configured || !selectedArchive || !!active} onClick={() => start('VERIFY', archive)}>{status('VERIFY')}</button>
              <button className={primary} disabled={!data.configured || !selectedArchive || !!active} onClick={() => start('RESTORE_CHECK', archive)}>{status('RESTORE_CHECK')}</button>
            </div>
          </div>}
        </section>
        {tab === 'backup' && editing && <section className={pane}>
          <h2 className="mb-3 text-xl font-semibold">{status('SETTINGS')}</h2>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex gap-2"><input type="checkbox" checked={editing.enabled} onChange={event => setSettings({ ...editing, enabled: event.target.checked })} />{t('Avtomatik backup', 'Автоматическое копирование')}</label>
            <label className="grid gap-1">{t('Vaqt (UTC)', 'Время (UTC)')}<input type="time" className={button} value={editing.time.slice(0, 5)} onChange={event => setSettings({ ...editing, time: event.target.value })} /></label>
            <label className="grid gap-1">{t('Saqlash (7–90 kun)', 'Хранение (7–90 дней)')}<input type="number" min={7} max={90} className={button} value={editing.retentionDays || ''} onChange={event => setSettings({ ...editing, retentionDays: Number(event.target.value) })} /></label>
            <button className={primary} disabled={!data.configured || !editing.time || editing.retentionDays < 7 || editing.retentionDays > 90} onClick={() => start('SETTINGS', undefined, editing)}>{t('Saqlash', 'Сохранить')}</button>
          </div>
        </section>}
        <section className={pane}>
          <h2 className="mb-3 text-xl font-semibold">{t('Amallar tarixi', 'История операций')}</h2>
          <ul className="grid gap-2">
            {data.events.filter(event => tab === 'backup' || event.operation === 'RESTORE_CHECK').map(event =>
              <li key={event.id} className="break-words border-b border-slate-200 pb-2 dark:border-slate-700">
                {date(event.createdAt)} · {status(event.operation)} · {status(event.state)}{event.result ? ' · ' + status(event.result) : ''}
              </li>)}
          </ul>
        </section>
      </>}
      {action && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
        <form onSubmit={confirm} className={pane + ' grid w-full max-w-md gap-3'} role="dialog" aria-modal="true" aria-label={status(action.operation)}>
          <h2 className="text-xl font-semibold">{status(action.operation)}</h2>
          <p>{t('Davom etish uchun email orqali shaxsingizni tasdiqlang.', 'Для продолжения подтвердите личность по электронной почте.')}</p>
          {error && <p role="alert" className="text-red-600">{error}</p>}
          {challenge && <label className="grid gap-1">{t('Olti xonali kod', 'Шестизначный код')}
            <input autoComplete="one-time-code" inputMode="numeric" className={button} maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, ''))} />
          </label>}
          <div className="flex flex-wrap gap-2">
            {!challenge ? <button type="button" className={primary} disabled={busy} onClick={requestCode}>{t('Kod yuborish', 'Отправить код')}</button>
              : <button type="submit" className={primary} disabled={busy || code.length !== 6}>{t('Tasdiqlash', 'Подтвердить')}</button>}
            <button type="button" className={button} disabled={busy} onClick={() => setAction(undefined)}>{t('Yopish', 'Закрыть')}</button>
          </div>
        </form>
      </div>}
    </main>
  );
}
