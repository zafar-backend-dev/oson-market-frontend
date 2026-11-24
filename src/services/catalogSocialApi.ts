import { API_BASE_URL } from '../constants';
import type { ApiErrorBody, Language } from '../types/auth';
import type {
  ProductComment,
  ProductCommentPageResponse,
  ProductLikeResponse,
  ProductSocialSummary,
} from '../types/catalog';
import { AuthApiError } from './apiError';
import { fetchWithSessionRefresh } from './sessionManager';

function getDefaultSocialErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Проверьте введённый текст комментария.';
      case 401:
        return 'Сессия истекла. Войдите в аккаунт снова.';
      case 403:
        return 'У вас нет прав для выполнения этого действия.';
      case 404:
        return 'Товар или комментарий не найдены.';
      default:
        return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
    }
  }

  switch (status) {
    case 400:
      return 'Kiritilgan izoh matnini tekshiring.';
    case 401:
      return 'Sessiya muddati tugagan. Iltimos, qayta kiring.';
    case 403:
      return 'Bu amalni bajarish uchun ruxsat yo‘q.';
    case 404:
      return 'Mahsulot yoki izoh topilmadi.';
    default:
      return 'So‘rovni bajarib bo‘lmadi. Qaytadan urinib ko‘ring.';
  }
}

async function requestProductSocialApi<T>(
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    language: Language;
    accessToken?: string | null;
    body?: unknown;
  },
): Promise<T> {
  const safeLanguage: Language = options.language === 'ru' ? 'ru' : 'uz';
  const trimmedToken = options.accessToken?.trim() || undefined;
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const networkErrorMessage =
    safeLanguage === 'ru'
      ? 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.'
      : 'Server bilan bog‘lanib bo‘lmadi. Ulanishni tekshirib qayta urinib ko‘ring.';

  let response: Response;

  if (trimmedToken) {
    response = await fetchWithSessionRefresh(path, {
      method: options.method,
      accessToken: trimmedToken,
      language: safeLanguage,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      networkErrorMessage,
    });
  } else {
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method,
        headers: {
          'Accept-Language': safeLanguage,
          ...headers,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch {
      throw new AuthApiError({
        status: 0,
        code: 'network.unreachable',
        message: networkErrorMessage,
        isNetworkError: true,
        endpoint: `${options.method} ${path.split('?')[0]}`,
      });
    }
  }

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
    const errBody = (parsed ?? {}) as ApiErrorBody;
    throw new AuthApiError({
      status: response.status,
      code: errBody.code || `http.${response.status}`,
      message: errBody.message || getDefaultSocialErrorMessage(response.status, safeLanguage),
      fields: Array.isArray(errBody.fields) ? errBody.fields : [],
      endpoint: `${options.method} ${path.split('?')[0]}`,
    });
  }

  return (parsed ?? {}) as T;
}

function clampPageSize(size: number): number {
  if (!Number.isFinite(size)) return 20;
  return Math.min(50, Math.max(1, Math.floor(size)));
}

function extractCommentAvatarUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const nestedAuthor =
    record.author && typeof record.author === 'object'
      ? (record.author as Record<string, unknown>)
      : null;

  const candidates: unknown[] = [
    record.authorAvatarUrl,
    record.avatarUrl,
    record.authorProfileAvatarUrl,
    record.authorProfileImageUrl,
    record.authorImageUrl,
    record.profileAvatarUrl,
    nestedAuthor?.avatarUrl,
    nestedAuthor?.imageUrl,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function normalizeProductComment(comment: ProductComment): ProductComment {
  return {
    ...comment,
    authorAvatarUrl: extractCommentAvatarUrl(comment),
  };
}

function normalizeCommentPage(pageRes: ProductCommentPageResponse): ProductCommentPageResponse {
  return {
    ...pageRes,
    content: Array.isArray(pageRes.content) ? pageRes.content.map(normalizeProductComment) : [],
  };
}

export const catalogSocialApi = {
  getProductSocial(
    productId: string,
    language: Language = 'uz',
    accessToken?: string | null,
  ): Promise<ProductSocialSummary> {
    return requestProductSocialApi<ProductSocialSummary>(
      `/api/catalog/products/${encodeURIComponent(productId)}/social`,
      {
        method: 'GET',
        language,
        accessToken,
      },
    );
  },

  async listComments(
    productId: string,
    params: { page?: number; size?: number },
    language: Language = 'uz',
    accessToken?: string | null,
  ): Promise<ProductCommentPageResponse> {
    const safePage = Math.max(0, Math.floor(params.page ?? 0));
    const safeSize = clampPageSize(params.size ?? 20);
    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });

    const res = await requestProductSocialApi<ProductCommentPageResponse>(
      `/api/catalog/products/${encodeURIComponent(productId)}/comments?${search.toString()}`,
      {
        method: 'GET',
        language,
        accessToken,
      },
    );
    return normalizeCommentPage(res);
  },

  async listReplies(
    productId: string,
    commentId: string,
    params: { page?: number; size?: number },
    language: Language = 'uz',
    accessToken?: string | null,
  ): Promise<ProductCommentPageResponse> {
    const safePage = Math.max(0, Math.floor(params.page ?? 0));
    const safeSize = clampPageSize(params.size ?? 20);
    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });

    const res = await requestProductSocialApi<ProductCommentPageResponse>(
      `/api/catalog/products/${encodeURIComponent(productId)}/comments/${encodeURIComponent(commentId)}/replies?${search.toString()}`,
      {
        method: 'GET',
        language,
        accessToken,
      },
    );
    return normalizeCommentPage(res);
  },

  async createComment(
    accessToken: string,
    productId: string,
    bodyText: string,
    language: Language = 'uz',
  ): Promise<ProductComment> {
    const created = await requestProductSocialApi<ProductComment>(
      `/api/catalog/products/${encodeURIComponent(productId)}/comments`,
      {
        method: 'POST',
        language,
        accessToken,
        body: { body: bodyText.trim() },
      },
    );
    return normalizeProductComment(created);
  },

  async createReply(
    accessToken: string,
    productId: string,
    commentId: string,
    bodyText: string,
    language: Language = 'uz',
  ): Promise<ProductComment> {
    const created = await requestProductSocialApi<ProductComment>(
      `/api/catalog/products/${encodeURIComponent(productId)}/comments/${encodeURIComponent(commentId)}/replies`,
      {
        method: 'POST',
        language,
        accessToken,
        body: { body: bodyText.trim() },
      },
    );
    return normalizeProductComment(created);
  },

  async updateComment(
    accessToken: string,
    productId: string,
    commentId: string,
    bodyText: string,
    language: Language = 'uz',
  ): Promise<ProductComment> {
    const updated = await requestProductSocialApi<ProductComment>(
      `/api/catalog/products/${encodeURIComponent(productId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'PATCH',
        language,
        accessToken,
        body: { body: bodyText.trim() },
      },
    );
    return normalizeProductComment(updated);
  },

  deleteComment(
    accessToken: string,
    productId: string,
    commentId: string,
    language: Language = 'uz',
  ): Promise<void> {
    return requestProductSocialApi<void>(
      `/api/catalog/products/${encodeURIComponent(productId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'DELETE',
        language,
        accessToken,
      },
    );
  },

  likeProduct(
    accessToken: string,
    productId: string,
    language: Language = 'uz',
  ): Promise<ProductLikeResponse> {
    return requestProductSocialApi<ProductLikeResponse>(
      `/api/catalog/products/${encodeURIComponent(productId)}/like`,
      {
        method: 'PUT',
        language,
        accessToken,
      },
    );
  },

  unlikeProduct(
    accessToken: string,
    productId: string,
    language: Language = 'uz',
  ): Promise<ProductLikeResponse> {
    return requestProductSocialApi<ProductLikeResponse>(
      `/api/catalog/products/${encodeURIComponent(productId)}/like`,
      {
        method: 'DELETE',
        language,
        accessToken,
      },
    );
  },

  likeComment(
    accessToken: string,
    productId: string,
    commentId: string,
    language: Language = 'uz',
  ): Promise<ProductLikeResponse> {
    return requestProductSocialApi<ProductLikeResponse>(
      `/api/catalog/products/${encodeURIComponent(productId)}/comments/${encodeURIComponent(commentId)}/like`,
      {
        method: 'PUT',
        language,
        accessToken,
      },
    );
  },

  unlikeComment(
    accessToken: string,
    productId: string,
    commentId: string,
    language: Language = 'uz',
  ): Promise<ProductLikeResponse> {
    return requestProductSocialApi<ProductLikeResponse>(
      `/api/catalog/products/${encodeURIComponent(productId)}/comments/${encodeURIComponent(commentId)}/like`,
      {
        method: 'DELETE',
        language,
        accessToken,
      },
    );
  },
};
