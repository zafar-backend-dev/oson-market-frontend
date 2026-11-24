import { API_BASE_URL } from '../constants';
import type { ApiErrorBody, Language } from '../types/auth';
import type {
  AdminBranchListResponse,
  AdminBranchPayload,
  AdminBranchRecord,
  BranchLocation,
  DeliveryQuoteResponse,
  PublicBranchItem,
  PublicBranchListResponse,
} from '../types/branch';
import { roundCoordinate7 } from '../utils/orderStatus';
import { AuthApiError } from './apiError';
import { fetchWithSessionRefresh } from './sessionManager';

function getDefaultBranchHttpErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Проверьте введённые данные филиала или координаты.';
      case 401:
        return 'Сессия истекла. Пожалуйста, войдите снова.';
      case 403:
        return 'Для управления филиалами требуются права администратора.';
      case 404:
        return 'Филиал не найден.';
      case 409:
        return 'Конфликт данных: код филиала уже используется или филиал связан с заказами.';
      case 413:
        return 'Размер загружаемого изображения превышает допустимый лимит.';
      default:
        return 'Произошла ошибка. Попробуйте ещё раз.';
    }
  }

  switch (status) {
    case 400:
      return 'Filial ma’lumotlari yoki koordinatalarni tekshiring.';
    case 401:
      return 'Sessiya muddati tugagan. Iltimos, qayta kiring.';
    case 403:
      return 'Filiallarni boshqarish uchun admin ruxsati kerak.';
    case 404:
      return 'Filial topilmadi.';
    case 409:
      return 'Ma’lumotlar ziddiyati: filial kodi band yoki buyurtmalarga bog‘langan bo‘lishi mumkin.';
    case 413:
      return 'Yuklanayotgan rasm hajmi ruxsat etilgan limitdan oshib ketdi.';
    default:
      return 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.';
  }
}

export function resolveBranchImageUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

async function requestAdminBranchApi<T>(
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

  if (!options.formData && options.body !== undefined) {
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
    networkErrorMessage:
      options.language === 'ru'
        ? 'Не удалось связаться с сервером. Проверьте подключение и повторите попытку.'
        : 'Server bilan bog‘lanib bo‘lmadi. Ulanishni tekshirib, qayta urinib ko‘ring.',
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
        getDefaultBranchHttpErrorMessage(response.status, options.language),
      fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
      endpoint: `${options.method} ${path.split('?')[0]}`,
    });
  }

  return (parsed ?? {}) as T;
}

function normalizeBranchPayload(payload: AdminBranchPayload): AdminBranchPayload {
  return {
    code: payload.code.trim(),
    nameUz: payload.nameUz.trim(),
    nameRu: payload.nameRu.trim(),
    addressLine: payload.addressLine.trim(),
    city: payload.city.trim(),
    phone: payload.phone.trim(),
    email: payload.email.trim(),
    workingHours: payload.workingHours.trim(),
    location: {
      latitude: roundCoordinate7(payload.location.latitude),
      longitude: roundCoordinate7(payload.location.longitude),
    },
    active: Boolean(payload.active),
    pickupEnabled: Boolean(payload.pickupEnabled),
    deliveryEnabled: Boolean(payload.deliveryEnabled),
    pricePerKm: Math.max(0, Math.round(payload.pricePerKm)),
  };
}

export const branchApi = {
  // Public active branches for guest & authenticated checkout (no JWT sent)
  async listPublicBranches(
    params: { page?: number; size?: number },
    language: Language = 'uz',
  ): Promise<PublicBranchListResponse> {
    const safeLanguage: Language = language === 'ru' ? 'ru' : 'uz';
    const safePage = Math.max(0, Math.floor(params.page ?? 0));
    const safeSize = Math.min(100, Math.max(1, Math.floor(params.size ?? 20)));
    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/branches?${search.toString()}`, {
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
            ? 'Не удалось загрузить список филиалов. Проверьте подключение.'
            : 'Filiallar ro‘yxatini yuklab bo‘lmadi. Ulanishni tekshiring.',
        isNetworkError: true,
        endpoint: 'GET /api/branches',
      });
    }

    const text = await response.text();
    let parsed: ApiErrorBody | PublicBranchListResponse | null = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as ApiErrorBody | PublicBranchListResponse;
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
          getDefaultBranchHttpErrorMessage(response.status, safeLanguage),
        fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
        endpoint: 'GET /api/branches',
      });
    }

    return (parsed ?? {
      content: [],
      page: { size: safeSize, number: safePage, totalElements: 0, totalPages: 0 },
    }) as PublicBranchListResponse;
  },

  async listAllPublicBranches(
    language: Language = 'uz',
    pageSize = 50,
  ): Promise<PublicBranchItem[]> {
    const firstPage = await this.listPublicBranches({ page: 0, size: pageSize }, language);
    const seen = new Set<string>();
    const all: PublicBranchItem[] = [];

    for (const item of Array.isArray(firstPage.content) ? firstPage.content : []) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        all.push(item);
      }
    }

    const totalPages = Math.min(25, Math.max(1, firstPage.page?.totalPages ?? 1));
    if (totalPages > 1) {
      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, idx) =>
          this.listPublicBranches({ page: idx + 1, size: pageSize }, language),
        ),
      );
      for (const pageRes of remainingPages) {
        for (const item of Array.isArray(pageRes.content) ? pageRes.content : []) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            all.push(item);
          }
        }
      }
    }

    return all;
  },

  // Customer delivery quote
  quoteCustomerDelivery(
    accessToken: string | undefined,
    branchId: string,
    location: BranchLocation,
    language: Language,
  ): Promise<DeliveryQuoteResponse> {
    return requestAdminBranchApi<DeliveryQuoteResponse>(
      `/api/orders/delivery-quote/${encodeURIComponent(branchId)}`,
      {
        method: 'POST',
        accessToken: accessToken ?? '',
        language,
        body: {
          latitude: roundCoordinate7(location.latitude),
          longitude: roundCoordinate7(location.longitude),
        },
      },
    );
  },

  // Admin branch CRUD & image endpoints
  listAdminBranches(
    accessToken: string,
    params: { page: number; size: number },
    language: Language,
  ): Promise<AdminBranchListResponse> {
    const safePage = Math.max(0, Math.floor(params.page));
    const safeSize = Math.min(100, Math.max(1, Math.floor(params.size)));
    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });

    return requestAdminBranchApi<AdminBranchListResponse>(
      `/api/admin/branches?${search.toString()}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
  },

  getAdminBranchById(
    accessToken: string,
    id: string,
    language: Language,
  ): Promise<AdminBranchRecord> {
    return requestAdminBranchApi<AdminBranchRecord>(
      `/api/admin/branches/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
  },

  createAdminBranchJson(
    accessToken: string,
    payload: AdminBranchPayload,
    language: Language,
  ): Promise<AdminBranchRecord> {
    return requestAdminBranchApi<AdminBranchRecord>('/api/admin/branches', {
      method: 'POST',
      accessToken,
      language,
      body: normalizeBranchPayload(payload),
    });
  },

  createAdminBranchMultipart(
    accessToken: string,
    payload: AdminBranchPayload,
    imageFile: File,
    language: Language,
  ): Promise<AdminBranchRecord> {
    const formData = new FormData();
    formData.append(
      'branch',
      new Blob([JSON.stringify(normalizeBranchPayload(payload))], {
        type: 'application/json',
      }),
    );
    formData.append('image', imageFile);

    return requestAdminBranchApi<AdminBranchRecord>('/api/admin/branches', {
      method: 'POST',
      accessToken,
      language,
      formData,
    });
  },

  updateAdminBranch(
    accessToken: string,
    id: string,
    payload: AdminBranchPayload,
    language: Language,
  ): Promise<AdminBranchRecord> {
    return requestAdminBranchApi<AdminBranchRecord>(
      `/api/admin/branches/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        accessToken,
        language,
        body: normalizeBranchPayload(payload),
      },
    );
  },

  archiveAdminBranch(accessToken: string, id: string, language: Language): Promise<void> {
    return requestAdminBranchApi<void>(`/api/admin/branches/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      accessToken,
      language,
    });
  },

  uploadAdminBranchImage(
    accessToken: string,
    id: string,
    imageFile: File,
    language: Language,
  ): Promise<AdminBranchRecord> {
    const formData = new FormData();
    formData.append('image', imageFile);

    return requestAdminBranchApi<AdminBranchRecord>(
      `/api/admin/branches/${encodeURIComponent(id)}/image`,
      {
        method: 'PUT',
        accessToken,
        language,
        formData,
      },
    );
  },

  deleteAdminBranchImage(accessToken: string, id: string, language: Language): Promise<void> {
    return requestAdminBranchApi<void>(
      `/api/admin/branches/${encodeURIComponent(id)}/image`,
      {
        method: 'DELETE',
        accessToken,
        language,
      },
    );
  },

  async fetchAdminBranchImageBlob(
    accessToken: string,
    branchIdOrUrl: string,
    language: Language,
  ): Promise<Blob | null> {
    const targetPath = branchIdOrUrl.includes('/')
      ? resolveBranchImageUrl(branchIdOrUrl)
      : `${API_BASE_URL}/api/admin/branches/${encodeURIComponent(branchIdOrUrl)}/image`;

    if (!targetPath) return null;

    const response = await fetchWithSessionRefresh(targetPath, {
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
        message: getDefaultBranchHttpErrorMessage(response.status, language),
        endpoint: `GET /api/admin/branches/.../image`,
      });
    }

    return response.blob();
  },

  quoteAdminBranchDelivery(
    accessToken: string,
    branchId: string,
    location: BranchLocation,
    language: Language,
  ): Promise<DeliveryQuoteResponse> {
    return requestAdminBranchApi<DeliveryQuoteResponse>(
      `/api/admin/branches/${encodeURIComponent(branchId)}/delivery-quote`,
      {
        method: 'POST',
        accessToken,
        language,
        body: {
          latitude: roundCoordinate7(location.latitude),
          longitude: roundCoordinate7(location.longitude),
        },
      },
    );
  },
};
