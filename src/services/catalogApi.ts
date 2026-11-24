import { API_BASE_URL } from '../constants';
import type { ApiErrorBody, Language } from '../types/auth';
import type { CatalogTreeResponse, PublicCategoryRecord } from '../types/catalog';
import { AuthApiError } from './authApi';

function getDefaultCatalogErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    if (status === 404) return 'Категория или товар не найдены.';
    if (status >= 500) return 'Сервер временно недоступен. Попробуйте позже.';
    return 'Не удалось загрузить каталог. Попробуйте ещё раз.';
  }

  if (status === 404) return 'Kategoriya yoki mahsulot topilmadi.';
  if (status >= 500) return 'Server vaqtincha javob bermayapti. Birozdan so‘ng urinib ko‘ring.';
  return 'Katalogni yuklab bo‘lmadi. Qaytadan urinib ko‘ring.';
}

export function resolveCatalogMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

async function requestPublicCatalogApi<T>(path: string, language: Language = 'uz'): Promise<T> {
  const safeLanguage: Language = language === 'ru' ? 'ru' : 'uz';

  let response: Response;
  try {
    // Public catalog GET requests must never include any Authorization/JWT header
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Accept-Language': safeLanguage,
      },
    });
  } catch {
    throw new AuthApiError({
      status: 0,
      code: 'network.unreachable',
      message:
        safeLanguage === 'ru'
          ? 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.'
          : 'Server bilan bog‘lanib bo‘lmadi. Ulanishni tekshirib qayta urinib ko‘ring.',
      isNetworkError: true,
    });
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
    const errBody = (parsed ?? {}) as ApiErrorBody;
    throw new AuthApiError({
      status: response.status,
      code: errBody.code || `http.${response.status}`,
      message: errBody.message || getDefaultCatalogErrorMessage(response.status, safeLanguage),
      fields: Array.isArray(errBody.fields) ? errBody.fields : [],
      endpoint: `GET ${path.split('?')[0]}`,
    });
  }

  return (parsed ?? {}) as T;
}

export const catalogApi = {
  getTree(language: Language = 'uz'): Promise<CatalogTreeResponse> {
    return requestPublicCatalogApi<CatalogTreeResponse>('/api/catalog/tree', language);
  },

  listCategories(
    language: Language = 'uz',
    parentId?: string | null,
  ): Promise<PublicCategoryRecord[]> {
    const query =
      parentId && parentId.trim()
        ? `?parentId=${encodeURIComponent(parentId.trim())}`
        : '';
    return requestPublicCatalogApi<PublicCategoryRecord[]>(`/api/categories${query}`, language);
  },

  getCategoryById(id: string, language: Language = 'uz'): Promise<PublicCategoryRecord> {
    return requestPublicCatalogApi<PublicCategoryRecord>(
      `/api/categories/${encodeURIComponent(id)}`,
      language,
    );
  },
};
