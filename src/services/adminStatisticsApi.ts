import { translations } from '../i18n/translations';
import type {
  BranchOrderStatRow,
  BranchesStatisticsData,
  CatalogStatisticsData,
  CurrencyOrderTotalRow,
  CustomersStatisticsData,
  DailyStatPoint,
  DatePresetKey,
  EngagementProductRow,
  EngagementStatisticsData,
  KeyCountItem,
  MediaByTypeRow,
  OperationsStatisticsData,
  OrderRatingBucket,
  OrderStatusChangeRow,
  OrdersStatisticsData,
  OverviewStatisticsData,
  SiteOperationsEntry,
  StatisticsSection,
  TopBrandStatRow,
  TopCategoryStatRow,
  TopVariantStatRow,
  VerificationCodeStatRow,
} from '../types/adminStatistics';
import type { ApiErrorBody, Language } from '../types/auth';
import { AuthApiError, getDefaultHttpErrorMessage } from './apiError';
import { fetchWithSessionRefresh } from './sessionManager';

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_STATISTICS_RANGE_DAYS = 366;
export const DEFAULT_RANKING_LIMIT = 20;

export function getTodayTashkentYmd(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const nowUtc = Date.now() + 5 * 60 * 60 * 1000;
    return new Date(nowUtc).toISOString().slice(0, 10);
  }
}

export function isValidYmd(value: string): boolean {
  if (!YMD_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function addDaysToYmd(ymd: string, deltaDays: number): string {
  if (!isValidYmd(ymd)) return getTodayTashkentYmd();
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getInclusiveDaysCount(from: string, to: string): number | null {
  if (!isValidYmd(from) || !isValidYmd(to)) return null;
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86_400_000) + 1;
}

export function getDefaultDateRange(days = 30): { from: string; to: string } {
  const to = getTodayTashkentYmd();
  const from = addDaysToYmd(to, -(days - 1));
  return { from, to };
}

export function detectDatePreset(from: string, to: string): DatePresetKey {
  const today = getTodayTashkentYmd();
  if (to !== today) return 'custom';
  if (from === addDaysToYmd(today, -6)) return '7d';
  if (from === addDaysToYmd(today, -29)) return '30d';
  if (from === addDaysToYmd(today, -89)) return '90d';
  return 'custom';
}

export function validateDateRange(
  from: string,
  to: string,
  language: Language,
): string | null {
  const tv = translations[language].adminStatistics.validation;
  if (!isValidYmd(from) || !isValidYmd(to)) {
    return tv.invalidDates;
  }
  if (from > to) {
    return tv.fromAfterTo;
  }
  const inclusiveDays = getInclusiveDaysCount(from, to);
  if (inclusiveDays === null || inclusiveDays > MAX_STATISTICS_RANGE_DAYS) {
    return tv.maxDaysExceeded;
  }
  return null;
}

export function formatShortYmdDate(ymd: string, language: Language): string {
  if (!isValidYmd(ymd)) return ymd;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

export function formatBytes(bytes: number | null | undefined, language: Language): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return translations[language].adminStatistics.noData;
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(mb >= 100 ? 0 : 2)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export function formatInteger(value: number | null | undefined, language: Language): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return translations[language].adminStatistics.noData;
  }
  return new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDecimal(
  value: number | null | undefined,
  language: Language,
  digits = 2,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return translations[language].adminStatistics.noData;
  }
  return new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

export function getStatLabel(key: string, language: Language): string {
  const dict = translations[language].adminStatistics.labels;
  if (dict[key]) return dict[key];
  const lower = key.toLowerCase();
  if (dict[lower]) return dict[lower];
  const upper = key.toUpperCase();
  if (dict[upper]) return dict[upper];
  // Never expose raw snake_case directly; format cleanly as readable text
  return key
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^\w/, (ch) => ch.toUpperCase());
}

function toNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toNullableNum(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toStr(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return fallback;
}

function toNullableStr(val: unknown): string | null {
  if (typeof val === 'string' && val.trim() !== '') return val.trim();
  return null;
}

function normalizeNumberMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      out[key] = Number(value);
    }
  }
  return out;
}

function normalizeKeyCountList(raw: unknown, keyFieldHints: string[] = []): KeyCountItem[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      let resolvedKey = '';
      for (const hint of [...keyFieldHints, 'key', 'status', 'method', 'fulfillment_method', 'kind', 'role', 'language', 'lang', 'bucket', 'label', 'name', 'type']) {
        if (obj[hint] !== undefined && obj[hint] !== null && String(obj[hint]).trim() !== '') {
          resolvedKey = String(obj[hint]);
          break;
        }
      }
      const count = toNum(obj.count ?? obj.total ?? obj.value ?? obj.customers_count ?? obj.records_count ?? 0);
      return { key: resolvedKey || 'UNKNOWN', count };
    });
  }

  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, val]) => typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && Number.isFinite(Number(val))))
      .map(([key, val]) => ({
        key,
        count: toNum(val),
      }));
  }

  return [];
}

function normalizeDailyPoints(raw: unknown): DailyStatPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const date = toStr(obj.date ?? obj.day ?? '');
      if (!date) return null;
      return {
        date,
        orders: toNum(obj.orders ?? obj.orders_count ?? 0),
        registrations: toNum(obj.registrations ?? obj.new_registrations ?? 0),
        comments: toNum(obj.comments ?? obj.comments_count ?? 0),
        payments_marked: toNum(obj.payments_marked ?? obj.paymentsMarked ?? 0),
      };
    })
    .filter((pt): pt is DailyStatPoint => pt !== null);
}

function normalizeCurrencyOrderTotals(raw: unknown): CurrencyOrderTotalRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      currency: toStr(obj.currency, 'UZS').toUpperCase(),
      orders_count: toNum(obj.orders_count ?? obj.order_count ?? obj.count ?? 0),
      total_amount: toNum(obj.total_amount ?? obj.order_total ?? obj.grand_total ?? obj.total ?? 0),
      subtotal_amount: toNum(obj.subtotal_amount ?? obj.subtotal_total ?? obj.subtotal ?? 0),
      discount_amount: toNum(obj.discount_amount ?? obj.discount_total ?? obj.discount ?? 0),
      shipping_amount: toNum(obj.shipping_amount ?? obj.shipping_total ?? obj.shipping ?? 0),
      paid_marked_amount: toNum(obj.paid_marked_amount ?? obj.paid_amount ?? obj.marked_paid_amount ?? 0),
      completed_amount: toNum(obj.completed_amount ?? obj.delivered_amount ?? 0),
    };
  });
}

function normalizeEnvelope(
  raw: Record<string, unknown>,
  fallbackSection: StatisticsSection,
  fallbackFrom: string,
  fallbackTo: string,
) {
  return {
    section: toStr(raw.section, fallbackSection),
    from: toStr(raw.from, fallbackFrom),
    to: toStr(raw.to, fallbackTo),
    timezone: toStr(raw.timezone, 'Asia/Tashkent'),
  };
}

function normalizeOverview(
  raw: Record<string, unknown>,
  from: string,
  to: string,
): OverviewStatisticsData {
  return {
    ...normalizeEnvelope(raw, 'OVERVIEW', from, to),
    totals: normalizeNumberMap(raw.totals),
    daily: normalizeDailyPoints(raw.daily),
    order_totals_by_currency: normalizeCurrencyOrderTotals(raw.order_totals_by_currency),
  };
}

function normalizeOrders(
  raw: Record<string, unknown>,
  from: string,
  to: string,
): OrdersStatisticsData {
  const statusChangesRaw = Array.isArray(raw.status_changes) ? raw.status_changes : [];
  const status_changes: OrderStatusChangeRow[] = statusChangesRaw.map((item) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      from_status: toStr(obj.from_status ?? obj.fromStatus ?? 'NONE'),
      to_status: toStr(obj.to_status ?? obj.toStatus ?? 'UNKNOWN'),
      count: toNum(obj.count ?? obj.transitions ?? 0),
    };
  });

  const ratingsRaw = raw.ratings;
  let ratings: OrderRatingBucket[] = [];
  if (Array.isArray(ratingsRaw)) {
    ratings = ratingsRaw.map((item) => {
      const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      return {
        rating: toNum(obj.rating ?? obj.stars ?? obj.score ?? 0),
        count: toNum(obj.count ?? 0),
      };
    });
  } else if (ratingsRaw && typeof ratingsRaw === 'object') {
    const obj = ratingsRaw as Record<string, unknown>;
    const dist = (obj.distribution && typeof obj.distribution === 'object'
      ? obj.distribution
      : obj) as Record<string, unknown>;
    ratings = [1, 2, 3, 4, 5].map((star) => ({
      rating: star,
      count: toNum(dist[String(star)] ?? dist[`star_${star}`] ?? dist[`stars_${star}`] ?? 0),
    }));
  }

  const topVariantsRaw = Array.isArray(raw.top_variants) ? raw.top_variants : [];
  const top_variants: TopVariantStatRow[] = topVariantsRaw.map((item) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      variant_id: toNullableStr(obj.variant_id ?? obj.variantId),
      product_id: toNullableStr(obj.product_id ?? obj.productId),
      sku: toStr(obj.sku, '—'),
      product_title: toNullableStr(
        obj.product_title ?? obj.title ?? obj.product_name ?? obj.name,
      ),
      orders_count: toNum(obj.orders_count ?? obj.order_count ?? 0),
      units_sold: toNum(obj.units_sold ?? obj.quantity ?? obj.sold_quantity ?? 0),
      discount_amount: toNum(obj.discount_amount ?? obj.discount_total ?? obj.discount ?? 0),
      total_amount: toNum(obj.total_amount ?? obj.line_total ?? obj.amount ?? 0),
      currency: toStr(obj.currency, 'UZS').toUpperCase(),
    };
  });

  const fulObj = (raw.fulfillment && typeof raw.fulfillment === 'object'
    ? raw.fulfillment
    : {}) as Record<string, unknown>;

  return {
    ...normalizeEnvelope(raw, 'ORDERS', from, to),
    by_status: normalizeKeyCountList(raw.by_status, ['status']),
    by_fulfillment: normalizeKeyCountList(raw.by_fulfillment, ['fulfillment_method', 'method']),
    status_changes,
    ratings,
    top_variants,
    fulfillment: {
      unique_customers: toNum(fulObj.unique_customers ?? fulObj.uniqueCustomers ?? 0),
      cancellations_with_reason: toNum(
        fulObj.cancellations_with_reason ?? fulObj.cancellationsWithReason ?? 0,
      ),
      average_rating: toNullableNum(fulObj.average_rating ?? fulObj.averageRating),
      average_distance_km: toNullableNum(fulObj.average_distance_km ?? fulObj.averageDistanceKm),
    },
    order_totals_by_currency: normalizeCurrencyOrderTotals(raw.order_totals_by_currency),
  };
}

function normalizeCatalog(
  raw: Record<string, unknown>,
  from: string,
  to: string,
): CatalogStatisticsData {
  const invRaw = normalizeNumberMap(raw.inventory);
  const qualityRaw = normalizeNumberMap(raw.quality ?? raw.data_quality);

  // Extract quality metrics from either `quality` or `inventory`
  const qualityKeys = [
    'without_images',
    'products_without_images',
    'variants_without_images',
    'without_active_price',
    'variants_without_active_price',
    'without_price',
    'without_category',
    'products_without_category',
    'without_brand',
    'products_without_brand',
  ];

  const quality: Record<string, number> = { ...qualityRaw };
  for (const k of qualityKeys) {
    if (invRaw[k] !== undefined && quality[k] === undefined) {
      quality[k] = invRaw[k];
      delete invRaw[k];
    }
    if (raw[k] !== undefined && quality[k] === undefined) {
      quality[k] = toNum(raw[k]);
    }
  }

  const topCategoriesRaw = Array.isArray(raw.top_categories) ? raw.top_categories : [];
  const top_categories: TopCategoryStatRow[] = topCategoriesRaw.map((item) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      id: toStr(obj.id ?? obj.category_id ?? ''),
      slug: toStr(obj.slug ?? ''),
      name_uz: toNullableStr(obj.name_uz ?? obj.nameUz),
      name_ru: toNullableStr(obj.name_ru ?? obj.nameRu),
      name: toNullableStr(obj.name ?? obj.title),
      active: Boolean(obj.active ?? obj.is_active ?? true),
      product_count: toNum(obj.product_count ?? obj.products_count ?? obj.count ?? 0),
    };
  });

  const topBrandsRaw = Array.isArray(raw.top_brands) ? raw.top_brands : [];
  const top_brands: TopBrandStatRow[] = topBrandsRaw.map((item) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      id: toStr(obj.id ?? obj.brand_id ?? ''),
      slug: toStr(obj.slug ?? ''),
      name: toStr(obj.name ?? obj.title ?? '—'),
      active: Boolean(obj.active ?? obj.is_active ?? true),
      product_count: toNum(obj.product_count ?? obj.products_count ?? obj.count ?? 0),
    };
  });

  return {
    ...normalizeEnvelope(raw, 'CATALOG', from, to),
    inventory: invRaw,
    quality,
    product_statuses: normalizeKeyCountList(raw.product_statuses, ['status']),
    product_kinds: normalizeKeyCountList(raw.product_kinds, ['product_kind', 'kind']),
    variant_statuses: normalizeKeyCountList(raw.variant_statuses, ['status']),
    category_statuses: normalizeKeyCountList(raw.category_statuses, ['status']),
    brand_statuses: normalizeKeyCountList(raw.brand_statuses, ['status']),
    product_translation_coverage: normalizeKeyCountList(raw.product_translation_coverage, ['language', 'lang']),
    category_translation_coverage: normalizeKeyCountList(raw.category_translation_coverage, ['language', 'lang']),
    top_categories,
    top_brands,
  };
}

function normalizeCustomers(
  raw: Record<string, unknown>,
  from: string,
  to: string,
): CustomersStatisticsData {
  const dailySource = raw.daily ?? raw.daily_registrations;
  const dailyPoints = normalizeDailyPoints(dailySource);
  return {
    ...normalizeEnvelope(raw, 'CUSTOMERS', from, to),
    accounts: normalizeNumberMap(raw.accounts),
    by_role: normalizeKeyCountList(raw.by_role, ['role']),
    by_status: normalizeKeyCountList(raw.by_status, ['status']),
    by_language: normalizeKeyCountList(raw.by_language, ['language', 'lang']),
    order_frequency: normalizeKeyCountList(raw.order_frequency, ['bucket', 'orders_bucket', 'label']),
    daily_registrations: dailyPoints.map((pt) => ({
      date: pt.date,
      registrations: pt.registrations,
    })),
  };
}

function normalizeBranches(
  raw: Record<string, unknown>,
  from: string,
  to: string,
): BranchesStatisticsData {
  const rawByStatus = raw.by_status;
  const statuses: KeyCountItem[] = [];
  const capabilities: KeyCountItem[] = [];

  if (Array.isArray(rawByStatus)) {
    for (const item of normalizeKeyCountList(rawByStatus, ['status'])) {
      if (item.key.includes('pickup') || item.key.includes('delivery')) {
        capabilities.push(item);
      } else {
        statuses.push(item);
      }
    }
  } else if (rawByStatus && typeof rawByStatus === 'object') {
    const obj = rawByStatus as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'statuses' && (Array.isArray(v) || typeof v === 'object')) {
        statuses.push(...normalizeKeyCountList(v, ['status']));
      } else if (k === 'capabilities' && (Array.isArray(v) || typeof v === 'object')) {
        capabilities.push(...normalizeKeyCountList(v));
      } else if (k === 'pickup_enabled' || k === 'delivery_enabled') {
        capabilities.push({ key: k, count: toNum(v) });
      } else if (typeof v === 'number' || (typeof v === 'string' && Number.isFinite(Number(v)))) {
        statuses.push({ key: k, count: toNum(v) });
      }
    }
  }

  if (raw.capabilities && typeof raw.capabilities === 'object') {
    capabilities.push(...normalizeKeyCountList(raw.capabilities));
  }

  const branchOrdersRaw = Array.isArray(raw.branch_orders) ? raw.branch_orders : [];
  const branch_orders: BranchOrderStatRow[] = branchOrdersRaw.map((item) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      branch_id: toNullableStr(obj.branch_id ?? obj.branchId),
      branch_name_uz: toNullableStr(obj.branch_name_uz ?? obj.name_uz),
      branch_name_ru: toNullableStr(obj.branch_name_ru ?? obj.name_ru),
      branch_name: toNullableStr(obj.branch_name ?? obj.name),
      currency: toStr(obj.currency, 'UZS').toUpperCase(),
      fulfillment_method: toStr(obj.fulfillment_method ?? obj.method ?? ''),
      total_orders: toNum(obj.total_orders ?? obj.orders_count ?? obj.total ?? 0),
      cancelled_orders: toNum(obj.cancelled_orders ?? obj.cancelled ?? 0),
      completed_orders: toNum(obj.completed_orders ?? obj.completed ?? 0),
      completed_amount: toNum(obj.completed_amount ?? obj.total_amount ?? 0),
      shipping_amount: toNum(obj.shipping_amount ?? obj.delivery_amount ?? 0),
      average_distance_km: toNullableNum(obj.average_distance_km ?? obj.avg_distance_km),
      average_rating: toNullableNum(obj.average_rating ?? obj.avg_rating),
    };
  });

  return {
    ...normalizeEnvelope(raw, 'BRANCHES', from, to),
    by_status: {
      statuses,
      capabilities,
    },
    branch_orders,
  };
}

function normalizeEngagementProductRow(item: unknown): EngagementProductRow {
  const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  return {
    product_id: toStr(obj.product_id ?? obj.id ?? ''),
    slug: toNullableStr(obj.slug),
    title_uz: toNullableStr(obj.title_uz ?? obj.name_uz),
    title_ru: toNullableStr(obj.title_ru ?? obj.name_ru),
    title: toNullableStr(obj.title ?? obj.product_title ?? obj.name),
    count: toNum(obj.likes_count ?? obj.comments_count ?? obj.count ?? 0),
  };
}

function normalizeEngagement(
  raw: Record<string, unknown>,
  from: string,
  to: string,
): EngagementStatisticsData {
  const dailySource = raw.daily ?? raw.daily_comments;
  const dailyPoints = normalizeDailyPoints(dailySource);
  const topLikedRaw = Array.isArray(raw.top_liked_products) ? raw.top_liked_products : [];
  const topCommentedRaw = Array.isArray(raw.top_commented_products)
    ? raw.top_commented_products
    : [];

  return {
    ...normalizeEnvelope(raw, 'ENGAGEMENT', from, to),
    comments: normalizeNumberMap(raw.comments),
    current_likes: normalizeNumberMap(raw.current_likes),
    top_liked_products: topLikedRaw.map(normalizeEngagementProductRow),
    top_commented_products: topCommentedRaw.map(normalizeEngagementProductRow),
    daily_comments: dailyPoints.map((pt) => ({
      date: pt.date,
      comments: pt.comments,
    })),
  };
}

function normalizeOperations(
  raw: Record<string, unknown>,
  from: string,
  to: string,
): OperationsStatisticsData {
  const siteRaw = raw.site && typeof raw.site === 'object' ? (raw.site as Record<string, unknown>) : {};
  const site: SiteOperationsEntry[] = Object.entries(siteRaw).map(([key, value]) => {
    if (typeof value === 'boolean') {
      return { key, configured: value, rawValue: value };
    }
    if (typeof value === 'number') {
      return { key, count: value, rawValue: value };
    }
    if (Array.isArray(value)) {
      return {
        key,
        count: value.length,
        items: value.map((v) => String(v)),
      };
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const configured =
        typeof obj.configured === 'boolean'
          ? obj.configured
          : typeof obj.enabled === 'boolean'
            ? obj.enabled
            : undefined;
      const count =
        obj.count !== undefined
          ? toNum(obj.count)
          : obj.total !== undefined
            ? toNum(obj.total)
            : undefined;
      return { key, configured, count };
    }
    return { key, rawValue: value == null ? null : String(value) };
  });

  const mediaRaw = Array.isArray(raw.media_by_type) ? raw.media_by_type : [];
  const media_by_type: MediaByTypeRow[] = mediaRaw.map((item) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      media_type: toStr(obj.media_type ?? obj.type ?? obj.entity_type ?? 'OTHER'),
      file_count: toNum(obj.file_count ?? obj.files_count ?? obj.count ?? 0),
      total_bytes: toNum(obj.total_bytes ?? obj.size_bytes ?? obj.bytes ?? 0),
    };
  });

  const verifRaw = Array.isArray(raw.verification_codes) ? raw.verification_codes : [];
  const verification_codes: VerificationCodeStatRow[] = verifRaw.map((item) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return {
      purpose: toStr(obj.purpose ?? obj.type ?? 'OTHER'),
      issued: toNum(obj.issued ?? obj.issued_count ?? 0),
      used: toNum(obj.used ?? obj.used_count ?? 0),
      expired: toNum(obj.expired ?? obj.expired_count ?? 0),
    };
  });

  return {
    ...normalizeEnvelope(raw, 'OPERATIONS', from, to),
    site,
    media_by_type,
    verification_codes,
    notifications: normalizeNumberMap(raw.notifications),
    email_queue: normalizeNumberMap(raw.email_queue),
    telegram_queue: normalizeNumberMap(raw.telegram_queue),
  };
}

function getStatsErrorMessage(status: number, lang: Language): string {
  if (lang === 'ru') {
    switch (status) {
      case 400:
        return 'Проверьте параметры запроса статистики (даты или лимит).';
      case 401:
        return 'Сессия истекла. Пожалуйста, войдите снова.';
      case 403:
        return 'Для просмотра статистики требуются права администратора.';
      default:
        return getDefaultHttpErrorMessage(status, lang);
    }
  }

  switch (status) {
    case 400:
      return 'Statistika so‘rovi parametrlarini (sanalar yoki limit) tekshiring.';
    case 401:
      return 'Sessiya muddati tugagan. Iltimos, qayta kiring.';
    case 403:
      return 'Statistikani ko‘rish uchun admin ruxsati kerak.';
    default:
      return getDefaultHttpErrorMessage(status, lang);
  }
}

async function fetchStatisticsRaw(
  accessToken: string,
  section: StatisticsSection,
  params: { from: string; to: string; limit?: number },
  language: Language,
): Promise<Record<string, unknown>> {
  const safeLanguage: Language = language === 'ru' ? 'ru' : 'uz';
  const search = new URLSearchParams();
  search.set('from', params.from);
  search.set('to', params.to);

  if (section !== 'OVERVIEW' && typeof params.limit === 'number' && Number.isFinite(params.limit)) {
    const safeLimit = Math.min(100, Math.max(1, Math.floor(params.limit)));
    search.set('limit', String(safeLimit));
  }

  const basePath =
    section === 'OVERVIEW'
      ? '/api/admin/statistics'
      : `/api/admin/statistics/${encodeURIComponent(section)}`;
  const path = `${basePath}?${search.toString()}`;

  const response = await fetchWithSessionRefresh(path, {
    method: 'GET',
    accessToken,
    language: safeLanguage,
    networkErrorMessage:
      safeLanguage === 'ru'
        ? 'Не удалось загрузить статистику. Проверьте подключение и попробуйте снова.'
        : 'Statistikani yuklab bo‘lmadi. Ulanishni tekshirib qayta urinib ko‘ring.',
  });

  const text = await response.text();
  let parsed: ApiErrorBody | Record<string, unknown> | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as ApiErrorBody | Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errorBody = (parsed ?? {}) as ApiErrorBody;
    throw new AuthApiError({
      status: response.status,
      code: errorBody.code || `http.${response.status}`,
      message: errorBody.message || getStatsErrorMessage(response.status, safeLanguage),
      fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
      endpoint: `GET ${basePath}`,
    });
  }

  return (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
}

export type AnySectionStatisticsData =
  | { sectionKey: 'OVERVIEW'; data: OverviewStatisticsData }
  | { sectionKey: 'ORDERS'; data: OrdersStatisticsData }
  | { sectionKey: 'CATALOG'; data: CatalogStatisticsData }
  | { sectionKey: 'CUSTOMERS'; data: CustomersStatisticsData }
  | { sectionKey: 'BRANCHES'; data: BranchesStatisticsData }
  | { sectionKey: 'ENGAGEMENT'; data: EngagementStatisticsData }
  | { sectionKey: 'OPERATIONS'; data: OperationsStatisticsData };

export const adminStatisticsApi = {
  async getSection(
    accessToken: string,
    section: StatisticsSection,
    params: { from: string; to: string; limit?: number },
    language: Language,
  ): Promise<AnySectionStatisticsData> {
    const raw = await fetchStatisticsRaw(accessToken, section, params, language);

    switch (section) {
      case 'OVERVIEW':
        return { sectionKey: 'OVERVIEW', data: normalizeOverview(raw, params.from, params.to) };
      case 'ORDERS':
        return { sectionKey: 'ORDERS', data: normalizeOrders(raw, params.from, params.to) };
      case 'CATALOG':
        return { sectionKey: 'CATALOG', data: normalizeCatalog(raw, params.from, params.to) };
      case 'CUSTOMERS':
        return { sectionKey: 'CUSTOMERS', data: normalizeCustomers(raw, params.from, params.to) };
      case 'BRANCHES':
        return { sectionKey: 'BRANCHES', data: normalizeBranches(raw, params.from, params.to) };
      case 'ENGAGEMENT':
        return { sectionKey: 'ENGAGEMENT', data: normalizeEngagement(raw, params.from, params.to) };
      case 'OPERATIONS':
        return { sectionKey: 'OPERATIONS', data: normalizeOperations(raw, params.from, params.to) };
    }
  },
};
