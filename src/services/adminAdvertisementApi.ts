import { API_BASE_URL } from '../constants';
import type {
  AdminAdvertisement,
  AdminAdvertisementHistoryEntry,
  AdminAdvertisementHistoryResponse,
  AdminAdvertisementItem,
  AdminAdvertisementListResponse,
  AdminAdvertisementPayload,
  AdminAdvertisementSnapshot,
  AdminAdvertisementsListParams,
  AdvertisementChannel,
  AdvertisementLocaleContent,
  AdvertisementMedia,
  AdvertisementStatus,
  AdvertisementVisibility,
  UpdateAdvertisementStatusPayload,
} from '../types/adminAdvertisement';
import type { ApiErrorBody, Language } from '../types/auth';
import { AuthApiError, getDefaultHttpErrorMessage } from './apiError';
import { fetchWithSessionRefresh } from './sessionManager';

function getAdvertisementHttpErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Проверьте заполненные поля рекламы.';
      case 401:
        return 'Сессия истекла. Пожалуйста, войдите снова.';
      case 403:
        return 'Для управления рекламой требуются права администратора.';
      case 404:
        return 'Реклама не найдена.';
      case 409:
        return 'Реклама была изменена другим пользователем. Загрузите актуальную версию.';
      case 413:
        return 'Размер загружаемого файла превышает допустимый предел.';
      default:
        return getDefaultHttpErrorMessage(status, lang);
    }
  }

  switch (status) {
    case 400:
      return 'Reklama ma’lumotlarini tekshiring.';
    case 401:
      return 'Sessiya muddati tugagan. Iltimos, qayta kiring.';
    case 403:
      return 'Reklamalarni boshqarish uchun admin ruxsati kerak.';
    case 404:
      return 'Reklama topilmadi.';
    case 409:
      return 'Reklama boshqa foydalanuvchi tomonidan o‘zgartirilgan. Yangi versiyani yuklang.';
    case 413:
      return 'Yuklanayotgan fayl hajmi ruxsat etilgan limitdan oshib ketdi.';
    default:
      return getDefaultHttpErrorMessage(status, lang);
  }
}

export function resolveAdvertisementMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function normalizeLocaleContent(raw: unknown): AdvertisementLocaleContent {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    title: typeof obj.title === 'string' ? obj.title : '',
    description: typeof obj.description === 'string' && obj.description.trim() ? obj.description : null,
  };
}

function normalizeChannels(raw: unknown): AdvertisementChannel[] {
  if (!Array.isArray(raw)) return [];
  const valid: AdvertisementChannel[] = [];
  for (const item of raw) {
    const ch = typeof item === 'string' ? item.trim().toUpperCase() : '';
    if ((ch === 'WEB' || ch === 'APP') && !valid.includes(ch)) {
      valid.push(ch);
    }
  }
  return valid;
}

function normalizeStatus(raw: unknown): AdvertisementStatus {
  const val = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (val === 'PUBLISHED' || val === 'PAUSED' || val === 'ARCHIVED' || val === 'DRAFT') {
    return val;
  }
  return 'DRAFT';
}

function normalizeVisibility(raw: unknown, fallbackStatus: AdvertisementStatus): AdvertisementVisibility {
  const val = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (
    val === 'DRAFT' ||
    val === 'SCHEDULED' ||
    val === 'LIVE' ||
    val === 'ENDED' ||
    val === 'PAUSED' ||
    val === 'ARCHIVED'
  ) {
    return val;
  }
  return fallbackStatus === 'PUBLISHED' ? 'LIVE' : fallbackStatus;
}

function normalizeMedia(raw: unknown): AdvertisementMedia | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const url = typeof obj.url === 'string' && obj.url.trim() ? obj.url.trim() : null;
  const mediaType =
    typeof obj.mediaType === 'string'
      ? obj.mediaType
      : typeof obj.type === 'string'
        ? obj.type
        : null;
  const contentType =
    typeof obj.contentType === 'string'
      ? obj.contentType
      : typeof obj.mimeType === 'string'
        ? obj.mimeType
        : null;

  if (!url && !mediaType && !contentType) {
    return null;
  }

  return {
    mediaType,
    contentType,
    url,
    fileName: typeof obj.fileName === 'string' ? obj.fileName : null,
    fileSizeBytes:
      typeof obj.fileSizeBytes === 'number' && Number.isFinite(obj.fileSizeBytes)
        ? obj.fileSizeBytes
        : typeof obj.sizeBytes === 'number' && Number.isFinite(obj.sizeBytes)
          ? obj.sizeBytes
          : null,
    width: typeof obj.width === 'number' && Number.isFinite(obj.width) ? obj.width : null,
    height: typeof obj.height === 'number' && Number.isFinite(obj.height) ? obj.height : null,
  };
}

function normalizeAdvertisement(raw: unknown): AdminAdvertisement {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const status = normalizeStatus(obj.status);

  return {
    id: typeof obj.id === 'string' ? obj.id : String(obj.id ?? ''),
    revision:
      typeof obj.revision === 'number' && Number.isFinite(obj.revision) ? obj.revision : 0,
    status,
    uz: normalizeLocaleContent(obj.uz),
    ru: normalizeLocaleContent(obj.ru),
    channels: normalizeChannels(obj.channels),
    targetUrl: typeof obj.targetUrl === 'string' && obj.targetUrl.trim() ? obj.targetUrl : null,
    startsAt: typeof obj.startsAt === 'string' && obj.startsAt.trim() ? obj.startsAt : null,
    endsAt: typeof obj.endsAt === 'string' && obj.endsAt.trim() ? obj.endsAt : null,
    sortOrder:
      typeof obj.sortOrder === 'number' && Number.isFinite(obj.sortOrder)
        ? Math.max(0, Math.floor(obj.sortOrder))
        : 0,
    media: normalizeMedia(obj.media),
    createdAt: typeof obj.createdAt === 'string' && obj.createdAt.trim() ? obj.createdAt : null,
    updatedAt: typeof obj.updatedAt === 'string' && obj.updatedAt.trim() ? obj.updatedAt : null,
    publishedAt:
      typeof obj.publishedAt === 'string' && obj.publishedAt.trim() ? obj.publishedAt : null,
    archivedAt:
      typeof obj.archivedAt === 'string' && obj.archivedAt.trim() ? obj.archivedAt : null,
  };
}

function normalizeAdvertisementItem(raw: unknown): AdminAdvertisementItem {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const adRaw = obj.advertisement ?? obj;
  const advertisement = normalizeAdvertisement(adRaw);
  const visibility = normalizeVisibility(obj.visibility, advertisement.status);
  return { advertisement, visibility };
}

function normalizeSnapshot(raw: unknown): AdminAdvertisementSnapshot {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    revision:
      typeof obj.revision === 'number' && Number.isFinite(obj.revision) ? obj.revision : null,
    status: obj.status ? normalizeStatus(obj.status) : null,
    uz: normalizeLocaleContent(obj.uz),
    ru: normalizeLocaleContent(obj.ru),
    channels: normalizeChannels(obj.channels),
    targetUrl: typeof obj.targetUrl === 'string' && obj.targetUrl.trim() ? obj.targetUrl : null,
    startsAt: typeof obj.startsAt === 'string' && obj.startsAt.trim() ? obj.startsAt : null,
    endsAt: typeof obj.endsAt === 'string' && obj.endsAt.trim() ? obj.endsAt : null,
    sortOrder:
      typeof obj.sortOrder === 'number' && Number.isFinite(obj.sortOrder)
        ? Math.max(0, Math.floor(obj.sortOrder))
        : null,
    media: normalizeMedia(obj.media),
  };
}

function normalizeHistoryEntry(raw: unknown, idx: number): AdminAdvertisementHistoryEntry {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const revision =
    typeof obj.revision === 'number' && Number.isFinite(obj.revision) ? obj.revision : idx + 1;
  return {
    id:
      typeof obj.id === 'string' && obj.id
        ? obj.id
        : `${revision}-${typeof obj.changedAt === 'string' ? obj.changedAt : idx}`,
    revision,
    action: typeof obj.action === 'string' && obj.action.trim() ? obj.action.trim() : 'UPDATED',
    actorId: typeof obj.actorId === 'string' && obj.actorId.trim() ? obj.actorId : null,
    changedAt: typeof obj.changedAt === 'string' && obj.changedAt.trim() ? obj.changedAt : null,
    reason: typeof obj.reason === 'string' && obj.reason.trim() ? obj.reason : null,
    snapshot: normalizeSnapshot(obj.snapshot),
  };
}

function parsePageMeta(
  rawPage: unknown,
  fallbackPage: number,
  fallbackSize: number,
  contentLength: number,
) {
  const p = (rawPage && typeof rawPage === 'object' ? rawPage : {}) as Record<string, unknown>;
  const number =
    typeof p.number === 'number' && Number.isFinite(p.number)
      ? Math.max(0, Math.floor(p.number))
      : fallbackPage;
  const size =
    typeof p.size === 'number' && Number.isFinite(p.size) && p.size >= 1
      ? Math.floor(p.size)
      : fallbackSize;
  const totalElements =
    typeof p.totalElements === 'number' && Number.isFinite(p.totalElements)
      ? Math.max(0, Math.floor(p.totalElements))
      : contentLength;
  const totalPages =
    typeof p.totalPages === 'number' && Number.isFinite(p.totalPages)
      ? Math.max(0, Math.floor(p.totalPages))
      : totalElements > 0
        ? Math.ceil(totalElements / size)
        : 0;

  return { number, size, totalElements, totalPages };
}

async function requestAdminAdvertisements<T>(
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    accessToken: string;
    language: Language;
    jsonBody?: unknown;
    formData?: FormData;
  },
): Promise<T> {
  const safeLanguage: Language = options.language === 'ru' ? 'ru' : 'uz';
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (options.formData) {
    body = options.formData;
  } else if (options.jsonBody !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.jsonBody);
  }

  const response = await fetchWithSessionRefresh(path, {
    method: options.method,
    accessToken: options.accessToken,
    language: safeLanguage,
    headers,
    body,
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
      message: errorBody.message || getAdvertisementHttpErrorMessage(response.status, safeLanguage),
      fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
      endpoint: `${options.method} ${path.split('?')[0]}`,
    });
  }

  return (parsed ?? {}) as T;
}

function buildAdvertisementFormData(
  payload: AdminAdvertisementPayload,
  file?: File | null,
): FormData {
  const formData = new FormData();
  formData.append(
    'advertisement',
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
  );
  if (file) {
    formData.append('file', file);
  }
  return formData;
}

export const adminAdvertisementApi = {
  async listAdvertisements(
    accessToken: string,
    params: AdminAdvertisementsListParams,
    language: Language = 'uz',
  ): Promise<AdminAdvertisementListResponse> {
    const search = new URLSearchParams();
    const trimmedQuery = params.q?.trim();
    if (trimmedQuery) {
      search.set('q', trimmedQuery.slice(0, 160));
    }
    if (params.channel === 'WEB' || params.channel === 'APP') {
      search.set('channel', params.channel);
    }
    if (
      params.status === 'DRAFT' ||
      params.status === 'PUBLISHED' ||
      params.status === 'PAUSED' ||
      params.status === 'ARCHIVED'
    ) {
      search.set('status', params.status);
    }

    const safePage =
      typeof params.page === 'number' && Number.isFinite(params.page)
        ? Math.max(0, Math.floor(params.page))
        : 0;
    const safeSize =
      typeof params.size === 'number' && Number.isFinite(params.size)
        ? Math.min(100, Math.max(1, Math.floor(params.size)))
        : 20;

    search.set('page', String(safePage));
    search.set('size', String(safeSize));

    const raw = await requestAdminAdvertisements<unknown>(
      `/api/admin/advertisements?${search.toString()}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );

    const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rawContent = Array.isArray(obj.content) ? obj.content : [];
    const content = rawContent.map(normalizeAdvertisementItem);
    const page = parsePageMeta(obj.page, safePage, safeSize, content.length);

    return { content, page };
  },

  async getAdvertisementById(
    accessToken: string,
    id: string,
    language: Language = 'uz',
  ): Promise<AdminAdvertisementItem> {
    const raw = await requestAdminAdvertisements<unknown>(
      `/api/admin/advertisements/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
    return normalizeAdvertisementItem(raw);
  },

  async createAdvertisement(
    accessToken: string,
    payload: AdminAdvertisementPayload,
    file: File | null,
    language: Language = 'uz',
  ): Promise<AdminAdvertisementItem> {
    const raw = await requestAdminAdvertisements<unknown>('/api/admin/advertisements', {
      method: 'POST',
      accessToken,
      language,
      formData: buildAdvertisementFormData(payload, file),
    });
    return normalizeAdvertisementItem(raw);
  },

  async updateAdvertisement(
    accessToken: string,
    id: string,
    expectedRevision: number,
    payload: AdminAdvertisementPayload,
    file: File | null,
    language: Language = 'uz',
  ): Promise<AdminAdvertisementItem> {
    const raw = await requestAdminAdvertisements<unknown>(
      `/api/admin/advertisements/${encodeURIComponent(id)}?expectedRevision=${encodeURIComponent(
        String(expectedRevision),
      )}`,
      {
        method: 'PUT',
        accessToken,
        language,
        formData: buildAdvertisementFormData(payload, file),
      },
    );
    return normalizeAdvertisementItem(raw);
  },

  async send(accessToken: string, id: string, expectedRevision: number, language: Language) {
    return requestAdminAdvertisements<{ pushStatus: string }>(
      `/api/admin/advertisements/${encodeURIComponent(id)}/send`,
      { method: 'POST', accessToken, language, jsonBody: { expectedRevision } },
    );
  },

  async latestPushStatus(accessToken: string, id: string, language: Language) {
    const result = await requestAdminAdvertisements<{ content: { pushStatus: string | null }[] }>(
      `/api/admin/advertisements/${encodeURIComponent(id)}/dispatches?page=0&size=1`,
      { method: 'GET', accessToken, language },
    );
    return result.content[0]?.pushStatus ?? null;
  },

  async updateStatus(
    accessToken: string,
    id: string,
    payload: UpdateAdvertisementStatusPayload,
    language: Language = 'uz',
  ): Promise<AdminAdvertisementItem> {
    const raw = await requestAdminAdvertisements<unknown>(
      `/api/admin/advertisements/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        accessToken,
        language,
        jsonBody: payload,
      },
    );
    return normalizeAdvertisementItem(raw);
  },

  async getHistory(
    accessToken: string,
    id: string,
    params: { page?: number; size?: number },
    language: Language = 'uz',
  ): Promise<AdminAdvertisementHistoryResponse> {
    const safePage =
      typeof params.page === 'number' && Number.isFinite(params.page)
        ? Math.max(0, Math.floor(params.page))
        : 0;
    const safeSize =
      typeof params.size === 'number' && Number.isFinite(params.size)
        ? Math.min(100, Math.max(1, Math.floor(params.size)))
        : 20;

    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });

    const raw = await requestAdminAdvertisements<unknown>(
      `/api/admin/advertisements/${encodeURIComponent(id)}/history?${search.toString()}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );

    const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rawContent = Array.isArray(obj.content) ? obj.content : [];
    const content = rawContent.map(normalizeHistoryEntry);
    const page = parsePageMeta(obj.page, safePage, safeSize, content.length);

    return { content, page };
  },

  async fetchMediaBlob(
    accessToken: string,
    mediaUrl: string,
    language: Language = 'uz',
  ): Promise<Blob | null> {
    const resolved = resolveAdvertisementMediaUrl(mediaUrl);
    if (!resolved) return null;

    const response = await fetchWithSessionRefresh(resolved, {
      method: 'GET',
      accessToken,
      language,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new AuthApiError({
        status: response.status,
        code: `http.${response.status}`,
        message: getAdvertisementHttpErrorMessage(response.status, language),
        endpoint: `GET ${mediaUrl}`,
      });
    }

    return response.blob();
  },
};
