import { translations } from '../i18n/translations';
import type { Language } from '../types/auth';
import type { AdminOrderDetailResponse, FulfillmentMethod, OrderStatus } from '../types/order';

export const ORDER_STATUS_LIST: OrderStatus[] = [
  'PENDING',
  'NEW_UNPAID',
  'NEW_PAID',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'READY_FOR_DELIVERY',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERY_FAILED',
  'DELIVERED',
  'CANCELLED',
];

export const PICKUP_STATUS_FLOW: OrderStatus[] = [
  'NEW_UNPAID',
  'NEW_PAID',
  'PROCESSING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
];

export const DELIVERY_STATUS_FLOW: OrderStatus[] = [
  'NEW_UNPAID',
  'NEW_PAID',
  'PROCESSING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const LEGACY_ORDER_STATUSES = new Set<string>(['PENDING', 'CONFIRMED', 'SHIPPED']);

export function getFulfillmentStatusFlow(
  method: FulfillmentMethod | string | null | undefined,
): OrderStatus[] {
  if (method === 'PICKUP') return PICKUP_STATUS_FLOW;
  if (method === 'DELIVERY') return DELIVERY_STATUS_FLOW;
  return [];
}

export const REASON_REQUIRED_STATUSES = new Set<string>([
  'CANCELLED',
  'DELIVERY_FAILED',
  'NEW_PAID',
]);

export function doesOrderStatusRequireReason(status: OrderStatus | string): boolean {
  return REASON_REQUIRED_STATUSES.has(status);
}

export function canAdminEditOrderFulfillment(
  status: OrderStatus | string | null | undefined,
  paidAt: string | null | undefined,
): boolean {
  if (paidAt) return false;
  return status === 'PENDING' || status === 'NEW_UNPAID' || status === 'CONFIRMED';
}

export function getOrderStatusLabel(status: OrderStatus | string, language: Language): string {
  const names = translations[language].orders.statusNames;
  switch (status) {
    case 'PENDING':
      return names.PENDING;
    case 'NEW_UNPAID':
      return names.NEW_UNPAID;
    case 'NEW_PAID':
      return names.NEW_PAID;
    case 'CONFIRMED':
      return names.CONFIRMED;
    case 'PROCESSING':
      return names.PROCESSING;
    case 'READY_FOR_PICKUP':
      return names.READY_FOR_PICKUP;
    case 'PICKED_UP':
      return names.PICKED_UP;
    case 'READY_FOR_DELIVERY':
      return names.READY_FOR_DELIVERY;
    case 'SHIPPED':
      return names.SHIPPED;
    case 'OUT_FOR_DELIVERY':
      return names.OUT_FOR_DELIVERY;
    case 'DELIVERY_FAILED':
      return names.DELIVERY_FAILED;
    case 'DELIVERED':
      return names.DELIVERED;
    case 'CANCELLED':
      return names.CANCELLED;
    default:
      return status;
  }
}

export function getOrderStatusTone(status: OrderStatus | string): {
  text: string;
  marker: string;
} {
  switch (status) {
    case 'NEW_UNPAID':
      return { text: 'text-amber-700', marker: 'text-amber-600' };
    case 'NEW_PAID':
      return { text: 'text-emerald-700', marker: 'text-emerald-600' };
    case 'CONFIRMED':
      return { text: 'text-sky-700', marker: 'text-sky-600' };
    case 'PROCESSING':
      return { text: 'text-indigo-700', marker: 'text-indigo-600' };
    case 'READY_FOR_PICKUP':
    case 'READY_FOR_DELIVERY':
      return { text: 'text-cyan-700', marker: 'text-cyan-600' };
    case 'SHIPPED':
      return { text: 'text-teal-700', marker: 'text-teal-600' };
    case 'OUT_FOR_DELIVERY':
      return { text: 'text-blue-700', marker: 'text-blue-600' };
    case 'PICKED_UP':
    case 'DELIVERED':
      return { text: 'text-[#15803d]', marker: 'text-[#16a34a]' };
    case 'DELIVERY_FAILED':
    case 'CANCELLED':
      return { text: 'text-red-700', marker: 'text-red-600' };
    case 'PENDING':
    default:
      return { text: 'text-amber-700', marker: 'text-amber-600' };
  }
}

export function getFulfillmentMethodLabel(
  method: FulfillmentMethod | string | null | undefined,
  language: Language,
): string {
  const labels = translations[language].orders.fulfillmentMethods;
  if (method === 'PICKUP') return labels.PICKUP;
  if (method === 'DELIVERY') return labels.DELIVERY;
  return '—';
}

export function formatOrderDateTime(iso: string | null | undefined, language: Language): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatDistanceKm(
  distanceKm: number | null | undefined,
  language: Language,
): string {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) return '—';
  const formatted = new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
    maximumFractionDigits: 2,
  }).format(distanceKm);
  return language === 'ru' ? `${formatted} км` : `${formatted} km`;
}

export function roundCoordinate7(value: number): number {
  return Number(value.toFixed(7));
}

export function extractAdminOrderMetadata(detail: AdminOrderDetailResponse) {
  const o = detail.order;
  return {
    fulfillmentMethod: detail.fulfillmentMethod ?? o.fulfillmentMethod ?? null,
    branchId: detail.branchId ?? o.branchId ?? null,
    branchName: detail.branchName ?? o.branchName ?? null,
    deliveryAddress: detail.deliveryAddress ?? o.deliveryAddress ?? null,
    latitude:
      typeof detail.latitude === 'number'
        ? detail.latitude
        : typeof o.latitude === 'number'
          ? o.latitude
          : null,
    longitude:
      typeof detail.longitude === 'number'
        ? detail.longitude
        : typeof o.longitude === 'number'
          ? o.longitude
          : null,
    distanceKm:
      typeof detail.distanceKm === 'number'
        ? detail.distanceKm
        : typeof o.distanceKm === 'number'
          ? o.distanceKm
          : null,
    pricePerKm:
      typeof detail.pricePerKm === 'number'
        ? detail.pricePerKm
        : typeof o.pricePerKm === 'number'
          ? o.pricePerKm
          : null,
    cancellationReason: detail.cancellationReason ?? o.cancellationReason ?? null,
    paidAt: detail.paidAt ?? o.paidAt ?? null,
    history: Array.isArray(detail.history) ? detail.history : [],
  };
}
