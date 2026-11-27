import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Input,
  InputNumber,
  Modal,
  Result,
  Segmented,
  Select,
  Skeleton,
  Spin,
} from 'antd';
import { ArrowLeft, Clock, MapPin, RefreshCw, Star, Truck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { branchApi } from '../services/branchApi';
import { orderApi } from '../services/orderApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import {
  extractBranchCoordinates,
  getAdminBranchDisplayName,
  isAdminBranchActive,
  type AdminBranchRecord,
  type BranchLocation,
  type DeliveryQuoteResponse,
} from '../types/branch';
import type {
  AdminOrderDetailResponse,
  FulfillmentMethod,
  OrderStatus,
  UpdateOrderFulfillmentPayload,
} from '../types/order';
import {
  canAdminEditOrderFulfillment,
  doesOrderStatusRequireReason,
  extractAdminOrderMetadata,
  formatDistanceKm,
  formatOrderDateTime,
  getFulfillmentMethodLabel,
  getOrderStatusLabel,
  getOrderStatusTone,
  roundCoordinate7,
} from '../utils/orderStatus';
import { formatPriceLabel } from '../utils/price';
import { isProfileComplete, isValidLatitude, isValidLongitude } from '../utils/validation';
import { LocationPickerMap } from './LocationPickerMap';
import { StoreHeader } from './StoreHeader';

interface AdminOrderDetailPageProps {
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

export function AdminOrderDetailPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminOrderDetailPageProps) {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const { subscribeOrderLiveUpdate } = useNotifications();

  const t = translations[language];
  const tao = t.adminOrders;
  const to = t.orders;
  const tc = t.catalog;
  const tr = t.adminTelegramRecipients;

  const isAdmin = profile.role === 'ADMIN';
  const hasAccessToken = Boolean(session.accessToken);

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [detail, setDetail] = useState<AdminOrderDetailResponse | null>(null);
  const [branches, setBranches] = useState<AdminBranchRecord[]>([]);
  const [fallbackBranch, setFallbackBranch] = useState<AdminBranchRecord | null>(null);

  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  // Reason Modal state for CANCELLED, DELIVERY_FAILED, NEW_PAID transitions
  const [reasonModalStatus, setReasonModalStatus] = useState<OrderStatus | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [reasonValidationError, setReasonValidationError] = useState<string | null>(null);

  // Admin Fulfillment Edit State
  const [editMethod, setEditMethod] = useState<FulfillmentMethod>('PICKUP');
  const [editBranchId, setEditBranchId] = useState<string>('');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  const [editLocation, setEditLocation] = useState<BranchLocation>({
    latitude: 41.311081,
    longitude: 69.240562,
  });
  const [savingFulfillment, setSavingFulfillment] = useState(false);
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quotePreview, setQuotePreview] = useState<DeliveryQuoteResponse | null>(null);
  const fulfillmentDirtyRef = useRef(false);
  const hasLoadedDetailRef = useRef(false);

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
        if (!cancelled) {
          setBranches(Array.isArray(res.content) ? res.content : []);
        }
      } catch {
        // Non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, hasAccessToken, language]);

  const syncFulfillmentFormFromDetail = useCallback((res: AdminOrderDetailResponse) => {
    const meta = extractAdminOrderMetadata(res);
    setEditMethod(meta.fulfillmentMethod === 'DELIVERY' ? 'DELIVERY' : 'PICKUP');
    setEditBranchId(meta.branchId ?? '');
    setEditDeliveryAddress(meta.deliveryAddress ?? '');
    if (
      typeof meta.latitude === 'number' &&
      isValidLatitude(meta.latitude) &&
      typeof meta.longitude === 'number' &&
      isValidLongitude(meta.longitude)
    ) {
      setEditLocation({
        latitude: roundCoordinate7(meta.latitude),
        longitude: roundCoordinate7(meta.longitude),
      });
    }
    fulfillmentDirtyRef.current = false;
    setFulfillmentError(null);
    setQuoteError(null);
    setQuotePreview(null);
  }, []);

  const loadOrderDetail = useCallback(
    async (preserveStatusError = false, silent = false) => {
      if (!isAdmin) return;
      if (!orderId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
        setNotFound(false);
        setPageError(null);
        setForbiddenState(null);
        if (!preserveStatusError) {
          setStatusError(null);
        }
      }

      try {
        const res = await orderApi.getAdminOrderById(session.accessToken, orderId, language);
        hasLoadedDetailRef.current = true;
        setDetail(res);
        if (!silent || !fulfillmentDirtyRef.current) {
          syncFulfillmentFormFromDetail(res);
        }
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint: error.endpoint || `GET /api/admin/orders/${orderId}`,
              message: error.message,
            });
            return;
          }
          if (error.status === 404) {
            setNotFound(true);
            return;
          }
          if (!silent) setPageError(error.message);
        } else if (!silent) {
          setPageError(
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
    [isAdmin, language, onUnauthorized, orderId, hasAccessToken, syncFulfillmentFormFromDetail],
  );

  useEffect(() => {
    hasLoadedDetailRef.current = false;
    fulfillmentDirtyRef.current = false;
    if (isAdmin) {
      void loadOrderDetail();
    }
  }, [isAdmin, loadOrderDetail]);

  // Subscribe to WebSocket / polling fallback updates for this order
  useEffect(() => {
    if (!isAdmin || !orderId) return;
    return subscribeOrderLiveUpdate((signal) => {
      if (signal.type === 'event' && signal.orderId && signal.orderId !== orderId) {
        return;
      }
      void loadOrderDetail(true, true);
    });
  }, [isAdmin, orderId, subscribeOrderLiveUpdate, loadOrderDetail]);

  const meta = useMemo(() => (detail ? extractAdminOrderMetadata(detail) : null), [detail]);

  // Resolve order's branch by ID if not present in the first 100 branches
  useEffect(() => {
    const branchId = meta?.branchId;
    if (!isAdmin || !branchId || !hasAccessToken) {
      setFallbackBranch(null);
      return;
    }
    if (branches.some((b) => b.id === branchId)) {
      setFallbackBranch(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const rec = await branchApi.getAdminBranchById(session.accessToken, branchId, language);
        if (!cancelled) setFallbackBranch(rec);
      } catch {
        // Ignore fallback failure
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, meta?.branchId, branches, hasAccessToken, language]);

  const allKnownBranches = useMemo(() => {
    if (fallbackBranch && !branches.some((b) => b.id === fallbackBranch.id)) {
      return [...branches, fallbackBranch];
    }
    return branches;
  }, [branches, fallbackBranch]);

  const selectableBranches = useMemo(() => {
    return allKnownBranches.filter((branch) => {
      if (branch.id === meta?.branchId || branch.id === editBranchId) return true;
      if (!isAdminBranchActive(branch)) return false;
      return editMethod === 'DELIVERY' ? branch.deliveryEnabled : branch.pickupEnabled;
    });
  }, [allKnownBranches, editMethod, editBranchId, meta?.branchId]);

  const resolvedOrderBranch = useMemo(() => {
    if (!meta?.branchId) return null;
    return allKnownBranches.find((b) => b.id === meta.branchId) ?? null;
  }, [allKnownBranches, meta?.branchId]);

  const selectedEditBranch = useMemo(() => {
    if (!editBranchId) return null;
    return allKnownBranches.find((b) => b.id === editBranchId) ?? null;
  }, [allKnownBranches, editBranchId]);

  const dispatchStatusPatch = async (
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus,
    reason?: string,
  ): Promise<boolean> => {
    if (!detail?.order.id) return false;
    setUpdatingStatus(true);
    setStatusError(null);

    try {
      const updated = await orderApi.updateAdminOrderStatus(
        session.accessToken,
        detail.order.id,
        {
          expectedStatus,
          status: nextStatus,
          reason,
        },
        language,
      );

      if (updated && updated.order) {
        setDetail(updated);
        syncFulfillmentFormFromDetail(updated);
      } else {
        await loadOrderDetail();
      }
      message.success(tao.statusUpdatedSuccess);
      return true;
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return false;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `PATCH /api/admin/orders/${detail.order.id}/status`,
            message: error.message,
          });
          return false;
        }
        if (error.status === 404) {
          setNotFound(true);
          return false;
        }
        if (error.status === 409) {
          setStatusError(error.message || tao.conflictReloadNotice);
          await loadOrderDetail(true);
          return false;
        }
        setStatusError(error.message);
      }
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTransitionClick = (targetStatus: OrderStatus) => {
    if (!detail?.order || updatingStatus) return;

    if (doesOrderStatusRequireReason(targetStatus)) {
      setReasonModalStatus(targetStatus);
      setReasonText('');
      setReasonValidationError(null);
      return;
    }

    void dispatchStatusPatch(detail.order.status, targetStatus);
  };

  const handleConfirmReasonModal = async () => {
    if (!detail?.order || !reasonModalStatus || updatingStatus) return;
    const trimmed = reasonText.trim();
    if (!trimmed) {
      setReasonValidationError(tao.reasonRequiredError);
      return;
    }
    if (trimmed.length > 1000) {
      setReasonValidationError(tao.reasonMaxLengthError);
      return;
    }
    setReasonValidationError(null);
    const ok = await dispatchStatusPatch(detail.order.status, reasonModalStatus, trimmed);
    if (ok) {
      setReasonModalStatus(null);
      setReasonText('');
    }
  };

  const handleTestAdminQuote = async () => {
    if (!editBranchId) {
      setQuoteError(to.validation.requiredBranch);
      return;
    }
    if (!isValidLatitude(editLocation.latitude) || !isValidLongitude(editLocation.longitude)) {
      setQuoteError(to.validation.requiredLocation);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await branchApi.quoteAdminBranchDelivery(
        session.accessToken,
        editBranchId,
        editLocation,
        language,
      );
      setQuotePreview(res);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        setQuoteError(error.message);
      } else {
        setQuoteError(to.deliveryQuoteError);
      }
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleSaveFulfillment = async () => {
    if (!detail?.order || savingFulfillment) return;
    if (!editBranchId) {
      setFulfillmentError(to.validation.requiredBranch);
      return;
    }

    let payload: UpdateOrderFulfillmentPayload;
    if (editMethod === 'DELIVERY') {
      const trimmedAddress = editDeliveryAddress.trim();
      if (!trimmedAddress) {
        setFulfillmentError(to.validation.requiredDeliveryAddress);
        return;
      }
      if (!isValidLatitude(editLocation.latitude) || !isValidLongitude(editLocation.longitude)) {
        setFulfillmentError(to.validation.requiredLocation);
        return;
      }
      payload = {
        expectedStatus: detail.order.status,
        method: 'DELIVERY',
        branchId: editBranchId,
        deliveryAddress: trimmedAddress,
        location: {
          latitude: roundCoordinate7(editLocation.latitude),
          longitude: roundCoordinate7(editLocation.longitude),
        },
      };
    } else {
      payload = {
        expectedStatus: detail.order.status,
        method: 'PICKUP',
        branchId: editBranchId,
      };
    }

    setSavingFulfillment(true);
    setFulfillmentError(null);
    try {
      const updated = await orderApi.updateAdminOrderFulfillment(
        session.accessToken,
        detail.order.id,
        payload,
        language,
      );
      if (updated && updated.order) {
        setDetail(updated);
        syncFulfillmentFormFromDetail(updated);
      } else {
        await loadOrderDetail();
      }
      message.success(tao.fulfillmentUpdatedSuccess);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `PUT /api/admin/orders/${detail.order.id}/fulfillment`,
            message: error.message,
          });
          return;
        }
        if (error.status === 409) {
          setFulfillmentError(error.message || tao.conflictReloadNotice);
          await loadOrderDetail(true);
          return;
        }
        setFulfillmentError(error.message);
      }
    } finally {
      setSavingFulfillment(false);
    }
  };

  const profileComplete = isProfileComplete(profile);
  const order = detail?.order ?? null;
  const allowedStatuses = Array.isArray(detail?.allowedStatuses) ? detail.allowedStatuses : [];
  const fulfillmentEditable = Boolean(
    order && meta && canAdminEditOrderFulfillment(order.status, meta.paidAt),
  );

  const selectedBranchCoords = selectedEditBranch
    ? extractBranchCoordinates(selectedEditBranch)
    : null;

  const getReasonPlaceholder = (target: OrderStatus | null) => {
    if (target === 'NEW_PAID') return tao.reasonPlaceholderPaid;
    if (target === 'CANCELLED') return tao.reasonPlaceholderCancelled;
    if (target === 'DELIVERY_FAILED') return tao.reasonPlaceholderDeliveryFailed;
    return tao.reasonPlaceholderDefault;
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/admin/orders')}
                className="!min-h-[40px]"
              >
                {tao.backToListButton}
              </Button>

              {order && (
                <Button
                  icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                  onClick={() => void loadOrderDetail()}
                  disabled={loading || updatingStatus || savingFulfillment}
                  className="!min-h-[40px]"
                >
                  {tao.refreshButton}
                </Button>
              )}
            </div>

            {loading && !order ? (
              <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 space-y-4">
                <div className="text-sm text-slate-500">{tao.loadingDetail}</div>
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : notFound ? (
              <div className="bg-white border border-[#e6e4dd] rounded-xl p-8 sm:p-10">
                <Result
                  status="404"
                  title={tao.notFoundTitle}
                  subTitle={tao.notFoundSubtitle}
                  extra={
                    <Button
                      type="primary"
                      size="large"
                      onClick={() => navigate('/admin/orders')}
                      className="!min-h-[44px]"
                    >
                      {tao.backToListButton}
                    </Button>
                  }
                />
              </div>
            ) : pageError ? (
              <Alert
                type="error"
                showIcon
                title={pageError}
                action={
                  <Button type="primary" size="small" onClick={() => void loadOrderDetail()}>
                    {tc.retryButton}
                  </Button>
                }
              />
            ) : order && meta ? (
              <div className="space-y-6">
                {/* Order Summary Header */}
                <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">{tao.detailTitlePrefix}</div>
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
                          meta.paidAt ? 'font-semibold text-[#15803d]' : 'font-medium text-amber-700'
                        }
                      >
                        {meta.paidAt
                          ? `${to.paidAtLabel}: ${formatOrderDateTime(meta.paidAt, language)}`
                          : to.unpaidLabel}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right space-y-1">
                    <div className="text-xs text-slate-500">{tao.currentStatusLabel}</div>
                    <div
                      className={`text-base font-bold ${getOrderStatusTone(order.status).text}`}
                    >
                      {getOrderStatusLabel(order.status, language)}
                    </div>
                  </div>
                </section>

                {meta.cancellationReason && meta.cancellationReason.trim() && (
                  <Alert
                    type={
                      order.status === 'CANCELLED' || order.status === 'DELIVERY_FAILED'
                        ? 'warning'
                        : 'info'
                    }
                    showIcon
                    title={to.cancellationReasonLabel}
                    description={meta.cancellationReason}
                  />
                )}

                {/* Status Transition Controls (strictly from allowedStatuses) */}
                {allowedStatuses.length > 0 && (
                  <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {tao.statusSectionTitle}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">{tao.availableTransitionsLabel}</p>
                    </div>

                    {statusError && (
                      <Alert type="error" showIcon title={statusError} className="text-xs sm:text-sm" />
                    )}

                    <div className="flex flex-wrap items-center gap-2.5">
                      {allowedStatuses.map((targetStatus) => {
                        const isDanger =
                          targetStatus === 'CANCELLED' || targetStatus === 'DELIVERY_FAILED';
                        const isPrimary = targetStatus === 'NEW_PAID' || targetStatus === 'CONFIRMED';

                        return (
                          <Button
                            key={targetStatus}
                            type={isPrimary ? 'primary' : 'default'}
                            danger={isDanger}
                            size="large"
                            loading={updatingStatus}
                            disabled={updatingStatus || savingFulfillment}
                            onClick={() => handleTransitionClick(targetStatus)}
                            className="!min-h-[42px]"
                          >
                            {getOrderStatusLabel(targetStatus, language)}
                          </Button>
                        );
                      })}
                    </div>
                  </section>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Items, Fulfillment Edit, History */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Items List */}
                    <section className="bg-white border border-[#e6e4dd] rounded-xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-[#f2f0ea]">
                        <h2 className="text-base font-semibold text-slate-900">
                          {tao.itemsListTitle} ({order.items.length})
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
                                      {formatPriceLabel(
                                        item.discountAmount,
                                        language,
                                        order.currency,
                                      )}
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

                    {/* Fulfillment Edit Section */}
                    <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#16a34a]" />
                        <h2 className="text-base font-semibold text-slate-900">
                          {tao.fulfillmentSectionTitle}
                        </h2>
                      </div>

                      {!fulfillmentEditable && (
                        <Alert
                          type="info"
                          showIcon
                          title={tao.fulfillmentEditLockedHint}
                          className="text-xs sm:text-sm"
                        />
                      )}

                      {fulfillmentError && (
                        <Alert
                          type="error"
                          showIcon
                          title={fulfillmentError}
                          className="text-xs sm:text-sm"
                        />
                      )}

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-600">
                            {to.fulfillmentTitle}
                          </label>
                          <Segmented
                            block
                            size="large"
                            disabled={!fulfillmentEditable || savingFulfillment}
                            value={editMethod}
                            onChange={(val) => {
                              const nextMethod = val as FulfillmentMethod;
                              fulfillmentDirtyRef.current = true;
                              setEditMethod(nextMethod);
                              setQuotePreview(null);
                              setQuoteError(null);
                              setFulfillmentError(null);
                              const compatible = allKnownBranches.filter(
                                (b) =>
                                  isAdminBranchActive(b) &&
                                  (nextMethod === 'DELIVERY' ? b.deliveryEnabled : b.pickupEnabled),
                              );
                              if (
                                compatible.length > 0 &&
                                !compatible.some((b) => b.id === editBranchId)
                              ) {
                                setEditBranchId(compatible[0].id);
                              }
                            }}
                            options={[
                              { label: to.fulfillmentMethods.PICKUP, value: 'PICKUP' },
                              { label: to.fulfillmentMethods.DELIVERY, value: 'DELIVERY' },
                            ]}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-600">
                            {to.branchLabel}
                          </label>
                          <Select
                            size="large"
                            className="w-full"
                            disabled={!fulfillmentEditable || savingFulfillment}
                            value={editBranchId || undefined}
                            onChange={(val) => {
                              fulfillmentDirtyRef.current = true;
                              setEditBranchId(val);
                              setQuotePreview(null);
                              setQuoteError(null);
                            }}
                            placeholder={to.selectBranchLabel}
                            options={selectableBranches.map((b) => ({
                              value: b.id,
                              label: `${getAdminBranchDisplayName(b, language)} (${b.city} · ${b.addressLine})`,
                            }))}
                          />
                        </div>

                        {editMethod === 'DELIVERY' && (
                          <div className="space-y-3 pt-1">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-600">
                                {to.deliveryAddressLabel}
                              </label>
                              <Input
                                size="large"
                                disabled={!fulfillmentEditable || savingFulfillment}
                                value={editDeliveryAddress}
                                onChange={(e) => {
                                  fulfillmentDirtyRef.current = true;
                                  setEditDeliveryAddress(e.target.value);
                                }}
                                placeholder={to.deliveryAddressPlaceholder}
                              />
                            </div>

                            <LocationPickerMap
                              latitude={editLocation.latitude}
                              longitude={editLocation.longitude}
                              branchMarker={
                                selectedBranchCoords
                                  ? {
                                      latitude: selectedBranchCoords.latitude,
                                      longitude: selectedBranchCoords.longitude,
                                      label: selectedEditBranch
                                        ? getAdminBranchDisplayName(selectedEditBranch, language)
                                        : undefined,
                                    }
                                  : null
                              }
                              onChange={(loc) => {
                                fulfillmentDirtyRef.current = true;
                                setEditLocation(loc);
                                setQuotePreview(null);
                              }}
                              disabled={!fulfillmentEditable || savingFulfillment}
                              heightClass="h-48"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-slate-600">
                                  {to.latitudeLabel}
                                </label>
                                <InputNumber
                                  size="large"
                                  step={0.0001}
                                  precision={7}
                                  disabled={!fulfillmentEditable || savingFulfillment}
                                  value={editLocation.latitude}
                                  className="!w-full font-mono"
                                  onChange={(val) => {
                                    if (typeof val === 'number' && isValidLatitude(val)) {
                                      fulfillmentDirtyRef.current = true;
                                      setEditLocation((prev) => ({
                                        latitude: roundCoordinate7(val),
                                        longitude: prev.longitude,
                                      }));
                                      setQuotePreview(null);
                                    }
                                  }}
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-slate-600">
                                  {to.longitudeLabel}
                                </label>
                                <InputNumber
                                  size="large"
                                  step={0.0001}
                                  precision={7}
                                  disabled={!fulfillmentEditable || savingFulfillment}
                                  value={editLocation.longitude}
                                  className="!w-full font-mono"
                                  onChange={(val) => {
                                    if (typeof val === 'number' && isValidLongitude(val)) {
                                      fulfillmentDirtyRef.current = true;
                                      setEditLocation((prev) => ({
                                        latitude: prev.latitude,
                                        longitude: roundCoordinate7(val),
                                      }));
                                      setQuotePreview(null);
                                    }
                                  }}
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                              <Button
                                loading={quoteLoading}
                                disabled={savingFulfillment || !editBranchId}
                                onClick={() => void handleTestAdminQuote()}
                              >
                                {tao.testQuoteButton}
                              </Button>
                            </div>

                            {quoteError && (
                              <Alert type="error" showIcon title={quoteError} className="text-xs" />
                            )}

                            {quotePreview && (
                              <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">{to.distanceLabel}:</span>
                                  <span className="font-semibold text-slate-900 tabular-nums">
                                    {formatDistanceKm(quotePreview.distanceKm, language)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">{to.ratePerKmLabel}:</span>
                                  <span className="font-semibold text-slate-900 tabular-nums">
                                    {formatPriceLabel(
                                      quotePreview.pricePerKm,
                                      language,
                                      quotePreview.currency,
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-[#dcfce7]">
                                  <span className="font-semibold text-[#15803d]">
                                    {to.deliveryFeeLabel}:
                                  </span>
                                  <span className="font-bold text-[#15803d] tabular-nums">
                                    {formatPriceLabel(
                                      quotePreview.deliveryPrice,
                                      language,
                                      quotePreview.currency,
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {fulfillmentEditable && (
                          <div className="pt-1">
                            <Button
                              type="primary"
                              size="large"
                              loading={savingFulfillment}
                              disabled={savingFulfillment || updatingStatus}
                              onClick={() => void handleSaveFulfillment()}
                              className="!min-h-[44px]"
                            >
                              {tao.saveFulfillmentButton}
                            </Button>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Order History Timeline */}
                    <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#16a34a]" />
                        <h2 className="text-base font-semibold text-slate-900">
                          {tao.historyTitle}
                        </h2>
                      </div>

                      {meta.history.length === 0 ? (
                        <p className="text-xs sm:text-sm text-slate-500">{tao.historyEmpty}</p>
                      ) : (
                        <ol className="space-y-3">
                          {meta.history.map((entry, idx) => {
                            const tone = getOrderStatusTone(entry.status);
                            return (
                              <li
                                key={`${entry.createdAt}-${entry.status}-${idx}`}
                                className="rounded-lg border border-[#f2f0ea] bg-[#faf9f5] p-3.5 space-y-1.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-semibold">
                                    {entry.previousStatus && (
                                      <>
                                        <span className="text-slate-500">
                                          {getOrderStatusLabel(entry.previousStatus, language)}
                                        </span>
                                        <span className="text-slate-400" aria-hidden="true">
                                          →
                                        </span>
                                      </>
                                    )}
                                    <span className={tone.text}>
                                      {getOrderStatusLabel(entry.status, language)}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-500 tabular-nums">
                                    {formatOrderDateTime(entry.createdAt, language)}
                                  </span>
                                </div>

                                {entry.reason && entry.reason.trim() && (
                                  <p className="text-xs text-slate-700">{entry.reason}</p>
                                )}

                                {entry.actorId && (
                                  <div className="text-[11px] font-mono text-slate-400">
                                    {tao.historyActorLabel}: {entry.actorId}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </section>
                  </div>

                  {/* Right Sidebar: Contact, Fulfillment Snapshot, Totals */}
                  <aside className="lg:col-span-4 space-y-6">
                    <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 space-y-3">
                      <h2 className="text-base font-semibold text-slate-900">
                        {tao.customerInfoTitle}
                      </h2>
                      <dl className="space-y-3 text-sm">
                        <div>
                          <dt className="text-xs text-slate-500">{to.phoneLabel}</dt>
                          <dd className="font-mono font-medium text-slate-900 tabular-nums mt-0.5">
                            {order.phone?.trim() || tao.noContactValue}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">{to.telegramLabel}</dt>
                          <dd className="font-mono font-medium text-slate-900 break-all mt-0.5">
                            {order.telegramAddress?.trim() || tao.noContactValue}
                          </dd>
                        </div>
                      </dl>
                    </div>

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
                            {getFulfillmentMethodLabel(meta.fulfillmentMethod, language)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">{to.branchLabel}</dt>
                          <dd className="font-medium text-slate-900 mt-0.5">
                            {meta.branchName?.trim() ||
                              (resolvedOrderBranch
                                ? getAdminBranchDisplayName(resolvedOrderBranch, language)
                                : meta.branchId) ||
                              '—'}
                          </dd>
                        </div>
                        {meta.deliveryAddress && (
                          <div>
                            <dt className="text-xs text-slate-500">{to.deliveryAddressLabel}</dt>
                            <dd className="text-slate-800 mt-0.5">{meta.deliveryAddress}</dd>
                          </div>
                        )}
                        {typeof meta.latitude === 'number' && typeof meta.longitude === 'number' && (
                          <div>
                            <dt className="text-xs text-slate-500">{to.locationLabel}</dt>
                            <dd className="font-mono text-xs text-slate-700 tabular-nums mt-0.5">
                              {meta.latitude.toFixed(7)}, {meta.longitude.toFixed(7)}
                            </dd>
                          </div>
                        )}
                        {typeof meta.distanceKm === 'number' && (
                          <div>
                            <dt className="text-xs text-slate-500">{to.distanceLabel}</dt>
                            <dd className="font-medium text-slate-900 tabular-nums mt-0.5">
                              {formatDistanceKm(meta.distanceKm, language)}
                            </dd>
                          </div>
                        )}
                        {typeof meta.pricePerKm === 'number' && (
                          <div>
                            <dt className="text-xs text-slate-500">{to.ratePerKmLabel}</dt>
                            <dd className="font-medium text-slate-900 tabular-nums mt-0.5">
                              {formatPriceLabel(meta.pricePerKm, language, order.currency)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {typeof order.serviceRating === 'number' && (
                      <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 space-y-2.5">
                        <h2 className="text-base font-semibold text-slate-900">
                          {tao.serviceRatingTitle}
                        </h2>
                        <div className="flex items-center gap-1" aria-label={`${order.serviceRating} / 5`}>
                          {[1, 2, 3, 4, 5].map((starValue) => {
                            const filled = starValue <= (order.serviceRating ?? 0);
                            return (
                              <Star
                                key={starValue}
                                className={`w-4 h-4 ${
                                  filled ? 'text-amber-500 fill-amber-400' : 'text-slate-300'
                                }`}
                              />
                            );
                          })}
                          <span className="ml-1.5 text-sm font-bold text-slate-900 tabular-nums">
                            {order.serviceRating} / 5
                          </span>
                        </div>
                        {order.serviceReview && order.serviceReview.trim() && (
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            {order.serviceReview}
                          </p>
                        )}
                        {order.ratedAt && (
                          <div className="text-xs text-slate-500 tabular-nums">
                            {to.ratedAtLabel}: {formatOrderDateTime(order.ratedAt, language)}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 space-y-3">
                      <h2 className="text-base font-semibold text-slate-900">{tao.summaryTitle}</h2>
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
          </>
        )}
      </main>

      <Modal
        open={reasonModalStatus !== null}
        title={
          <span className="font-display font-bold text-slate-900">
            {reasonModalStatus
              ? `${getOrderStatusLabel(reasonModalStatus, language)} — ${tao.reasonModalTitle}`
              : tao.reasonModalTitle}
          </span>
        }
        onCancel={() => {
          if (!updatingStatus) {
            setReasonModalStatus(null);
            setReasonValidationError(null);
          }
        }}
        onOk={() => void handleConfirmReasonModal()}
        okText={tao.confirmTransitionButton}
        cancelText={tao.cancelTransitionButton}
        okButtonProps={{
          loading: updatingStatus,
          danger:
            reasonModalStatus === 'CANCELLED' || reasonModalStatus === 'DELIVERY_FAILED',
        }}
        cancelButtonProps={{ disabled: updatingStatus }}
        mask={{ closable: !updatingStatus }}
      >
        <div className="space-y-3 py-2">
          <label className="block text-xs font-medium text-slate-700">
            {reasonModalStatus === 'NEW_PAID' ? tao.reasonLabelPaid : tao.reasonLabelDefault}
          </label>
          <Input.TextArea
            rows={4}
            maxLength={1000}
            showCount
            value={reasonText}
            onChange={(e) => {
              setReasonText(e.target.value);
              if (reasonValidationError) setReasonValidationError(null);
            }}
            placeholder={getReasonPlaceholder(reasonModalStatus)}
            disabled={updatingStatus}
          />
          {reasonValidationError && (
            <Alert type="error" showIcon title={reasonValidationError} className="text-xs" />
          )}
        </div>
      </Modal>
    </div>
  );
}
