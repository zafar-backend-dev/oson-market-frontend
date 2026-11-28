import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, Archive, CalendarClock, History, CircleHelp, Info, RotateCcw, Settings2 } from 'lucide-react';
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
    CREATE: t('Zaxira nusxasini yaratish', 'Создать резервную копию'),
    VERIFY: t('Nusxani tekshirish', 'Проверить копию'),
    RESTORE_CHECK: t('Tiklash imkonini tekshirish', 'Проверить возможность восстановления'),
    DOWNLOAD: t('Yuklab olish', 'Скачать'),
    SETTINGS: t('Sozlamalarni saqlash', 'Сохранить настройки'),
    OTP_REQUEST: t('Tasdiqlash kodi so‘raldi', 'Запрошен код подтверждения'),
    ROTATION_PREVIEW: t('O‘chirmasdan tekshirish', 'Проверить без удаления'),
    QUEUED: t('Navbatda', 'В очереди'), RUNNING: t('Bajarilmoqda', 'Выполняется'),
    DONE: t('Bajarildi', 'Готово'), FAILED: t('Xato yuz berdi', 'Произошла ошибка'),
    UNKNOWN: t('Tekshirilmagan', 'Не проверено'), VERIFIED: t('Tekshirildi', 'Проверено'),
    UNCONFIGURED: t('Sozlanmagan', 'Не настроено'),
    INTERRUPTED: t('Jarayon uzilib qoldi. Qayta urinib ko‘ring.', 'Операция прервалась. Попробуйте снова.'),
    TIMED_OUT: t('Jarayon uzoq davom etdi. Qayta urinib ko‘ring.', 'Операция заняла слишком много времени. Попробуйте снова.'),
    CHECKPOINT_FAILED: t('O‘chirilgan hisoblar himoyasini tasdiqlab bo‘lmadi.', 'Не удалось подтвердить защиту удалённых аккаунтов.'),
    ARCHIVE_CHECK_FAILED: t('Nusxani ochib tekshirib bo‘lmadi.', 'Не удалось открыть и проверить копию.'),
    OPERATION_FAILED: t('Amal bajarilmadi. Server administratoriga murojaat qiling.', 'Операция не выполнена. Обратитесь к администратору сервера.'),
  };
  const status = (value: string | null) => value && labels[value] ? labels[value] : t('Holat noma’lum', 'Статус неизвестен');
  const pane = 'min-w-0 rounded-2xl border border-[#e7e5df] bg-white p-5 sm:p-6';
  const button = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-green-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600';
  const primary = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 focus-visible:ring-2 focus-visible:ring-green-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600';
  const muted = 'text-sm leading-relaxed text-slate-600';
  const active = data?.events.find(event => event.state === 'QUEUED' || event.state === 'RUNNING');
  const editing = settings ?? data?.settings;
  const selectedArchive = data?.archives.find(item => item.name === archive);
  const unavailable = t('Zaxira nusxalash xizmati hozir ishlamayapti. Server administratoridan xizmatni yoqish va nusxalar saqlanadigan joyni sozlashni so‘rang.', 'Служба резервного копирования сейчас недоступна. Попросите администратора сервера включить службу и настроить место для хранения копий.');
  const blocked = !data?.configured || !!active;
  const reason = !data?.configured ? unavailable : active ? t('Joriy amal tugashini kuting.', 'Дождитесь завершения текущей операции.') : '';
  const title = (Icon: typeof ShieldCheck, label: string) => <h2 className="flex items-center gap-3 text-lg font-semibold text-slate-900"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-50 text-green-800"><Icon size={19} aria-hidden /></span>{label}</h2>;
  const badge = (label: string, good: boolean) => <span className={'inline-flex rounded-full px-3 py-1 text-xs font-semibold ' + (good ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-950')}>{label}</span>;

  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-4 py-7 text-slate-900 sm:gap-5 sm:px-6">
      <header className="flex items-center gap-3 pb-2">
        <ShieldCheck className="size-8 shrink-0 text-green-800" aria-hidden />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('Ma’lumotlar himoyasi', 'Защита данных')}</h1>
      </header>
      {refreshFailed && <p className={pane} role="alert">{t('Joriy holatni yuklab bo‘lmadi. Sahifa qayta urinmoqda.', 'Не удалось загрузить текущее состояние. Страница повторяет попытку.')}</p>}
      {!data && !refreshFailed && <p className={pane} role="status">{t('Yuklanmoqda…', 'Загрузка…')}</p>}
      {data && <>
        <section className={pane + ' grid gap-4'}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {title(ShieldCheck, t('Umumiy himoya holati', 'Состояние защиты'))}
            {badge(data.configured ? t('Xizmat tayyor', 'Служба доступна') : t('Xizmat mavjud emas', 'Служба недоступна'), data.configured)}
          </div>
          {!data.configured && <p role="status" className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-950"><Info size={18} className="mt-0.5 shrink-0" aria-hidden />{unavailable}</p>}
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              [t('Oxirgi tayyor nusxa', 'Последняя готовая копия'), data.lastBackup ? date(data.lastBackup) : t('Hali yaratilmagan', 'Ещё не создана')],
              [t('Keyingi avtomatik saqlash', 'Следующее автоматическое сохранение'), data.configured && data.nextBackup ? date(data.nextBackup) : t('Rejalashtirilmagan', 'Не запланировано')],
              [t('Saqlangan nusxalar', 'Сохранённые копии'), data.archiveCount],
            ].map(([label, value]) => <div key={label} className="rounded-xl bg-[#f7f8f5] p-3"><dt className={muted}>{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
          </dl>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className={pane + ' grid content-start gap-3'}>
            {title(Archive, status('CREATE'))}
            <p className={muted}>{t('Do‘koningizdagi mahsulotlar, buyurtmalar va boshqa ma’lumotlarning himoyalangan nusxasini hozir yarating.', 'Создайте защищённую копию товаров, заказов и других данных магазина прямо сейчас.')}</p>
            <div><button className={primary} disabled={blocked} onClick={() => start('CREATE')}>{status('CREATE')}</button></div>
            <p className={muted}>{reason || t('Amalni elektron pochtangizga yuborilgan kod bilan tasdiqlaysiz.', 'Подтвердите действие кодом из письма.')}</p>
            {active && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-900">{status(active.operation)} · {status(active.state)}</p>}
          </section>

          {editing && <section className={pane + ' grid content-start gap-3'}>
            {title(CalendarClock, t('Avtomatik saqlash sozlamalari', 'Настройки автоматического сохранения'))}
            <label className="grid gap-1"><span className="flex items-center gap-2 font-semibold"><input type="checkbox" className="size-4 accent-green-700" checked={editing.enabled} onChange={event => setSettings({ ...editing, enabled: event.target.checked })} />{t('Har kuni nusxa yaratish', 'Создавать копию каждый день')}</span><span className={muted}>{t('Yoqilsa, nusxa har kuni belgilangan vaqtda yaratiladi.', 'Если включить, копия будет создаваться ежедневно в заданное время.')}</span></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid content-start gap-1 text-sm font-semibold">{t('Saqlash vaqti (UTC)', 'Время сохранения (UTC)')}<input type="time" className={button + ' w-full'} value={editing.time.slice(0, 5)} onChange={event => setSettings({ ...editing, time: event.target.value })} /><span className={muted + ' font-normal'}>{t('Bu xalqaro vaqt. Keyingi saqlash vaqti yuqorida qurilmangiz vaqtida ko‘rinadi.', 'Это международное время. Следующее сохранение выше показано по времени вашего устройства.')}</span></label>
              <label className="grid content-start gap-1 text-sm font-semibold">{t('Saqlash muddati (kun)', 'Срок хранения (дни)')}<input type="number" min={7} max={90} step={1} className={button + ' w-full'} value={editing.retentionDays || ''} onChange={event => setSettings({ ...editing, retentionDays: Number(event.target.value) })} /><span className={muted + ' font-normal'}>{t('7–90 kun. Eski nusxalar serverda avtomatik tozalash yoqilganida shu muddat bo‘yicha saralanadi.', 'От 7 до 90 дней. Срок применяется к старым копиям, если на сервере включена автоматическая очистка.')}</span></label>
            </div>
            <div><button className={primary} disabled={(!data.configured && editing.enabled) || !editing.time || !Number.isInteger(editing.retentionDays) || editing.retentionDays < 7 || editing.retentionDays > 90} onClick={() => start('SETTINGS', undefined, editing)}>{status('SETTINGS')}</button></div>
            <p className={muted}>{!data.configured && editing.enabled ? unavailable : t('O‘zgarishlarni qo‘llash uchun saqlang va email kodini kiriting.', 'Чтобы применить изменения, сохраните их и введите код из письма.')}</p>
          </section>}
        </div>

        <section className={pane + ' grid gap-3'}>
          {title(Archive, t('Saqlangan nusxalar', 'Сохранённые копии'))}
          <p className={muted}>{t('Nusxani tekshirib, keyin xavfsiz joyda saqlash uchun yuklab oling.', 'Проверьте копию, затем скачайте её для хранения в безопасном месте.')}</p>
          {data.archives.length ? <>
            <div><button className={button} onClick={() => setDescending(!descending)}>{descending ? t('Avval yangilari ↓', 'Сначала новые ↓') : t('Avval eskilari ↑', 'Сначала старые ↑')}</button></div>
            <ul className="divide-y divide-slate-200">
              {(descending ? data.archives : [...data.archives].reverse()).map(item => <li key={item.name} className="grid min-w-0 gap-2 py-3 sm:flex sm:items-start sm:justify-between">
                <div className="min-w-0"><p className="font-semibold">{date(item.modifiedAt)}</p><p className={muted}>{bytes(item.size)} · {item.integrity === 'DONE' ? t('Yuklab olishga tayyor', 'Готова к скачиванию') : status(item.integrity)}</p><details className={muted}><summary className="cursor-pointer">{t('Fayl nomi', 'Имя файла')}</summary><p className="break-all">{item.name}</p></details></div>
                <div><div className="flex flex-wrap gap-2"><button className={button} disabled={blocked} onClick={() => start('VERIFY', item.name)}>{status('VERIFY')}</button><button className={button} disabled={item.integrity !== 'DONE'} onClick={() => start('DOWNLOAD', item.name)}>{status('DOWNLOAD')}</button></div>
                {item.integrity !== 'DONE' && <p className={muted + ' mt-1'}>{t('Yuklab olishdan oldin nusxani tekshiring.', 'Перед скачиванием проверьте копию.')}</p>}</div>
              </li>)}
            </ul>
            {reason && <p className={muted}>{reason}</p>}
          </> : <p className="rounded-xl bg-[#f7f8f5] p-3 text-sm text-slate-700">{t('Hozir yuklab olish uchun nusxa yo‘q.', 'Сейчас нет копий для скачивания.')}</p>}
          <details className={muted + ' rounded-xl border border-slate-200 p-3'}>
            <summary className="cursor-pointer font-semibold text-slate-800">{t('Eski nusxalarni avtomatik tozalash', 'Автоматическая очистка старых копий')}</summary>
            <p className="my-2">{t('Saqlash muddati o‘tgan nechta nusxa borligini ko‘ring. Tekshiruv davomida hech qanday fayl o‘chirilmaydi.', 'Узнайте, сколько копий вышло за срок хранения. Проверка не удаляет файлы.')}</p>
            <button className={button} disabled={blocked} onClick={() => start('ROTATION_PREVIEW')}>{status('ROTATION_PREVIEW')}</button>
            {reason && <p className="mt-2">{reason}</p>}
          </details>
        </section>

        <section className={pane + ' grid gap-3'}>
          {title(RotateCcw, t('Ma’lumotlarni tiklash', 'Восстановление данных'))}
          <p className={muted}>{t('Nusxani tanlang va tiklashga yaroqliligini tekshiring. Tekshiruv do‘kon ma’lumotlarini o‘zgartirmaydi. Haqiqiy tiklashni server administratori bajaradi.', 'Выберите копию и проверьте её пригодность для восстановления. Проверка не меняет данные магазина. Само восстановление выполняет администратор сервера.')}</p>
          <label className="grid max-w-full gap-1 text-sm font-semibold">{t('Tekshiriladigan nusxa', 'Копия для проверки')}<select className={button + ' max-w-full'} value={archive} onChange={event => selectArchive(event.target.value)}><option value="">{t('Nusxani tanlang', 'Выберите копию')}</option>{data.archives.map(item => <option key={item.name} value={item.name}>{date(item.modifiedAt)} · {bytes(item.size)}</option>)}</select></label>
          <div><button className={button} disabled={blocked || !selectedArchive} onClick={() => start('RESTORE_CHECK', archive)}>{status('RESTORE_CHECK')}</button></div>
          {(reason || !selectedArchive) && <p className={muted}>{reason || t('Davom etish uchun nusxani tanlang.', 'Чтобы продолжить, выберите копию.')}</p>}
        </section>

        <section className={pane + ' grid gap-3'}>
          {title(History, t('Amallar tarixi', 'История действий'))}
          {data.events.length ? <ul className="divide-y divide-slate-200">{data.events.map(event => <li key={event.id} className="grid gap-1 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-semibold">{status(event.operation)}</span>{badge(status(event.state), event.state === 'DONE')}<span className={muted}>{date(event.createdAt)}</span></div>
            {event.result && <p className={muted}>{event.operation === 'ROTATION_PREVIEW' && /^\d+$/.test(event.result) ? t('Tozalashga mos nusxalar: ', 'Копий подходит для очистки: ') + event.result : status(event.result)}</p>}
            {event.result && event.state === 'FAILED' && <details className={muted}><summary className="cursor-pointer">{t('Texnik tafsilot', 'Технические сведения')}</summary><code className="break-all">{event.result}</code></details>}
          </li>)}</ul> : <p className={muted}>{t('Hali hech qanday amal bajarilmagan.', 'Действий пока нет.')}</p>}
        </section>

        <section className={pane + ' grid gap-3'}>
          {title(CircleHelp, t('Foydalanish bo‘yicha yordam', 'Помощь в использовании'))}
          <details className={muted}><summary className="cursor-pointer font-semibold text-slate-900">{t('Zaxira nusxasi nima?', 'Что такое резервная копия?')}</summary><p className="mt-1">{t('Bu mahsulotlar, buyurtmalar va do‘koningizdagi boshqa ma’lumotlarning himoyalangan nusxasi.', 'Это защищённая копия товаров, заказов и других данных вашего магазина.')}</p></details>
          <details className={muted}><summary className="cursor-pointer font-semibold text-slate-900">{t('Avtomatik saqlash nima?', 'Что такое автоматическое сохранение?')}</summary><p className="mt-1">{t('Yoqilgan bo‘lsa, xizmat har kuni tanlangan vaqtda zaxira nusxasini yaratadi.', 'Если оно включено, служба ежедневно создаёт резервную копию в выбранное время.')}</p></details>
        </section>

        <details className={pane}>
          <summary className="cursor-pointer font-semibold"><Settings2 size={18} className="mr-2 inline text-green-800" aria-hidden />{t('Kengaytirilgan texnik ma’lumotlar', 'Дополнительные технические сведения')}</summary>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              [t('O‘chirilgan hisoblar himoyasi', 'Защита удалённых аккаунтов'), data.ledgerConfigured ? t('Sozlangan', 'Настроена') : status('UNCONFIGURED')],
              [t('Himoya nazorati', 'Проверка защиты'), status(data.checkpointStatus)],
              [t('Boshqa serverdagi zaxira nusxasi', 'Резервная копия на другом сервере'), status(data.offsiteStatus)],
              [t('Nusxalarning umumiy hajmi', 'Общий размер копий'), bytes(data.totalBytes)],
              [t('Diskdagi bo‘sh joy', 'Свободное место на диске'), bytes(data.freeBytes)],
            ].map(([label, value]) => <div key={label}><dt className={muted}>{label}</dt><dd className="font-semibold">{value}</dd></div>)}
          </dl>
        </details>
      </>}
      {action && <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-slate-900/40 p-4">
        <form onSubmit={confirm} className={pane + ' grid w-full max-w-md gap-3 text-slate-900'} role="dialog" aria-modal="true" aria-label={status(action.operation)}>
          <h2 className="text-xl font-semibold">{status(action.operation)}</h2>
          <p className={muted}>{t('Davom etish uchun elektron pochtangizga yuborilgan kodni kiriting.', 'Чтобы продолжить, введите код из письма.')}</p>
          {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">
            <p>{t('Amal bajarilmadi. Kodni qayta so‘rang yoki birozdan keyin urinib ko‘ring.', 'Не удалось выполнить действие. Запросите новый код или попробуйте чуть позже.')}</p>
            <details className="mt-2"><summary className="cursor-pointer font-semibold">{t('Xato tafsilotlari', 'Подробности ошибки')}</summary><p className="break-words">{error}</p></details>
          </div>}
          {challenge && <label className="grid gap-1">{t('Olti xonali kod', 'Шестизначный код')}<input autoComplete="one-time-code" inputMode="numeric" className={button} maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, ''))} /></label>}
          <div className="flex flex-wrap gap-2">
            {!challenge ? <button type="button" className={primary} disabled={busy} onClick={requestCode}>{t('Kod yuborish', 'Отправить код')}</button> : <button type="submit" className={primary} disabled={busy || code.length !== 6}>{t('Tasdiqlash', 'Подтвердить')}</button>}
            <button type="button" className={button} disabled={busy} onClick={() => setAction(undefined)}>{t('Yopish', 'Закрыть')}</button>
          </div>
        </form>
      </div>}
    </main>
  );
}