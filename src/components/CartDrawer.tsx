import { BranchDirections } from './BranchDirections';
import { getCurrentLocation, locationErrorMessage, supportsLocation } from '../services/deviceLocation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Segmented,
  Skeleton,
} from 'antd';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  Send,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MAX_CART_ITEM_QUANTITY,
  MAX_CART_VARIANTS,
  clearPendingCheckoutDraft,
  readPendingCheckoutDraft,
  savePendingCheckoutDraft,
  useCart,
} from '../contexts/CartContext';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import { branchApi, resolveBranchImageUrl } from '../services/branchApi';
import {
  reverseGeocodeCoordinates,
  type ReverseGeocodeResult,
} from '../services/geocodingApi';
import { orderApi } from '../services/orderApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import type { BranchLocation, DeliveryQuoteResponse, PublicBranchItem } from '../types/branch';
import type {
  CustomerOrderResponse,
  FulfillmentMethod,
  OrderFulfillmentPayload,
  OrderStatus,
} from '../types/order';
import {
  composeOrderDeliveryAddress,
  formatBranchDistance,
  formatFallbackPointAddress,
  isFiniteCoordinatePair,
  sortBranchesByDistance,
} from '../utils/geo';
import {
  formatDistanceKm,
  formatOrderDateTime,
  getFulfillmentMethodLabel,
  getOrderStatusLabel,
  getOrderStatusTone,
  roundCoordinate7,
} from '../utils/orderStatus';
import { formatPriceLabel, hasVariantDiscount, isValidVariantPrice } from '../utils/price';
import {
  generateRequestUuid,
  isValidLatitude,
  isValidLongitude,
  isValidTelegramAddress,
  validateOrderPhone,
} from '../utils/validation';
import { GuestAuthModal } from './GuestAuthModal';
import { LocationPickerMap } from './LocationPickerMap';
import { PublicCatalogImage } from './PublicCatalogImage';

interface CartDrawerProps {
  language: Language;
  profile: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  onAuthenticatedInPlace: (session: AuthSession, profile: UserProfile) => void;
  onUnauthorizedInPlace: () => void;
}

interface CheckoutFormValues {
  phone: string;
  telegramAddress: string;
  deliveryAddressNote?: string;
}

const DEFAULT_MAP_LOCATION: BranchLocation = {
  latitude: 41.311081,
  longitude: 69.240562,
};

export function CartDrawer({
  language,
  profile,
  accessToken,
  isAuthenticated,
  onAuthenticatedInPlace,
  onUnauthorizedInPlace,
}: CartDrawerProps) {
  const navigate = useNavigate();
  const {
    items,
    totalQuantity,
    totalAmount,
    drawerOpen,
    checkoutMode,
    closeDrawer,
    setCheckoutMode,
    increment,
    decrement,
    removeItem,
    removeItems,
    clearCart,
  } = useCart();

  const t = translations[language];
  const tc = t.catalog;
  const to = t.orders;

  const [checkoutForm] = Form.useForm<CheckoutFormValues>();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{
    type: 'error' | 'warning';
    message: string;
    isConflict?: boolean;
    isNetwork?: boolean;
  } | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<{
    order: CustomerOrderResponse;
    isReplay: boolean;
  } | null>(null);

  // Fulfillment & Branches State
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('PICKUP');
  const [publicBranches, setPublicBranches] = useState<PublicBranchItem[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [branchValidationError, setBranchValidationError] = useState<string | null>(null);

  // Delivery Location, Reverse Geocoding & Quote State
  const [deliveryLocation, setDeliveryLocation] = useState<BranchLocation | null>(null);
  const [pickupReferenceLocation, setPickupReferenceLocation] = useState<BranchLocation | null>(
    null,
  );
  const [locationValidationError, setLocationValidationError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoNotice, setGeoNotice] = useState<{
    type: 'info' | 'warning' | 'success';
    text: string;
  } | null>(null);

  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<ReverseGeocodeResult | null>(null);
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const userEditedPhoneRef = useRef(false);
  const requestIdRef = useRef<{ signature: string; requestId: string } | null>(null);
  const geocodeSeqRef = useRef(0);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const quoteSeqRef = useRef(0);

  useEffect(() => {
    return () => {
      geocodeAbortRef.current?.abort();
    };
  }, []);

  const triggerReverseGeocode = useCallback(
    async (loc: BranchLocation, targetLanguage: Language) => {
      geocodeAbortRef.current?.abort();
      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      const seq = ++geocodeSeqRef.current;

      setGeocodeLoading(true);
      setGeocodeFailed(false);
      setGeocodeResult(null);

      try {
        const result = await reverseGeocodeCoordinates({
          latitude: loc.latitude,
          longitude: loc.longitude,
          language: targetLanguage,
          signal: controller.signal,
        });
        if (seq !== geocodeSeqRef.current || controller.signal.aborted) {
          return;
        }
        setGeocodeResult(result);
        setGeocodeFailed(false);
      } catch (error) {
        if (
          seq !== geocodeSeqRef.current ||
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }
        setGeocodeResult(null);
        setGeocodeFailed(true);
      } finally {
        if (seq === geocodeSeqRef.current && !controller.signal.aborted) {
          setGeocodeLoading(false);
        }
      }
    },
    [],
  );

  const applyDeliveryPoint = useCallback(
    (rawLocation: BranchLocation) => {
      if (!isFiniteCoordinatePair(rawLocation.latitude, rawLocation.longitude)) {
        return;
      }
      const next: BranchLocation = {
        latitude: roundCoordinate7(rawLocation.latitude),
        longitude: roundCoordinate7(rawLocation.longitude),
      };
      setDeliveryLocation(next);
      setLocationValidationError(null);
      setSubmitError(null);
      void triggerReverseGeocode(next, language);
    },
    [language, triggerReverseGeocode],
  );

  const fetchPublicBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchesError(null);
    try {
      const content = await branchApi.listAllPublicBranches(language);
      setPublicBranches(content);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setBranchesError(error.message);
      } else {
        setBranchesError(to.branchesLoadError);
      }
    } finally {
      setBranchesLoading(false);
    }
  }, [language, to.branchesLoadError]);

  // Fetch all active public branches when entering checkout or switching language while open
  useEffect(() => {
    if (!drawerOpen || !checkoutMode) return;
    void fetchPublicBranches();
  }, [drawerOpen, checkoutMode, fetchPublicBranches]);

  const activeReferenceLocation = useMemo<BranchLocation | null>(() => {
    if (fulfillmentMethod === 'DELIVERY') {
      return deliveryLocation &&
        isFiniteCoordinatePair(deliveryLocation.latitude, deliveryLocation.longitude)
        ? deliveryLocation
        : null;
    }
    const candidate = pickupReferenceLocation ?? deliveryLocation;
    return candidate && isFiniteCoordinatePair(candidate.latitude, candidate.longitude)
      ? candidate
      : null;
  }, [fulfillmentMethod, deliveryLocation, pickupReferenceLocation]);

  const sortedCompatibleBranches = useMemo(() => {
    const filtered = publicBranches.filter((branch) =>
      fulfillmentMethod === 'DELIVERY' ? branch.deliveryEnabled : branch.pickupEnabled,
    );
    return sortBranchesByDistance(filtered, activeReferenceLocation);
  }, [publicBranches, fulfillmentMethod, activeReferenceLocation]);

  // Auto-select a valid branch only when current selection is missing or incompatible with chosen method
  useEffect(() => {
    if (!checkoutMode) return;
    if (sortedCompatibleBranches.length === 0) {
      if (selectedBranchId && !publicBranches.some((b) => b.id === selectedBranchId)) {
        setSelectedBranchId('');
      }
      return;
    }
    if (!sortedCompatibleBranches.some((entry) => entry.branch.id === selectedBranchId)) {
      setSelectedBranchId(sortedCompatibleBranches[0].branch.id);
      setBranchValidationError(null);
    }
  }, [checkoutMode, sortedCompatibleBranches, publicBranches, selectedBranchId]);

  const selectedBranch = useMemo(
    () => publicBranches.find((b) => b.id === selectedBranchId) ?? null,
    [publicBranches, selectedBranchId],
  );

  // Restore saved draft or prefill profile phone when entering checkout mode
  useEffect(() => {
    if (!drawerOpen) {
      setSubmitError(null);
      return;
    }
    if (!checkoutMode) {
      return;
    }

    const draft = readPendingCheckoutDraft();
    if (draft?.phone && !checkoutForm.getFieldValue('phone')) {
      checkoutForm.setFieldValue('phone', draft.phone);
      userEditedPhoneRef.current = true;
    } else if (!userEditedPhoneRef.current && profile?.phone && !checkoutForm.getFieldValue('phone')) {
      checkoutForm.setFieldValue('phone', profile.phone);
    }

    if (draft?.telegramAddress && !checkoutForm.getFieldValue('telegramAddress')) {
      checkoutForm.setFieldValue('telegramAddress', draft.telegramAddress);
    }
    if (draft?.fulfillmentMethod) {
      setFulfillmentMethod(draft.fulfillmentMethod);
    }
    if (draft?.branchId) {
      setSelectedBranchId(draft.branchId);
    }
    if (draft?.deliveryAddressNote && !checkoutForm.getFieldValue('deliveryAddressNote')) {
      checkoutForm.setFieldValue('deliveryAddressNote', draft.deliveryAddressNote);
    }
    if (
      typeof draft?.latitude === 'number' &&
      isValidLatitude(draft.latitude) &&
      typeof draft?.longitude === 'number' &&
      isValidLongitude(draft.longitude)
    ) {
      const restored: BranchLocation = {
        latitude: roundCoordinate7(draft.latitude),
        longitude: roundCoordinate7(draft.longitude),
      };
      setDeliveryLocation((prev) => {
        if (prev && prev.latitude === restored.latitude && prev.longitude === restored.longitude) {
          return prev;
        }
        return restored;
      });
    }
  }, [drawerOpen, checkoutMode, profile?.phone, checkoutForm]);

  // Keep reverse geocoded address synchronized when deliveryLocation or language changes in DELIVERY mode
  useEffect(() => {
    if (!drawerOpen || !checkoutMode || fulfillmentMethod !== 'DELIVERY') return;
    if (
      !deliveryLocation ||
      !isFiniteCoordinatePair(deliveryLocation.latitude, deliveryLocation.longitude)
    ) {
      return;
    }
    void triggerReverseGeocode(deliveryLocation, language);
  }, [drawerOpen, checkoutMode, fulfillmentMethod, deliveryLocation, language, triggerReverseGeocode]);

  // Quote delivery cost automatically whenever DELIVERY + branch + valid coordinates change
  useEffect(() => {
    if (
      !drawerOpen ||
      !checkoutMode ||
      fulfillmentMethod !== 'DELIVERY' ||
      !selectedBranchId ||
      !deliveryLocation ||
      !isValidLatitude(deliveryLocation.latitude) ||
      !isValidLongitude(deliveryLocation.longitude)
    ) {
      quoteSeqRef.current += 1;
      setDeliveryQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    let cancelled = false;
    const seq = ++quoteSeqRef.current;
    setQuoteLoading(true);
    setQuoteError(null);

    const timer = window.setTimeout(async () => {
      try {
        const res = await branchApi.quoteCustomerDelivery(
          accessToken ?? undefined,
          selectedBranchId,
          deliveryLocation,
          language,
        );
        if (!cancelled && seq === quoteSeqRef.current) {
          setDeliveryQuote(res);
          setQuoteError(null);
        }
      } catch (error) {
        if (cancelled || seq !== quoteSeqRef.current) return;
        setDeliveryQuote(null);
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorizedInPlace();
            setAuthModalOpen(true);
            return;
          }
          setQuoteError(error.message);
        } else {
          setQuoteError(to.deliveryQuoteError);
        }
      } finally {
        if (!cancelled && seq === quoteSeqRef.current) {
          setQuoteLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    drawerOpen,
    checkoutMode,
    fulfillmentMethod,
    selectedBranchId,
    deliveryLocation,
    accessToken,
    language,
    onUnauthorizedInPlace,
    to.deliveryQuoteError,
  ]);

  const hasInvalidPricedItem = items.some((item) => !isValidVariantPrice(item.price));
  const exceedsVariantLimit = items.length > MAX_CART_VARIANTS;
  const exceedsQtyLimit = items.some((item) => item.quantity > MAX_CART_ITEM_QUANTITY);
  const primaryCurrency = items[0]?.price.currency ?? 'UZS';
  const totalAmountLabel = formatPriceLabel(totalAmount, language, primaryCurrency);

  const estimatedGrandTotal =
    fulfillmentMethod === 'DELIVERY' && deliveryQuote
      ? totalAmount + deliveryQuote.deliveryPrice
      : totalAmount;
  const estimatedGrandTotalLabel = formatPriceLabel(
    estimatedGrandTotal,
    language,
    deliveryQuote?.currency ?? primaryCurrency,
  );

  const persistDraftNow = () => {
    const prevDraft = readPendingCheckoutDraft();
    const note = checkoutMode
      ? checkoutForm.getFieldValue('deliveryAddressNote') || undefined
      : prevDraft?.deliveryAddressNote;
    savePendingCheckoutDraft({
      phone: checkoutMode ? checkoutForm.getFieldValue('phone') || undefined : prevDraft?.phone,
      telegramAddress: checkoutMode
        ? checkoutForm.getFieldValue('telegramAddress') || undefined
        : prevDraft?.telegramAddress,
      fulfillmentMethod,
      branchId: selectedBranchId || undefined,
      deliveryAddress:
        geocodeResult?.fullAddress ?? prevDraft?.deliveryAddress,
      deliveryAddressNote: note,
      latitude: deliveryLocation?.latitude,
      longitude: deliveryLocation?.longitude,
      checkoutRequested: true,
    });
  };

  const handleCloseDrawer = () => {
    if (submitting) return;
    setCompletedReceipt(null);
    setSubmitError(null);
    closeDrawer();
  };

  const handleCheckoutClick = () => {
    if (items.length === 0 || hasInvalidPricedItem) return;
    if (exceedsVariantLimit) {
      setSubmitError({ type: 'warning', message: to.itemsLimitError });
      return;
    }
    if (exceedsQtyLimit) {
      setSubmitError({ type: 'warning', message: to.itemQuantityLimitError });
      return;
    }

    setCompletedReceipt(null);
    setSubmitError(null);

    if (!isAuthenticated) {
      persistDraftNow();
      setAuthModalOpen(true);
      return;
    }

    setCheckoutMode(true);
  };

  const handleModalAuthenticated = (nextSession: AuthSession, nextProfile: UserProfile) => {
    setAuthModalOpen(false);
    onAuthenticatedInPlace(nextSession, nextProfile);
    if (!userEditedPhoneRef.current && nextProfile.phone && !checkoutForm.getFieldValue('phone')) {
      checkoutForm.setFieldValue('phone', nextProfile.phone);
    }
    setSubmitError(null);
    setCheckoutMode(true);
  };

  const handleGetBrowserLocation = () => {
    setLocationValidationError(null);
    setSubmitError(null);
    if (!supportsLocation()) {
      setGeoNotice({ type: 'warning', text: to.locationUnsupportedHint });
      if (fulfillmentMethod === 'DELIVERY' && !deliveryLocation) {
        applyDeliveryPoint(DEFAULT_MAP_LOCATION);
      }
      return;
    }

    setGeoLoading(true);
    setGeoNotice(null);
    void getCurrentLocation().then(
      (pos) => {
        setGeoLoading(false);
        const next: BranchLocation = {
          latitude: roundCoordinate7(pos.coords.latitude),
          longitude: roundCoordinate7(pos.coords.longitude),
        };
        if (fulfillmentMethod === 'DELIVERY') {
          applyDeliveryPoint(next);
        } else {
          setPickupReferenceLocation(next);
        }
        setGeoNotice({ type: 'success', text: to.locationFoundHint });
      },
      (error: unknown) => {
        setGeoLoading(false);
        setGeoNotice({ type: 'warning', text: locationErrorMessage(error, language, to.locationPermissionDeniedHint) });
        if (fulfillmentMethod === 'DELIVERY' && !deliveryLocation) {
          if (
            selectedBranch &&
            typeof selectedBranch.latitude === 'number' &&
            typeof selectedBranch.longitude === 'number'
          ) {
            applyDeliveryPoint({
              latitude: roundCoordinate7(selectedBranch.latitude),
              longitude: roundCoordinate7(selectedBranch.longitude),
            });
          } else {
            applyDeliveryPoint(DEFAULT_MAP_LOCATION);
          }
        }
      },
    );
  };

  const handlePlaceOrder = async (values: CheckoutFormValues) => {
    if (items.length === 0) {
      setSubmitError({ type: 'warning', message: to.validation.emptyCart });
      return;
    }
    if (items.length > MAX_CART_VARIANTS) {
      setSubmitError({ type: 'warning', message: to.itemsLimitError });
      return;
    }
    if (items.some((item) => item.quantity < 1 || item.quantity > MAX_CART_ITEM_QUANTITY)) {
      setSubmitError({ type: 'warning', message: to.itemQuantityLimitError });
      return;
    }
    if (hasInvalidPricedItem) {
      setSubmitError({ type: 'warning', message: tc.cartNoPriceBlocked });
      return;
    }

    if (!selectedBranchId) {
      setBranchValidationError(to.validation.requiredBranch);
      setSubmitError({ type: 'warning', message: to.validation.requiredBranch });
      return;
    }
    setBranchValidationError(null);

    let fulfillmentPayload: OrderFulfillmentPayload;
    if (fulfillmentMethod === 'DELIVERY') {
      if (
        !deliveryLocation ||
        !isValidLatitude(deliveryLocation.latitude) ||
        !isValidLongitude(deliveryLocation.longitude)
      ) {
        setLocationValidationError(to.validation.requiredLocation);
        setSubmitError({ type: 'warning', message: to.validation.requiredLocation });
        return;
      }
      const roundedLat = roundCoordinate7(deliveryLocation.latitude);
      const roundedLng = roundCoordinate7(deliveryLocation.longitude);
      const resolvedDeliveryAddress = composeOrderDeliveryAddress(
        geocodeResult?.fullAddress,
        values.deliveryAddressNote,
        roundedLat,
        roundedLng,
        language,
      );

      setLocationValidationError(null);
      fulfillmentPayload = {
        method: 'DELIVERY',
        branchId: selectedBranchId,
        deliveryAddress: resolvedDeliveryAddress,
        location: {
          latitude: roundedLat,
          longitude: roundedLng,
        },
      };
    } else {
      fulfillmentPayload = {
        method: 'PICKUP',
        branchId: selectedBranchId,
      };
    }

    const cleanPhone = values.phone.trim();
    const cleanTelegram = values.telegramAddress.trim();

    if (!isAuthenticated || !accessToken) {
      persistDraftNow();
      setAuthModalOpen(true);
      return;
    }

    const orderItems = items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    const signature = JSON.stringify({
      phone: cleanPhone,
      telegramAddress: cleanTelegram,
      items: orderItems,
      fulfillment: fulfillmentPayload,
    });

    if (!requestIdRef.current || requestIdRef.current.signature !== signature) {
      requestIdRef.current = {
        signature,
        requestId: generateRequestUuid(),
      };
    }

    const requestId = requestIdRef.current.requestId;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await orderApi.createOrder(
        accessToken,
        {
          requestId,
          phone: cleanPhone,
          telegramAddress: cleanTelegram,
          items: orderItems,
          fulfillment: fulfillmentPayload,
        },
        language,
      );

      // Success (201 new order or 200 idempotent replay): remove only submitted variantIds
      const submittedVariantIds = orderItems.map((entry) => entry.variantId);
      removeItems(submittedVariantIds);
      requestIdRef.current = null;
      clearPendingCheckoutDraft();
      setCheckoutMode(false);
      setCompletedReceipt({
        order: response.order,
        isReplay: response.httpStatus === 200,
      });
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          persistDraftNow();
          onUnauthorizedInPlace();
          setAuthModalOpen(true);
          return;
        }

        if (error.status === 400) {
          const fieldErrors: Array<{ name: keyof CheckoutFormValues; errors: string[] }> = [];
          for (const field of error.fields) {
            if (field === 'phone' || field === 'telegramAddress') {
              fieldErrors.push({ name: field, errors: [error.message] });
            }
          }
          if (fieldErrors.length > 0) {
            checkoutForm.setFields(fieldErrors);
          }
          setSubmitError({
            type: 'error',
            message: error.message,
          });
          return;
        }

        if (error.status === 409) {
          requestIdRef.current = null;
          setSubmitError({
            type: 'error',
            message: error.message,
            isConflict: true,
          });
          return;
        }

        if (error.isNetworkError || error.status === 0) {
          setSubmitError({
            type: 'warning',
            message: error.message,
            isNetwork: true,
          });
          return;
        }

        setSubmitError({
          type: 'error',
          message: error.message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusLabel = (status: OrderStatus | string) => {
    const tone = getOrderStatusTone(status);
    return (
      <span className={`text-xs font-semibold ${tone.text}`}>
        {getOrderStatusLabel(status, language)}
      </span>
    );
  };

  const receiptBranchLabel = completedReceipt
    ? completedReceipt.order.branchName?.trim() ||
      publicBranches.find((b) => b.id === completedReceipt.order.branchId)?.name ||
      completedReceipt.order.branchId ||
      '—'
    : '—';

  return (
    <>
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        mask={{ closable: !submitting }}
        size={520}
        title={
          <div className="flex items-center justify-between gap-3 pr-2">
            <div className="flex items-center gap-2 min-w-0">
              {checkoutMode && !completedReceipt && items.length > 0 ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setSubmitError(null);
                    setCheckoutMode(false);
                  }}
                  aria-label={to.editCartButton}
                  className="p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-[#f2f0ea] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <ShoppingCart className="w-4 h-4 text-[#16a34a] shrink-0" />
              )}
              <span className="font-display font-bold text-slate-900 truncate">
                {completedReceipt
                  ? completedReceipt.isReplay
                    ? to.orderReplayedTitle
                    : to.orderCreatedTitle
                  : checkoutMode && items.length > 0
                    ? to.checkoutSectionTitle
                    : tc.cartTitle}
              </span>
              {!completedReceipt && totalQuantity > 0 && (
                <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
                  ({totalQuantity} {tc.cartItemsCountSuffix})
                </span>
              )}
            </div>

            {!completedReceipt && !checkoutMode && items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer shrink-0"
              >
                {tc.cartClearButton}
              </button>
            )}
          </div>
        }
        styles={{
          body: {
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            height: '100%',
          },
        }}
      >
        {completedReceipt ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#15803d]">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="font-display font-bold text-base">
                    {completedReceipt.isReplay ? to.orderReplayedTitle : to.orderCreatedTitle}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs block">{to.orderNumberLabel}</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {completedReceipt.order.orderNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-xs block">{to.orderStatusLabel}</span>
                    {renderStatusLabel(completedReceipt.order.status)}
                  </div>
                </div>
                <div className="text-xs text-slate-600 pt-1 border-t border-[#dcfce7] flex flex-wrap justify-between gap-2">
                  <span>{to.placedAtLabel}:</span>
                  <span className="font-medium text-slate-800 tabular-nums">
                    {formatOrderDateTime(completedReceipt.order.placedAt, language)}
                  </span>
                </div>
              </div>

              {/* Contact + Fulfillment Summary */}
              <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-2.5 text-sm">
                <div className="text-xs font-semibold text-slate-500">{to.contactLabel}</div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-600">{to.phoneLabel}:</span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    {completedReceipt.order.phone?.trim() || '—'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-600">{to.telegramLabel}:</span>
                  <span className="font-mono font-medium text-slate-900 break-all">
                    {completedReceipt.order.telegramAddress?.trim() || '—'}
                  </span>
                </div>
                {completedReceipt.order.fulfillmentMethod && (
                  <>
                    <div className="pt-2 border-t border-[#f2f0ea] text-xs font-semibold text-slate-500">
                      {to.fulfillmentSummaryTitle}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-600">{to.fulfillmentTitle}:</span>
                      <span className="font-medium text-slate-900">
                        {getFulfillmentMethodLabel(
                          completedReceipt.order.fulfillmentMethod,
                          language,
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-600">{to.branchLabel}:</span>
                      <span className="font-medium text-slate-900">{receiptBranchLabel}</span>
                    </div>
                    {completedReceipt.order.deliveryAddress && (
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="text-slate-600">{to.deliveryAddressLabel}:</span>
                        <span className="font-medium text-slate-900 text-right max-w-[240px]">
                          {completedReceipt.order.deliveryAddress}
                        </span>
                      </div>
                    )}
                    {typeof completedReceipt.order.distanceKm === 'number' && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-slate-600">{to.distanceLabel}:</span>
                        <span className="font-medium text-slate-900 tabular-nums">
                          {formatDistanceKm(completedReceipt.order.distanceKm, language)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Server-calculated Itemized Breakdown */}
              <div className="rounded-xl border border-[#e6e4dd] bg-white divide-y divide-[#f2f0ea]">
                {completedReceipt.order.items.map((item) => (
                  <div key={item.variantId} className="p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                        <div className="text-xs font-mono text-slate-500">
                          {item.variantTitle || item.sku} · {item.quantity} {tc.cartItemsCountSuffix}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                        {formatPriceLabel(
                          item.lineTotal,
                          language,
                          completedReceipt.order.currency,
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 tabular-nums">
                      <span>
                        {to.unitPriceLabel}:{' '}
                        {formatPriceLabel(
                          item.unitPrice,
                          language,
                          completedReceipt.order.currency,
                        )}
                      </span>
                      {item.discountAmount > 0 && (
                        <span className="text-[#15803d]">
                          {to.discountLabel}: -
                          {formatPriceLabel(
                            item.discountAmount,
                            language,
                            completedReceipt.order.currency,
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Server Totals */}
              <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2 text-slate-600">
                  <span>{to.subtotalLabel}</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {formatPriceLabel(
                      completedReceipt.order.subtotal,
                      language,
                      completedReceipt.order.currency,
                    )}
                  </span>
                </div>
                {completedReceipt.order.discountTotal > 0 && (
                  <div className="flex items-center justify-between gap-2 text-[#15803d]">
                    <span>{to.discountTotalLabel}</span>
                    <span className="font-medium tabular-nums">
                      -
                      {formatPriceLabel(
                        completedReceipt.order.discountTotal,
                        language,
                        completedReceipt.order.currency,
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 text-slate-600">
                  <span>{to.shippingTotalLabel}</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {formatPriceLabel(
                      completedReceipt.order.shippingTotal,
                      language,
                      completedReceipt.order.currency,
                    )}
                  </span>
                </div>
                {completedReceipt.order.shippingTotal === 0 && (
                  <p className="text-xs text-slate-500">{to.shippingZeroNote}</p>
                )}
                <div className="pt-2 border-t border-[#e6e4dd] flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-900">{to.grandTotalLabel}</span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">
                    {formatPriceLabel(
                      completedReceipt.order.grandTotal,
                      language,
                      completedReceipt.order.currency,
                    )}
                  </span>
                </div>
              </div>

              {(completedReceipt.order.status === 'PENDING' ||
                completedReceipt.order.status === 'NEW_UNPAID') && (
                <Alert type="info" showIcon title={to.paymentPendingNote} className="text-xs" />
              )}
            </div>

            <div className="border-t border-[#e6e4dd] bg-[#faf9f5] p-4 sm:p-5 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  size="large"
                  icon={<ClipboardList className="w-4 h-4" />}
                  onClick={() => {
                    handleCloseDrawer();
                    navigate('/orders');
                  }}
                  className="!min-h-[44px]"
                >
                  {to.viewMyOrdersButton}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<ExternalLink className="w-4 h-4" />}
                  onClick={() => {
                    const targetId = completedReceipt.order.id;
                    handleCloseDrawer();
                    navigate(`/orders/${encodeURIComponent(targetId)}`);
                  }}
                  className="!min-h-[44px]"
                >
                  {to.viewOrderDetailButton}
                </Button>
              </div>
              <Button
                type="text"
                block
                onClick={handleCloseDrawer}
                className="!min-h-[40px] !text-slate-600"
              >
                {to.continueShoppingButton}
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <Empty
              image={<ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />}
              description={
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">{tc.cartEmptyTitle}</div>
                  <div className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
                    {tc.cartEmptyDescription}
                  </div>
                </div>
              }
            >
              <Button
                type="primary"
                size="large"
                onClick={handleCloseDrawer}
                className="!min-h-[44px]"
              >
                {tc.backToCatalog}
              </Button>
            </Empty>
          </div>
        ) : checkoutMode ? (
          <Form<CheckoutFormValues>
            form={checkoutForm}
            layout="vertical"
            requiredMark={false}
            onFinish={handlePlaceOrder}
            className="flex flex-col h-full"
          >
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {to.checkoutSectionSubtitle}
              </p>

              {submitError && (
                <Alert
                  type={submitError.type}
                  showIcon
                  title={submitError.message}
                  description={
                    submitError.isNetwork ? (
                      <span className="text-xs">{to.networkRetryHint}</span>
                    ) : submitError.isConflict ? (
                      <span className="text-xs">{to.priceChangedNotice}</span>
                    ) : undefined
                  }
                  className="text-xs"
                />
              )}

              {/* Contact Fields */}
              <Form.Item
                name="phone"
                label={<span className="text-sm font-medium text-slate-700">{to.phoneLabel}</span>}
                extra={<span className="text-xs text-slate-500">{to.phoneHint}</span>}
                rules={[
                  { required: true, message: to.validation.requiredPhone },
                  {
                    validator: (_, value: string) => {
                      const trimmed = (value ?? '').trim();
                      if (!trimmed) return Promise.resolve();
                      const res = validateOrderPhone(trimmed);
                      return res.valid
                        ? Promise.resolve()
                        : Promise.reject(new Error(to.validation.invalidPhone));
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  prefix={<Phone className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder={to.phonePlaceholder}
                  disabled={submitting}
                  onChange={() => {
                    userEditedPhoneRef.current = true;
                  }}
                />
              </Form.Item>

              <Form.Item
                name="telegramAddress"
                label={
                  <span className="text-sm font-medium text-slate-700">{to.telegramLabel}</span>
                }
                extra={<span className="text-xs text-slate-500">{to.telegramHint}</span>}
                rules={[
                  { required: true, message: to.validation.requiredTelegram },
                  {
                    validator: (_, value: string) => {
                      const trimmed = (value ?? '').trim();
                      if (!trimmed) return Promise.resolve();
                      return isValidTelegramAddress(trimmed)
                        ? Promise.resolve()
                        : Promise.reject(new Error(to.validation.invalidTelegram));
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  prefix={<Send className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder={to.telegramPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>

              {/* Fulfillment Selector */}
              <div className="space-y-2.5 pt-1">
                <div className="text-sm font-medium text-slate-700">{to.fulfillmentTitle}</div>
                <Segmented
                  block
                  size="large"
                  disabled={submitting}
                  value={fulfillmentMethod}
                  onChange={(val) => {
                    setFulfillmentMethod(val as FulfillmentMethod);
                    setBranchValidationError(null);
                    setLocationValidationError(null);
                    setSubmitError(null);
                  }}
                  options={[
                    { label: to.fulfillmentMethods.PICKUP, value: 'PICKUP' },
                    { label: to.fulfillmentMethods.DELIVERY, value: 'DELIVERY' },
                  ]}
                />
                <p className="text-xs text-slate-500">
                  {fulfillmentMethod === 'PICKUP' ? to.pickupMethodHint : to.deliveryMethodHint}
                </p>
              </div>

              {/* Branch Selection */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">{to.selectBranchLabel}</span>
                  <div className="flex items-center gap-2">
                    {fulfillmentMethod === 'PICKUP' && (
                      <Button
                        size="small"
                        icon={<Crosshair className="w-3.5 h-3.5" />}
                        loading={geoLoading}
                        disabled={submitting}
                        onClick={handleGetBrowserLocation}
                        className="!min-h-[32px]"
                      >
                        {geoLoading ? to.gettingLocationLabel : to.getLocationButton}
                      </Button>
                    )}
                    {branchesError && (
                      <button
                        type="button"
                        onClick={() => void fetchPublicBranches()}
                        className="text-xs font-medium text-[#16a34a] cursor-pointer"
                      >
                        {tc.retryButton}
                      </button>
                    )}
                  </div>
                </div>

                {activeReferenceLocation && sortedCompatibleBranches.length > 0 && (
                  <p className="text-xs text-[#15803d]">{to.nearestSortedHint}</p>
                )}

                {fulfillmentMethod === 'PICKUP' && geoNotice && (
                  <Alert type={geoNotice.type} showIcon title={geoNotice.text} className="text-xs" />
                )}

                {branchesLoading && publicBranches.length === 0 ? (
                  <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-2">
                    <div className="text-xs text-slate-500">{to.loadingBranches}</div>
                    <Skeleton active paragraph={{ rows: 2 }} title={false} />
                  </div>
                ) : branchesError ? (
                  <Alert type="error" showIcon title={branchesError} className="text-xs" />
                ) : sortedCompatibleBranches.length === 0 ? (
                  <Alert type="warning" showIcon title={to.noBranchesForMethod} className="text-xs" />
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                    {sortedCompatibleBranches.map(({ branch, distanceMeters }) => {
                      const active = branch.id === selectedBranchId;
                      const formattedDistance = formatBranchDistance(distanceMeters, language);
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          disabled={submitting}
                          onClick={() => {
                            setSelectedBranchId(branch.id);
                            setBranchValidationError(null);
                          }}
                          className={`w-full text-left rounded-xl border p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                            active
                              ? 'border-[#16a34a] bg-[#f0fdf4]'
                              : 'border-[#e6e4dd] bg-white hover:border-[#cbd5e1]'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-lg border border-[#e6e4dd] bg-[#faf9f5] overflow-hidden shrink-0">
                            <PublicCatalogImage
                              url={branch.imageUrl ? resolveBranchImageUrl(branch.imageUrl) : null}
                              alt={branch.name}
                              fallbackVariant="brand"
                              className="w-full h-full"
                              imgClassName="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900 truncate">
                                {branch.name}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                {activeReferenceLocation && (
                                  <span
                                    className={`text-xs font-medium tabular-nums ${
                                      formattedDistance ? 'text-[#15803d]' : 'text-slate-400'
                                    }`}
                                  >
                                    {formattedDistance ?? to.distanceUnavailable}
                                  </span>
                                )}
                                {active && (
                                  <span className="w-2 h-2 rounded-full bg-[#16a34a] shrink-0" />
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-slate-600">
                              {branch.city} · {branch.addressLine}
                            </div>
                            {(branch.workingHours || branch.phone) && (
                              <div className="text-[11px] text-slate-500 tabular-nums">
                                {[branch.workingHours, branch.phone].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {fulfillmentMethod === 'PICKUP' && selectedBranch && (
                  <BranchDirections key={selectedBranch.id} branch={selectedBranch} language={language} />
                )}

                {branchValidationError && (
                  <div className="text-xs text-red-600">{branchValidationError}</div>
                )}
              </div>

              {/* Delivery Location Picker + Auto Reverse Geocoding + Optional Note + Live Quote */}
              {fulfillmentMethod === 'DELIVERY' && (
                <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3.5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700">{to.locationLabel}</span>
                      <Button
                        size="small"
                        icon={<Crosshair className="w-3.5 h-3.5" />}
                        loading={geoLoading}
                        disabled={submitting}
                        onClick={handleGetBrowserLocation}
                        className="!min-h-[34px]"
                      >
                        {geoLoading ? to.gettingLocationLabel : to.getLocationButton}
                      </Button>
                    </div>

                    {geoNotice && (
                      <Alert type={geoNotice.type} showIcon title={geoNotice.text} className="text-xs" />
                    )}

                    <p className="text-xs text-slate-500">{to.mapPickHint}</p>

                    <LocationPickerMap
                      latitude={deliveryLocation?.latitude}
                      longitude={deliveryLocation?.longitude}
                      branchMarker={
                        selectedBranch &&
                        typeof selectedBranch.latitude === 'number' &&
                        typeof selectedBranch.longitude === 'number'
                          ? {
                              latitude: selectedBranch.latitude,
                              longitude: selectedBranch.longitude,
                              label: selectedBranch.name,
                            }
                          : null
                      }
                      onChange={applyDeliveryPoint}
                      disabled={submitting}
                      heightClass="h-48"
                    />

                    {/* Auto-filled Resolved Address Summary */}
                    <div className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5] p-3 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                          <span>{to.selectedAddressLabel}</span>
                        </span>
                        {!geocodeLoading && deliveryLocation && geocodeResult?.isApproximate && (
                          <span className="text-[11px] font-semibold text-amber-700">
                            {to.approximateAddressBadge}
                          </span>
                        )}
                      </div>

                      {!deliveryLocation ? (
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {to.selectPointPrompt}
                        </p>
                      ) : geocodeLoading ? (
                        <div className="flex items-center gap-2 text-xs text-slate-600 py-0.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16a34a] shrink-0" />
                          <span>{to.resolvingAddressLabel}</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-medium text-slate-900 leading-snug">
                            {geocodeResult?.fullAddress ??
                              formatFallbackPointAddress(
                                deliveryLocation.latitude,
                                deliveryLocation.longitude,
                                language,
                              )}
                          </p>
                          {geocodeResult?.isApproximate && (
                            <p className="text-[11px] text-amber-700">
                              {to.approximateAddressHint}
                            </p>
                          )}
                          {geocodeFailed && (
                            <p className="text-[11px] text-slate-500">{to.geocodeFallbackNote}</p>
                          )}
                          <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                            {deliveryLocation.latitude.toFixed(6)},{' '}
                            {deliveryLocation.longitude.toFixed(6)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Optional Apartment / Entrance / Landmark */}
                    <Form.Item
                      name="deliveryAddressNote"
                      label={
                        <span className="text-xs font-medium text-slate-700">
                          {to.addressNoteLabel}
                        </span>
                      }
                      className="!mb-0"
                    >
                      <Input
                        size="large"
                        maxLength={120}
                        placeholder={to.addressNotePlaceholder}
                        disabled={submitting}
                      />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-600">
                          {to.latitudeLabel}
                        </label>
                        <InputNumber
                          size="middle"
                          step={0.0001}
                          precision={7}
                          disabled={submitting}
                          value={deliveryLocation?.latitude ?? null}
                          placeholder="41.3110810"
                          className="!w-full font-mono"
                          onChange={(val) => {
                            if (typeof val === 'number' && isValidLatitude(val)) {
                              applyDeliveryPoint({
                                latitude: roundCoordinate7(val),
                                longitude:
                                  deliveryLocation?.longitude ?? DEFAULT_MAP_LOCATION.longitude,
                              });
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-600">
                          {to.longitudeLabel}
                        </label>
                        <InputNumber
                          size="middle"
                          step={0.0001}
                          precision={7}
                          disabled={submitting}
                          value={deliveryLocation?.longitude ?? null}
                          placeholder="69.2405620"
                          className="!w-full font-mono"
                          onChange={(val) => {
                            if (typeof val === 'number' && isValidLongitude(val)) {
                              applyDeliveryPoint({
                                latitude:
                                  deliveryLocation?.latitude ?? DEFAULT_MAP_LOCATION.latitude,
                                longitude: roundCoordinate7(val),
                              });
                            }
                          }}
                        />
                      </div>
                    </div>

                    {locationValidationError && (
                      <div className="text-xs text-red-600">{locationValidationError}</div>
                    )}
                  </div>

                  {/* Delivery Quote Breakdown */}
                  {quoteLoading ? (
                    <div className="text-xs text-slate-500 pt-1">{to.deliveryQuoteLoading}</div>
                  ) : quoteError ? (
                    <Alert type="error" showIcon title={quoteError} className="text-xs" />
                  ) : deliveryQuote ? (
                    <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-xs space-y-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600">{to.distanceLabel}:</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {formatDistanceKm(deliveryQuote.distanceKm, language)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-600">{to.ratePerKmLabel}:</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {formatPriceLabel(
                            deliveryQuote.pricePerKm,
                            language,
                            deliveryQuote.currency,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 pt-1 border-t border-[#dcfce7]">
                        <span className="font-semibold text-[#15803d]">{to.deliveryFeeLabel}:</span>
                        <span className="font-bold text-[#15803d] tabular-nums">
                          {formatPriceLabel(
                            deliveryQuote.deliveryPrice,
                            language,
                            deliveryQuote.currency,
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 pt-0.5">{to.straightLineHint}</p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Compact Order Items Overview */}
              <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>
                    {to.itemsListTitle} ({items.length})
                  </span>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setSubmitError(null);
                      setCheckoutMode(false);
                    }}
                    className="text-[#16a34a] hover:text-[#15803d] font-medium cursor-pointer"
                  >
                    {to.editCartButton}
                  </button>
                </div>

                <div className="divide-y divide-[#e6e4dd] max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.variantId}
                      className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {item.productTitle}
                        </div>
                        <div className="text-slate-500 font-mono">
                          {item.variantTitle || item.sku} × {item.quantity}
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                        {formatPriceLabel(
                          item.price.amount * item.quantity,
                          language,
                          item.price.currency,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[#e6e4dd] bg-[#faf9f5] p-4 sm:p-5 space-y-2.5">
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-2">
                  <span>{to.subtotalLabel}</span>
                  <span className="font-medium text-slate-900 tabular-nums">{totalAmountLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>{to.shippingTotalLabel}</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {fulfillmentMethod === 'PICKUP'
                      ? formatPriceLabel(0, language, primaryCurrency)
                      : deliveryQuote
                        ? formatPriceLabel(
                            deliveryQuote.deliveryPrice,
                            language,
                            deliveryQuote.currency,
                          )
                        : '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-3 pt-1 border-t border-[#e6e4dd]">
                <span className="text-sm font-semibold text-slate-900">
                  {to.estimatedTotalLabel}:
                </span>
                <span className="text-xl font-bold text-slate-900 tabular-nums">
                  {estimatedGrandTotalLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{to.serverFinalTotalNote}</p>

              <div className="flex gap-2.5 pt-1">
                <Button
                  size="large"
                  disabled={submitting}
                  onClick={() => {
                    setSubmitError(null);
                    setCheckoutMode(false);
                  }}
                  className="!min-h-[48px]"
                >
                  {to.editCartButton}
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={submitting}
                  disabled={
                    submitting ||
                    hasInvalidPricedItem ||
                    exceedsVariantLimit ||
                    exceedsQtyLimit ||
                    sortedCompatibleBranches.length === 0
                  }
                  className="!min-h-[48px] !text-base !font-semibold flex-1"
                >
                  {to.submitOrderButton}
                </Button>
              </div>
            </div>
          </Form>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {items.map((item) => {
                const productUrl = `/products/${encodeURIComponent(
                  item.productSlug || item.productId,
                )}?variant=${encodeURIComponent(item.variantId)}`;
                const discounted = hasVariantDiscount(item.price);
                const unitPriceLabel = formatPriceLabel(
                  item.price.amount,
                  language,
                  item.price.currency,
                );
                const regularPriceLabel = formatPriceLabel(
                  item.price.regularPrice,
                  language,
                  item.price.currency,
                );
                const lineTotalLabel = formatPriceLabel(
                  item.price.amount * item.quantity,
                  language,
                  item.price.currency,
                );
                const maxQtyReached = item.quantity >= MAX_CART_ITEM_QUANTITY;

                return (
                  <article
                    key={item.variantId}
                    className="rounded-xl border border-[#e6e4dd] bg-white p-3.5 flex gap-3.5"
                  >
                    <Link
                      to={productUrl}
                      onClick={handleCloseDrawer}
                      className="w-20 h-20 rounded-lg border border-[#e6e4dd] bg-[#faf9f5] overflow-hidden shrink-0"
                    >
                      <PublicCatalogImage
                        url={item.imageUrl}
                        alt={item.productTitle}
                        fallbackVariant="product"
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover"
                      />
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <Link
                            to={productUrl}
                            onClick={handleCloseDrawer}
                            className="text-sm font-semibold text-slate-900 hover:text-[#15803d] line-clamp-2 transition-colors"
                          >
                            {item.productTitle}
                          </Link>
                          <div className="text-xs font-mono text-slate-500 truncate">
                            {item.variantTitle || item.sku}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          aria-label={tc.cartRemoveItem}
                          title={tc.cartRemoveItem}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className="font-medium text-slate-700 tabular-nums">
                            {unitPriceLabel}
                          </span>
                          {discounted && (
                            <span className="text-slate-400 line-through tabular-nums">
                              {regularPriceLabel}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900 text-sm tabular-nums">
                          {lineTotalLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="inline-flex items-center rounded-lg border border-[#e6e4dd] bg-[#faf9f5] h-9 overflow-hidden select-none">
                          <button
                            type="button"
                            onClick={() => decrement(item.variantId)}
                            aria-label={tc.decreaseQuantityLabel}
                            className="h-full w-9 inline-flex items-center justify-center text-slate-700 hover:bg-[#eceae2] transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-sm font-semibold text-slate-900 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={maxQtyReached}
                            onClick={() => increment(item.variantId)}
                            aria-label={tc.increaseQuantityLabel}
                            className={`h-full w-9 inline-flex items-center justify-center transition-colors ${
                              maxQtyReached
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-700 hover:bg-[#eceae2] cursor-pointer'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="border-t border-[#e6e4dd] bg-[#faf9f5] p-4 sm:p-5 space-y-3">
              {hasInvalidPricedItem && (
                <Alert type="warning" showIcon title={tc.cartNoPriceBlocked} className="text-xs" />
              )}

              {exceedsVariantLimit && (
                <Alert type="warning" showIcon title={to.itemsLimitError} className="text-xs" />
              )}

              {submitError && (
                <Alert type={submitError.type} showIcon title={submitError.message} className="text-xs" />
              )}

              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-slate-600">
                  {tc.cartTotalLabel} ({totalQuantity} {tc.cartItemsCountSuffix}):
                </span>
                <span className="text-xl font-bold text-slate-900 tabular-nums">
                  {totalAmountLabel}
                </span>
              </div>

              <Button
                type="primary"
                size="large"
                block
                disabled={
                  hasInvalidPricedItem ||
                  items.length === 0 ||
                  exceedsVariantLimit ||
                  exceedsQtyLimit
                }
                onClick={handleCheckoutClick}
                className="!min-h-[48px] !text-base !font-semibold"
              >
                {tc.cartOrderButton}
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <GuestAuthModal
        open={authModalOpen}
        language={language}
        cartSummary={{ itemCount: totalQuantity, totalAmountLabel }}
        productPath="/?openCart=1&checkout=1"
        onCancel={() => setAuthModalOpen(false)}
        onAuthenticated={handleModalAuthenticated}
      />
    </>
  );
}
