import type { ApiErrorBody, Language } from '../types/auth';
import type {
  AdminCategoryItem,
  AdminCategoryPageResponse,
  AdminCategoryPayload,
} from '../types/category';
import { API_BASE_URL } from '../constants';
import { AuthApiError } from './apiError';
import { fetchWithSessionRefresh } from './sessionManager';

function getDefaultCategoryHttpErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Проверьте введённые данные категории.';
      case 401:
        return 'Сессия истекла. Пожалуйста, войдите снова.';
      case 403:
        return 'Для управления категориями требуются права администратора.';
      case 404:
        return 'Категория не найдена.';
      case 409:
        return 'Невозможно выполнить действие из-за связанных данных или конфликта.';
      default:
        return 'Произошла ошибка. Попробуйте ещё раз.';
    }
  }

  switch (status) {
    case 400:
      return 'Yuborilgan kategoriya ma’lumotlarini tekshiring.';
    case 401:
      return 'Sessiya muddati tugagan. Iltimos, qayta kiring.';
    case 403:
      return 'Kategoriyalarni boshqarish uchun admin ruxsati kerak.';
    case 404:
      return 'Kategoriya topilmadi.';
    case 409:
      return 'Bog‘langan ma’lumotlar yoki ziddiyat sababli amalni bajarib bo‘lmadi.';
    default:
      return 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.';
  }
}

async function requestCategoryApi<T>(
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
        getDefaultCategoryHttpErrorMessage(response.status, options.language),
      fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
      endpoint: `${options.method} ${path.split('?')[0]}`,
    });
  }

  return (parsed ?? {}) as T;
}

function buildCategoryFormData(
  payload: AdminCategoryPayload,
  options?: { file?: File | null; removeImage?: boolean },
): FormData {
  const formData = new FormData();
  formData.append(
    'category',
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
  );
  if (options?.file) {
    formData.append('file', options.file);
  } else if (options?.removeImage) {
    formData.append('removeImage', 'true');
  }
  return formData;
}

export function resolveCategoryImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export const categoryApi = {
  list(
    accessToken: string,
    params: { page: number; size: number },
    language: Language,
  ): Promise<AdminCategoryPageResponse> {
    const safePage = Math.max(0, Math.floor(params.page));
    const safeSize = Math.min(100, Math.max(1, Math.floor(params.size)));
    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });

    return requestCategoryApi<AdminCategoryPageResponse>(
      `/api/admin/categories?${search.toString()}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
  },

  getById(
    accessToken: string,
    id: string,
    language: Language,
  ): Promise<AdminCategoryItem> {
    return requestCategoryApi<AdminCategoryItem>(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
  },

  create(
    accessToken: string,
    payload: AdminCategoryPayload,
    language: Language,
  ): Promise<AdminCategoryItem> {
    return requestCategoryApi<AdminCategoryItem>('/api/admin/categories', {
      method: 'POST',
      accessToken,
      language,
      body: payload,
    });
  },

  createMultipart(
    accessToken: string,
    payload: AdminCategoryPayload,
    language: Language,
    options?: { file?: File | null },
  ): Promise<AdminCategoryItem> {
    return requestCategoryApi<AdminCategoryItem>('/api/admin/categories', {
      method: 'POST',
      accessToken,
      language,
      formData: buildCategoryFormData(payload, { file: options?.file }),
    });
  },

  updateMultipart(
    accessToken: string,
    id: string,
    payload: AdminCategoryPayload,
    language: Language,
    options?: { file?: File | null; removeImage?: boolean },
  ): Promise<AdminCategoryItem> {
    return requestCategoryApi<AdminCategoryItem>(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        accessToken,
        language,
        formData: buildCategoryFormData(payload, options),
      },
    );
  },

  update(
    accessToken: string,
    id: string,
    payload: AdminCategoryPayload,
    language: Language,
  ): Promise<AdminCategoryItem> {
    return requestCategoryApi<AdminCategoryItem>(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        accessToken,
        language,
        body: payload,
      },
    );
  },

  remove(accessToken: string, id: string, language: Language): Promise<void> {
    return requestCategoryApi<void>(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        accessToken,
        language,
      },
    );
  },

  async fetchImageBlob(
    accessToken: string,
    imageUrl: string,
    language: Language,
  ): Promise<Blob | null> {
    const resolved = resolveCategoryImageUrl(imageUrl);
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
        message: getDefaultCategoryHttpErrorMessage(response.status, language),
        endpoint: `GET ${imageUrl}`,
      });
    }

    return response.blob();
  },
};
