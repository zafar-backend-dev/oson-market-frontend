import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntApp, Button, Input, Modal, Result, Skeleton } from 'antd';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  Clock,
  MapPin,
  RefreshCw,
  Star,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import { branchApi } from '../services/branchApi';
import { orderApi } from '../services/orderApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import type { PublicBranchItem } from '../types/branch';
import type {
  CustomerOrderHistoryEntry,
  CustomerOrderResponse,
  OrderStatus,
} from '../types/order';
import {
  LEGACY_ORDER_STATUSES,
  formatDistanceKm,
  formatOrderDateTime,
  getFulfillmentMethodLabel,
  getFulfillmentStatusFlow,
  getOrderStatusLabel,
  getOrderStatusTone,
} from '../utils/orderStatus';
import { formatPriceLabel } from '../utils/price';
import { isProfileComplete } from '../utils/validation';
import { StoreHeader } from './StoreHeader';

interface OrderDetailPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile;
  session: AuthSession;
  onUnauthorized: (message?: string) => void;
  onLogout: () => void;
}

export function OrderDetailPage({
  language,
  onLanguageChange,
  profile,
  session,
  onUnauthorized,
  onLogout,
}: OrderDetailPageProps) {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const {
    subscribeOrderLiveUpdate,
    refreshUnreadCount,
    loadNotifications,
  } = useNotifications();

  const t = translations[language];
  const to = t.orders;
  const tc = t.catalog;

  const [order, setOrder] = useState<CustomerOrderResponse | null>(null);
  const [history, setHistory] = useState<CustomerOrderHistoryEntry[]>([]);
  const [publicBranches, setPublicBranches] = useState<PublicBranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Customer cancellation modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelValidationError, setCancelValidationError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Service rating state
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingValidationError, setRatingValidationError] = useState<string | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const ratingSectionRef = useRef<HTMLElement | null>(null);
  const didScrollToRatingRef = useRef(false);

  const hasAccessToken = Boolean(session.accessToken);

  const loadOrderAndHistory = useCallback(
    async (silent = false) => {
      if (!orderId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
        setNotFound(false);
        setErrorMessage(null);
      }

      try {
        const [orderRes, historyRes] = await Promise.all([
          orderApi.getOrderById(session.accessToken, orderId, language),
          orderApi.getOrderHistory(session.accessToken, orderId, language).catch(() => []),
        ]);
        setOrder(orderRes);
        const sortedHistory = [...historyRes].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        setHistory(sortedHistory);
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 404) {
            setNotFound(true);
            return;
          }
          if (!silent) setErrorMessage(error.message);
        } else if (!silent) {
          setErrorMessage(
            language === 'ru'
              ? 'Не удалось загрузить детали заказа.'
              : 'Buyurtma tafsilotlarini yuklab bo‘lmadi.',
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, onUnauthorized, orderId, hasAccessToken],
  );

  // Reset form/scroll transient state when navigating to a different order
  useEffect(() => {
    didScrollToRatingRef.current = false;
    setActionError(null);
    setSelectedRating(0);
    setHoveredRating(0);
    setRatingComment('');
    setRatingValidationError(null);
    setCancelModalOpen(false);
    setCancelReason('');
    setCancelValidationError(null);
  }, [orderId, location.key]);

  // Load on initial mount or route navigation key change
  useEffect(() => {
    void loadOrderAndHistory(false);
  }, [loadOrderAndHistory, location.key]);

  // Focus/scroll to rating section when navigating from RATE_SERVICE notification
  useEffect(() => {
    if (!order || didScrollToRatingRef.current) return;
    const navState = location.state as { focusRating?: boolean } | null;
    const wantsRatingFocus =
      location.hash === '#rate-service' || Boolean(navState?.focusRating);
    if (!wantsRatingFocus) return;
    if (ratingSectionRef.current) {
      didScrollToRatingRef.current = true;
      ratingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [order, location.hash, location.state]);

  // Load public branches for branch name fallback if backend only returns branchId
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await branchApi.listPublicBranches({ page: 0, size: 100 }, language);
        if (!cancelled) {
          setPublicBranches(Array.isArray(res.content) ? res.content : []);
        }
      } catch {
        // Non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);

  // Live WebSocket / polling fallback sync for this order
  useEffect(() => {
    if (!orderId) return;
    return subscribeOrderLiveUpdate((signal) => {
      if (signal.type === 'event' && signal.orderId && signal.orderId !== orderId) {
        return;
      }
      void loadOrderAndHistory(true);
    });
  }, [orderId, subscribeOrderLiveUpdate, loadOrderAndHistory]);

  const resolvedBranchName = useMemo(() => {
    if (!order) return '—';
    if (order.branchName?.trim()) return order.branchName.trim();
    if (order.branchId) {
      const found = publicBranches.find((b) => b.id === order.branchId);
      if (found) return found.name;
      return order.branchId;
    }
    return '—';
  }, [order, publicBranches]);

  const terminalReason = useMemo(() => {
    if (!order) return null;
    if (order.cancellationReason && order.cancellationReason.trim()) {
      return order.cancellationReason.trim();
    }
    if (order.status === 'CANCELLED' || order.status === 'DELIVERY_FAILED') {
      const matching = [...history]
        .reverse()
        .find((entry) => entry.status === order.status && entry.reason?.trim());
      if (matching?.reason?.trim()) {
        return matching.reason.trim();
      }
    }
    return null;
  }, [order, history]);

  const flowSteps = useMemo<OrderStatus[]>(() => {
    if (!order) return [];
    return getFulfillmentStatusFlow(order.fulfillmentMethod);
  }, [order]);

  const stepTimestampMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of history) {
      if (!map.has(entry.status)) {
        map.set(entry.status, entry.createdAt);
      }
    }
    return map;
  }, [history]);

  const progressState = useMemo(() => {
    if (!order || flowSteps.length === 0) {
      return { activeIndex: -1, isTerminalError: false, isLegacy: false };
    }

    const isTerminalError =
      order.status === 'CANCELLED' || order.status === 'DELIVERY_FAILED';
    const isLegacy = LEGACY_ORDER_STATUSES.has(order.status);

    const directIndex = flowSteps.indexOf(order.status);
    if (directIndex >= 0) {
      return { activeIndex: directIndex, isTerminalError: false, isLegacy: false };
    }

    if (isLegacy) {
      if (order.status === 'PENDING') {
        return { activeIndex: 0, isTerminalError: false, isLegacy: true };
      }
      if (order.status === 'CONFIRMED') {
        return {
          activeIndex: flowSteps.indexOf('NEW_PAID') >= 0 ? flowSteps.indexOf('NEW_PAID') : 1,
          isTerminalError: false,
          isLegacy: true,
        };
      }
      if (order.status === 'SHIPPED') {
        const idx = flowSteps.indexOf('OUT_FOR_DELIVERY');
        return {
          activeIndex: idx >= 0 ? idx : Math.max(0, flowSteps.length - 2),
          isTerminalError: false,
          isLegacy: true,
        };
      }
    }

    if (isTerminalError) {
      let lastReached = order.paidAt ? 1 : 0;
      for (const entry of history) {
        const idx = flowSteps.indexOf(entry.status);
        if (idx >= 0) {
          lastReached = Math.max(lastReached, idx);
        }
      }
      return { activeIndex: lastReached, isTerminalError: true, isLegacy: false };
    }

    return { activeIndex: 0, isTerminalError: false, isLegacy: false };
  }, [order, flowSteps, history]);

  const handleOpenCancelModal = () => {
    setCancelReason('');
    setCancelValidationError(null);
    setActionError(null);
    setCancelModalOpen(true);
  };

  const handleConfirmCancelOrder = async () => {
    if (!order || cancelling) return;
    const trimmed = cancelReason.trim();
    if (!trimmed) {
      setCancelValidationError(to.cancelReasonRequired);
      return;
    }
    if (trimmed.length > 1000) {
      setCancelValidationError(to.cancelReasonMaxLength);
      return;
    }

    setCancelling(true);
    setCancelValidationError(null);
    setActionError(null);

    try {
      const updated = await orderApi.cancelCustomerOrder(
        session.accessToken,
        order.id,
        { reason: trimmed },
        language,
      );
      setOrder(updated);
      setCancelModalOpen(false);
      setCancelReason('');
      message.success(to.cancelSuccessMessage);
      void orderApi
        .getOrderHistory(session.accessToken, order.id, language)
        .then((hist) => {
          setHistory(
            [...hist].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            ),
          );
        })
        .catch(() => {});
      void refreshUnreadCount();
      void loadNotifications(0, false);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          setCancelModalOpen(false);
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 409) {
          setCancelModalOpen(false);
          setCancelReason('');
          setActionError(error.message);
          message.error(error.message);
          await loadOrderAndHistory(true);
          return;
        }
        setCancelValidationError(error.message);
      } else {
        setCancelValidationError(
          language === 'ru'
            ? 'Не удалось отменить заказ. Попробуйте ещё раз.'
            : 'Buyurtmani bekor qilib bo‘lmadi. Qaytadan urinib ko‘ring.',
        );
      }
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitServiceRating = async () => {
    if (!order || submittingRating) return;
    if (selectedRating < 1 || selectedRating > 5) {
      setRatingValidationError(to.ratingRequiredError);
      return;
    }
    const trimmedComment = ratingComment.trim();
    if (trimmedComment.length > 1000) {
      setRatingValidationError(to.ratingCommentMaxLength);
      return;
    }

    setSubmittingRating(true);
    setRatingValidationError(null);
    setActionError(null);

    try {
      const updated = await orderApi.rateCustomerOrder(
        session.accessToken,
        order.id,
        {
          rating: selectedRating,
          comment: trimmedComment || undefined,
        },
        language,
      );
      setOrder((prev) => ({
        ...(prev ?? updated),
        ...updated,
        serviceRating:
          typeof updated.serviceRating === 'number' ? updated.serviceRating : selectedRating,
        serviceReview:
          updated.serviceReview !== undefined
            ? updated.serviceReview
            : trimmedComment || null,
        ratedAt: updated.ratedAt ?? new Date().toISOString(),
        canRate: updated.canRate ?? false,
      }));
      setRatingComment('');
      message.success(to.ratingSuccessMessage);
      void refreshUnreadCount();
      void loadNotifications(0, false);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 409) {
          setActionError(error.message);
          message.error(error.message);
          await loadOrderAndHistory(true);
          return;
        }
        setRatingValidationError(error.message);
      } else {
        setRatingValidationError(
          language === 'ru'
            ? 'Не удалось сохранить оценку. Попробуйте ещё раз.'
            : 'Bahoni saqlab bo‘lmadi. Qaytadan urinib ko‘ring.',
        );
      }
    } finally {
      setSubmittingRating(false);
    }
  };

  const profileComplete = isProfileComplete(profile);
  const showRatingSection = Boolean(
    order && (order.canRate === true || typeof order.serviceRating === 'number'),
  );
  const displayedStars = hoveredRating > 0 ? hoveredRating : selectedRating;

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/orders')}
            className="!min-h-[40px]"
          >
            {to.backToOrdersButton}
          </Button>

          {order && (
            <Button
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={() => void loadOrderAndHistory(false)}
              disabled={loading || cancelling || submittingRating}
              className="!min-h-[40px]"
            >
              {to.refreshButton}
            </Button>
          )}
        </div>

        {loading && !order ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 space-y-4">
            <div className="text-sm text-slate-500">{to.loadingDetail}</div>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : notFound ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-8 sm:p-10">
            <Result
              status="404"
              title={to.notFoundTitle}
              subTitle={to.notFoundSubtitle}
              extra={
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/orders')}
                  className="!min-h-[44px]"
                >
                  {to.backToOrdersButton}
                </Button>
              }
            />
          </div>
        ) : errorMessage ? (
          <Alert
            type="error"
            showIcon
            title={errorMessage}
            action={
              <Button
                type="primary"
                size="small"
                onClick={() => void loadOrderAndHistory(false)}
              >
                {tc.retryButton}
              </Button>
            }
          />
        ) : order ? (
          <div className="space-y-6">
            {/* Header Summary */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">{to.detailTitlePrefix}</div>
                <h1 className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {order.orderNumber}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600 tabular-nums">
                  <span>
                    {to.placedAtLabel}: {formatOrderDateTime(order.placedAt, language)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      order.paidAt ? 'font-semibold text-[#15803d]' : 'font-medium text-amber-700'
                    }
                  >
                    {order.paidAt
                      ? `${to.paidAtLabel}: ${formatOrderDateTime(order.paidAt, language)}`
                      : to.unpaidLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2.5">
                <div className="sm:text-right space-y-1">
                  <div className="text-xs text-slate-500">{to.orderStatusLabel}</div>
                  <div className={`text-sm font-semibold ${getOrderStatusTone(order.status).text}`}>
                    {getOrderStatusLabel(order.status, language)}
                  </div>
                </div>

                {order.canCancel === true && (
                  <Button
                    danger
                    size="large"
                    icon={<Ban className="w-4 h-4" />}
                    onClick={handleOpenCancelModal}
                    disabled={cancelling}
                    className="!min-h-[42px]"
                  >
                    {to.cancelOrderButton}
                  </Button>
                )}
              </div>
            </section>

            {actionError && (
              <Alert
                type="error"
                showIcon
                closable
                onClose={() => setActionError(null)}
                title={actionError}
                className="text-xs sm:text-sm"
              />
            )}

            {(order.status === 'PENDING' || order.status === 'NEW_UNPAID') && (
              <Alert type="info" showIcon title={to.paymentPendingNote} className="text-xs sm:text-sm" />
            )}

            {terminalReason && (
              <Alert
                type={
                  order.status === 'CANCELLED' || order.status === 'DELIVERY_FAILED'
                    ? 'warning'
                    : 'info'
                }
                showIcon
                title={to.cancellationReasonLabel}
                description={terminalReason}
                className="text-xs sm:text-sm"
              />
            )}

            {/* Service-Specific Progress Flow */}
            {flowSteps.length > 0 && (
              <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    {to.orderProgressTitle}
                  </h2>
                  <span className="text-xs font-medium text-slate-500">
                    {getFulfillmentMethodLabel(order.fulfillmentMethod, language)}
                  </span>
                </div>

                {progressState.isLegacy && (
                  <p className="text-xs text-slate-500">{to.legacyStatusNote}</p>
                )}

                <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                  {flowSteps.map((stepStatus, idx) => {
                    const isCompleted =
                      !progressState.isTerminalError && idx < progressState.activeIndex;
                    const isCurrent =
                      !progressState.isTerminalError && idx === progressState.activeIndex;
                    const isPassedBeforeTerminal =
                      progressState.isTerminalError && idx <= progressState.activeIndex;
                    const isDone =
                      isCompleted ||
                      isPassedBeforeTerminal ||
                      (isCurrent && idx === flowSteps.length - 1);
                    const stepTime =
                      stepTimestampMap.get(stepStatus) ??
                      (idx === 0 ? order.placedAt : undefined);

                    return (
                      <li
                        key={stepStatus}
                        className={`rounded-lg border p-3 flex items-start gap-2.5 transition-colors ${
                          isCurrent && idx < flowSteps.length - 1
                            ? 'border-[#16a34a] bg-[#f0fdf4]'
                            : isDone
                              ? 'border-[#bbf7d0] bg-[#fafdf9]'
                              : 'border-[#f2f0ea] bg-[#faf9f5]'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 tabular-nums ${
                            isDone
                              ? 'bg-[#16a34a] text-white'
                              : isCurrent
                                ? 'border-2 border-[#16a34a] bg-white text-[#15803d]'
                                : 'border border-[#d6d3cb] bg-white text-slate-400'
                          }`}
                          aria-hidden="true"
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <div
                            className={`text-xs font-semibold leading-snug ${
                              isDone || isCurrent ? 'text-slate-900' : 'text-slate-400'
                            }`}
                          >
                            {getOrderStatusLabel(stepStatus, language)}
                          </div>
                          {stepTime && (isDone || isCurrent) && (
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              {formatOrderDateTime(stepTime, language)}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {progressState.isTerminalError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 flex items-start gap-2.5 text-xs sm:text-sm text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-semibold">
                        {getOrderStatusLabel(order.status, language)}
                      </div>
                      {terminalReason && <div className="text-red-700">{terminalReason}</div>}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Post-Delivery Service Rating (One-Time) */}
            {showRatingSection && (
              <section
                id="rate-service"
                ref={ratingSectionRef}
                className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <h2 className="text-base font-semibold text-slate-900">
                      {to.ratingSectionTitle}
                    </h2>
                  </div>
                  {typeof order.serviceRating === 'number' && order.canRate !== true && (
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      {order.serviceRating} / 5
                    </span>
                  )}
                </div>

                {order.canRate === true ? (
                  <div className="space-y-4">
                    <p className="text-xs sm:text-sm text-slate-600">{to.ratingFormPrompt}</p>

                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium text-slate-700">
                        {to.ratingStarsLabel}
                      </span>
                      <div
                        role="radiogroup"
                        aria-label={to.ratingStarsLabel}
                        className="inline-flex flex-wrap items-center gap-1"
                        onMouseLeave={() => setHoveredRating(0)}
                      >
                        {[1, 2, 3, 4, 5].map((starValue) => {
                          const isActive = starValue <= displayedStars;
                          const isSelected = starValue === selectedRating;

                          return (
                            <button
                              key={starValue}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              aria-label={`${starValue} / 5`}
                              disabled={submittingRating}
                              onMouseEnter={() => setHoveredRating(starValue)}
                              onClick={() => {
                                setSelectedRating(starValue);
                                if (ratingValidationError) setRatingValidationError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  const next = Math.min(5, (selectedRating || 0) + 1);
                                  setSelectedRating(next);
                                  if (ratingValidationError) setRatingValidationError(null);
                                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const next = Math.max(1, (selectedRating || 2) - 1);
                                  setSelectedRating(next);
                                  if (ratingValidationError) setRatingValidationError(null);
                                }
                              }}
                              className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-[#faf9f5] focus:outline-none focus:ring-2 focus:ring-[#16a34a]/40 transition-colors cursor-pointer disabled:opacity-60"
                            >
                              <Star
                                className={`w-7 h-7 transition-colors ${
                                  isActive
                                    ? 'text-amber-500 fill-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          );
                        })}
                        {selectedRating > 0 && (
                          <span className="ml-2 text-sm font-semibold text-slate-800 tabular-nums">
                            {selectedRating} / 5
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="order-rating-comment"
                        className="block text-xs font-medium text-slate-700"
                      >
                        {to.ratingCommentLabel}
                      </label>
                      <Input.TextArea
                        id="order-rating-comment"
                        rows={3}
                        maxLength={1000}
                        showCount
                        value={ratingComment}
                        onChange={(e) => {
                          setRatingComment(e.target.value);
                          if (ratingValidationError) setRatingValidationError(null);
                        }}
                        placeholder={to.ratingCommentPlaceholder}
                        disabled={submittingRating}
                      />
                    </div>

                    {ratingValidationError && (
                      <Alert
                        type="error"
                        showIcon
                        title={ratingValidationError}
                        className="text-xs sm:text-sm"
                      />
                    )}

                    <div>
                      <Button
                        type="primary"
                        size="large"
                        loading={submittingRating}
                        onClick={() => void handleSubmitServiceRating()}
                        className="!min-h-[44px]"
                      >
                        {to.ratingSubmitButton}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-4 space-y-2">
                    <div
                      className="flex items-center gap-1"
                      aria-label={`${order.serviceRating ?? 0} / 5`}
                    >
                      {[1, 2, 3, 4, 5].map((starValue) => {
                        const filled = starValue <= (order.serviceRating ?? 0);
                        return (
                          <Star
                            key={starValue}
                            className={`w-5 h-5 ${
                              filled ? 'text-amber-500 fill-amber-400' : 'text-slate-300'
                            }`}
                          />
                        );
                      })}
                      <span className="ml-2 text-sm font-bold text-slate-900 tabular-nums">
                        {order.serviceRating} / 5
                      </span>
                    </div>

                    {order.serviceReview && order.serviceReview.trim() && (
                      <div className="text-sm text-slate-800 leading-relaxed">
                        <span className="text-xs font-medium text-slate-500 block">
                          {to.submittedReviewLabel}:
                        </span>
                        <p>{order.serviceReview}</p>
                      </div>
                    )}

                    {order.ratedAt && (
                      <div className="text-xs text-slate-500 tabular-nums">
                        {to.ratedAtLabel}: {formatOrderDateTime(order.ratedAt, language)}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Items Breakdown + History Timeline */}
              <div className="lg:col-span-8 space-y-6">
                <section className="bg-white border border-[#e6e4dd] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#f2f0ea]">
                    <h2 className="text-base font-semibold text-slate-900">
                      {to.itemsListTitle} ({order.items.length})
                    </h2>
                  </div>

                  <div className="divide-y divide-[#f2f0ea]">
                    {order.items.map((item) => (
                      <div
                        key={item.variantId}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="text-sm sm:text-base font-semibold text-slate-900">
                            {item.title}
                          </div>
                          <div className="text-xs font-mono text-slate-500">
                            {item.variantTitle || item.sku}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                            <span>
                              {to.unitPriceLabel}:{' '}
                              {formatPriceLabel(item.unitPrice, language, order.currency)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {to.quantityLabel}: {item.quantity}
                            </span>
                            {item.discountAmount > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#15803d]">
                                  {to.discountLabel}: -
                                  {formatPriceLabel(item.discountAmount, language, order.currency)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <div className="text-xs text-slate-500">{to.lineTotalLabel}</div>
                          <div className="text-base font-bold text-slate-900 tabular-nums">
                            {formatPriceLabel(item.lineTotal, language, order.currency)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Chronological Status History */}
                <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#16a34a]" />
                    <h2 className="text-base font-semibold text-slate-900">{to.historyTitle}</h2>
                  </div>

                  {history.length === 0 ? (
                    <p className="text-xs sm:text-sm text-slate-500">{to.historyEmpty}</p>
                  ) : (
                    <ol className="space-y-3">
                      {history.map((entry, idx) => {
                        const tone = getOrderStatusTone(entry.status);
                        return (
                          <li
                            key={`${entry.createdAt}-${entry.status}-${idx}`}
                            className="rounded-lg border border-[#f2f0ea] bg-[#faf9f5] p-3.5 space-y-1"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className={`text-xs sm:text-sm font-semibold ${tone.text}`}>
                                {getOrderStatusLabel(entry.status, language)}
                              </span>
                              <span className="text-xs text-slate-500 tabular-nums">
                                {formatOrderDateTime(entry.createdAt, language)}
                              </span>
                            </div>
                            {entry.reason && entry.reason.trim() && (
                              <p className="text-xs text-slate-700">{entry.reason}</p>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              </div>

              {/* Contact + Fulfillment + Totals Sidebar */}
              <aside className="lg:col-span-4 space-y-6">
                <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 space-y-3">
                  <h2 className="text-base font-semibold text-slate-900">
                    {to.customerInfoTitle}
                  </h2>
                  <dl className="space-y-2.5 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">{to.phoneLabel}</dt>
                      <dd className="font-mono font-medium text-slate-900 tabular-nums">
                        {order.phone?.trim() || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{to.telegramLabel}</dt>
                      <dd className="font-mono font-medium text-slate-900 break-all">
                        {order.telegramAddress?.trim() || '—'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {(order.fulfillmentMethod || order.branchId || order.deliveryAddress) && (
                  <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#16a34a]" />
                      <h2 className="text-base font-semibold text-slate-900">
                        {to.fulfillmentSummaryTitle}
                      </h2>
                    </div>
                    <dl className="space-y-2.5 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">{to.fulfillmentTitle}</dt>
                        <dd className="font-medium text-slate-900 mt-0.5">
                          {getFulfillmentMethodLabel(order.fulfillmentMethod, language)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">{to.branchLabel}</dt>
                        <dd className="font-medium text-slate-900 mt-0.5">{resolvedBranchName}</dd>
                      </div>
                      {order.deliveryAddress && (
                        <div>
                          <dt className="text-xs text-slate-500">{to.deliveryAddressLabel}</dt>
                          <dd className="text-slate-800 mt-0.5">{order.deliveryAddress}</dd>
                        </div>
                      )}
                      {typeof order.distanceKm === 'number' && (
                        <div>
                          <dt className="text-xs text-slate-500">{to.distanceLabel}</dt>
                          <dd className="font-medium text-slate-900 tabular-nums mt-0.5">
                            {formatDistanceKm(order.distanceKm, language)}
                          </dd>
                        </div>
                      )}
                      {typeof order.pricePerKm === 'number' && (
                        <div>
                          <dt className="text-xs text-slate-500">{to.ratePerKmLabel}</dt>
                          <dd className="font-medium text-slate-900 tabular-nums mt-0.5">
                            {formatPriceLabel(order.pricePerKm, language, order.currency)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 space-y-3">
                  <h2 className="text-base font-semibold text-slate-900">{to.summaryTitle}</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2 text-slate-600">
                      <span>{to.subtotalLabel}</span>
                      <span className="font-medium text-slate-900 tabular-nums">
                        {formatPriceLabel(order.subtotal, language, order.currency)}
                      </span>
                    </div>
                    {order.discountTotal > 0 && (
                      <div className="flex items-center justify-between gap-2 text-[#15803d]">
                        <span>{to.discountTotalLabel}</span>
                        <span className="font-medium tabular-nums">
                          -{formatPriceLabel(order.discountTotal, language, order.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 text-slate-600">
                      <span>{to.shippingTotalLabel}</span>
                      <span className="font-medium text-slate-900 tabular-nums">
                        {formatPriceLabel(order.shippingTotal, language, order.currency)}
                      </span>
                    </div>
                    {order.shippingTotal === 0 && (
                      <p className="text-xs text-slate-500">{to.shippingZeroNote}</p>
                    )}
                    <div className="pt-3 border-t border-[#f2f0ea] flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-slate-900">{to.grandTotalLabel}</span>
                      <span className="text-xl font-bold text-slate-900 tabular-nums">
                        {formatPriceLabel(order.grandTotal, language, order.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : null}
      </main>

      <Modal
        open={cancelModalOpen}
        title={<span className="font-display font-bold text-slate-900">{to.cancelModalTitle}</span>}
        onCancel={() => {
          if (!cancelling) {
            setCancelModalOpen(false);
            setCancelValidationError(null);
          }
        }}
        onOk={() => void handleConfirmCancelOrder()}
        okText={to.cancelConfirmButton}
        cancelText={to.cancelKeepOrderButton}
        okButtonProps={{
          danger: true,
          loading: cancelling,
        }}
        cancelButtonProps={{ disabled: cancelling }}
        mask={{ closable: !cancelling }}
      >
        <div className="space-y-3 py-2">
          <p className="text-xs sm:text-sm text-slate-600">{to.cancelModalSubtitle}</p>
          <div className="space-y-1.5">
            <label
              htmlFor="customer-cancel-reason"
              className="block text-xs font-medium text-slate-700"
            >
              {to.cancelReasonLabel}
            </label>
            <Input.TextArea
              id="customer-cancel-reason"
              rows={4}
              maxLength={1000}
              showCount
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                if (cancelValidationError) setCancelValidationError(null);
              }}
              placeholder={to.cancelReasonPlaceholder}
              disabled={cancelling}
            />
          </div>
          {cancelValidationError && (
            <Alert type="error" showIcon title={cancelValidationError} className="text-xs" />
          )}
        </div>
      </Modal>
    </div>
  );
}
