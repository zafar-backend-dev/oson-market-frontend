import { API_BASE_URL } from '../constants';
import type { ApiErrorBody, Language } from '../types/auth';
import { AuthApiError, getDefaultHttpErrorMessage } from './apiError';
import { fetchWithSessionRefresh } from './sessionManager';

export const SOCIAL_PLATFORM_KEYS = [
  'TELEGRAM',
  'INSTAGRAM',
  'FACEBOOK',
  'YOUTUBE',
  'TIKTOK',
  'X',
  'LINKEDIN',
  'WHATSAPP',
] as const;

export type SocialPlatformKey = (typeof SOCIAL_PLATFORM_KEYS)[number];

export type SiteSocialLinks = Partial<Record<SocialPlatformKey, string>>;

export const SOCIAL_PLATFORM_META: Record<
  SocialPlatformKey,
  { label: string; placeholder: string }
> = {
  TELEGRAM: { label: 'Telegram', placeholder: 'https://t.me/oson_market' },
  INSTAGRAM: { label: 'Instagram', placeholder: 'https://www.instagram.com/oson_market/' },
  FACEBOOK: { label: 'Facebook', placeholder: 'https://www.facebook.com/osonmarket' },
  YOUTUBE: { label: 'YouTube', placeholder: 'https://www.youtube.com/@osonmarket' },
  TIKTOK: { label: 'TikTok', placeholder: 'https://www.tiktok.com/@osonmarket' },
  X: { label: 'X', placeholder: 'https://x.com/osonmarket' },
  LINKEDIN: { label: 'LinkedIn', placeholder: 'https://www.linkedin.com/company/osonmarket/' },
  WHATSAPP: { label: 'WhatsApp', placeholder: 'https://wa.me/998901234567' },
};

export const SOCIAL_URL_MAX_LENGTH = 2048;

export function isValidHttpsUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > SOCIAL_URL_MAX_LENGTH || /\s/.test(trimmed)) {
    return false;
  }
  if (!/^https:\/\//i.test(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

export interface SiteAboutLocaleContent {
  title: string;
  description: string;
}

export interface SiteAboutResponse {
  uz: SiteAboutLocaleContent | null;
  ru: SiteAboutLocaleContent | null;
  socialLinks: SiteSocialLinks;
  updatedAt: string | null;
}

export interface SiteAboutUpdatePayload {
  uz: SiteAboutLocaleContent;
  ru: SiteAboutLocaleContent;
  socialLinks: SiteSocialLinks;
}

export interface PublicSiteAboutResponse {
  uz: SiteAboutLocaleContent | null;
  ru: SiteAboutLocaleContent | null;
  title: string | null;
  description: string | null;
  socialLinks: SiteSocialLinks;
  updatedAt: string | null;
}

function getDefaultAboutErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Проверьте корректность данных раздела «О нас».';
      case 401:
        return 'Сессия истекла. Пожалуйста, войдите снова.';
      case 403:
        return 'Для редактирования раздела «О нас» требуются права администратора.';
      default:
        return getDefaultHttpErrorMessage(status, lang);
    }
  }

  switch (status) {
    case 400:
      return '«Biz haqimizda» bo‘limi ma’lumotlarini tekshiring.';
    case 401:
      return 'Sessiya muddati tugagan. Iltimos, qayta kiring.';
    case 403:
      return '«Biz haqimizda» bo‘limini tahrirlash uchun admin ruxsati kerak.';
    default:
      return getDefaultHttpErrorMessage(status, lang);
  }
}

function normalizeLocaleContent(raw: unknown): SiteAboutLocaleContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title : '';
  const description = typeof obj.description === 'string' ? obj.description : '';
  return { title, description };
}

function normalizeSocialLinks(raw: unknown, requireSafeHttps = false): SiteSocialLinks {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const normalized: SiteSocialLinks = {};

  for (const key of SOCIAL_PLATFORM_KEYS) {
    const val = record[key] ?? record[key.toLowerCase()];
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) continue;
      if (requireSafeHttps && !isValidHttpsUrl(trimmed)) continue;
      normalized[key] = trimmed;
    }
  }

  return normalized;
}

function normalizeAboutResponse(raw: unknown): SiteAboutResponse {
  if (!raw || typeof raw !== 'object') {
    return { uz: null, ru: null, socialLinks: {}, updatedAt: null };
  }
  const obj = raw as Record<string, unknown>;
  const updatedAt =
    typeof obj.updatedAt === 'string' && obj.updatedAt.trim() ? obj.updatedAt.trim() : null;

  return {
    uz: normalizeLocaleContent(obj.uz),
    ru: normalizeLocaleContent(obj.ru),
    socialLinks: normalizeSocialLinks(obj.socialLinks, false),
    updatedAt,
  };
}

function normalizePublicAboutResponse(raw: unknown, language: Language): PublicSiteAboutResponse {
  if (!raw || typeof raw !== 'object') {
    return { uz: null, ru: null, title: null, description: null, socialLinks: {}, updatedAt: null };
  }
  const obj = raw as Record<string, unknown>;
  const updatedAt =
    typeof obj.updatedAt === 'string' && obj.updatedAt.trim() ? obj.updatedAt.trim() : null;

  const rawUz = normalizeLocaleContent(obj.uz);
  const rawRu = normalizeLocaleContent(obj.ru);
  const uz =
    rawUz && (rawUz.title.trim() || rawUz.description.trim()) ? rawUz : null;
  const ru =
    rawRu && (rawRu.title.trim() || rawRu.description.trim()) ? rawRu : null;

  let title = typeof obj.title === 'string' && obj.title.trim() ? obj.title : null;
  let description =
    typeof obj.description === 'string' && obj.description.trim() ? obj.description : null;

  if (!title && !description) {
    const picked = language === 'ru' ? (ru ?? uz) : (uz ?? ru);
    if (picked) {
      title = picked.title.trim() ? picked.title : null;
      description = picked.description.trim() ? picked.description : null;
    }
  }

  return {
    uz,
    ru,
    title,
    description,
    socialLinks: normalizeSocialLinks(obj.socialLinks, true),
    updatedAt,
  };
}

async function requestAdminAbout<T>(
  options: {
    method: 'GET' | 'PUT';
    accessToken: string;
    language: Language;
    body?: SiteAboutUpdatePayload;
  },
): Promise<T> {
  const safeLanguage: Language = options.language === 'ru' ? 'ru' : 'uz';
  const headers: Record<string, string> = {};

  if (options.method === 'PUT') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetchWithSessionRefresh('/api/admin/site/about', {
    method: options.method,
    accessToken: options.accessToken,
    language: safeLanguage,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    networkErrorMessage:
      safeLanguage === 'ru'
        ? 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.'
        : 'Server bilan bog‘lanib bo‘lmadi. Ulanishni tekshirib qayta urinib ko‘ring.',
  });

  const text = await response.text();
  let parsed: ApiErrorBody | T | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as ApiErrorBody | T;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errorBody = (parsed ?? {}) as ApiErrorBody;
    throw new AuthApiError({
      status: response.status,
      code: errorBody.code || `http.${response.status}`,
      message: errorBody.message || getDefaultAboutErrorMessage(response.status, safeLanguage),
      fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
      endpoint: `${options.method} /api/admin/site/about`,
    });
  }

  return (parsed ?? {}) as T;
}

export const siteAboutApi = {
  async getPublicAbout(language: Language = 'uz'): Promise<PublicSiteAboutResponse> {
    const safeLanguage: Language = language === 'ru' ? 'ru' : 'uz';
    const networkErrorMessage =
      safeLanguage === 'ru'
        ? 'Не удалось загрузить информацию о компании. Попробуйте ещё раз.'
        : 'Kompaniya haqidagi ma’lumotlarni yuklab bo‘lmadi. Qaytadan urinib ko‘ring.';

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/site/about`, {
        method: 'GET',
        headers: {
          'Accept-Language': safeLanguage,
        },
      });
    } catch {
      throw new AuthApiError({
        status: 0,
        code: 'network.unreachable',
        message: networkErrorMessage,
        isNetworkError: true,
        endpoint: 'GET /api/site/about',
      });
    }

    if (response.status === 404) {
      return { uz: null, ru: null, title: null, description: null, socialLinks: {}, updatedAt: null };
    }

    const text = await response.text();
    let parsed: ApiErrorBody | unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as ApiErrorBody | unknown;
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      const errorBody = (parsed ?? {}) as ApiErrorBody;
      throw new AuthApiError({
        status: response.status,
        code: errorBody.code || `http.${response.status}`,
        message: errorBody.message || getDefaultHttpErrorMessage(response.status, safeLanguage),
        fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
        endpoint: 'GET /api/site/about',
      });
    }

    return normalizePublicAboutResponse(parsed, safeLanguage);
  },

  async getAdminAbout(
    accessToken: string,
    language: Language = 'uz',
  ): Promise<SiteAboutResponse> {
    const raw = await requestAdminAbout<unknown>({
      method: 'GET',
      accessToken,
      language,
    });
    return normalizeAboutResponse(raw);
  },

  async updateAdminAbout(
    accessToken: string,
    payload: SiteAboutUpdatePayload,
    language: Language = 'uz',
  ): Promise<SiteAboutResponse> {
    const raw = await requestAdminAbout<unknown>({
      method: 'PUT',
      accessToken,
      language,
      body: payload,
    });
    return normalizeAboutResponse(raw);
  },
};
