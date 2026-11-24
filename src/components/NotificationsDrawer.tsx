import { Alert, Button, Drawer, Empty, Skeleton } from 'antd';
import { Bell, ChevronRight, RefreshCw, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { translations } from '../i18n/translations';
import type { Language } from '../types/auth';
import type { OrderNotificationItem } from '../types/order';
import {
  formatOrderDateTime,
  getOrderStatusLabel,
  getOrderStatusTone,
} from '../utils/orderStatus';

interface NotificationsDrawerProps {
  language: Language;
}

export function NotificationsDrawer({ language }: NotificationsDrawerProps) {
  const navigate = useNavigate();
  const t = translations[language];
  const tn = t.notificationsPanel;

  const {
    unreadCount,
    items,
    pageMeta,
    loading,
    loadingMore,
    errorMessage,
    drawerOpen,
    closeDrawer,
    refreshUnreadCount,
    loadNotifications,
    markNotificationAsRead,
  } = useNotifications();

  const hasMore = Boolean(pageMeta && pageMeta.number + 1 < pageMeta.totalPages);

  const handleNotificationClick = async (
    notification: OrderNotificationItem,
    focusRating = false,
  ) => {
    if (notification.readAt === null) {
      void markNotificationAsRead(notification);
    }
    closeDrawer();
    const shouldFocusRating = focusRating || notification.action === 'RATE_SERVICE';
    const targetPath = shouldFocusRating
      ? `/orders/${encodeURIComponent(notification.orderId)}#rate-service`
      : `/orders/${encodeURIComponent(notification.orderId)}`;
    navigate(targetPath, {
      state: {
        fromNotificationId: notification.id,
        focusRating: shouldFocusRating,
        triggeredAt: Date.now(),
      },
    });
  };

  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      size={440}
      title={
        <div className="flex items-center justify-between gap-3 pr-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-[#16a34a] shrink-0" />
            <span className="font-display font-bold text-slate-900 truncate">
              {tn.drawerTitle}
            </span>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-[#15803d] tabular-nums shrink-0">
                ({unreadCount} {tn.unreadCountLabel.toLowerCase()})
              </span>
            )}
          </div>

          <Button
            type="text"
            size="small"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => {
              void refreshUnreadCount();
              void loadNotifications(0, false);
            }}
            disabled={loading}
            className="!inline-flex !items-center !text-slate-600"
          >
            {tn.refreshButton}
          </Button>
        </div>
      }
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
        {errorMessage && (
          <Alert
            type="error"
            showIcon
            title={errorMessage}
            action={
              <Button
                type="primary"
                size="small"
                onClick={() => void loadNotifications(0, false)}
              >
                {t.catalog.retryButton}
              </Button>
            }
          />
        )}

        {loading && items.length === 0 ? (
          <div className="space-y-3">
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12">
            <Empty
              image={<Bell className="w-10 h-10 text-slate-300 mx-auto" />}
              description={
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">{tn.emptyTitle}</div>
                  <div className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
                    {tn.emptyDescription}
                  </div>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {items.map((item) => {
                const isUnread = item.readAt === null;
                const tone = getOrderStatusTone(item.status);
                const statusLabel = getOrderStatusLabel(item.status, language);
                const canRateAction = item.action === 'RATE_SERVICE';

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void handleNotificationClick(item, canRateAction)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void handleNotificationClick(item, canRateAction);
                      }
                    }}
                    className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer space-y-2 focus:outline-none focus:ring-2 focus:ring-[#16a34a]/40 ${
                      isUnread
                        ? 'border-[#86efac] bg-[#f0fdf4] hover:border-[#16a34a]'
                        : 'border-[#e6e4dd] bg-white hover:border-[#cbd5e1] hover:bg-[#faf9f5]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-mono font-semibold text-slate-700 tabular-nums">
                            {item.orderNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-semibold ${tone.text}`}>{statusLabel}</span>
                          {isUnread && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[#15803d]">{tn.unreadLabel}</span>
                            </>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {item.message}
                    </p>

                    {item.reason && item.reason.trim() && (
                      <div className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5] px-2.5 py-1.5 text-xs text-slate-700">
                        <span className="font-medium text-slate-500">{tn.reasonLabel}: </span>
                        <span>{item.reason}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
                      <span className="tabular-nums">
                        {formatOrderDateTime(item.createdAt, language)}
                      </span>
                      {canRateAction ? (
                        <Button
                          type="primary"
                          size="small"
                          icon={<Star className="w-3.5 h-3.5" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleNotificationClick(item, true);
                          }}
                          className="!min-h-[34px] !inline-flex !items-center"
                        >
                          {tn.rateServiceAction}
                        </Button>
                      ) : (
                        <span className="font-medium text-[#16a34a]">{tn.openOrderHint}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && pageMeta && (
              <div className="pt-2">
                <Button
                  block
                  size="large"
                  loading={loadingMore}
                  onClick={() => void loadNotifications(pageMeta.number + 1, true)}
                  className="!min-h-[44px]"
                >
                  {tn.loadMoreButton}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
