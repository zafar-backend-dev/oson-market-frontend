import { API_BASE_URL } from '../constants';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Language } from '../types/auth';

const documents = {
  uz: {
    privacy: [
      ['Oson Market', 'Oson Market mahsulotlarni ko‘rish, savatga qo‘shish va buyurtma berish uchun sayt va Android ilovasini taqdim etadi.'],
      ['Hisob va profil', 'Hisob uchun email, foydalanuvchi nomi, ism va familiya ishlatiladi. Profilga telefon raqami va rasm qo‘shish mumkin. Google orqali kirishda autentifikatsiya uchun Google hisob identifikatori va email ishlatiladi. Email tasdiqlash kodlari Brevo orqali yuboriladi.'],
      ['Buyurtmalar va joylashuv', 'Buyurtmalar tarixi, tanlangan mahsulotlar va aloqa ma’lumotlari buyurtmani bajarish uchun ishlatiladi. Yetkazib berish tanlansa, manzil va yetkazib berish nuqtasi buyurtmaga bog‘lanadi. Joylashuvga ruxsat berilsa, undan xaritada nuqtani aniqlash yoki yaqin filiallarni topish uchun foydalaniladi.'],
      ['Qurilma va bildirishnomalar', 'Sessiyani yuritish uchun kirish va yangilash tokenlari ishlatiladi. Android push bildirishnomalari uchun Firebase qurilma tokeni ishlatiladi. Bildirishnoma ruxsatini qurilma sozlamalaridan boshqarish mumkin.'],
      ['Chat va boshqa kontent', 'Yordam so‘ralganda matn, yuborilgan rasmlar va ovozli xabarlar chatga bog‘lanadi. Mikrofon ovozli xabar yozish uchun, telefonning fayl tanlash interfeysi rasm tanlash uchun ishlatiladi. Mahsulot izohlari mahsulot sahifasida ko‘rinishi mumkin.'],
      ['To‘lov va xizmatlar', 'Buyurtmada tanlangan to‘lov usuli va buyurtma holati qayd etiladi. Google kirish, Brevo orqali email va Firebase orqali push bildirishnomalari o‘z vazifalari uchun kerakli ma’lumotlarga ishlov beradi.'],
      ['Himoya, saqlash va huquqlar', 'Sayt va ishlab chiqarish API manzili HTTPS orqali ochiladi. Profil ma’lumotlarini hisob sozlamalarida ko‘rish va tahrirlash mumkin. Hisobni o‘chirish so‘rovi email kodi orqali tasdiqlanadi. Buyurtma, hisob-kitob va zaxira yozuvlarining saqlash muddatlari aniqlashtirilmoqda.'],
      ['Bog‘lanish', 'Yordam uchun Chat bo‘limi, ziyatovzafar98@gmail.com yoki +905427325572 orqali bog‘laning.'],
    ],
    terms: [
      ['Umumiy qoidalar va hisob', 'Oson Market katalogni ko‘rish va mahsulotlarga buyurtma berish imkonini beradi. Hisobga kirish ma’lumotlarini himoyalang va profilga to‘g‘ri aloqa ma’lumotlarini kiriting.'],
      ['Mahsulot, narx va to‘lov', 'Buyurtma berishdan oldin mahsulot variantini, miqdorini, narxini va yakuniy summani tekshiring. Buyurtma shaklida mavjud to‘lov usullari ko‘rsatiladi.'],
      ['Buyurtma, bekor qilish va yetkazib berish', 'Buyurtma shaklida yetkazib berish yoki filialdan olib ketish usulini tanlang. Yetkazib berish uchun manzilni, olib ketish uchun filialni tekshiring. Bekor qilish imkoniyati buyurtma holatiga bog‘liq. Bekor qilishda sabab ko‘rsatiladi.'],
      ['Mahsulotlarni qaytarish', 'Qaytarish bo‘yicha savol bilan yordam xizmatiga buyurtma raqami orqali murojaat qiling. Batafsil qaytarish tartibi aniqlashtirilmoqda.'],
      ['Izohlar, baholash va taqiqlangan harakatlar', 'Izoh va baholarda mahsulot yoki buyurtma haqidagi tajribangizni tasvirlang. Boshqalarning shaxsiy ma’lumotlarini, haqoratli xabarlarni va spamni joylamang. Boshqa shaxs nomidan ruxsatsiz hisobdan foydalanmang.'],
      ['Hisobni o‘chirish va aloqa', 'Hisobni o‘chirish sahifasida so‘rov yuborishingiz mumkin. Yordam uchun Android ilovasidagi Chat bo‘limidan foydalaning.'],
    ],
  },
  ru: {
    privacy: [
      ['Oson Market', 'Oson Market предоставляет сайт и приложение Android для просмотра товаров, работы с корзиной и оформления заказов.'],
      ['Аккаунт и профиль', 'Для аккаунта используются адрес электронной почты, имя пользователя, имя и фамилия. В профиль можно добавить номер телефона и фотографию. При входе через Google используются идентификатор аккаунта Google и email. Коды подтверждения отправляются через Brevo.'],
      ['Заказы и местоположение', 'История заказов, выбранные товары и контактные данные используются для исполнения заказов. При доставке сохраняются адрес и точка доставки. С разрешения пользователя геолокация помогает определить точку на карте или найти ближайший филиал.'],
      ['Устройство и уведомления', 'Для сеансов используются токены доступа и обновления. Для уведомлений Android используется токен устройства Firebase. Разрешением на уведомления можно управлять в настройках устройства.'],
      ['Чат и другой контент', 'С чатом поддержки связаны отправленные тексты, изображения и голосовые сообщения. Микрофон используется для записи голосового сообщения, системный выбор файлов — для выбора изображения. Отзывы могут отображаться на странице товара.'],
      ['Оплата и сторонние службы', 'В заказе фиксируются выбранный способ оплаты и статус. Google, Brevo и Firebase обрабатывают данные, необходимые для входа, отправки писем и push-уведомлений соответственно.'],
      ['Защита, хранение и права', 'Сайт и рабочий API доступны по HTTPS. Просматривать и исправлять данные можно в настройках профиля. Запрос на удаление подтверждается кодом по электронной почте. Сроки хранения заказов, расчётных записей и резервных копий уточняются.'],
      ['Связь', 'Обратитесь через чат приложения, по email ziyatovzafar98@gmail.com или телефону +905427325572.'],
    ],
    terms: [
      ['Общие правила и аккаунт', 'В Oson Market можно просматривать каталог и оформлять заказы. Защищайте данные входа и указывайте актуальные контактные данные.'],
      ['Товары, цены и оплата', 'Перед заказом проверьте вариант товара, количество, цену и итоговую сумму. Доступные способы оплаты указаны при оформлении.'],
      ['Заказ, отмена и доставка', 'При оформлении выберите доставку или самовывоз. Проверьте адрес доставки либо филиал самовывоза. Возможность отмены зависит от статуса заказа. При отмене указывается причина.'],
      ['Возврат товаров', 'По вопросам возврата обратитесь в поддержку и укажите номер заказа. Подробный порядок возврата уточняется.'],
      ['Отзывы, оценки и запрещённые действия', 'В отзывах и оценках описывайте свой опыт с товаром или заказом. Запрещены спам, оскорбления и публикация чужих персональных данных. Не используйте чужой аккаунт без разрешения.'],
      ['Удаление аккаунта и связь', 'Запрос можно отправить на странице удаления аккаунта. Связаться с поддержкой можно в разделе «Чат» приложения Android.'],
    ],
  },
};

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

  const [revision, setRevision] = useState<{ version: string; publishedAt: string; contentUz: string; contentRu: string }>();
  useEffect(() => {
    if (kind !== 'privacy' && kind !== 'terms') return;
    const controller = new AbortController();
    void fetch(API_BASE_URL + '/api/site/legal/' + kind, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (response.status !== 200) return;
        const document = await response.json();
        if (!controller.signal.aborted) setRevision(document);
      }).catch(() => {});
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
      {(kind === 'privacy' || kind === 'terms') && (revision ? <>
        <p className="mb-4 text-sm">{revision.version} · {new Date(revision.publishedAt).toLocaleDateString(language)}</p>
        <p className="whitespace-pre-wrap leading-relaxed">{ru ? revision.contentRu : revision.contentUz}</p>
      </> : <>
        <p className="mb-5 text-sm">{ru ? 'Редакция от 27.11.2026' : 'Tahrir sanasi 27.11.2026'}</p>
        {documents[language][kind].map(([title, content]) => <section className="mb-5" key={title}>
          <h2 className="mb-1 text-lg font-semibold">{title}</h2><p className="leading-relaxed">{content}</p>
        </section>)}
      </>)}
      {kind === 'about' && <p>{documents[language].privacy[0][1]}</p>}
      {kind === 'contact' && <div className="grid gap-3"><a className="underline" href="mailto:ziyatovzafar98@gmail.com">ziyatovzafar98@gmail.com</a><a className="underline" href="tel:+905427325572">+90 542 732 55 72</a><Link className="underline" to="/chat">{ru ? 'Чат с поддержкой Oson Market' : 'Oson Market yordam xizmati bilan chat'}</Link></div>}
      {kind === 'delete' && <div className="space-y-4">
        <p>{ru ? 'Войдите в свой аккаунт и подтвердите запрос кодом, отправленным на email. Запрос можно подать при активном заказе.'
          : 'Hisobingizga kiring va emailga yuborilgan kod bilan so‘rovni tasdiqlang. Faol buyurtma bo‘lsa ham so‘rov yuborish mumkin.'}</p>
        <p>{ru ? 'Подтверждение регистрирует запрос. Удаление аккаунта и связанных данных выполняется отдельно. Порядок хранения необходимых записей уточняется.'
          : 'Tasdiqlash so‘rovni ro‘yxatga oladi. Hisob va bog‘langan ma’lumotlarni o‘chirish alohida bajariladi. Zarur yozuvlarni saqlash tartibi aniqlashtirilmoqda.'}</p>
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
