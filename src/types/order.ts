import type { BranchLocation } from './branch';

export type OrderStatus =
  | 'PENDING'
  | 'NEW_UNPAID'
  | 'NEW_PAID'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'READY_FOR_DELIVERY'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_FAILED'
  | 'DELIVERED'
  | 'CANCELLED'
  | (string & {});

export type FulfillmentMethod = 'PICKUP' | 'DELIVERY';

export type OrderFulfillmentPayload =
  | {
      method: 'PICKUP';
      branchId: string;
    }
  | {
      method: 'DELIVERY';
      branchId: string;
      deliveryAddress: string;
      location: BranchLocation;
    };

export interface CreateOrderItemPayload {
  variantId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  requestId: string;
  phone: string;
  telegramAddress: string;
  items: CreateOrderItemPayload[];
  fulfillment: OrderFulfillmentPayload;
}

export interface CustomerOrderItem {
  variantId: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface CustomerOrderResponse {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  phone?: string | null;
  telegramAddress?: string | null;
  placedAt: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  items: CustomerOrderItem[];
  fulfillmentMethod?: FulfillmentMethod | (string & {}) | null;
  branchId?: string | null;
  branchName?: string | null;
  deliveryAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  pricePerKm?: number | null;
  cancellationReason?: string | null;
  paidAt?: string | null;
  canCancel?: boolean;
  canRate?: boolean;
  serviceRating?: number | null;
  serviceReview?: string | null;
  ratedAt?: string | null;
}

export interface CancelOrderPayload {
  reason: string;
}

export interface RateOrderPayload {
  rating: number;
  comment?: string;
}

export interface OrderPageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface CustomerOrderPageResponse {
  content: CustomerOrderResponse[];
  page: OrderPageMetadata;
}

export interface CustomerOrderHistoryEntry {
  status: OrderStatus;
  reason?: string | null;
  createdAt: string;
}

export interface AdminOrderHistoryEntry {
  previousStatus?: OrderStatus | null;
  status: OrderStatus;
  actorId?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  phone?: string | null;
  telegramAddress?: string | null;
  currency: string;
  grandTotal: number;
  placedAt: string;
  fulfillmentMethod?: FulfillmentMethod | (string & {}) | null;
  branchId?: string | null;
  branchName?: string | null;
  paidAt?: string | null;
}

export interface AdminOrderPageResponse {
  content: AdminOrderSummary[];
  page: OrderPageMetadata;
}

export interface AdminOrderDetailResponse {
  order: CustomerOrderResponse;
  allowedStatuses: OrderStatus[];
  fulfillmentMethod?: FulfillmentMethod | (string & {}) | null;
  branchId?: string | null;
  branchName?: string | null;
  deliveryAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  pricePerKm?: number | null;
  cancellationReason?: string | null;
  paidAt?: string | null;
  history?: AdminOrderHistoryEntry[];
}

export interface UpdateOrderStatusPayload {
  expectedStatus: OrderStatus;
  status: OrderStatus;
  reason?: string;
}

export type UpdateOrderFulfillmentPayload =
  | {
      expectedStatus: OrderStatus;
      method: 'PICKUP';
      branchId: string;
    }
  | {
      expectedStatus: OrderStatus;
      method: 'DELIVERY';
      branchId: string;
      deliveryAddress: string;
      location: BranchLocation;
    };

export interface OrderNotificationItem {
  id: string;
  type: 'ORDER_STATUS_CHANGED' | (string & {});
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  action?: 'RATE_SERVICE' | (string & {}) | null;
  reason?: string | null;
  createdAt: string;
  readAt: string | null;
  title: string;
  message: string;
}

export interface OrderNotificationPageResponse {
  content: OrderNotificationItem[];
  page: OrderPageMetadata;
}

export interface UnreadNotificationCountResponse {
  count: number;
}

export interface TelegramRecipient {
  id: string;
  chatId: string;
  label: string | null;
}

export interface CreateTelegramRecipientPayload {
  chatId: string;
  label?: string | null;
}
