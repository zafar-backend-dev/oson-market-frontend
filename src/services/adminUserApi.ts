import type {
  AdminUserAccountStatus,
  AdminUserRecord,
  AdminUsersListParams,
  AdminUsersListResponse,
  UpdateAdminUserStatusPayload,
} from '../types/adminUser';
import type { ApiErrorBody, Language } from '../types/auth';
import { AuthApiError, getDefaultHttpErrorMessage } from './apiError';
import { fetchWithSessionRefresh } from './sessionManager';

function getAdminUsersErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Проверьте параметры запроса пользователей.';
      case 401:
        return 'Сессия истекла. Пожалуйста, войдите снова.';
      case 403:
        return 'Для управления пользователями требуются права администратора.';
      case 404:
        return 'Аккаунт пользователя не найден.';
      default:
        return getDefaultHttpErrorMessage(status, lang);
    }
  }

  switch (status) {
    case 400:
      return 'Foydalanuvchilar so‘rovi parametrlarini tekshiring.';
    case 401:
      return 'Sessiya muddati tugagan. Iltimos, qayta kiring.';
    case 403:
      return 'Foydalanuvchilarni boshqarish uchun admin ruxsati kerak.';
    case 404:
      return 'Foydalanuvchi akkaunti topilmadi.';
    default:
      return getDefaultHttpErrorMessage(status, lang);
  }
}

async function requestAdminUsers<T>(
  path: string,
  options: {
    method: 'GET' | 'PATCH';
    accessToken: string;
    language: Language;
    body?: UpdateAdminUserStatusPayload;
  },
): Promise<T> {
  const safeLanguage: Language = options.language === 'ru' ? 'ru' : 'uz';
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetchWithSessionRefresh(path, {
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
      message: errorBody.message || getAdminUsersErrorMessage(response.status, safeLanguage),
      fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
      endpoint: `${options.method} ${path.split('?')[0]}`,
    });
  }

  return (parsed ?? {}) as T;
}

function normalizeUserRecord(raw: unknown): AdminUserRecord {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const rawRole = obj.role === 'ADMIN' ? 'ADMIN' : 'USER';
  const rawStatus =
    typeof obj.status === 'string' && obj.status.trim()
      ? obj.status.trim().toUpperCase()
      : 'ACTIVE';

  return {
    id: typeof obj.id === 'string' ? obj.id : String(obj.id ?? ''),
    username: typeof obj.username === 'string' ? obj.username : '',
    email: typeof obj.email === 'string' ? obj.email : '',
    role: rawRole,
    status: rawStatus as AdminUserAccountStatus | string,
    firstName: typeof obj.firstName === 'string' && obj.firstName.trim() ? obj.firstName : null,
    lastName: typeof obj.lastName === 'string' && obj.lastName.trim() ? obj.lastName : null,
    phone: typeof obj.phone === 'string' && obj.phone.trim() ? obj.phone : null,
    language: typeof obj.language === 'string' && obj.language.trim() ? obj.language : null,
    emailVerifiedAt:
      typeof obj.emailVerifiedAt === 'string' && obj.emailVerifiedAt.trim()
        ? obj.emailVerifiedAt
        : null,
    createdAt:
      typeof obj.createdAt === 'string' && obj.createdAt.trim() ? obj.createdAt : null,
    updatedAt:
      typeof obj.updatedAt === 'string' && obj.updatedAt.trim() ? obj.updatedAt : null,
  };
}

export const adminUserApi = {
  async listUsers(
    accessToken: string,
    params: AdminUsersListParams,
    language: Language = 'uz',
  ): Promise<AdminUsersListResponse> {
    const search = new URLSearchParams();

    const trimmedQuery = params.q?.trim();
    if (trimmedQuery) {
      search.set('q', trimmedQuery.slice(0, 255));
    }

    if (params.role === 'USER' || params.role === 'ADMIN') {
      search.set('role', params.role);
    }

    if (params.status === 'ACTIVE' || params.status === 'BLOCKED') {
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

    const queryString = search.toString();
    const raw = await requestAdminUsers<unknown>(`/api/admin/users?${queryString}`, {
      method: 'GET',
      accessToken,
      language,
    });

    const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rawContent = Array.isArray(obj.content) ? obj.content : [];
    const content = rawContent.map(normalizeUserRecord);

    const rawPage =
      obj.page && typeof obj.page === 'object'
        ? (obj.page as Record<string, unknown>)
        : {};

    const number =
      typeof rawPage.number === 'number' && Number.isFinite(rawPage.number)
        ? Math.max(0, Math.floor(rawPage.number))
        : safePage;
    const size =
      typeof rawPage.size === 'number' && Number.isFinite(rawPage.size) && rawPage.size >= 1
        ? Math.floor(rawPage.size)
        : safeSize;
    const totalElements =
      typeof rawPage.totalElements === 'number' && Number.isFinite(rawPage.totalElements)
        ? Math.max(0, Math.floor(rawPage.totalElements))
        : content.length;
    const totalPages =
      typeof rawPage.totalPages === 'number' && Number.isFinite(rawPage.totalPages)
        ? Math.max(0, Math.floor(rawPage.totalPages))
        : totalElements > 0
          ? Math.ceil(totalElements / size)
          : 0;

    return {
      content,
      page: {
        number,
        size,
        totalElements,
        totalPages,
      },
    };
  },

  async getUserDetail(
    accessToken: string,
    userId: string,
    language: Language = 'uz',
  ): Promise<AdminUserRecord> {
    const raw = await requestAdminUsers<unknown>(
      `/api/admin/users/${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
    return normalizeUserRecord(raw);
  },

  async updateUserStatus(
    accessToken: string,
    userId: string,
    status: AdminUserAccountStatus,
    language: Language = 'uz',
  ): Promise<AdminUserRecord> {
    const raw = await requestAdminUsers<unknown>(
      `/api/admin/users/${encodeURIComponent(userId)}/status`,
      {
        method: 'PATCH',
        accessToken,
        language,
        body: { status },
      },
    );
    return normalizeUserRecord(raw);
  },
};
