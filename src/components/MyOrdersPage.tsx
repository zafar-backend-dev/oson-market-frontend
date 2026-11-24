import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Empty, Pagination, Skeleton, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRight, ClipboardList, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import { orderApi } from '../services/orderApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import type { CustomerOrderResponse, OrderStatus } from '../types/order';
import {
  formatOrderDateTime,
  getOrderStatusLabel,
  getOrderStatusTone,
} from '../utils/orderStatus';
import { formatPriceLabel } from '../utils/price';
import { isProfileComplete } from '../utils/validation';
import { StoreHeader } from './StoreHeader';

interface MyOrdersPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile;
  session: AuthSession;
  onUnauthorized: (message?: string) => void;
  onLogout: () => void;
}

export function MyOrdersPage({
  language,
  onLanguageChange,
  profile,
  session,
  onUnauthorized,
  onLogout,
}: MyOrdersPageProps) {
  const navigate = useNavigate();
  const { subscribeOrderLiveUpdate } = useNotifications();
  const t = translations[language];
  const to = t.orders;
  const tc = t.catalog;

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [orders, setOrders] = useState<CustomerOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasAccessToken = Boolean(session.accessToken);

  const loadOrders = useCallback(
    async (targetPage: number, targetSize: number, silent = false) => {
      if (!silent) {
        setLoading(true);
        setErrorMessage(null);
      }
      try {
        const res = await orderApi.listOrders(
          session.accessToken,
          { page: targetPage, size: targetSize },
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
          if (!silent) setErrorMessage(error.message);
        } else if (!silent) {
          setErrorMessage(
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
    [language, onUnauthorized, hasAccessToken],
  );

  useEffect(() => {
    void loadOrders(page, size);
  }, [loadOrders, page, size]);

  useEffect(() => {
    return subscribeOrderLiveUpdate(() => {
      void loadOrders(page, size, true);
    });
  }, [subscribeOrderLiveUpdate, loadOrders, page, size]);

  const columns: ColumnsType<CustomerOrderResponse> = [
    {
      title: to.columns.orderNumber,
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (_: unknown, record) => (
        <button
          type="button"
          onClick={() => navigate(`/orders/${encodeURIComponent(record.id)}`)}
          className="font-mono font-semibold text-slate-900 hover:text-[#15803d] tabular-nums cursor-pointer text-left"
        >
          {record.orderNumber}
        </button>
      ),
    },
    {
      title: to.columns.placedAt,
      dataIndex: 'placedAt',
      key: 'placedAt',
      render: (placedAt: string) => (
        <span className="text-sm text-slate-600 tabular-nums whitespace-nowrap">
          {formatOrderDateTime(placedAt, language)}
        </span>
      ),
    },
    {
      title: to.columns.status,
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
      title: to.columns.itemsCount,
      key: 'itemsCount',
      render: (_: unknown, record) => {
        const units = record.items.reduce((sum, item) => sum + item.quantity, 0);
        return (
          <span className="text-sm text-slate-700 tabular-nums whitespace-nowrap">
            {units} {tc.cartItemsCountSuffix}
          </span>
        );
      },
    },
    {
      title: to.columns.grandTotal,
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
      title: to.columns.actions,
      key: 'actions',
      align: 'right',
      render: (_: unknown, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/orders/${encodeURIComponent(record.id)}`)}
          className="!px-0 !font-semibold !text-[#16a34a] hover:!text-[#15803d] inline-flex items-center gap-1"
        >
          <span>{to.viewDetailsAction}</span>
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
        <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{t.brandName}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {to.totalCountLabel}: {totalElements}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
              {to.myOrdersTitle}
            </h1>
            <p className="text-sm text-slate-600">{to.myOrdersSubtitle}</p>
          </div>

          <Button
            size="large"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => void loadOrders(page, size)}
            disabled={loading}
            className="!min-h-[44px] shrink-0"
          >
            {to.refreshButton}
          </Button>
        </div>

        {errorMessage && (
          <Alert
            type="error"
            showIcon
            title={errorMessage}
            action={
              <Button
                type="primary"
                size="small"
                onClick={() => void loadOrders(page, size)}
              >
                {tc.retryButton}
              </Button>
            }
          />
        )}

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
                    <div className="font-semibold text-slate-900">{to.emptyTitle}</div>
                    <div className="text-sm text-slate-500 max-w-md mx-auto">
                      {to.emptyDescription}
                    </div>
                  </div>
                }
              >
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/')}
                  className="!min-h-[44px]"
                >
                  {to.goToCatalogButton}
                </Button>
              </Empty>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table<CustomerOrderResponse>
                  rowKey="id"
                  columns={columns}
                  dataSource={orders}
                  loading={loading}
                  pagination={false}
                />
              </div>

              <div className="md:hidden divide-y divide-[#f2f0ea]">
                {orders.map((order) => {
                  const tone = getOrderStatusTone(order.status);
                  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <div
                      key={order.id}
                      className="p-4 space-y-2.5 hover:bg-[#faf9f5] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-mono font-bold text-slate-900 tabular-nums">
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

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="text-xs text-slate-600 tabular-nums">
                          {units} {tc.cartItemsCountSuffix} ·{' '}
                          <span className="font-bold text-slate-900 text-sm">
                            {formatPriceLabel(order.grandTotal, language, order.currency)}
                          </span>
                        </div>
                        <Button
                          size="small"
                          onClick={() => navigate(`/orders/${encodeURIComponent(order.id)}`)}
                          className="!min-h-[40px] !px-3"
                        >
                          {to.viewDetailsAction}
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
      </main>
    </div>
  );
}
