import { ArrowRight, Star } from 'lucide-react';
import { translations } from '../i18n/translations';
import {
  formatBytes,
  formatDecimal,
  formatInteger,
  getStatLabel,
} from '../services/adminStatisticsApi';
import type {
  BranchOrderStatRow,
  BranchesStatisticsData,
  CatalogStatisticsData,
  CurrencyOrderTotalRow,
  CustomersStatisticsData,
  EngagementProductRow,
  EngagementStatisticsData,
  KeyCountItem,
  MediaByTypeRow,
  OperationsStatisticsData,
  OrderStatusChangeRow,
  OrdersStatisticsData,
  OverviewStatisticsData,
  StatisticsSection,
  TopBrandStatRow,
  TopCategoryStatRow,
  TopVariantStatRow,
  VerificationCodeStatRow,
} from '../types/adminStatistics';
import type { Language } from '../types/auth';
import {
  formatDistanceKm,
  getFulfillmentMethodLabel,
  getOrderStatusLabel,
} from '../utils/orderStatus';
import { formatPriceLabel } from '../utils/price';
import {
  DailyTrendChart,
  HorizontalDistributionBars,
  ResponsiveExpandableTable,
  type ResponsiveTableColumn,
} from './StatisticsCharts';

interface ScopeBadgeProps {
  scope: 'period' | 'current';
  periodLabel: string;
  currentStateLabel: string;
}

function ScopeTag({ scope, periodLabel, currentStateLabel }: ScopeBadgeProps) {
  return (
    <span className="text-[11px] font-medium text-slate-500">
      {scope === 'period' ? periodLabel : currentStateLabel}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  scope?: 'period' | 'current';
  periodLabel: string;
  currentStateLabel: string;
  onNavigate?: () => void;
  navigateHint?: string;
  tone?: 'default' | 'accent' | 'warning';
}

function StatKpiCard({
  label,
  value,
  unit,
  scope,
  periodLabel,
  currentStateLabel,
  onNavigate,
  navigateHint,
  tone = 'default',
}: StatCardProps) {
  const borderClass =
    tone === 'accent'
      ? 'border-[#bbf7d0] bg-[#f0fdf4]/40'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/30'
        : 'border-[#e6e4dd] bg-white';

  const content = (
    <div className="flex flex-col justify-between h-full gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-600 leading-snug">{label}</span>
        {onNavigate && (
          <ArrowRight
            className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#16a34a] transition-colors shrink-0 mt-0.5"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 tabular-nums">
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-slate-500">{unit}</span>}
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        {scope ? (
          <ScopeTag
            scope={scope}
            periodLabel={periodLabel}
            currentStateLabel={currentStateLabel}
          />
        ) : (
          <span />
        )}
        {onNavigate && navigateHint && (
          <span className="text-[11px] font-medium text-[#15803d] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
            {navigateHint}
          </span>
        )}
      </div>
    </div>
  );

  if (onNavigate) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        className={`group w-full text-left rounded-xl border ${borderClass} p-4 sm:p-5 hover:border-[#86efac] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2`}
      >
        {content}
      </button>
    );
  }

  return <div className={`rounded-xl border ${borderClass} p-4 sm:p-5`}>{content}</div>;
}

function SectionPanel({
  title,
  subtitle,
  rightBadge,
  children,
}: {
  title: string;
  subtitle?: string;
  rightBadge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-[#e6e4dd] rounded-xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-slate-500">{subtitle}</p>}
        </div>
        {rightBadge && (
          <span className="text-xs font-medium text-slate-500 shrink-0">{rightBadge}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function getCurrencyTotalsColumns(
  language: Language,
): ResponsiveTableColumn<CurrencyOrderTotalRow>[] {
  const tos = translations[language].adminStatistics.ordersSection;
  return [
    {
      key: 'currency',
      title: tos.currencyCol,
      primaryOnMobile: true,
      render: (row) => <span className="font-mono font-semibold">{row.currency}</span>,
    },
    {
      key: 'orders_count',
      title: tos.ordersCountCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => formatInteger(row.orders_count, language),
    },
    {
      key: 'subtotal_amount',
      title: tos.subtotalCol,
      align: 'right',
      render: (row) => formatPriceLabel(row.subtotal_amount, language, row.currency),
    },
    {
      key: 'discount_amount',
      title: tos.discountCol,
      align: 'right',
      render: (row) => formatPriceLabel(row.discount_amount, language, row.currency),
    },
    {
      key: 'shipping_amount',
      title: tos.shippingCol,
      align: 'right',
      render: (row) => formatPriceLabel(row.shipping_amount, language, row.currency),
    },
    {
      key: 'total_amount',
      title: tos.totalAmountCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => (
        <span className="font-semibold text-slate-900">
          {formatPriceLabel(row.total_amount, language, row.currency)}
        </span>
      ),
    },
    {
      key: 'paid_marked_amount',
      title: tos.paidMarkedCol,
      align: 'right',
      render: (row) => formatPriceLabel(row.paid_marked_amount, language, row.currency),
    },
    {
      key: 'completed_amount',
      title: tos.completedAmountCol,
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-[#15803d]">
          {formatPriceLabel(row.completed_amount, language, row.currency)}
        </span>
      ),
    },
  ];
}

function pickFirstMetric(
  map: Record<string, number>,
  candidates: string[],
): { key: string; value: number } | null {
  for (const key of candidates) {
    if (map[key] !== undefined) {
      return { key, value: map[key] };
    }
  }
  return null;
}

function getMetricScopeAndTarget(key: string): {
  scope: 'period' | 'current';
  target?: StatisticsSection;
} {
  const lower = key.toLowerCase();
  if (
    lower.includes('total_accounts') ||
    lower === 'accounts' ||
    lower.includes('product') ||
    lower.includes('categor') ||
    lower.includes('brand') ||
    lower.includes('branch') ||
    lower.includes('unread') ||
    lower.includes('current_like') ||
    lower === 'likes' ||
    lower.includes('variant')
  ) {
    if (lower.includes('account')) return { scope: 'current', target: 'CUSTOMERS' };
    if (lower.includes('product') || lower.includes('categor') || lower.includes('brand') || lower.includes('variant')) {
      return { scope: 'current', target: 'CATALOG' };
    }
    if (lower.includes('branch')) return { scope: 'current', target: 'BRANCHES' };
    if (lower.includes('unread')) return { scope: 'current', target: 'OPERATIONS' };
    if (lower.includes('like')) return { scope: 'current', target: 'ENGAGEMENT' };
    return { scope: 'current' };
  }

  if (lower.includes('order') || lower.includes('payment')) {
    return { scope: 'period', target: 'ORDERS' };
  }
  if (lower.includes('registration')) {
    return { scope: 'period', target: 'CUSTOMERS' };
  }
  if (lower.includes('comment')) {
    return { scope: 'period', target: 'ENGAGEMENT' };
  }
  return { scope: 'period' };
}

/* ============================================================================
 * 1. OVERVIEW SECTION
 * ========================================================================== */
export function OverviewStatisticsView({
  data,
  language,
  periodLabel,
  onSelectSection,
}: {
  data: OverviewStatisticsData;
  language: Language;
  periodLabel: string;
  onSelectSection: (section: StatisticsSection) => void;
}) {
  const ts = translations[language].adminStatistics;
  const tov = ts.overview;
  const totals = data.totals;

  const ordersMetric = pickFirstMetric(totals, ['orders', 'orders_in_period', 'total_orders']);
  const totalAccountsMetric = pickFirstMetric(totals, ['total_accounts', 'accounts']);
  const registrationsMetric = pickFirstMetric(totals, [
    'new_registrations',
    'registrations',
    'new_accounts',
  ]);
  const productsMetric = pickFirstMetric(totals, [
    'products',
    'total_products',
    'active_products',
  ]);
  const unreadNotifsMetric = pickFirstMetric(totals, ['unread_notifications']);

  const usedPrimaryKeys = new Set<string>(
    [
      ordersMetric?.key,
      totalAccountsMetric?.key,
      registrationsMetric?.key,
      productsMetric?.key,
      unreadNotifsMetric?.key,
    ].filter((k): k is string => Boolean(k)),
  );

  const primaryCards: {
    key: string;
    label: string;
    value: number;
    scope: 'period' | 'current';
    target: StatisticsSection;
    tone?: 'default' | 'accent' | 'warning';
  }[] = [
    {
      key: 'orders',
      label: getStatLabel(ordersMetric?.key ?? 'orders', language),
      value: ordersMetric?.value ?? 0,
      scope: 'period',
      target: 'ORDERS',
      tone: 'accent',
    },
    {
      key: 'total_accounts',
      label: getStatLabel(totalAccountsMetric?.key ?? 'total_accounts', language),
      value: totalAccountsMetric?.value ?? 0,
      scope: 'current',
      target: 'CUSTOMERS',
    },
    {
      key: 'new_registrations',
      label: getStatLabel(registrationsMetric?.key ?? 'new_registrations', language),
      value: registrationsMetric?.value ?? 0,
      scope: 'period',
      target: 'CUSTOMERS',
    },
    {
      key: 'products',
      label: getStatLabel(productsMetric?.key ?? 'products', language),
      value: productsMetric?.value ?? 0,
      scope: 'current',
      target: 'CATALOG',
    },
    {
      key: 'unread_notifications',
      label: getStatLabel(unreadNotifsMetric?.key ?? 'unread_notifications', language),
      value: unreadNotifsMetric?.value ?? 0,
      scope: 'current',
      target: 'OPERATIONS',
      tone: (unreadNotifsMetric?.value ?? 0) > 0 ? 'warning' : 'default',
    },
  ];

  const remainingEntries = Object.entries(totals).filter(([k]) => !usedPrimaryKeys.has(k));

  return (
    <div className="space-y-6">
      {/* Primary Overview KPI Cards */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">
          {tov.kpiSectionTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {primaryCards.map((card) => (
            <StatKpiCard
              key={card.key}
              label={card.label}
              value={formatInteger(card.value, language)}
              scope={card.scope}
              periodLabel={periodLabel}
              currentStateLabel={ts.currentStateBadge}
              tone={card.tone}
              navigateHint={tov.openReportHint}
              onNavigate={() => onSelectSection(card.target)}
            />
          ))}
        </div>
      </section>

      {/* Remaining Compact Totals */}
      {remainingEntries.length > 0 && (
        <SectionPanel title={tov.otherMetricsTitle}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {remainingEntries.map(([key, value]) => {
              const meta = getMetricScopeAndTarget(key);
              return (
                <StatKpiCard
                  key={key}
                  label={getStatLabel(key, language)}
                  value={formatInteger(value, language)}
                  scope={meta.scope}
                  periodLabel={periodLabel}
                  currentStateLabel={ts.currentStateBadge}
                  navigateHint={meta.target ? tov.openReportHint : undefined}
                  onNavigate={meta.target ? () => onSelectSection(meta.target!) : undefined}
                />
              );
            })}
          </div>
        </SectionPanel>
      )}

      {/* Daily Dynamics Chart */}
      <SectionPanel
        title={tov.dailyChartTitle}
        subtitle={tov.dailyChartSubtitle}
        rightBadge={periodLabel}
      >
        <DailyTrendChart
          points={data.daily.map((d) => ({ ...d }))}
          language={language}
          series={[
            { key: 'orders', label: tov.series.orders, color: '#16a34a', shape: 'circle' },
            {
              key: 'registrations',
              label: tov.series.registrations,
              color: '#0284c7',
              shape: 'square',
            },
            { key: 'comments', label: tov.series.comments, color: '#d97706', shape: 'diamond' },
            {
              key: 'payments_marked',
              label: tov.series.payments_marked,
              color: '#7c3aed',
              shape: 'triangle',
            },
          ]}
        />
      </SectionPanel>

      {/* Order Totals by Currency */}
      <SectionPanel
        title={tov.currencySectionTitle}
        subtitle={ts.ordersSection.multiCurrencyNote}
        rightBadge={periodLabel}
      >
        <ResponsiveExpandableTable
          rows={data.order_totals_by_currency}
          rowKey={(row, idx) => `${row.currency}-${idx}`}
          columns={getCurrencyTotalsColumns(language)}
          language={language}
          emptyLabel={ts.emptyTitle}
        />
      </SectionPanel>
    </div>
  );
}

/* ============================================================================
 * 2. ORDERS SECTION
 * ========================================================================== */
export function OrdersStatisticsView({
  data,
  language,
  periodLabel,
}: {
  data: OrdersStatisticsData;
  language: Language;
  periodLabel: string;
}) {
  const ts = translations[language].adminStatistics;
  const tos = ts.ordersSection;

  const statusChangeCols: ResponsiveTableColumn<OrderStatusChangeRow>[] = [
    {
      key: 'from_status',
      title: tos.fromStatusCol,
      primaryOnMobile: true,
      render: (row) => getOrderStatusLabel(row.from_status, language),
    },
    {
      key: 'to_status',
      title: tos.toStatusCol,
      primaryOnMobile: true,
      render: (row) => (
        <span className="font-semibold">{getOrderStatusLabel(row.to_status, language)}</span>
      ),
    },
    {
      key: 'count',
      title: tos.transitionsCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => formatInteger(row.count, language),
    },
  ];

  const topVariantCols: ResponsiveTableColumn<TopVariantStatRow>[] = [
    {
      key: 'sku',
      title: tos.skuCol,
      primaryOnMobile: true,
      render: (row) => <span className="font-mono text-xs">{row.sku}</span>,
    },
    {
      key: 'product_title',
      title: tos.productCol,
      primaryOnMobile: true,
      render: (row) => row.product_title || ts.noData,
    },
    {
      key: 'orders_count',
      title: tos.ordersCountCol,
      align: 'right',
      render: (row) => formatInteger(row.orders_count, language),
    },
    {
      key: 'units_sold',
      title: tos.unitsSoldCol,
      align: 'right',
      render: (row) => formatInteger(row.units_sold, language),
    },
    {
      key: 'discount_amount',
      title: tos.discountCol,
      align: 'right',
      render: (row) => formatPriceLabel(row.discount_amount, language, row.currency),
    },
    {
      key: 'total_amount',
      title: tos.totalAmountCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => (
        <span className="font-semibold">
          {formatPriceLabel(row.total_amount, language, row.currency)}
        </span>
      ),
    },
  ];

  const ratingBars = [5, 4, 3, 2, 1].map((star) => {
    const found = data.ratings.find((r) => r.rating === star);
    return {
      key: String(star),
      label: `${star} ${tos.starsSuffix}`,
      count: found?.count ?? 0,
      barColor: star >= 4 ? '#16a34a' : star === 3 ? '#d97706' : '#dc2626',
      marker: <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />,
    };
  });

  return (
    <div className="space-y-6">
      {/* Fulfillment & Quality Summary Cards */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">
          {tos.fulfillmentMetricsTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatKpiCard
            label={tos.uniqueCustomers}
            value={formatInteger(data.fulfillment.unique_customers, language)}
            scope="period"
            periodLabel={periodLabel}
            currentStateLabel={ts.currentStateBadge}
          />
          <StatKpiCard
            label={tos.cancellationsWithReason}
            value={formatInteger(data.fulfillment.cancellations_with_reason, language)}
            scope="period"
            periodLabel={periodLabel}
            currentStateLabel={ts.currentStateBadge}
          />
          <StatKpiCard
            label={tos.averageRating}
            value={
              data.fulfillment.average_rating === null
                ? ts.noData
                : formatDecimal(data.fulfillment.average_rating, language, 2)
            }
            unit={data.fulfillment.average_rating !== null ? '/ 5' : undefined}
            scope="period"
            periodLabel={periodLabel}
            currentStateLabel={ts.currentStateBadge}
          />
          <StatKpiCard
            label={tos.averageDistanceKm}
            value={
              data.fulfillment.average_distance_km === null
                ? ts.noData
                : formatDistanceKm(data.fulfillment.average_distance_km, language)
            }
            scope="period"
            periodLabel={periodLabel}
            currentStateLabel={ts.currentStateBadge}
          />
        </div>
      </section>

      {/* Horizontal Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel title={tos.byStatusTitle} rightBadge={periodLabel}>
          <HorizontalDistributionBars
            items={data.by_status.map((item) => ({
              key: item.key,
              label: getOrderStatusLabel(item.key, language),
              count: item.count,
              barColor:
                item.key === 'CANCELLED' || item.key === 'DELIVERY_FAILED'
                  ? '#dc2626'
                  : item.key === 'DELIVERED' || item.key === 'PICKED_UP' || item.key === 'NEW_PAID'
                    ? '#16a34a'
                    : '#0284c7',
            }))}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>

        <div className="space-y-6">
          <SectionPanel title={tos.byFulfillmentTitle} rightBadge={periodLabel}>
            <HorizontalDistributionBars
              items={data.by_fulfillment.map((item) => ({
                key: item.key,
                label: getFulfillmentMethodLabel(item.key, language),
                count: item.count,
                barColor: item.key === 'DELIVERY' ? '#16a34a' : '#0284c7',
              }))}
              language={language}
              emptyLabel={ts.emptyTitle}
            />
          </SectionPanel>

          <SectionPanel title={tos.ratingsTitle} rightBadge={periodLabel}>
            <HorizontalDistributionBars
              items={ratingBars}
              language={language}
              emptyLabel={ts.emptyTitle}
            />
          </SectionPanel>
        </div>
      </div>

      {/* Order Totals by Currency */}
      <SectionPanel
        title={tos.currencyTotalsTitle}
        subtitle={tos.multiCurrencyNote}
        rightBadge={periodLabel}
      >
        <ResponsiveExpandableTable
          rows={data.order_totals_by_currency}
          rowKey={(row, idx) => `${row.currency}-${idx}`}
          columns={getCurrencyTotalsColumns(language)}
          language={language}
          emptyLabel={ts.emptyTitle}
        />
      </SectionPanel>

      {/* Top Variants Table */}
      <SectionPanel title={tos.topVariantsTitle} rightBadge={periodLabel}>
        <ResponsiveExpandableTable
          rows={data.top_variants}
          rowKey={(row, idx) => `${row.sku}-${row.currency}-${idx}`}
          columns={topVariantCols}
          language={language}
          emptyLabel={ts.emptyTitle}
        />
      </SectionPanel>

      {/* Status Transitions Table */}
      <SectionPanel title={tos.statusChangesTitle} rightBadge={periodLabel}>
        <ResponsiveExpandableTable
          rows={data.status_changes}
          rowKey={(row, idx) => `${row.from_status}-${row.to_status}-${idx}`}
          columns={statusChangeCols}
          language={language}
          emptyLabel={ts.emptyTitle}
        />
      </SectionPanel>
    </div>
  );
}

/* ============================================================================
 * 3. CATALOG SECTION
 * ========================================================================== */
function DistributionGroupCard({
  title,
  items,
  language,
  emptyLabel,
}: {
  title: string;
  items: KeyCountItem[];
  language: Language;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <HorizontalDistributionBars
        items={items.map((item) => ({
          key: item.key,
          label: getStatLabel(item.key, language),
          count: item.count,
          barColor:
            item.key === 'ACTIVE'
              ? '#16a34a'
              : item.key === 'ARCHIVED' || item.key === 'INACTIVE'
                ? '#64748b'
                : '#0284c7',
        }))}
        language={language}
        emptyLabel={emptyLabel}
      />
    </div>
  );
}

export function CatalogStatisticsView({
  data,
  language,
}: {
  data: CatalogStatisticsData;
  language: Language;
}) {
  const ts = translations[language].adminStatistics;
  const tcs = ts.catalogSection;

  const inventoryEntries = Object.entries(data.inventory);
  const qualityEntries = Object.entries(data.quality);

  const categoryCols: ResponsiveTableColumn<TopCategoryStatRow>[] = [
    {
      key: 'name',
      title: tcs.nameCol,
      primaryOnMobile: true,
      render: (row) => {
        const localized =
          language === 'ru'
            ? row.name_ru || row.name || row.name_uz
            : row.name_uz || row.name || row.name_ru;
        return <span className="font-medium">{localized || ts.noData}</span>;
      },
    },
    {
      key: 'slug',
      title: tcs.slugCol,
      render: (row) => <span className="font-mono text-xs text-slate-500">{row.slug || ts.noData}</span>,
    },
    {
      key: 'active',
      title: tcs.statusCol,
      render: (row) => (
        <span className={row.active ? 'text-[#15803d] font-medium' : 'text-slate-500'}>
          {row.active ? tcs.activeLabel : tcs.inactiveLabel}
        </span>
      ),
    },
    {
      key: 'product_count',
      title: tcs.productsCountCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => (
        <span className="font-semibold">{formatInteger(row.product_count, language)}</span>
      ),
    },
  ];

  const brandCols: ResponsiveTableColumn<TopBrandStatRow>[] = [
    {
      key: 'name',
      title: tcs.nameCol,
      primaryOnMobile: true,
      render: (row) => <span className="font-medium">{row.name || ts.noData}</span>,
    },
    {
      key: 'slug',
      title: tcs.slugCol,
      render: (row) => <span className="font-mono text-xs text-slate-500">{row.slug || ts.noData}</span>,
    },
    {
      key: 'active',
      title: tcs.statusCol,
      render: (row) => (
        <span className={row.active ? 'text-[#15803d] font-medium' : 'text-slate-500'}>
          {row.active ? tcs.activeLabel : tcs.inactiveLabel}
        </span>
      ),
    },
    {
      key: 'product_count',
      title: tcs.productsCountCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => (
        <span className="font-semibold">{formatInteger(row.product_count, language)}</span>
      ),
    },
  ];

  const translationCols: ResponsiveTableColumn<KeyCountItem>[] = [
    {
      key: 'language',
      title: tcs.languageCol,
      primaryOnMobile: true,
      render: (row) => getStatLabel(row.key, language),
    },
    {
      key: 'count',
      title: tcs.recordsCountCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => <span className="font-semibold">{formatInteger(row.count, language)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Inventory */}
      <SectionPanel title={tcs.inventoryTitle} rightBadge={ts.currentStateBadge}>
        {inventoryEntries.length === 0 ? (
          <p className="text-sm text-slate-500">{ts.emptyTitle}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {inventoryEntries.map(([key, value]) => (
              <StatKpiCard
                key={key}
                label={getStatLabel(key, language)}
                value={formatInteger(value, language)}
                scope="current"
                periodLabel=""
                currentStateLabel={ts.currentStateBadge}
              />
            ))}
          </div>
        )}
      </SectionPanel>

      {/* Catalog Quality */}
      <SectionPanel title={tcs.qualityTitle} rightBadge={ts.currentStateBadge}>
        {qualityEntries.length === 0 ? (
          <p className="text-sm text-slate-500">{ts.emptyTitle}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {qualityEntries.map(([key, value]) => (
              <StatKpiCard
                key={key}
                label={getStatLabel(key, language)}
                value={formatInteger(value, language)}
                scope="current"
                periodLabel=""
                currentStateLabel={ts.currentStateBadge}
                tone={value > 0 ? 'warning' : 'default'}
              />
            ))}
          </div>
        )}
      </SectionPanel>

      {/* Status & Kind Breakdowns */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">
            {tcs.distributionsTitle}
          </h2>
          <span className="text-xs font-medium text-slate-500">{ts.currentStateBadge}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DistributionGroupCard
            title={tcs.productStatuses}
            items={data.product_statuses}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
          <DistributionGroupCard
            title={tcs.productKinds}
            items={data.product_kinds}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
          <DistributionGroupCard
            title={tcs.variantStatuses}
            items={data.variant_statuses}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
          <DistributionGroupCard
            title={tcs.categoryStatuses}
            items={data.category_statuses}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
          <DistributionGroupCard
            title={tcs.brandStatuses}
            items={data.brand_statuses}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </div>
      </section>

      {/* Translation Coverage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionPanel title={tcs.productTranslationsTitle} rightBadge={ts.currentStateBadge}>
          <ResponsiveExpandableTable
            rows={data.product_translation_coverage}
            rowKey={(row, idx) => `${row.key}-${idx}`}
            columns={translationCols}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>
        <SectionPanel title={tcs.categoryTranslationsTitle} rightBadge={ts.currentStateBadge}>
          <ResponsiveExpandableTable
            rows={data.category_translation_coverage}
            rowKey={(row, idx) => `${row.key}-${idx}`}
            columns={translationCols}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>
      </div>

      {/* Top Categories & Top Brands */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title={tcs.topCategoriesTitle} rightBadge={ts.currentStateBadge}>
          <ResponsiveExpandableTable
            rows={data.top_categories}
            rowKey={(row, idx) => `${row.id || row.slug}-${idx}`}
            columns={categoryCols}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>
        <SectionPanel title={tcs.topBrandsTitle} rightBadge={ts.currentStateBadge}>
          <ResponsiveExpandableTable
            rows={data.top_brands}
            rowKey={(row, idx) => `${row.id || row.slug}-${idx}`}
            columns={brandCols}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>
      </div>
    </div>
  );
}

/* ============================================================================
 * 4. CUSTOMERS SECTION
 * ========================================================================== */
export function CustomersStatisticsView({
  data,
  language,
  periodLabel,
}: {
  data: CustomersStatisticsData;
  language: Language;
  periodLabel: string;
}) {
  const ts = translations[language].adminStatistics;
  const tcu = ts.customersSection;
  const accountEntries = Object.entries(data.accounts);

  return (
    <div className="space-y-6">
      <SectionPanel title={tcu.accountsTitle}>
        {accountEntries.length === 0 ? (
          <p className="text-sm text-slate-500">{ts.emptyTitle}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {accountEntries.map(([key, value]) => {
              const isPeriod = key.toLowerCase().includes('new') || key.toLowerCase().includes('registration');
              return (
                <StatKpiCard
                  key={key}
                  label={getStatLabel(key, language)}
                  value={formatInteger(value, language)}
                  scope={isPeriod ? 'period' : 'current'}
                  periodLabel={periodLabel}
                  currentStateLabel={ts.currentStateBadge}
                />
              );
            })}
          </div>
        )}
      </SectionPanel>

      <SectionPanel title={tcu.dailyRegistrationsTitle} rightBadge={periodLabel}>
        <DailyTrendChart
          points={data.daily_registrations.map((pt) => ({ ...pt }))}
          language={language}
          allowSeriesToggle={false}
          series={[
            {
              key: 'registrations',
              label: ts.overview.series.registrations,
              color: '#0284c7',
              shape: 'square',
            },
          ]}
        />
      </SectionPanel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionPanel title={tcu.byRoleTitle} rightBadge={ts.currentStateBadge}>
          <HorizontalDistributionBars
            items={data.by_role.map((item) => ({
              key: item.key,
              label: getStatLabel(item.key, language),
              count: item.count,
              barColor: item.key === 'ADMIN' ? '#0f172a' : '#16a34a',
            }))}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>

        <SectionPanel title={tcu.byStatusTitle} rightBadge={ts.currentStateBadge}>
          <HorizontalDistributionBars
            items={data.by_status.map((item) => ({
              key: item.key,
              label: getStatLabel(item.key, language),
              count: item.count,
              barColor: item.key === 'BLOCKED' ? '#dc2626' : '#16a34a',
            }))}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>

        <SectionPanel title={tcu.byLanguageTitle} rightBadge={ts.currentStateBadge}>
          <HorizontalDistributionBars
            items={data.by_language.map((item) => ({
              key: item.key,
              label: getStatLabel(item.key, language),
              count: item.count,
              barColor: '#0284c7',
            }))}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>

        <SectionPanel title={tcu.orderFrequencyTitle} rightBadge={periodLabel}>
          <HorizontalDistributionBars
            items={data.order_frequency.map((item) => ({
              key: item.key,
              label: `${item.key} ${tcu.ordersBucketUnit}`,
              count: item.count,
              barColor: '#16a34a',
            }))}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>
      </div>
    </div>
  );
}

/* ============================================================================
 * 5. BRANCHES SECTION
 * ========================================================================== */
export function BranchesStatisticsView({
  data,
  language,
  periodLabel,
}: {
  data: BranchesStatisticsData;
  language: Language;
  periodLabel: string;
}) {
  const ts = translations[language].adminStatistics;
  const tbs = ts.branchesSection;

  const branchCols: ResponsiveTableColumn<BranchOrderStatRow>[] = [
    {
      key: 'branch',
      title: tbs.branchCol,
      primaryOnMobile: true,
      render: (row) => {
        const resolved =
          language === 'ru'
            ? row.branch_name_ru || row.branch_name || row.branch_name_uz
            : row.branch_name_uz || row.branch_name || row.branch_name_ru;
        if (!row.branch_id && !resolved) {
          return <span className="italic text-slate-500">{tbs.unassignedBranch}</span>;
        }
        return <span className="font-medium">{resolved || tbs.unassignedBranch}</span>;
      },
    },
    {
      key: 'method',
      title: tbs.methodCol,
      primaryOnMobile: true,
      render: (row) => getFulfillmentMethodLabel(row.fulfillment_method, language),
    },
    {
      key: 'currency',
      title: tbs.currencyCol,
      render: (row) => <span className="font-mono">{row.currency}</span>,
    },
    {
      key: 'total_orders',
      title: tbs.totalOrdersCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => formatInteger(row.total_orders, language),
    },
    {
      key: 'cancelled_orders',
      title: tbs.cancelledCol,
      align: 'right',
      render: (row) => formatInteger(row.cancelled_orders, language),
    },
    {
      key: 'completed_orders',
      title: tbs.completedCol,
      align: 'right',
      render: (row) => formatInteger(row.completed_orders, language),
    },
    {
      key: 'completed_amount',
      title: tbs.completedAmountCol,
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-[#15803d]">
          {formatPriceLabel(row.completed_amount, language, row.currency)}
        </span>
      ),
    },
    {
      key: 'shipping_amount',
      title: tbs.shippingAmountCol,
      align: 'right',
      render: (row) => formatPriceLabel(row.shipping_amount, language, row.currency),
    },
    {
      key: 'average_distance_km',
      title: tbs.avgDistanceCol,
      align: 'right',
      render: (row) =>
        row.average_distance_km === null
          ? ts.noData
          : formatDistanceKm(row.average_distance_km, language),
    },
    {
      key: 'average_rating',
      title: tbs.avgRatingCol,
      align: 'right',
      render: (row) =>
        row.average_rating === null
          ? ts.noData
          : formatDecimal(row.average_rating, language, 2),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionPanel title={tbs.byStatusTitle} rightBadge={ts.currentStateBadge}>
          <HorizontalDistributionBars
            items={data.by_status.statuses.map((item) => ({
              key: item.key,
              label: getStatLabel(item.key, language),
              count: item.count,
              barColor:
                item.key.toUpperCase() === 'ACTIVE'
                  ? '#16a34a'
                  : item.key.toUpperCase() === 'ARCHIVED'
                    ? '#64748b'
                    : '#d97706',
            }))}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>

        <SectionPanel title={tbs.capabilitiesTitle} rightBadge={ts.currentStateBadge}>
          <HorizontalDistributionBars
            items={data.by_status.capabilities.map((item) => ({
              key: item.key,
              label: getStatLabel(item.key, language),
              count: item.count,
              barColor: '#0284c7',
            }))}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>
      </div>

      <SectionPanel
        title={tbs.branchOrdersTitle}
        subtitle={ts.ordersSection.multiCurrencyNote}
        rightBadge={periodLabel}
      >
        <ResponsiveExpandableTable
          rows={data.branch_orders}
          rowKey={(row, idx) =>
            `${row.branch_id ?? 'unassigned'}-${row.fulfillment_method}-${row.currency}-${idx}`
          }
          columns={branchCols}
          language={language}
          emptyLabel={ts.emptyTitle}
        />
      </SectionPanel>
    </div>
  );
}

/* ============================================================================
 * 6. ENGAGEMENT SECTION
 * ========================================================================== */
export function EngagementStatisticsView({
  data,
  language,
  periodLabel,
}: {
  data: EngagementStatisticsData;
  language: Language;
  periodLabel: string;
}) {
  const ts = translations[language].adminStatistics;
  const tes = ts.engagementSection;

  const commentEntries = Object.entries(data.comments);
  const likeEntries = Object.entries(data.current_likes);

  const buildProductCols = (countTitle: string): ResponsiveTableColumn<EngagementProductRow>[] => [
    {
      key: 'title',
      title: tes.productCol,
      primaryOnMobile: true,
      render: (row) => {
        const resolved =
          language === 'ru'
            ? row.title_ru || row.title || row.title_uz
            : row.title_uz || row.title || row.title_ru;
        return <span className="font-medium">{resolved || row.slug || ts.noData}</span>;
      },
    },
    {
      key: 'slug',
      title: ts.catalogSection.slugCol,
      render: (row) => <span className="font-mono text-xs text-slate-500">{row.slug || ts.noData}</span>,
    },
    {
      key: 'count',
      title: countTitle,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => <span className="font-semibold">{formatInteger(row.count, language)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Comments (Period) */}
      <SectionPanel title={tes.commentsTitle} rightBadge={periodLabel}>
        {commentEntries.length === 0 ? (
          <p className="text-sm text-slate-500">{ts.emptyTitle}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {commentEntries.map(([key, value]) => (
              <StatKpiCard
                key={key}
                label={getStatLabel(key, language)}
                value={formatInteger(value, language)}
                scope="period"
                periodLabel={periodLabel}
                currentStateLabel={ts.currentStateBadge}
              />
            ))}
          </div>
        )}
      </SectionPanel>

      {/* Current Likes (Strictly Current State, unaffected by date filter) */}
      <SectionPanel
        title={tes.likesTitle}
        subtitle={tes.currentLikesSubtitle}
        rightBadge={ts.currentStateBadge}
      >
        {likeEntries.length === 0 ? (
          <p className="text-sm text-slate-500">{ts.emptyTitle}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {likeEntries.map(([key, value]) => (
              <StatKpiCard
                key={key}
                label={getStatLabel(key, language)}
                value={formatInteger(value, language)}
                scope="current"
                periodLabel={periodLabel}
                currentStateLabel={ts.currentStateBadge}
              />
            ))}
          </div>
        )}
      </SectionPanel>

      {/* Daily Comments Chart */}
      <SectionPanel title={tes.dailyCommentsTitle} rightBadge={periodLabel}>
        <DailyTrendChart
          points={data.daily_comments.map((pt) => ({ ...pt }))}
          language={language}
          allowSeriesToggle={false}
          series={[
            {
              key: 'comments',
              label: ts.overview.series.comments,
              color: '#d97706',
              shape: 'diamond',
            },
          ]}
        />
      </SectionPanel>

      {/* Top Liked & Commented Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title={tes.topLikedTitle} rightBadge={ts.currentStateBadge}>
          <ResponsiveExpandableTable
            rows={data.top_liked_products}
            rowKey={(row, idx) => `${row.product_id}-${idx}`}
            columns={buildProductCols(tes.likesCountCol)}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>

        <SectionPanel title={tes.topCommentedTitle} rightBadge={periodLabel}>
          <ResponsiveExpandableTable
            rows={data.top_commented_products}
            rowKey={(row, idx) => `${row.product_id}-${idx}`}
            columns={buildProductCols(tes.commentsCountCol)}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>
      </div>
    </div>
  );
}

/* ============================================================================
 * 7. OPERATIONS SECTION
 * ========================================================================== */
export function OperationsStatisticsView({
  data,
  language,
  periodLabel,
}: {
  data: OperationsStatisticsData;
  language: Language;
  periodLabel: string;
}) {
  const ts = translations[language].adminStatistics;
  const top = ts.operationsSection;

  const mediaCols: ResponsiveTableColumn<MediaByTypeRow>[] = [
    {
      key: 'media_type',
      title: top.mediaTypeCol,
      primaryOnMobile: true,
      render: (row) => getStatLabel(row.media_type, language),
    },
    {
      key: 'file_count',
      title: top.filesCountCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => formatInteger(row.file_count, language),
    },
    {
      key: 'total_bytes',
      title: top.totalSizeCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => (
        <span className="font-semibold">{formatBytes(row.total_bytes, language)}</span>
      ),
    },
  ];

  const verifCols: ResponsiveTableColumn<VerificationCodeStatRow>[] = [
    {
      key: 'purpose',
      title: top.purposeCol,
      primaryOnMobile: true,
      render: (row) => getStatLabel(row.purpose, language),
    },
    {
      key: 'issued',
      title: top.issuedCol,
      align: 'right',
      primaryOnMobile: true,
      render: (row) => formatInteger(row.issued, language),
    },
    {
      key: 'used',
      title: top.usedCol,
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-[#15803d]">{formatInteger(row.used, language)}</span>
      ),
    },
    {
      key: 'expired',
      title: top.expiredCol,
      align: 'right',
      render: (row) => formatInteger(row.expired, language),
    },
  ];

  const queueBlocks = [
    { title: top.notificationsQueueTitle, metrics: data.notifications },
    { title: top.emailQueueTitle, metrics: data.email_queue },
    { title: top.telegramQueueTitle, metrics: data.telegram_queue },
  ];

  return (
    <div className="space-y-6">
      {/* Site Configuration Status */}
      <SectionPanel title={top.siteTitle} rightBadge={ts.currentStateBadge}>
        {data.site.length === 0 ? (
          <p className="text-sm text-slate-500">{ts.emptyTitle}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.site.map((entry) => {
              let displayValue: string;
              let tone: 'default' | 'accent' | 'warning' = 'default';

              if (entry.configured !== undefined) {
                displayValue = entry.configured ? top.configuredLabel : top.notConfiguredLabel;
                tone = entry.configured ? 'accent' : 'warning';
              } else if (entry.items && entry.items.length > 0) {
                displayValue = entry.items
                  .map((item) => getStatLabel(item, language))
                  .join(', ');
              } else if (entry.count !== undefined) {
                displayValue = formatInteger(entry.count, language);
              } else if (entry.rawValue !== undefined && entry.rawValue !== null) {
                displayValue = String(entry.rawValue);
              } else {
                displayValue = ts.noData;
              }

              return (
                <StatKpiCard
                  key={entry.key}
                  label={getStatLabel(entry.key, language)}
                  value={displayValue}
                  scope="current"
                  periodLabel={periodLabel}
                  currentStateLabel={ts.currentStateBadge}
                  tone={tone}
                />
              );
            })}
          </div>
        )}
      </SectionPanel>

      {/* Queues & Notifications */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">{top.queuesTitle}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {queueBlocks.map((block) => {
            const entries = Object.entries(block.metrics);
            return (
              <div
                key={block.title}
                className="rounded-xl border border-[#e6e4dd] bg-white p-4 sm:p-5 space-y-3"
              >
                <h3 className="text-sm font-semibold text-slate-900">{block.title}</h3>
                {entries.length === 0 ? (
                  <p className="text-xs text-slate-500">{ts.emptyTitle}</p>
                ) : (
                  <dl className="divide-y divide-[#f2f0ea]">
                    {entries.map(([k, v]) => {
                      const isPeriodMetric = k.toLowerCase().includes('period');
                      return (
                        <div
                          key={k}
                          className="py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <dt className="text-slate-600">
                            <span>{getStatLabel(k, language)}</span>
                            <span className="ml-1.5 text-[11px] text-slate-400">
                              ({isPeriodMetric ? periodLabel : ts.currentStateBadge})
                            </span>
                          </dt>
                          <dd className="font-bold text-slate-900 tabular-nums shrink-0">
                            {formatInteger(v, language)}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Media by Type & Verification Codes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title={top.mediaTitle} rightBadge={ts.currentStateBadge}>
          <ResponsiveExpandableTable
            rows={data.media_by_type}
            rowKey={(row, idx) => `${row.media_type}-${idx}`}
            columns={mediaCols}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>

        <SectionPanel title={top.verificationTitle} rightBadge={periodLabel}>
          <ResponsiveExpandableTable
            rows={data.verification_codes}
            rowKey={(row, idx) => `${row.purpose}-${idx}`}
            columns={verifCols}
            language={language}
            emptyLabel={ts.emptyTitle}
          />
        </SectionPanel>
      </div>
    </div>
  );
}
