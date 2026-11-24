import type { ApiErrorBody, Language } from '../types/auth';
import type { AdminCategoryItem, AdminCategoryPageResponse } from '../types/category';
import type {
  AdminBrandItem,
  AdminBrandPageResponse,
  AdminProductDetailResponse,
  AdminProductPageResponse,
  AdminProductPayload,
} from '../types/product';
import { AuthApiError } from './apiError';
import { resolveCategoryImageUrl } from './categoryApi';
import { fetchWithSessionRefresh } from './sessionManager';

function getDefaultProductHttpErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Проверьте введённые данные товара и вариантов.';
      case 401:
        return 'Сессия истекла. Пожалуйста, войдите снова.';
      case 403:
        return 'Для управления товарами требуются права администратора.';
      case 404:
        return 'Товар не найден.';
      case 409:
        return 'Конфликт данных: возможно, такой slug или SKU уже существует, либо товар связан с другими записями.';
      case 413:
        return 'Общий размер загружаемых файлов превышает допустимый лимит (до 2 МБ на изображение).';
      case 415:
        return 'Неподдерживаемый формат запроса. Данные товара должны передаваться как application/json.';
      default:
        return 'Произошла ошибка. Попробуйте ещё раз.';
    }
  }

  switch (status) {
    case 400:
      return 'Kiritilgan mahsulot va variant ma’lumotlarini tekshiring.';
    case 401:
      return 'Sessiya muddati tugagan. Iltimos, qayta kiring.';
    case 403:
      return 'Mahsulotlarni boshqarish uchun admin ruxsati kerak.';
    case 404:
      return 'Mahsulot topilmadi.';
    case 409:
      return 'Ma’lumotlar ziddiyati: slug, SKU band bo‘lishi yoki boshqa yozuvlar bilan bog‘langan bo‘lishi mumkin.';
    case 413:
      return 'Yuklanayotgan rasmlar hajmi ruxsat etilgan limitdan oshib ketdi (har bir rasm 2 MB gacha).';
    case 415:
      return 'So‘rov formati qo‘llab-quvvatlanmadi. product qismi application/json formatida bo‘lishi kerak.';
    default:
      return 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.';
  }
}

async function requestProductApi<T>(
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    accessToken: string;
    language: Language;
    formData?: FormData;
  },
): Promise<T> {
  // Never set Content-Type manually for FormData; browser adds multipart/form-data boundary automatically
  const response = await fetchWithSessionRefresh(path, {
    method: options.method,
    accessToken: options.accessToken,
    language: options.language,
    body: options.formData,
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
        getDefaultProductHttpErrorMessage(response.status, options.language),
      fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
      endpoint: `${options.method} ${path.split('?')[0]}`,
    });
  }

  return (parsed ?? {}) as T;
}

function buildProductFormData(
  payload: AdminProductPayload,
  fileMap: Map<string, File>,
): FormData {
  const formData = new FormData();
  formData.append(
    'product',
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
  );

  for (const [filePart, file] of fileMap.entries()) {
    formData.append(filePart, file);
  }

  return formData;
}

export const productApi = {
  async listAllCategories(accessToken: string, language: Language): Promise<AdminCategoryItem[]> {
    const collected: AdminCategoryItem[] = [];
    let currentPage = 0;
    let totalPages = 1;

    while (currentPage < totalPages && currentPage < 25) {
      const search = new URLSearchParams({
        page: String(currentPage),
        size: '20',
      });
      const res = await requestProductApi<AdminCategoryPageResponse>(
        `/api/admin/categories?${search.toString()}`,
        {
          method: 'GET',
          accessToken,
          language,
        },
      );
      if (Array.isArray(res.content)) {
        collected.push(...res.content);
      }
      totalPages = Math.max(1, res.page?.totalPages ?? 1);
      currentPage += 1;
    }

    return collected;
  },

  async listAllBrands(accessToken: string, language: Language): Promise<AdminBrandItem[]> {
    const collected: AdminBrandItem[] = [];
    let currentPage = 0;
    let totalPages = 1;

    while (currentPage < totalPages && currentPage < 25) {
      const search = new URLSearchParams({
        page: String(currentPage),
        size: '20',
      });
      const res = await requestProductApi<AdminBrandPageResponse>(
        `/api/admin/brands?${search.toString()}`,
        {
          method: 'GET',
          accessToken,
          language,
        },
      );
      if (Array.isArray(res.content)) {
        collected.push(...res.content);
      }
      totalPages = Math.max(1, res.page?.totalPages ?? 1);
      currentPage += 1;
    }

    return collected;
  },

  listProducts(
    accessToken: string,
    params: { page: number; size: number; categoryId?: string | null },
    language: Language,
  ): Promise<AdminProductPageResponse> {
    const safePage = Math.max(0, Math.floor(params.page));
    const safeSize = Math.min(100, Math.max(1, Math.floor(params.size)));
    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });
    if (params.categoryId && params.categoryId.trim()) {
      search.set('categoryId', params.categoryId.trim());
    }

    return requestProductApi<AdminProductPageResponse>(
      `/api/admin/products?${search.toString()}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
  },

  getProductById(
    accessToken: string,
    id: string,
    language: Language,
  ): Promise<AdminProductDetailResponse> {
    return requestProductApi<AdminProductDetailResponse>(
      `/api/admin/products/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
  },

  createProduct(
    accessToken: string,
    payload: AdminProductPayload,
    fileMap: Map<string, File>,
    language: Language,
  ): Promise<AdminProductDetailResponse> {
    return requestProductApi<AdminProductDetailResponse>('/api/admin/products', {
      method: 'POST',
      accessToken,
      language,
      formData: buildProductFormData(payload, fileMap),
    });
  },

  updateProduct(
    accessToken: string,
    id: string,
    payload: AdminProductPayload,
    fileMap: Map<string, File>,
    language: Language,
  ): Promise<AdminProductDetailResponse> {
    return requestProductApi<AdminProductDetailResponse>(
      `/api/admin/products/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        accessToken,
        language,
        formData: buildProductFormData(payload, fileMap),
      },
    );
  },

  deleteProduct(accessToken: string, id: string, language: Language): Promise<void> {
    return requestProductApi<void>(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      accessToken,
      language,
    });
  },

  deleteVariant(
    accessToken: string,
    productId: string,
    variantId: string,
    language: Language,
  ): Promise<void> {
    return requestProductApi<void>(
      `/api/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`,
      {
        method: 'DELETE',
        accessToken,
        language,
      },
    );
  },

  deleteProductImage(
    accessToken: string,
    productId: string,
    imageId: string,
    language: Language,
  ): Promise<void> {
    return requestProductApi<void>(
      `/api/admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`,
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
        message: getDefaultProductHttpErrorMessage(response.status, language),
        endpoint: `GET ${imageUrl}`,
      });
    }

    return response.blob();
  },
};
