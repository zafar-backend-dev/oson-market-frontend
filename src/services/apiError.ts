import type { Language } from '../types/auth';

export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: string[];
  readonly retryAfterSeconds?: number;
  readonly isNetworkError: boolean;
  readonly endpoint?: string;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    fields?: string[];
    retryAfterSeconds?: number;
    isNetworkError?: boolean;
    endpoint?: string;
  }) {
    super(params.message);
    this.name = 'AuthApiError';
    this.status = params.status;
    this.code = params.code;
    this.fields = params.fields ?? [];
    this.retryAfterSeconds = params.retryAfterSeconds;
    this.isNetworkError = Boolean(params.isNetworkError);
    this.endpoint = params.endpoint;
  }
}

export function getDefaultHttpErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Некорректные данные или неверный, использованный либо просроченный код.';
      case 401:
        return 'Неверный логин или пароль, либо срок действия сессии истёк.';
      case 403:
        return 'Доступ запрещён или email Google не подтверждён.';
      case 409:
        return 'Email или имя пользователя уже заняты.';
      case 413:
        return 'Размер файла слишком большой. Максимум 2 МБ.';
      case 429:
        return 'Слишком много запросов. Подождите перед повторным запросом кода.';
      case 503:
        return 'Сервис отправки писем временно недоступен.';
      default:
        return 'Произошла ошибка. Попробуйте ещё раз.';
    }
  }

  switch (status) {
    case 400:
      return 'Kiritilgan ma’lumot yoki tasdiqlash kodi noto‘g‘ri, ishlatilgan yoxud muddati o‘tgan.';
    case 401:
      return 'Login yoki parol noto‘g‘ri, yoxud sessiya muddati tugagan.';
    case 403:
      return 'Ruxsat yo‘q yoki Google email tasdiqlanmagan.';
    case 409:
      return 'Bu email yoki foydalanuvchi nomi allaqachon band.';
    case 413:
      return 'Fayl hajmi juda katta. Maksimum 2 MB ruxsat etiladi.';
    case 429:
      return 'Yangi kod so‘rash uchun biroz kutish kerak.';
    case 503:
      return 'Tasdiqlash xatini yuborish xizmati vaqtincha ishlamayapti.';
    default:
      return 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.';
  }
}
