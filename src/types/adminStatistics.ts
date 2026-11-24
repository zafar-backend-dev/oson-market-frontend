export type StatisticsSection =
  | 'OVERVIEW'
  | 'ORDERS'
  | 'CATALOG'
  | 'CUSTOMERS'
  | 'BRANCHES'
  | 'ENGAGEMENT'
  | 'OPERATIONS';

export const STATISTICS_SECTIONS: StatisticsSection[] = [
  'OVERVIEW',
  'ORDERS',
  'CATALOG',
  'CUSTOMERS',
  'BRANCHES',
  'ENGAGEMENT',
  'OPERATIONS',
];

export type DatePresetKey = '7d' | '30d' | '90d' | 'custom';

export interface StatisticsEnvelope {
  section: StatisticsSection | string;
  from: string;
  to: string;
  timezone: string;
}

export interface DailyStatPoint {
  date: string;
  orders: number;
  registrations: number;
  comments: number;
  payments_marked: number;
}

export interface CurrencyOrderTotalRow {
  currency: string;
  orders_count: number;
  total_amount: number;
  subtotal_amount: number;
  discount_amount: number;
  shipping_amount: number;
  paid_marked_amount: number;
  completed_amount: number;
}

export interface KeyCountItem {
  key: string;
  count: number;
}

export interface OverviewStatisticsData extends StatisticsEnvelope {
  totals: Record<string, number>;
  daily: DailyStatPoint[];
  order_totals_by_currency: CurrencyOrderTotalRow[];
}

export interface OrderStatusChangeRow {
  from_status: string;
  to_status: string;
  count: number;
}

export interface OrderRatingBucket {
  rating: number;
  count: number;
}

export interface TopVariantStatRow {
  variant_id?: string | null;
  product_id?: string | null;
  sku: string;
  product_title: string | null;
  orders_count: number;
  units_sold: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
}

export interface OrdersFulfillmentSummary {
  unique_customers: number;
  cancellations_with_reason: number;
  average_rating: number | null;
  average_distance_km: number | null;
}

export interface OrdersStatisticsData extends StatisticsEnvelope {
  by_status: KeyCountItem[];
  by_fulfillment: KeyCountItem[];
  status_changes: OrderStatusChangeRow[];
  ratings: OrderRatingBucket[];
  top_variants: TopVariantStatRow[];
  fulfillment: OrdersFulfillmentSummary;
  order_totals_by_currency: CurrencyOrderTotalRow[];
}

export interface TopCategoryStatRow {
  id: string;
  slug: string;
  name_uz: string | null;
  name_ru: string | null;
  name: string | null;
  active: boolean;
  product_count: number;
}

export interface TopBrandStatRow {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  product_count: number;
}

export interface CatalogStatisticsData extends StatisticsEnvelope {
  inventory: Record<string, number>;
  quality: Record<string, number>;
  product_statuses: KeyCountItem[];
  product_kinds: KeyCountItem[];
  variant_statuses: KeyCountItem[];
  category_statuses: KeyCountItem[];
  brand_statuses: KeyCountItem[];
  product_translation_coverage: KeyCountItem[];
  category_translation_coverage: KeyCountItem[];
  top_categories: TopCategoryStatRow[];
  top_brands: TopBrandStatRow[];
}

export interface CustomersStatisticsData extends StatisticsEnvelope {
  accounts: Record<string, number>;
  by_role: KeyCountItem[];
  by_status: KeyCountItem[];
  by_language: KeyCountItem[];
  order_frequency: KeyCountItem[];
  daily_registrations: { date: string; registrations: number }[];
}

export interface BranchCapabilitySummary {
  total?: number;
  active?: number;
  inactive?: number;
  archived?: number;
  pickup_enabled?: number;
  delivery_enabled?: number;
  statuses: KeyCountItem[];
  capabilities: KeyCountItem[];
}

export interface BranchOrderStatRow {
  branch_id: string | null;
  branch_name_uz: string | null;
  branch_name_ru: string | null;
  branch_name: string | null;
  currency: string;
  fulfillment_method: string;
  total_orders: number;
  cancelled_orders: number;
  completed_orders: number;
  completed_amount: number;
  shipping_amount: number;
  average_distance_km: number | null;
  average_rating: number | null;
}

export interface BranchesStatisticsData extends StatisticsEnvelope {
  by_status: BranchCapabilitySummary;
  branch_orders: BranchOrderStatRow[];
}

export interface EngagementProductRow {
  product_id: string;
  slug: string | null;
  title_uz: string | null;
  title_ru: string | null;
  title: string | null;
  count: number;
}

export interface EngagementStatisticsData extends StatisticsEnvelope {
  comments: Record<string, number>;
  current_likes: Record<string, number>;
  top_liked_products: EngagementProductRow[];
  top_commented_products: EngagementProductRow[];
  daily_comments: { date: string; comments: number }[];
}

export interface SiteOperationsEntry {
  key: string;
  configured?: boolean;
  count?: number;
  items?: string[];
  rawValue?: string | number | boolean | null;
}

export interface MediaByTypeRow {
  media_type: string;
  file_count: number;
  total_bytes: number;
}

export interface VerificationCodeStatRow {
  purpose: string;
  issued: number;
  used: number;
  expired: number;
}

export interface OperationsStatisticsData extends StatisticsEnvelope {
  site: SiteOperationsEntry[];
  media_by_type: MediaByTypeRow[];
  verification_codes: VerificationCodeStatRow[];
  notifications: Record<string, number>;
  email_queue: Record<string, number>;
  telegram_queue: Record<string, number>;
}
