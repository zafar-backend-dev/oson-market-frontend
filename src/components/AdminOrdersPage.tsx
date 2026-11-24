import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  Input,
  Pagination,
  Result,
  Select,
  Skeleton,
  Spin,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRight, Bell, ClipboardList, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { branchApi } from '../services/branchApi';
import { orderApi } from '../services/orderApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import { getAdminBranchDisplayName } from '../types/branch';
import type { AdminOrderSummary, OrderStatus } from '../types/order';
import {
  ORDER_STATUS_LIST,
  formatOrderDateTime,
  getFulfillmentMethodLabel,
  getOrderStatusLabel,
  getOrderStatusTone,
} from '../utils/orderStatus';
import { formatPriceLabel } from '../utils/price';
import { isProfileComplete } from '../utils/validation';
import { StoreHeader } from './StoreHeader';

interface AdminOrdersPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile;
  session: AuthSession;
  onProfileUpdated: (nextProfile: UserProfile) => void;
  onUnauthorized: (message?: string) => void;
  onLogout: () => void;
}

interface BackendForbiddenState {
  endpoint?: string;
  message: string;
}

export function AdminOrdersPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminOrdersPageProps) {
  const navigate = useNavigate();
  const { subscribeOrderLiveUpdate } = useNotifications();
  const t = translations[language];
  const tao = t.adminOrders;
  const to = t.orders;
  const tr = t.adminTelegramRecipients;

  const isAdmin = profile.role === 'ADMIN';

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [branchNames, setBranchNames] = useState<Record<string, string>>({});

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [appliedOrderNumber, setAppliedOrderNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  const hasAccessToken = Boolean(session.accessToken);

  useEffect(() => {
    if (isAdmin) {
      setVerifyingProfile(false);
      return;
    }

    let cancelled = false;
    setVerifyingProfile(true);

    (async () => {
      try {
        const freshProfile = await authApi.getProfile(session.accessToken, language);
        if (cancelled) return;
        if (freshProfile.role !== profile.role || freshProfile.updatedAt !== profile.updatedAt) {
          onProfileUpdated(freshProfile);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint: error.endpoint || 'GET /api/profile',
              message: error.message,
            });
          }
        }
      } finally {
        if (!cancelled) {
          setVerifyingProfile(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, hasAccessToken]);

  // Load branches lookup map for displaying branch names
  useEffect(() => {
    if (!isAdmin || !hasAccessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await branchApi.listAdminBranches(
          session.accessToken,
          { page: 0, size: 100 },
          language,
        );
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const branch of res.content ?? []) {
          map[branch.id] = getAdminBranchDisplayName(branch, language);
        }
        setBranchNames(map);
      } catch {
        // Non-fatal fallback: branchId will still display
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, hasAccessToken, language]);

  const loadOrders = useCallback(
    async (
      targetPage: number,
      targetSize: number,
      targetStatus: string,
      targetOrderNumber: string,
      silent = false,
    ) => {
      if (!isAdmin) return;
      if (!silent) {
        setLoading(true);
        setPageError(null);
        setForbiddenState(null);
      }

      try {
        const res = await orderApi.listAdminOrders(
          session.accessToken,
          {
            page: targetPage,
            size: targetSize,
            status: targetStatus !== 'ALL' ? targetStatus : undefined,
            orderNumber: targetOrderNumber.trim() || undefined,
          },
          language,
        );
        const content = Array.isArray(res.content) ? res.content : [];
        setOrders(content);
        setTotalElements(res.page?.totalElements ?? content.length);
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint: error.endpoint || 'GET /api/admin/orders',
              message: error.message,
            });
            return;
          }
          if (!silent) setPageError(error.message);
        } else if (!silent) {
          setPageError(
            language === 'ru'
              ? 'Не удалось загрузить заказы.'
              : 'Buyurtmalarni yuklab bo‘lmadi.',
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, language, onUnauthorized, hasAccessToken],
  );

  useEffect(() => {
    if (isAdmin) {
      void loadOrders(page, size, statusFilter, appliedOrderNumber);
    }
  }, [isAdmin, loadOrders, page, size, statusFilter, appliedOrderNumber]);

  // Live WebSocket / polling fallback sync
  useEffect(() => {
    if (!isAdmin) return;
    return subscribeOrderLiveUpdate(() => {
      void loadOrders(page, size, statusFilter, appliedOrderNumber, true);
    });
  }, [isAdmin, subscribeOrderLiveUpdate, loadOrders, page, size, statusFilter, appliedOrderNumber]);

  const handleStatusFilterChange = (nextStatus: string) => {
    setPage(0);
    setStatusFilter(nextStatus);
  };

  const handleOrderNumberSearch = (value: string) => {
    setPage(0);
    setAppliedOrderNumber(value.trim());
  };

  const handleClearFilters = () => {
    setPage(0);
    setStatusFilter('ALL');
    setOrderNumberInput('');
    setAppliedOrderNumber('');
  };

  const hasActiveFilters = statusFilter !== 'ALL' || appliedOrderNumber.length > 0;

  const resolveBranchLabel = (record: AdminOrderSummary): string => {
    if (record.branchName?.trim()) return record.branchName.trim();
    if (record.branchId && branchNames[record.branchId]) return branchNames[record.branchId];
    return record.branchId?.trim() || '—';
  };

  const columns: ColumnsType<AdminOrderSummary> = [
    {
      title: tao.columns.orderNumber,
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (_: unknown, record) => (
        <button
          type="button"
          onClick={() => navigate(`/admin/orders/${encodeURIComponent(record.id)}`)}
          className="font-mono font-semibold text-slate-900 hover:text-[#15803d] tabular-nums cursor-pointer text-left"
        >
          {record.orderNumber}
        </button>
      ),
    },
    {
      title: tao.columns.placedAt,
      dataIndex: 'placedAt',
      key: 'placedAt',
      render: (placedAt: string) => (
        <span className="text-xs text-slate-600 tabular-nums whitespace-nowrap">
          {formatOrderDateTime(placedAt, language)}
        </span>
      ),
    },
    {
      title: tao.columns.status,
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus | string) => {
        const tone = getOrderStatusTone(status);
        return (
          <span className={`text-xs font-semibold whitespace-nowrap ${tone.text}`}>
            {getOrderStatusLabel(status, language)}
          </span>
        );
      },
    },
    {
      title: tao.columns.fulfillment,
      key: 'fulfillment',
      render: (_: unknown, record) => (
        <div className="text-xs text-slate-700 space-y-0.5 max-w-[180px]">
          <div className="font-medium text-slate-900">
            {getFulfillmentMethodLabel(record.fulfillmentMethod, language)}
          </div>
          <div className="text-slate-500 truncate">{resolveBranchLabel(record)}</div>
        </div>
      ),
    },
    {
      title: tao.columns.payment,
      key: 'payment',
      render: (_: unknown, record) =>
        record.paidAt ? (
          <div className="text-xs space-y-0.5">
            <div className="font-semibold text-[#15803d]">{tao.paidBadge}</div>
            <div className="text-slate-500 tabular-nums whitespace-nowrap">
              {formatOrderDateTime(record.paidAt, language)}
            </div>
          </div>
        ) : (
          <span className="text-xs font-medium text-amber-700">{tao.unpaidBadge}</span>
        ),
    },
    {
      title: tao.columns.contact,
      key: 'contact',
      render: (_: unknown, record) => (
        <div className="text-xs text-slate-600 space-y-0.5 max-w-[180px]">
          <div className="font-mono tabular-nums truncate">
            {record.phone?.trim() || tao.noContactValue}
          </div>
          <div className="font-mono text-slate-500 truncate">
            {record.telegramAddress?.trim() || tao.noContactValue}
          </div>
        </div>
      ),
    },
    {
      title: tao.columns.grandTotal,
      dataIndex: 'grandTotal',
      key: 'grandTotal',
      align: 'right',
      render: (_: unknown, record) => (
        <span className="font-bold text-slate-900 tabular-nums whitespace-nowrap">
          {formatPriceLabel(record.grandTotal, language, record.currency)}
        </span>
      ),
    },
    {
      title: tao.columns.actions,
      key: 'actions',
      align: 'right',
      render: (_: unknown, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/admin/orders/${encodeURIComponent(record.id)}`)}
          className="!px-0 !font-semibold !text-[#16a34a] hover:!text-[#15803d] inline-flex items-center gap-1"
        >
          <span>{tao.viewDetailsAction}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  const profileComplete = isProfileComplete(profile);

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {verifyingProfile ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-8 flex items-center justify-center gap-3">
            <Spin />
            <span className="text-sm font-medium text-slate-600">{tr.checkingPermissions}</span>
          </div>
        ) : !isAdmin ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tr.userRoleBlockedTitle}
              subTitle={tr.userRoleBlockedSubtitle}
              extra={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => navigate('/')}
                    className="!min-h-[44px]"
                  >
                    {tr.backToStore}
                  </Button>
                  <Button size="large" onClick={onLogout} className="!min-h-[44px]">
                    {tr.switchAccountButton}
                  </Button>
                </div>
              }
            />
          </div>
        ) : forbiddenState ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tr.backendForbiddenTitle}
              subTitle={
                <div className="space-y-2 max-w-lg mx-auto">
                  <p>{tr.backendForbiddenSubtitle}</p>
                  {forbiddenState.message && (
                    <p className="text-sm font-medium text-slate-700">{forbiddenState.message}</p>
                  )}
                  {forbiddenState.endpoint && (
                    <div className="text-xs font-mono text-slate-500">
                      {tr.backendForbiddenEndpointLabel}: {forbiddenState.endpoint}
                    </div>
                  )}
                </div>
              }
              extra={
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/')}
                  className="!min-h-[44px]"
                >
                  {tr.backToStore}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Header Bar */}
            <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{t.brandName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{tr.menuGroupLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {tao.totalCountLabel}: {totalElements}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
                  {tao.title}
                </h1>
                <p className="text-sm text-slate-600">{tao.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  size="large"
                  icon={<Bell className="w-4 h-4" />}
                  onClick={() => navigate('/admin/orders/telegram-recipients')}
                  className="!min-h-[44px]"
                >
                  {tao.telegramSettingsButton}
                </Button>
                <Button
                  size="large"
                  icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                  onClick={() => void loadOrders(page, size, statusFilter, appliedOrderNumber)}
                  disabled={loading}
                  className="!min-h-[44px]"
                >
                  {tao.refreshButton}
                </Button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="w-full md:w-64 shrink-0">
                <Select
                  size="large"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  aria-label={tao.statusFilterLabel}
                  className="w-full"
                  options={[
                    { value: 'ALL', label: tao.allStatusesOption },
                    ...ORDER_STATUS_LIST.map((st) => ({
                      value: st,
                      label: getOrderStatusLabel(st, language),
                    })),
                  ]}
                />
              </div>

              <div className="flex-1 min-w-0">
                <Input.Search
                  size="large"
                  allowClear
                  value={orderNumberInput}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setOrderNumberInput(nextVal);
                    if (nextVal.trim() === '' && appliedOrderNumber !== '') {
                      handleOrderNumberSearch('');
                    }
                  }}
                  onSearch={handleOrderNumberSearch}
                  prefix={<Search className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder={tao.orderNumberPlaceholder}
                />
              </div>

              {hasActiveFilters && (
                <Button size="large" onClick={handleClearFilters} className="!min-h-[44px] shrink-0">
                  {tao.clearFilters}
                </Button>
              )}
            </section>

            {pageError && (
              <Alert
                type="error"
                showIcon
                title={pageError}
                action={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => void loadOrders(page, size, statusFilter, appliedOrderNumber)}
                  >
                    {t.catalog.retryButton}
                  </Button>
                }
              />
            )}

            {/* Desktop Table + Mobile Compact Cards */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl overflow-hidden">
              {loading && orders.length === 0 ? (
                <div className="p-6">
                  <Skeleton active paragraph={{ rows: 5 }} />
                </div>
              ) : orders.length === 0 ? (
                <div className="p-8 sm:p-12">
                  <Empty
                    image={<ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />}
                    description={
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900">{tao.emptyTitle}</div>
                        <div className="text-sm text-slate-500 max-w-md mx-auto">
                          {tao.emptyDescription}
                        </div>
                      </div>
                    }
                  >
                    {hasActiveFilters && (
                      <Button
                        type="primary"
                        size="large"
                        onClick={handleClearFilters}
                        className="!min-h-[44px]"
                      >
                        {tao.clearFilters}
                      </Button>
                    )}
                  </Empty>
                </div>
              ) : (
                <>
                  <div className="hidden lg:block">
                    <Table<AdminOrderSummary>
                      rowKey="id"
                      columns={columns}
                      dataSource={orders}
                      loading={loading}
                      pagination={false}
                    />
                  </div>

                  <div className="lg:hidden divide-y divide-[#f2f0ea]">
                    {orders.map((order) => {
                      const tone = getOrderStatusTone(order.status);

                      return (
                        <div
                          key={order.id}
                          className="p-4 space-y-2.5 hover:bg-[#faf9f5] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-mono font-bold text-slate-900 tabular-nums truncate">
                                {order.orderNumber}
                              </div>
                              <div className="text-xs text-slate-500 tabular-nums">
                                {formatOrderDateTime(order.placedAt, language)}
                              </div>
                            </div>

                            <span className={`text-xs font-semibold shrink-0 ${tone.text}`}>
                              {getOrderStatusLabel(order.status, language)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                            <span className="font-medium text-slate-800">
                              {getFulfillmentMethodLabel(order.fulfillmentMethod, language)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{resolveBranchLabel(order)}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                order.paidAt
                                  ? 'font-semibold text-[#15803d]'
                                  : 'font-medium text-amber-700'
                              }
                            >
                              {order.paidAt ? tao.paidBadge : tao.unpaidBadge}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 font-mono truncate">
                            {order.phone?.trim() || tao.noContactValue} ·{' '}
                            {order.telegramAddress?.trim() || tao.noContactValue}
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <span className="font-bold text-slate-900 text-sm tabular-nums">
                              {formatPriceLabel(order.grandTotal, language, order.currency)}
                            </span>

                            <Button
                              size="small"
                              onClick={() => navigate(`/admin/orders/${encodeURIComponent(order.id)}`)}
                              className="!min-h-[40px] !px-3"
                            >
                              {tao.viewDetailsAction}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalElements > size && (
                    <div className="border-t border-[#f2f0ea] px-4 py-3.5 flex justify-end">
                      <Pagination
                        current={page + 1}
                        pageSize={size}
                        total={totalElements}
                        showSizeChanger
                        pageSizeOptions={['10', '20', '50']}
                        onChange={(nextPage, nextSize) => {
                          setPage(nextPage - 1);
                          setSize(nextSize);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
