import type { ApiErrorBody, Language } from '../types/auth';
import type {
  AdminOrderDetailResponse,
  AdminOrderPageResponse,
  CancelOrderPayload,
  CreateOrderPayload,
  CreateTelegramRecipientPayload,
  CustomerOrderHistoryEntry,
  CustomerOrderPageResponse,
  CustomerOrderResponse,
  OrderNotificationPageResponse,
  RateOrderPayload,
  TelegramRecipient,
  UnreadNotificationCountResponse,
  UpdateOrderFulfillmentPayload,
  UpdateOrderStatusPayload,
} from '../types/order';
import { roundCoordinate7 } from '../utils/orderStatus';
import { AuthApiError } from './apiError';
import { fetchWithSessionRefresh } from './sessionManager';

function getDefaultOrderHttpErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Проверьте введённые данные формы.';
      case 401:
        return 'Сессия истекла. Пожалуйста, войдите снова.';
      case 403:
        return 'Недостаточно прав для выполнения этого действия.';
      case 404:
        return 'Запись или заказ не найдены.';
      case 409:
        return 'Конфликт данных или состояния заказа.';
      default:
        return 'Произошла ошибка. Попробуйте ещё раз.';
    }
  }

  switch (status) {
    case 400:
      return 'Kiritilgan ma’lumotlarni tekshiring.';
    case 401:
      return 'Sessiya muddati tugagan. Iltimos, qayta kiring.';
    case 403:
      return 'Bu amalni bajarish uchun ruxsat yetarli emas.';
    case 404:
      return 'So‘ralgan buyurtma yoki yozuv topilmadi.';
    case 409:
      return 'Ma’lumotlar yoki buyurtma holatida ziddiyat yuz berdi.';
    default:
      return 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.';
  }
}

async function requestOrderApi<T>(
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    accessToken: string;
    language: Language;
    body?: unknown;
  },
): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetchWithSessionRefresh(path, {
    method: options.method,
    accessToken: options.accessToken,
    language: options.language,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
        getDefaultOrderHttpErrorMessage(response.status, options.language),
      fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
      endpoint: `${options.method} ${path.split('?')[0]}`,
    });
  }

  return (parsed ?? {}) as T;
}

export const orderApi = {
  async createOrder(
    accessToken: string,
    payload: CreateOrderPayload,
    language: Language,
  ): Promise<{ order: CustomerOrderResponse; httpStatus: number }> {
    const fulfillmentBody =
      payload.fulfillment.method === 'DELIVERY'
        ? {
            method: 'DELIVERY' as const,
            branchId: payload.fulfillment.branchId,
            deliveryAddress: payload.fulfillment.deliveryAddress.trim(),
            location: {
              latitude: roundCoordinate7(payload.fulfillment.location.latitude),
              longitude: roundCoordinate7(payload.fulfillment.location.longitude),
            },
          }
        : {
            method: 'PICKUP' as const,
            branchId: payload.fulfillment.branchId,
          };

    const response = await fetchWithSessionRefresh('/api/orders', {
      method: 'POST',
      accessToken,
      language,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: payload.requestId,
        phone: payload.phone.trim(),
        telegramAddress: payload.telegramAddress.trim(),
        items: payload.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        fulfillment: fulfillmentBody,
      }),
      networkErrorMessage:
        language === 'ru'
          ? 'Не удалось связаться с сервером. Проверьте подключение и повторите попытку.'
          : 'Server bilan bog‘lanib bo‘lmadi. Ulanishni tekshirib, qayta urinib ko‘ring.',
    });

    const text = await response.text();
    let parsed: ApiErrorBody | CustomerOrderResponse | null = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as ApiErrorBody | CustomerOrderResponse;
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
          errorBody.message || getDefaultOrderHttpErrorMessage(response.status, language),
        fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
        endpoint: 'POST /api/orders',
      });
    }

    return {
      order: (parsed ?? {}) as CustomerOrderResponse,
      httpStatus: response.status,
    };
  },

  listOrders(
    accessToken: string,
    params: { page: number; size: number },
    language: Language,
  ): Promise<CustomerOrderPageResponse> {
    const safePage = Math.max(0, Math.floor(params.page));
    const safeSize = Math.min(100, Math.max(1, Math.floor(params.size)));
    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });

    return requestOrderApi<CustomerOrderPageResponse>(`/api/orders?${search.toString()}`, {
      method: 'GET',
      accessToken,
      language,
    });
  },

  getOrderById(
    accessToken: string,
    orderId: string,
    language: Language,
  ): Promise<CustomerOrderResponse> {
    return requestOrderApi<CustomerOrderResponse>(
      `/api/orders/${encodeURIComponent(orderId)}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
  },

  async getOrderHistory(
    accessToken: string,
    orderId: string,
    language: Language,
  ): Promise<CustomerOrderHistoryEntry[]> {
    const res = await requestOrderApi<
      CustomerOrderHistoryEntry[] | { history?: CustomerOrderHistoryEntry[] }
    >(`/api/orders/${encodeURIComponent(orderId)}/history`, {
      method: 'GET',
      accessToken,
      language,
    });
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.history)) return res.history;
    return [];
  },

  cancelCustomerOrder(
    accessToken: string,
    orderId: string,
    payload: CancelOrderPayload,
    language: Language,
  ): Promise<CustomerOrderResponse> {
    return requestOrderApi<CustomerOrderResponse>(
      `/api/orders/${encodeURIComponent(orderId)}/cancel`,
      {
        method: 'PATCH',
        accessToken,
        language,
        body: {
          reason: payload.reason.trim(),
        },
      },
    );
  },

  rateCustomerOrder(
    accessToken: string,
    orderId: string,
    payload: RateOrderPayload,
    language: Language,
  ): Promise<CustomerOrderResponse> {
    const trimmedComment = payload.comment?.trim();
    const body: Record<string, unknown> = {
      rating: payload.rating,
    };
    if (trimmedComment) {
      body.comment = trimmedComment;
    }

    return requestOrderApi<CustomerOrderResponse>(
      `/api/orders/${encodeURIComponent(orderId)}/rating`,
      {
        method: 'PUT',
        accessToken,
        language,
        body,
      },
    );
  },

  listAdminOrders(
    accessToken: string,
    params: { page: number; size: number; status?: string; orderNumber?: string },
    language: Language,
  ): Promise<AdminOrderPageResponse> {
    const safePage = Math.max(0, Math.floor(params.page));
    const safeSize = Math.min(100, Math.max(1, Math.floor(params.size)));
    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });
    if (params.status && params.status.trim()) {
      search.set('status', params.status.trim());
    }
    if (params.orderNumber && params.orderNumber.trim()) {
      search.set('orderNumber', params.orderNumber.trim());
    }

    return requestOrderApi<AdminOrderPageResponse>(`/api/admin/orders?${search.toString()}`, {
      method: 'GET',
      accessToken,
      language,
    });
  },

  getAdminOrderById(
    accessToken: string,
    orderId: string,
    language: Language,
  ): Promise<AdminOrderDetailResponse> {
    return requestOrderApi<AdminOrderDetailResponse>(
      `/api/admin/orders/${encodeURIComponent(orderId)}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
  },

  updateAdminOrderStatus(
    accessToken: string,
    orderId: string,
    payload: UpdateOrderStatusPayload,
    language: Language,
  ): Promise<AdminOrderDetailResponse> {
    const trimmedReason = payload.reason?.trim();
    const body: Record<string, unknown> = {
      expectedStatus: payload.expectedStatus,
      status: payload.status,
    };
    if (trimmedReason) {
      body.reason = trimmedReason;
    }

    return requestOrderApi<AdminOrderDetailResponse>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/status`,
      {
        method: 'PATCH',
        accessToken,
        language,
        body,
      },
    );
  },

  updateAdminOrderFulfillment(
    accessToken: string,
    orderId: string,
    payload: UpdateOrderFulfillmentPayload,
    language: Language,
  ): Promise<AdminOrderDetailResponse> {
    const body =
      payload.method === 'DELIVERY'
        ? {
            expectedStatus: payload.expectedStatus,
            method: 'DELIVERY',
            branchId: payload.branchId,
            deliveryAddress: payload.deliveryAddress.trim(),
            location: {
              latitude: roundCoordinate7(payload.location.latitude),
              longitude: roundCoordinate7(payload.location.longitude),
            },
          }
        : {
            expectedStatus: payload.expectedStatus,
            method: 'PICKUP',
            branchId: payload.branchId,
          };

    return requestOrderApi<AdminOrderDetailResponse>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/fulfillment`,
      {
        method: 'PUT',
        accessToken,
        language,
        body,
      },
    );
  },

  listNotifications(
    accessToken: string,
    params: { page: number; size: number },
    language: Language,
  ): Promise<OrderNotificationPageResponse> {
    const safePage = Math.max(0, Math.floor(params.page));
    const safeSize = Math.min(100, Math.max(1, Math.floor(params.size)));
    const search = new URLSearchParams({
      page: String(safePage),
      size: String(safeSize),
    });

    return requestOrderApi<OrderNotificationPageResponse>(
      `/api/orders/notifications?${search.toString()}`,
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
  },

  getUnreadNotificationCount(
    accessToken: string,
    language: Language,
  ): Promise<UnreadNotificationCountResponse> {
    return requestOrderApi<UnreadNotificationCountResponse>(
      '/api/orders/notifications/unread-count',
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
  },

  markNotificationRead(
    accessToken: string,
    notificationId: string,
    language: Language,
  ): Promise<void> {
    return requestOrderApi<void>(
      `/api/orders/notifications/${encodeURIComponent(notificationId)}/read`,
      {
        method: 'PATCH',
        accessToken,
        language,
      },
    );
  },

  markAllNotificationsRead(accessToken: string, language: Language): Promise<void> {
    return requestOrderApi<void>('/api/orders/notifications/read-all', {
      method: 'PATCH',
      accessToken,
      language,
    });
  },

  async listTelegramRecipients(
    accessToken: string,
    language: Language,
  ): Promise<TelegramRecipient[]> {
    const res = await requestOrderApi<TelegramRecipient[] | { content?: TelegramRecipient[] }>(
      '/api/admin/orders/telegram-recipients',
      {
        method: 'GET',
        accessToken,
        language,
      },
    );
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.content)) return res.content;
    return [];
  },

  createTelegramRecipient(
    accessToken: string,
    payload: CreateTelegramRecipientPayload,
    language: Language,
  ): Promise<TelegramRecipient> {
    const trimmedLabel = payload.label?.trim();
    return requestOrderApi<TelegramRecipient>('/api/admin/orders/telegram-recipients', {
      method: 'POST',
      accessToken,
      language,
      body: {
        chatId: String(payload.chatId).trim(),
        label: trimmedLabel && trimmedLabel.length > 0 ? trimmedLabel : null,
      },
    });
  },

  deleteTelegramRecipient(
    accessToken: string,
    recipientId: string,
    language: Language,
  ): Promise<void> {
    return requestOrderApi<void>(
      `/api/admin/orders/telegram-recipients/${encodeURIComponent(recipientId)}`,
      {
        method: 'DELETE',
        accessToken,
        language,
      },
    );
  },
};
