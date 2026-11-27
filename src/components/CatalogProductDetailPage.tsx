import { PUBLIC_SITE_ORIGIN } from '../constants';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InputRef } from 'antd';
import { Alert, App as AntApp, Button, Input, Modal, Result, Skeleton } from 'antd';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  RefreshCw,
  Share2,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  clearPendingCheckoutDraft,
  readPendingCheckoutDraft,
  savePendingCheckoutDraft,
  useCart,
} from '../contexts/CartContext';
import { useProductSocial } from '../hooks/useProductSocial';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import { catalogApi } from '../services/catalogApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import type { CatalogTreeResponse, CatalogVariant } from '../types/catalog';
import {
  clearPendingProductOrder,
  findProductInCatalog,
  flattenCatalogTree,
  getCategoryPath,
  pickDefaultVariant,
  pickPrimaryImage,
  readPendingProductOrder,
  sortVariantImages,
} from '../utils/catalog';
import { isValidVariantPrice } from '../utils/price';
import { isProfileComplete } from '../utils/validation';
import { CartQuantityControl } from './CartQuantityControl';
import { GuestAuthModal } from './GuestAuthModal';
import { ProductCommentsSection, ProductLikeButton } from './ProductSocialSection';
import { PublicCatalogImage } from './PublicCatalogImage';
import { SiteFooter } from './SiteFooter';
import { StoreHeader } from './StoreHeader';
import { SwipeableProductGallery } from './SwipeableProductGallery';
import { VariantPriceDisplay } from './VariantPriceDisplay';

interface CatalogProductDetailPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile | null;
  accessToken?: string | null;
  isAuthenticated: boolean;
  onAuthenticatedInPlace: (session: AuthSession, profile: UserProfile) => void;
  onUnauthorizedInPlace?: () => void;
  onLogout?: () => void;
}

export function CatalogProductDetailPage({
  language,
  onLanguageChange,
  profile,
  accessToken = null,
  isAuthenticated,
  onAuthenticatedInPlace,
  onUnauthorizedInPlace,
  onLogout,
}: CatalogProductDetailPageProps) {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const scrolledHashKeyRef = useRef<string | null>(null);

  const { message } = AntApp.useApp();
  const t = translations[language];
  const tc = t.catalog;
  const { syncWithCatalogIndex, getQuantity, addVariant, openDrawer } = useCart();

  const [tree, setTree] = useState<CatalogTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authModalPurpose, setAuthModalPurpose] = useState<'checkout' | 'social'>('checkout');
  const [shareCopiedRecent, setShareCopiedRecent] = useState(false);
  const [manualShareUrl, setManualShareUrl] = useState<string | null>(null);
  const shareResetTimerRef = useRef<number | null>(null);
  const manualShareInputRef = useRef<InputRef | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await catalogApi.getTree(language);
      setTree(response);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          language === 'ru'
            ? 'Не удалось загрузить данные товара. Попробуйте ещё раз.'
            : 'Mahsulot ma’lumotlarini yuklab bo‘lmadi. Qaytadan urinib ko‘ring.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const index = useMemo(
    () =>
      tree
        ? flattenCatalogTree(tree)
        : {
            rootCategories: [],
            categoryById: {},
            descendantIdsByCategoryId: {},
            products: [],
            uncategorizedProductIds: [],
          },
    [tree],
  );

  useEffect(() => {
    if (tree) {
      syncWithCatalogIndex(index);
    }
  }, [tree, index, syncWithCatalogIndex]);

  const foundEntry = useMemo(
    () => (idOrSlug ? findProductInCatalog(index, idOrSlug) : null),
    [idOrSlug, index],
  );

  const product = foundEntry?.product ?? null;

  const categoryTrail = useMemo(
    () =>
      foundEntry?.primaryCategory
        ? getCategoryPath(index.categoryById, foundEntry.primaryCategory.id)
        : [],
    [foundEntry?.primaryCategory, index.categoryById],
  );

  // Sync default variant or restore URL / Google OAuth pending selection
  useEffect(() => {
    if (!product) {
      setSelectedVariantId(null);
      return;
    }

    const urlVariantId = searchParams.get('variant');
    const pendingOrder = readPendingProductOrder();

    setSelectedVariantId((currentId) => {
      if (currentId && product.variants.some((v) => v.id === currentId)) {
        return currentId;
      }
      if (urlVariantId && product.variants.some((v) => v.id === urlVariantId)) {
        return urlVariantId;
      }
      if (
        pendingOrder &&
        pendingOrder.productId === product.id &&
        pendingOrder.variantId &&
        product.variants.some((v) => v.id === pendingOrder.variantId)
      ) {
        return pendingOrder.variantId;
      }
      return pickDefaultVariant(product.variants)?.id ?? null;
    });
  }, [product, searchParams]);

  // If user returned authenticated via Google OAuth with a pending selection, restore appropriately
  useEffect(() => {
    if (!isAuthenticated || !product) return;
    const pendingOrder = readPendingProductOrder();
    const pendingDraft = readPendingCheckoutDraft();
    if (pendingOrder && pendingOrder.productId === product.id) {
      if (
        pendingOrder.variantId &&
        product.variants.some((v) => v.id === pendingOrder.variantId)
      ) {
        setSelectedVariantId(pendingOrder.variantId);
      }

      if (pendingOrder.intent === 'social') {
        clearPendingProductOrder();
        return;
      }

      const targetVariant =
        (pendingOrder.variantId &&
          product.variants.find((v) => v.id === pendingOrder.variantId)) ||
        pickDefaultVariant(product.variants);

      if (targetVariant) {
        setSelectedVariantId(targetVariant.id);
        if (getQuantity(targetVariant.id) === 0 && isValidVariantPrice(targetVariant.price)) {
          addVariant({ product, variant: targetVariant });
        }
      }
      clearPendingProductOrder();
      if (pendingDraft?.checkoutRequested) {
        clearPendingCheckoutDraft();
        openDrawer({ checkout: true });
      }
    }
  }, [isAuthenticated, product, getQuantity, addVariant, openDrawer]);

  const handleRequestSocialAuth = useCallback(() => {
    setAuthModalPurpose('social');
    setLoginModalOpen(true);
  }, []);

  const socialState = useProductSocial({
    productId: product?.id ?? null,
    language,
    accessToken,
    isAuthenticated,
    onUnauthorizedInPlace,
    onRequestAuth: handleRequestSocialAuth,
    onReloadProduct: loadTree,
  });

  const activeVariant: CatalogVariant | null = useMemo(() => {
    if (!product) return null;
    if (selectedVariantId) {
      const matched = product.variants.find((v) => v.id === selectedVariantId);
      if (matched) return matched;
    }
    return pickDefaultVariant(product.variants);
  }, [product, selectedVariantId]);

  const galleryImages = useMemo(
    () => (activeVariant ? sortVariantImages(activeVariant.images) : []),
    [activeVariant],
  );

  useEffect(() => {
    const primary = pickPrimaryImage(galleryImages);
    setSelectedImageId(primary?.id ?? null);
  }, [activeVariant?.id, galleryImages]);

  const activeImage = useMemo(() => {
    if (galleryImages.length === 0) return null;
    if (selectedImageId) {
      const matched = galleryImages.find((img) => img.id === selectedImageId);
      if (matched) return matched;
    }
    return pickPrimaryImage(galleryImages);
  }, [galleryImages, selectedImageId]);

  useEffect(() => {
    if (location.hash !== '#comments' || !product || loading) return;
    const targetKey = `${location.key}:${product.id}:${location.hash}`;
    if (scrolledHashKeyRef.current === targetKey) return;
    scrolledHashKeyRef.current = targetKey;

    const timer = window.setTimeout(() => {
      const commentsEl = document.getElementById('comments');
      if (commentsEl) {
        commentsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        commentsEl.focus({ preventScroll: true });
      }
    }, 100);

    return () => window.clearTimeout(timer);
  }, [loading, location.hash, location.key, product]);

  useEffect(() => {
    return () => {
      if (shareResetTimerRef.current !== null) {
        window.clearTimeout(shareResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setShareCopiedRecent(false);
    setManualShareUrl(null);
  }, [idOrSlug]);

  const handleShareClick = useCallback(async () => {
    if (!product) return;
    const productPath = `/products/${encodeURIComponent(product.slug || product.id)}`;
    const currentUrl = new URL(productPath, PUBLIC_SITE_ORIGIN).href;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(currentUrl);
        message.success(tc.shareCopiedSuccess);
        setShareCopiedRecent(true);
        if (shareResetTimerRef.current !== null) {
          window.clearTimeout(shareResetTimerRef.current);
        }
        shareResetTimerRef.current = window.setTimeout(() => {
          setShareCopiedRecent(false);
          shareResetTimerRef.current = null;
        }, 2000);
        return;
      } catch {
        // Clipboard permission denied or unavailable in current context; fall back to manual modal
      }
    }
    setManualShareUrl(currentUrl);
  }, [message, product, tc.shareCopiedSuccess]);

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
  };

  const activeVariantHasPrice = Boolean(activeVariant && isValidVariantPrice(activeVariant.price));

  const handleOrderClick = () => {
    if (!product || !activeVariant || !activeVariantHasPrice) return;
    if (getQuantity(activeVariant.id) === 0) {
      addVariant({ product, variant: activeVariant });
    }
    if (!isAuthenticated) {
      savePendingCheckoutDraft({ checkoutRequested: true });
      setAuthModalPurpose('checkout');
      setLoginModalOpen(true);
      return;
    }
    openDrawer({ checkout: true });
  };

  const handleModalAuthenticated = (nextSession: AuthSession, nextProfile: UserProfile) => {
    setLoginModalOpen(false);
    clearPendingProductOrder();
    onAuthenticatedInPlace(nextSession, nextProfile);

    if (authModalPurpose === 'social') {
      socialState.handleAuthenticatedInPlaceComplete();
      return;
    }

    if (product && activeVariant && activeVariantHasPrice && getQuantity(activeVariant.id) === 0) {
      addVariant({ product, variant: activeVariant });
    }
    openDrawer({ checkout: true });
  };

  const profileComplete = profile ? isProfileComplete(profile) : false;
  const displayTitle = product ? product.title?.trim() || product.slug : '';

  const hasWeight =
    typeof activeVariant?.weightGrams === 'number' && activeVariant.weightGrams > 0;
  const hasLength = typeof activeVariant?.lengthMm === 'number' && activeVariant.lengthMm > 0;
  const hasWidth = typeof activeVariant?.widthMm === 'number' && activeVariant.widthMm > 0;
  const hasHeight = typeof activeVariant?.heightMm === 'number' && activeVariant.heightMm > 0;
  const hasAnySpecification = hasWeight || hasLength || hasWidth || hasHeight;

  const dimensionsParts = [
    hasLength ? `${activeVariant!.lengthMm} ${tc.mmUnit}` : null,
    hasWidth ? `${activeVariant!.widthMm} ${tc.mmUnit}` : null,
    hasHeight ? `${activeVariant!.heightMm} ${tc.mmUnit}` : null,
  ].filter(Boolean);

  return (
    <div
      className={`min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col ${
        product ? 'pb-24 md:pb-0' : ''
      }`}
    >
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-5 sm:space-y-6">
        {/* Top Back / Breadcrumb Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label={tc.navCatalog}
            className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-slate-500"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-[#15803d] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{tc.navCatalog}</span>
            </Link>

            {categoryTrail.map((cat) => (
              <span key={cat.id} className="inline-flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <Link
                  to={`/?category=${encodeURIComponent(cat.id)}`}
                  className="hover:text-[#15803d] transition-colors"
                >
                  {cat.name || cat.slug}
                </Link>
              </span>
            ))}

            {product && (
              <span className="inline-flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900 truncate max-w-[260px]">
                  {displayTitle}
                </span>
              </span>
            )}
          </nav>
        </div>

        {loading && !tree ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 aspect-[4/3] rounded-lg bg-[#f2f0ea] animate-pulse" />
            <div className="lg:col-span-6 space-y-4">
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
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
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => void loadTree()}
              >
                {tc.retryButton}
              </Button>
            }
          />
        ) : !product ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="404"
              title={tc.productNotFoundTitle}
              subTitle={tc.productNotFoundSubtitle}
              extra={
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/')}
                  className="!min-h-[44px]"
                >
                  {tc.backToCatalog}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Contiguous Gallery + Purchase Module */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left: Gallery (Swipeable on mobile + arrows/keyboard/thumbnails on desktop) */}
              <div className="md:col-span-6 space-y-3 md:sticky md:top-24">
                <SwipeableProductGallery
                  images={galleryImages}
                  alt={displayTitle}
                  emptyLabel={tc.noImageLabel}
                  prevLabel={tc.prevImageAriaLabel}
                  nextLabel={tc.nextImageAriaLabel}
                  selectedImageId={activeImage?.id ?? null}
                  onSelectImageId={setSelectedImageId}
                  aspectClassName="aspect-[4/3]"
                  containerClassName="rounded-lg border border-[#e6e4dd] bg-white"
                  imgClassName="w-full h-full object-contain p-2 sm:p-3"
                  arrowsVisibility="always"
                />

                {galleryImages.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto oson-scrollbar-none pb-0.5">
                    {galleryImages.map((img) => {
                      const isSelected = activeImage?.id === img.id;
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setSelectedImageId(img.id)}
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg border overflow-hidden shrink-0 bg-white transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-[#16a34a] ring-2 ring-[#bbf7d0]'
                              : 'border-[#e6e4dd] hover:border-[#86efac]'
                          }`}
                          aria-label={displayTitle}
                        >
                          <PublicCatalogImage
                            url={img.imageUrl}
                            alt={displayTitle}
                            fallbackVariant="product"
                            className="w-full h-full"
                            imgClassName="w-full h-full object-contain p-1"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Product Name & Price -> Variants -> Purchase CTA -> Meta/Specs */}
              <div className="md:col-span-6 space-y-5">
                {/* Brand & Category Line */}
                {(product.brand || (foundEntry && foundEntry.categoryNames.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {product.brand && (
                      <div className="inline-flex items-center gap-2">
                        <PublicCatalogImage
                          url={product.brand.logoUrl}
                          alt={product.brand.name}
                          fallbackVariant="brand"
                          className="w-7 h-7 rounded-lg border border-[#e6e4dd] bg-white overflow-hidden flex items-center justify-center shrink-0"
                          imgClassName="w-full h-full object-contain p-1"
                        />
                        <span className="text-sm font-semibold text-slate-800">
                          {product.brand.name}
                        </span>
                      </div>
                    )}

                    {product.brand && foundEntry?.categoryNames.length ? (
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                    ) : null}

                    {foundEntry && foundEntry.categoryNames.length > 0 && (
                      <span className="text-xs font-medium text-slate-500">
                        {foundEntry.categoryNames.join(', ')}
                      </span>
                    )}
                  </div>
                )}

                {/* Title + Like & Share */}
                <div className="space-y-3">
                  <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-display [text-wrap:balance] min-w-0 flex-1">
                      {displayTitle}
                    </h1>
                    <div className="flex items-center gap-2 shrink-0">
                      <ProductLikeButton
                        language={language}
                        likeCount={socialState.social?.likeCount ?? 0}
                        likedByMe={Boolean(socialState.social?.likedByMe)}
                        loading={socialState.socialLoading && !socialState.social}
                        pending={socialState.productLikePending}
                        onToggle={() => void socialState.toggleProductLike()}
                      />
                      <button
                        type="button"
                        onClick={() => void handleShareClick()}
                        aria-label={tc.shareAriaLabel}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg border text-sm font-medium transition-colors shrink-0 cursor-pointer whitespace-nowrap ${
                          shareCopiedRecent
                            ? 'bg-[#f0fdf4] border-[#86efac] text-[#15803d]'
                            : 'bg-white border-[#e6e4dd] text-slate-700 hover:border-slate-300 hover:bg-[#faf9f5]'
                        }`}
                      >
                        {shareCopiedRecent ? (
                          <Check className="w-4 h-4 shrink-0 text-[#16a34a]" />
                        ) : (
                          <Share2 className="w-4 h-4 shrink-0 text-slate-500" />
                        )}
                        <span>{tc.shareButton}</span>
                      </button>
                    </div>
                  </div>

                  {/* Selected Variant Price directly with Title */}
                  <VariantPriceDisplay
                    price={activeVariant?.price}
                    language={language}
                    size="detail"
                  />
                </div>

                {/* Variant Selector */}
                {product.variants.length > 0 && (
                  <div className="space-y-2.5 pt-4 border-t border-[#f2f0ea]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {tc.variantsTitle}
                      </span>
                      {activeVariant?.sku && (
                        <span className="text-xs text-slate-500">
                          {tc.selectedSkuLabel}:{' '}
                          <code className="font-mono text-slate-800">{activeVariant.sku}</code>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((variant) => {
                        const isSelected = activeVariant?.id === variant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => handleSelectVariant(variant.id)}
                            className={`inline-flex items-center gap-2 px-3.5 min-h-[42px] rounded-lg border text-sm transition-colors cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? 'bg-[#f0fdf4] border-[#16a34a] text-[#15803d] font-semibold ring-1 ring-[#16a34a]/20'
                                : 'bg-white border-[#e6e4dd] text-slate-700 hover:border-[#86efac]'
                            }`}
                          >
                            <span className="font-mono text-xs sm:text-sm">{variant.title || variant.sku}</span>
                            {variant.defaultType && (
                              <span className="text-xs opacity-75">
                                ({tc.defaultVariantLabel})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Desktop & Tablet Cart + Order CTA */}
                <div className="space-y-3 pt-4 border-t border-[#f2f0ea]">
                  <div className="flex flex-col xl:flex-row items-stretch gap-3">
                    <CartQuantityControl
                      product={product}
                      variant={activeVariant}
                      language={language}
                      size="detail"
                    />

                    <Button
                      type="primary"
                      size="large"
                      block
                      disabled={!activeVariantHasPrice}
                      icon={<ShoppingCart className="w-4 h-4" />}
                      onClick={handleOrderClick}
                      className="!min-h-[44px] sm:!min-h-[48px] !text-sm sm:!text-base !font-semibold flex-1"
                    >
                      {tc.orderButton}
                    </Button>
                  </div>

                  {!activeVariantHasPrice ? (
                    <p className="text-xs text-slate-500 text-center">{tc.cartNoPriceBlocked}</p>
                  ) : !isAuthenticated ? (
                    <p className="text-xs text-slate-500 text-center">{tc.guestOrderHint}</p>
                  ) : null}
                </div>

                {/* Short Summary, Kind, Warranty & Conditional Dimensions */}
                {(product.shortDescription?.trim() ||
                  product.productKind ||
                  (product.warrantyMonths !== null && product.warrantyMonths !== undefined) ||
                  hasAnySpecification) && (
                  <div className="space-y-3 pt-4 border-t border-[#f2f0ea]">
                    {product.shortDescription?.trim() && (
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
                        {product.shortDescription.trim()}
                      </p>
                    )}

                    {(product.productKind ||
                      (product.warrantyMonths !== null &&
                        product.warrantyMonths !== undefined)) && (
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                        {product.productKind && (
                          <span>
                            {tc.productKindLabel}:{' '}
                            <strong className="font-medium text-slate-800">
                              {product.productKind}
                            </strong>
                          </span>
                        )}
                        {product.productKind &&
                          product.warrantyMonths !== null &&
                          product.warrantyMonths !== undefined && <span aria-hidden="true">·</span>}
                        {product.warrantyMonths !== null &&
                          product.warrantyMonths !== undefined && (
                            <span className="inline-flex items-center gap-1 text-slate-700 font-medium tabular-nums">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#16a34a]" />
                              {tc.warrantyPrefix}: {product.warrantyMonths} {tc.warrantyMonthsSuffix}
                            </span>
                          )}
                      </div>
                    )}

                    {hasAnySpecification && (
                      <div className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5] p-3.5 space-y-2">
                        <div className="text-xs font-semibold text-slate-700">
                          {tc.specificationsTitle}
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                          {hasWeight && (
                            <div>
                              <dt className="text-xs text-slate-500">{tc.weightLabel}</dt>
                              <dd className="font-medium text-slate-900 tabular-nums">
                                {activeVariant!.weightGrams} {tc.weightUnit}
                              </dd>
                            </div>
                          )}
                          {dimensionsParts.length > 0 && (
                            <div>
                              <dt className="text-xs text-slate-500">{tc.dimensionsLabel}</dt>
                              <dd className="font-medium text-slate-900 tabular-nums">
                                {dimensionsParts.join(' × ')}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Full Description Section (only if present) */}
            {product.description && product.description.trim() && (
              <section className="bg-white border border-[#e6e4dd] rounded-xl p-4 sm:p-6 lg:p-8 space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">{tc.descriptionTitle}</h2>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </section>
            )}

            {/* Product Comments & Replies Section */}
            <ProductCommentsSection
              language={language}
              isAuthenticated={isAuthenticated}
              currentUserProfile={profile}
              accessToken={accessToken}
              socialState={socialState}
            />
          </>
        )}
      </main>

      {product && (
        <GuestAuthModal
          open={loginModalOpen}
          language={language}
          productTitle={displayTitle}
          productId={product.id}
          productPath={`/products/${encodeURIComponent(product.slug || product.id)}`}
          selectedVariantId={activeVariant?.id ?? null}
          selectedVariantSku={activeVariant?.sku ?? null}
          oauthIntent={authModalPurpose}
          onCancel={() => setLoginModalOpen(false)}
          onAuthenticated={handleModalAuthenticated}
        />
      )}

      <Modal
        open={Boolean(manualShareUrl)}
        onCancel={() => setManualShareUrl(null)}
        mask={{ closable: true }}
        title={
          <span className="font-display font-semibold text-slate-900">
            {tc.shareFallbackTitle}
          </span>
        }
        footer={[
          <Button
            key="select"
            onClick={() => {
              const inputEl = manualShareInputRef.current?.input;
              if (inputEl) {
                inputEl.focus();
                inputEl.select();
              }
            }}
            className="!min-h-[40px]"
          >
            {tc.shareFallbackSelectButton}
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => setManualShareUrl(null)}
            className="!min-h-[40px]"
          >
            {tc.shareFallbackClose}
          </Button>,
        ]}
      >
        <div className="space-y-3 pt-1">
          <p className="text-sm text-slate-600 leading-relaxed">{tc.shareFallbackDescription}</p>
          <Input
            ref={manualShareInputRef}
            size="large"
            readOnly
            value={manualShareUrl ?? ''}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            aria-label={tc.shareFallbackTitle}
            className="!font-mono !text-xs sm:!text-sm"
          />
        </div>
      </Modal>

      {/* Mobile Sticky Bottom Cart Bar with safe-area padding */}
      {product && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#e6e4dd] shadow-[0_-6px_24px_rgba(15,23,42,0.08)] px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-2.5 max-w-[600px] mx-auto">
            <div className="min-w-0">
              <VariantPriceDisplay
                price={activeVariant?.price}
                language={language}
                size="compact"
                showDiscountBadge={false}
              />
              {activeVariant?.sku && (
                <div className="text-[11px] font-mono text-slate-500 truncate">
                  {activeVariant.sku}
                </div>
              )}
            </div>

            <div className="w-44 shrink-0">
              <CartQuantityControl
                product={product}
                variant={activeVariant}
                language={language}
                size="card"
              />
            </div>
          </div>
        </div>
      )}

      <SiteFooter language={language} />
    </div>
  );
}
