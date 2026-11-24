import type { ApiErrorBody, Language } from '../types/auth';
import type {
  AdminBrandJsonPayload,
  AdminBrandListResponse,
  AdminBrandMultipartPayload,
  AdminBrandRecord,
} from '../types/brand';
import { API_BASE_URL } from '../constants';
import { AuthApiError } from './apiError';
import { resolveCategoryImageUrl } from './categoryApi';
import { fetchWithSessionRefresh } from './sessionManager';

function getDefaultBrandHttpErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Проверьте введённые данные бренда.';
      case 401:
        return 'Сессия истекла. Пожалуйста, войдите снова.';
      case 403:
        return 'Для управления брендами требуются права администратора.';
      case 404:
        return 'Бренд не найден.';
      case 409:
        return 'Конфликт данных: возможно, такой slug уже занят или бренд связан с товарами.';
      case 413:
        return 'Размер загружаемого логотипа превышает допустимый лимит (до 2 МБ).';
      default:
        return 'Произошла ошибка. Попробуйте ещё раз.';
    }
  }

  switch (status) {
    case 400:
      return 'Kiritilgan brend ma’lumotlarini tekshiring.';
    case 401:
      return 'Sessiya muddati tugagan. Iltimos, qayta kiring.';
    case 403:
      return 'Brendlarni boshqarish uchun admin ruxsati kerak.';
    case 404:
      return 'Brend topilmadi.';
    case 409:
      return 'Ma’lumotlar ziddiyati: slug band bo‘lishi yoki brend mahsulotlarga bog‘langan bo‘lishi mumkin.';
    case 413:
      return 'Yuklanayotgan logotip hajmi ruxsat etilgan limitdan oshib ketdi (2 MB gacha).';
    default:
      return 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.';
  }
}

async function requestBrandApi<T>(
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    accessToken: string;
    language: Language;
    body?: unknown;
    formData?: FormData;
  },
): Promise<T> {
  const headers: Record<string, string> = {};

  // Bypass JSON Content-Type header when sending FormData so browser sets multipart boundary
  if (!options.formData && (options.method === 'POST' || options.method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetchWithSessionRefresh(path, {
    method: options.method,
    accessToken: options.accessToken,
    language: options.language,
    headers,
    body: options.formData
      ? options.formData
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

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
      message:
        errorBody.message ||
        getDefaultBrandHttpErrorMessage(response.status, options.language),
      fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
      endpoint: `${options.method} ${path.split('?')[0]}`,
    });
  }

  return (parsed ?? {}) as T;
}

function buildBrandFormData(
  payload: AdminBrandMultipartPayload,
  options?: { file?: File | null; removeLogo?: boolean },
): FormData {
  const formData = new FormData();
  formData.append(
    'brand',
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
  );
  if (options?.file) {
    formData.append('file', options.file);
  }
  if (options?.removeLogo) {
    formData.append('removeLogo', 'true');
  }
  return formData;
}

export const brandApi = {
  list(
    accessToken: string,
    params: {
      page: number;
      size: number;
      q?: string;
      active?: boolean | null;
    },
    language: Language,
  ): Promise<AdminBrandListResponse> {
    const safePage = Math.max(0, Math.floor(params.page));
    const safeSize = Math.min(100, Math.max(1, Math.floor(params.size)));
    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });

    if (params.q && params.q.trim()) {
      search.set('q', params.q.trim());
    }
    if (typeof params.active === 'boolean') {
      search.set('active', String(params.active));
    }

    return requestBrandApi<AdminBrandListResponse>(`/api/admin/brands?${search.toString()}`, {
      method: 'GET',
      accessToken,
      language,
    });
  },

  getById(accessToken: string, id: string, language: Language): Promise<AdminBrandRecord> {
    return requestBrandApi<AdminBrandRecord>(`/api/admin/brands/${encodeURIComponent(id)}`, {
      method: 'GET',
      accessToken,
      language,
    });
  },

  createJson(
    accessToken: string,
    payload: AdminBrandJsonPayload,
    language: Language,
  ): Promise<AdminBrandRecord> {
    return requestBrandApi<AdminBrandRecord>('/api/admin/brands', {
      method: 'POST',
      accessToken,
      language,
      body: payload,
    });
  },

  createMultipart(
    accessToken: string,
    payload: AdminBrandMultipartPayload,
    language: Language,
    options?: { file?: File | null },
  ): Promise<AdminBrandRecord> {
    return requestBrandApi<AdminBrandRecord>('/api/admin/brands', {
      method: 'POST',
      accessToken,
      language,
      formData: buildBrandFormData(payload, { file: options?.file }),
    });
  },

  updateJson(
    accessToken: string,
    id: string,
    payload: AdminBrandJsonPayload,
    language: Language,
  ): Promise<AdminBrandRecord> {
    return requestBrandApi<AdminBrandRecord>(`/api/admin/brands/${encodeURIComponent(id)}`, {
      method: 'PUT',
      accessToken,
      language,
      body: payload,
    });
  },

  updateMultipart(
    accessToken: string,
    id: string,
    payload: AdminBrandMultipartPayload,
    language: Language,
    options?: { file?: File | null; removeLogo?: boolean },
  ): Promise<AdminBrandRecord> {
    return requestBrandApi<AdminBrandRecord>(`/api/admin/brands/${encodeURIComponent(id)}`, {
      method: 'PUT',
      accessToken,
      language,
      formData: buildBrandFormData(payload, options),
    });
  },

  remove(accessToken: string, id: string, language: Language): Promise<void> {
    return requestBrandApi<void>(`/api/admin/brands/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      accessToken,
      language,
    });
  },

  async fetchLogoBlob(
    accessToken: string,
    logoUrl: string,
    language: Language,
  ): Promise<Blob | null> {
    const resolved = resolveCategoryImageUrl(logoUrl);
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
        message: getDefaultBrandHttpErrorMessage(response.status, language),
        endpoint: `GET ${logoUrl}`,
      });
    }

    return response.blob();
  },
};
