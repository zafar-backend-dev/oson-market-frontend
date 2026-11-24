import { API_BASE_URL } from '../constants';
import type { ApiErrorBody, Language } from '../types/auth';
import { AuthApiError, getDefaultHttpErrorMessage } from './apiError';
import { fetchWithSessionRefresh } from './sessionManager';

export interface SiteLogoUploadResponse {
  url: string;
  updatedAt: string;
}

export function buildSiteLogoUrl(version?: string | null): string {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const basePath = `${cleanBase}/api/site/logo`;
  if (version && version.trim()) {
    return `${basePath}?v=${encodeURIComponent(version.trim())}`;
  }
  return basePath;
}

export const siteLogoApi = {
  async uploadLogo(
    accessToken: string,
    file: File,
    language: Language,
  ): Promise<SiteLogoUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchWithSessionRefresh('/api/admin/site/logo', {
      method: 'PUT',
      language,
      accessToken,
      body: formData,
      networkErrorMessage:
        language === 'ru'
          ? 'Не удалось загрузить логотип сайта.'
          : 'Sayt logosini yuklab bo‘lmadi.',
    });

    const text = await response.text();
    let parsed: ApiErrorBody | SiteLogoUploadResponse | null = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as ApiErrorBody | SiteLogoUploadResponse;
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      const errorBody = (parsed ?? {}) as ApiErrorBody;
      throw new AuthApiError({
        status: response.status,
        code: errorBody.code || `http.${response.status}`,
        message: errorBody.message || getDefaultHttpErrorMessage(response.status, language),
        fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
        endpoint: 'PUT /api/admin/site/logo',
      });
    }

    const result = (parsed ?? {}) as Partial<SiteLogoUploadResponse>;
    return {
      url: typeof result.url === 'string' && result.url.trim() ? result.url : '/api/site/logo',
      updatedAt:
        typeof result.updatedAt === 'string' && result.updatedAt.trim()
          ? result.updatedAt
          : String(Date.now()),
    };
  },
};
