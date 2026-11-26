import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntApp, Button, Empty, Input, Skeleton } from 'antd';
import {
  Heart,
  Layers,
  MessageSquare,
  RefreshCw,
  Search,
  ShoppingCart,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useProductSocialCache } from '../contexts/ProductSocialCacheContext';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import { catalogApi } from '../services/catalogApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import type { CatalogCategoryNode, CatalogProduct, CatalogTreeResponse } from '../types/catalog';
import {
  buildCategoryProductCountMap,
  clearPendingProductOrder,
  flattenCatalogTree,
  getCategoryPath,
  pickDefaultVariant,
  pruneEmptyCategoryTree,
  readPendingProductOrder,
  sortVariantImages,
} from '../utils/catalog';
import { isValidVariantPrice } from '../utils/price';
import { isProfileComplete } from '../utils/validation';
import { CartQuantityControl } from './CartQuantityControl';
import { CatalogCategoryBar } from './CatalogCategoryBar';
import { CatalogVariantModal } from './CatalogVariantModal';
import { GuestAuthModal } from './GuestAuthModal';
import { SiteFooter } from './SiteFooter';
import { SiteLogo } from './SiteLogo';
import { StoreHeader } from './StoreHeader';
import { SwipeableProductGallery } from './SwipeableProductGallery';
import { VariantPriceDisplay } from './VariantPriceDisplay';

const STOREFRONT_HERO_IMAGE = '/src/assets/images/oson_market_brand_1795278421395.jpg';

interface CatalogPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile | null;
  isAuthenticated?: boolean;
  onAuthenticatedInPlace?: (session: AuthSession, profile: UserProfile) => void;
  onLogout?: () => void;
}

interface CatalogProductCardProps {
  product: CatalogProduct;
  categoryNames: string[];
  language: Language;
  onRequireAuth: (product: CatalogProduct) => void;
  onSocialError: (errorMessage: string) => void;
  onOpenVariantPicker: (product: CatalogProduct) => void;
}

function CatalogProductCard({
  product,
  categoryNames,
  language,
  onRequireAuth,
  onSocialError,
  onOpenVariantPicker,
}: CatalogProductCardProps) {
  const navigate = useNavigate();
  const { getQuantity } = useCart();
  const t = translations[language];
  const tc = t.catalog;
  const ts = t.productSocial;

  const {
    authScope,
    getCachedSocial,
    isProductLikePending,
    ensureProductSocial,
    toggleProductLike,
  } = useProductSocialCache();

  const cardRef = useRef<HTMLElement | null>(null);

  const summary = getCachedSocial(product.id);
  const likePending = isProductLikePending(product.id);
  const likedByMe = Boolean(summary?.likedByMe);
  const commentCountDisplay = summary ? summary.commentCount : 0;

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      void ensureProductSocial(product.id);
      return;
    }

    let triggered = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!triggered && entries.some((entry) => entry.isIntersecting)) {
          triggered = true;
          observer.disconnect();
          void ensureProductSocial(product.id);
        }
      },
      { rootMargin: '250px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [authScope, ensureProductSocial, product.id]);

  const defaultVariant = useMemo(
    () => pickDefaultVariant(product.variants),
    [product.variants],
  );

  const galleryImages = useMemo(
    () => (defaultVariant ? sortVariantImages(defaultVariant.images) : []),
    [defaultVariant],
  );

  const variantsInCart = useMemo(
    () => product.variants.filter((v) => getQuantity(v.id) > 0),
    [getQuantity, product.variants],
  );

  const totalVariantQtyInCart = useMemo(
    () => variantsInCart.reduce((sum, v) => sum + getQuantity(v.id), 0),
    [getQuantity, variantsInCart],
  );

  const hasAnyPricedVariant = useMemo(
    () => product.variants.some((v) => isValidVariantPrice(v.price)),
    [product.variants],
  );

  const displayTitle = product.title?.trim() || product.slug;
  const rawCardSummary =
    product.shortDescription?.trim() || product.description?.trim() || '';
  const cardSummary = rawCardSummary.replace(/\s+/g, ' ').trim();
  const productUrl = `/products/${encodeURIComponent(product.slug || product.id)}`;
  const variantCount = product.variants.length;
  const isMultiVariant = variantCount > 1;

  const renderCartAction = () => {
    if (!isMultiVariant) {
      return (
        <CartQuantityControl
          product={product}
          variant={defaultVariant}
          language={language}
          size="card"
        />
      );
    }

    if (variantsInCart.length === 1) {
      return (
        <CartQuantityControl
          product={product}
          variant={variantsInCart[0]}
          language={language}
          size="card"
        />
      );
    }

    if (variantsInCart.length > 1) {
      return (
        <button
          type="button"
          onClick={() => onOpenVariantPicker(product)}
          className="h-10 sm:h-11 px-2.5 sm:px-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#16a34a] bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#15803d] font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
        >
          <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate tabular-nums">
            {tc.inCartLabel}: {totalVariantQtyInCart}
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled={!hasAnyPricedVariant}
        onClick={() => onOpenVariantPicker(product)}
        className={`h-10 sm:h-11 px-2.5 sm:px-4 w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap ${
          hasAnyPricedVariant
            ? 'bg-[#16a34a] hover:bg-[#15803d] text-white cursor-pointer'
            : 'bg-[#f2f0ea] text-slate-400 border border-[#e6e4dd] cursor-not-allowed'
        }`}
      >
        <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
        <span className="truncate">{tc.addToCart}</span>
      </button>
    );
  };

  return (
    <article
      ref={cardRef}
      className="group bg-white border border-[#e6e4dd] hover:border-[#86efac] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-sm"
    >
      {/* Product Cover Image: aspect-[4/3], object-contain so nothing is cropped */}
      <div className="bg-white border-b border-[#f2f0ea]">
        <SwipeableProductGallery
          images={galleryImages}
          autoAdvanceMs={3000}
          alt={displayTitle}
          emptyLabel={tc.noImageLabel}
          prevLabel={tc.prevImageAriaLabel}
          nextLabel={tc.nextImageAriaLabel}
          onTapImage={() => navigate(productUrl)}
          aspectClassName="aspect-[4/3]"
          imgClassName="w-full h-full object-contain p-2"
          arrowsVisibility="hover"
        />
      </div>

      {/* Product Card Body */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between gap-2 sm:gap-3">
        <div className="space-y-1 min-w-0">
          {(product.brand?.name || categoryNames[0] || isMultiVariant) && (
            <div className="flex items-center justify-between gap-1.5 text-[11px] sm:text-xs text-slate-500 min-w-0">
              <div className="flex items-center gap-1 min-w-0 truncate">
                {product.brand?.name && (
                  <span className="font-medium text-slate-700 truncate">
                    {product.brand.name}
                  </span>
                )}
                {product.brand?.name && categoryNames[0] && (
                  <span aria-hidden="true" className="shrink-0">
                    ·
                  </span>
                )}
                {categoryNames[0] && <span className="truncate">{categoryNames[0]}</span>}
              </div>

              {isMultiVariant && (
                <button
                  type="button"
                  onClick={() => onOpenVariantPicker(product)}
                  title={tc.chooseVariantButton}
                  className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-medium text-slate-600 hover:text-[#15803d] bg-[#faf9f5] border border-[#e6e4dd] px-1.5 py-0.5 rounded shrink-0 cursor-pointer tabular-nums"
                >
                  <Layers className="w-3 h-3 shrink-0" />
                  <span>{variantCount}</span>
                </button>
              )}
            </div>
          )}

          <h2 className="text-[13px] min-[390px]:text-sm sm:text-[15px] font-semibold text-slate-900 leading-snug">
            <Link
              to={productUrl}
              className="hover:text-[#15803d] transition-colors line-clamp-2 block"
            >
              {displayTitle}
            </Link>
          </h2>

          {cardSummary && (
            <p className="text-[11px] sm:text-xs text-slate-600 leading-snug line-clamp-2 break-words">
              {cardSummary}
            </p>
          )}
        </div>

        <div className="space-y-2 sm:space-y-2.5 pt-2 border-t border-[#f2f0ea]">
          {/* Priority Price (+ genuine discount badge/regular price if discounted) */}
          <VariantPriceDisplay
            price={defaultVariant?.price}
            language={language}
            size="card"
          />

          {/* Independent Social Row (Heart + Comment link to #comments) */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <button
              type="button"
              disabled={likePending}
              aria-pressed={likedByMe}
              aria-label={likedByMe ? ts.unlikeProductLabel : ts.likeProductLabel}
              title={likedByMe ? ts.unlikeProductLabel : ts.likeProductLabel}
              onClick={() => {
                void toggleProductLike(product.id, {
                  onRequireAuth: () => onRequireAuth(product),
                  onError: onSocialError,
                });
              }}
              className={`inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 h-9 sm:h-10 rounded-lg border text-[11px] sm:text-xs font-medium transition-colors shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                likedByMe
                  ? 'bg-[#fff1f2] border-[#fecdd3] text-[#be123c] hover:bg-[#ffe4e6]'
                  : 'bg-[#faf9f5] border-[#e6e4dd] text-slate-700 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                  likedByMe ? 'fill-[#e11d48] text-[#e11d48]' : 'fill-none text-slate-500'
                }`}
              />
              <span className="tabular-nums font-semibold">
                {summary ? summary.likeCount : '—'}
              </span>
            </button>

            <Link
              to={`${productUrl}#comments`}
              aria-label={`${ts.sectionTitle} (${commentCountDisplay})`}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 h-9 sm:h-10 rounded-lg border border-[#e6e4dd] bg-[#faf9f5] hover:bg-white hover:border-[#86efac] text-[11px] sm:text-xs font-medium text-slate-700 hover:text-[#15803d] transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-slate-500" />
              <span className="truncate tabular-nums">
                {ts.sectionTitle} ({summary ? commentCountDisplay : '0'})
              </span>
            </Link>
          </div>

          {/* Bottom Cart Action */}
          <div>{renderCartAction()}</div>
        </div>
      </div>
    </article>
  );
}

export function CatalogPage({
  language,
  onLanguageChange,
  profile,
  isAuthenticated = false,
  onAuthenticatedInPlace,
  onLogout,
}: CatalogPageProps) {
  const { message } = AntApp.useApp();
  const t = translations[language];
  const tc = t.catalog;
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { syncWithCatalogIndex, openDrawer } = useCart();
  const { ensureProductSocial } = useProductSocialCache();

  const [tree, setTree] = useState<CatalogTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalProduct, setAuthModalProduct] = useState<CatalogProduct | null>(null);
  const [variantModalProduct, setVariantModalProduct] = useState<CatalogProduct | null>(null);

  const openedCategoryRef = useRef<string | null>(null);
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const [visibleCategoryId, setVisibleCategoryId] = useState<string | null>(null);
  const selectedCategoryParam = searchParams.get('category');
  const selectedUncategorized = searchParams.get('uncategorized') === '1';

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
            ? 'Не удалось загрузить каталог. Попробуйте ещё раз.'
            : 'Katalogni yuklab bo‘lmadi. Qaytadan urinib ko‘ring.',
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

  // Prune empty branches strictly from the full public catalog tree (unaffected by searchQuery)
  const nonEmptyRootCategories = useMemo(
    () => pruneEmptyCategoryTree(index.rootCategories, index),
    [index],
  );

  const categoryCounts = useMemo(
    () => buildCategoryProductCountMap(index),
    [index],
  );

  const nonEmptyCategoryById = useMemo(() => {
    const map: Record<string, CatalogCategoryNode> = {};
    const walk = (nodes: CatalogCategoryNode[]) => {
      for (const node of nodes) {
        map[node.id] = node;
        if (node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    walk(nonEmptyRootCategories);
    return map;
  }, [nonEmptyRootCategories]);

  useEffect(() => {
    if (tree) {
      syncWithCatalogIndex(index);
    }
  }, [tree, index, syncWithCatalogIndex]);

  useEffect(() => {
    if (searchParams.get('openCart') === '1') {
      const wantsCheckout = searchParams.get('checkout') === '1';
      clearPendingProductOrder();
      openDrawer({ checkout: wantsCheckout });
      const next = new URLSearchParams(searchParams);
      next.delete('openCart');
      next.delete('checkout');
      setSearchParams(next, { replace: true });
    }
  }, [openDrawer, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const pendingOrder = readPendingProductOrder();
    if (
      pendingOrder?.intent === 'social' &&
      (pendingOrder.productPath === '/' || pendingOrder.productPath.startsWith('/?'))
    ) {
      clearPendingProductOrder();
    }
  }, [isAuthenticated]);

  const activeCategory: CatalogCategoryNode | null = useMemo(() => {
    if (visibleCategoryId === 'uncategorized' || (!visibleCategoryId && selectedUncategorized)) return null;
    const defaultCategory = searchQuery.trim() ? null : nonEmptyRootCategories[0] ?? null;
    if (visibleCategoryId) return nonEmptyCategoryById[visibleCategoryId] ?? defaultCategory;
    if (!selectedCategoryParam) return defaultCategory;
    if (nonEmptyCategoryById[selectedCategoryParam]) {
      return nonEmptyCategoryById[selectedCategoryParam];
    }
    const lower = selectedCategoryParam.toLowerCase();
    const matchedNonEmpty = Object.values(nonEmptyCategoryById).find(
      (cat) => cat.slug.toLowerCase() === lower || cat.id.toLowerCase() === lower,
    );
    if (matchedNonEmpty) return matchedNonEmpty;

    // Fallback lookup in full tree if someone directly pasted an empty category URL
    if (index.categoryById[selectedCategoryParam]) {
      return index.categoryById[selectedCategoryParam];
    }
    return (
      Object.values(index.categoryById).find(
        (cat) => cat.slug.toLowerCase() === lower || cat.id.toLowerCase() === lower,
      ) ?? defaultCategory
    );
  }, [index.categoryById, nonEmptyCategoryById, nonEmptyRootCategories, searchQuery, selectedCategoryParam, selectedUncategorized, visibleCategoryId]);

  const activeCategoryPath = useMemo(
    () =>
      activeCategory
        ? getCategoryPath(
            Object.keys(nonEmptyCategoryById).length > 0
              ? nonEmptyCategoryById
              : index.categoryById,
            activeCategory.id,
          )
        : [],
    [activeCategory, index.categoryById, nonEmptyCategoryById],
  );

  // Only show non-empty subcategories in the active subcategory strip
  const visibleSubcategories: CatalogCategoryNode[] = useMemo(() => {
    const activeNonEmpty = activeCategory ? nonEmptyCategoryById[activeCategory.id] : null;
    if (activeNonEmpty && activeNonEmpty.children.length > 0) {
      return activeNonEmpty.children;
    }
    if (activeCategoryPath.length > 1) {
      const parent = activeCategoryPath[activeCategoryPath.length - 2];
      return parent?.children ?? [];
    }
    return [];
  }, [activeCategory, activeCategoryPath, nonEmptyCategoryById]);

  const filteredProducts = useMemo(() => {
    const pool = index.products;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pool;

    return pool.filter(({ product, categoryNames }) => {
      if (product.title?.toLowerCase().includes(q)) return true;
      if (product.slug?.toLowerCase().includes(q)) return true;
      if (product.shortDescription?.toLowerCase().includes(q)) return true;
      if (product.brand?.name?.toLowerCase().includes(q)) return true;
      if (categoryNames.some((name) => name.toLowerCase().includes(q))) return true;
      if (product.variants.some((variant) => variant.sku.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [index.products, searchQuery]);

  const productSections = useMemo(() => {
    const productsByCategory = new Map<string, typeof filteredProducts>();
    for (const entry of filteredProducts) {
      for (const id of new Set(entry.categoryIds.length ? entry.categoryIds : ['uncategorized'])) {
        const entries = productsByCategory.get(id) ?? [];
        entries.push(entry);
        productsByCategory.set(id, entries);
      }
    }

    const sections: { id: string; title: string; products: typeof filteredProducts }[] = [];
    const visit = (category: CatalogCategoryNode) => {
      const products = productsByCategory.get(category.id);
      if (products?.length) sections.push({ id: category.id, title: category.name || category.slug, products });
      category.children.forEach(visit);
    };
    nonEmptyRootCategories.forEach(visit);
    const uncategorized = productsByCategory.get('uncategorized');
    if (uncategorized?.length) sections.push({ id: 'uncategorized', title: tc.uncategorizedLabel, products: uncategorized });
    return sections;
  }, [filteredProducts, nonEmptyRootCategories, tc.uncategorizedLabel]);

  const scrollToCategory = useCallback((id: string) => {
    const categoryId = index.categoryById[id]?.id
      ?? Object.values(index.categoryById).find(({ slug }) => slug === id)?.id
      ?? id;
    const categoryIds = new Set(index.descendantIdsByCategoryId[categoryId] ?? [categoryId]);
    const targetSection = productSections.find((section) => categoryIds.has(section.id));
    const target = targetSection && document.getElementById(`catalog-section-${targetSection.id}`);
    const nav = categoryNavRef.current;
    if (!target || !nav) return false;
    const header = nav.closest('main')?.previousElementSibling;
    const offset = (header?.getBoundingClientRect().height ?? 0) + nav.offsetHeight + 12;
    window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - offset });
    return true;
  }, [index.categoryById, index.descendantIdsByCategoryId, productSections]);

  useEffect(() => {
    const nav = categoryNavRef.current;
    const header = nav?.closest('main')?.previousElementSibling;
    if (!nav || !header) return;
    const update = () => { nav.style.top = `${header.getBoundingClientRect().height}px`; };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const requestedCategory = selectedUncategorized ? 'uncategorized' : selectedCategoryParam;
    if (!requestedCategory) openedCategoryRef.current = null;
    else if (openedCategoryRef.current !== requestedCategory && scrollToCategory(requestedCategory)) {
      openedCategoryRef.current = requestedCategory;
    }
  }, [scrollToCategory, selectedCategoryParam, selectedUncategorized]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const navBottom = categoryNavRef.current?.getBoundingClientRect().bottom ?? 0;
        let current = productSections[0]?.id ?? null;
        for (const section of productSections) {
          const element = document.getElementById(`catalog-section-${section.id}`);
          if (!element || element.getBoundingClientRect().top > navBottom + 20) break;
          current = section.id;
        }
        const page = document.scrollingElement;
        if (page && page.scrollTop > 0 && page.scrollHeight - page.scrollTop - page.clientHeight < 4) {
          current = productSections.at(-1)?.id ?? current;
        }
        setVisibleCategoryId(current);
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.cancelAnimationFrame(frame);
    };
  }, [productSections]);

  const handleSelectCategory = (categoryId: string | null) => {
    setVisibleCategoryId(categoryId);
    if (categoryId && openedCategoryRef.current === categoryId) scrollToCategory(categoryId);
    const next = new URLSearchParams(searchParams);
    next.delete('uncategorized');
    if (categoryId) {
      next.set('category', categoryId);
    } else {
      next.delete('category');
    }
    setSearchParams(next, { replace: true });
  };

  const handleSelectUncategorized = () => {
    setVisibleCategoryId('uncategorized');
    if (openedCategoryRef.current === 'uncategorized') scrollToCategory('uncategorized');
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    next.set('uncategorized', '1');
    setSearchParams(next, { replace: true });
  };

  const handleClearFilters = () => {
    setVisibleCategoryId(null);
    setSearchQuery('');
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    next.delete('uncategorized');
    setSearchParams(next, { replace: true });
  };

  const handleRequireAuthFromCard = useCallback((product: CatalogProduct) => {
    setAuthModalProduct(product);
    setAuthModalOpen(true);
  }, []);

  const handleSocialError = useCallback(
    (errMsg: string) => {
      message.error(errMsg);
    },
    [message],
  );

  const handleModalAuthenticated = (nextSession: AuthSession, nextProfile: UserProfile) => {
    const targetProductId = authModalProduct?.id;
    setAuthModalOpen(false);
    setAuthModalProduct(null);
    clearPendingProductOrder();
    onAuthenticatedInPlace?.(nextSession, nextProfile);
    if (targetProductId) {
      window.setTimeout(() => {
        void ensureProductSocial(targetProductId, true);
      }, 60);
    }
  };

  const hasActiveFilters = Boolean(
    selectedCategoryParam || selectedUncategorized || searchQuery.trim().length > 0,
  );
  const profileComplete = profile ? isProfileComplete(profile) : false;

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1480px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-3.5 sm:space-y-5">
        {/* Compact Storefront Search & Slim Banner */}
        <section className="bg-white border border-[#e6e4dd] rounded-xl p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 md:gap-6">
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 font-display">
                {tc.heroHeading}
              </h1>

              {!loading && tree && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 tabular-nums shrink-0">
                  <span>
                    {nonEmptyRootCategories.length} {tc.categoriesCountSuffix}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {index.products.length} {tc.productsCountSuffix}
                  </span>
                </div>
              )}
            </div>

            <Input
              size="large"
              allowClear
              value={searchQuery}
              onChange={(e) => { setVisibleCategoryId(null); setSearchQuery(e.target.value); }}
              prefix={<Search className="w-4 h-4 text-slate-400 mr-1" />}
              placeholder={tc.searchPlaceholder}
              className="w-full"
            />
          </div>

          {/* Slim Desktop Accent Visual (omitted on mobile so search + categories + first product row fit immediately) */}
          <div className="hidden md:block w-56 lg:w-64 h-24 rounded-lg overflow-hidden bg-[#f7f6f2] border border-[#e6e4dd] shrink-0">
            {!heroImageFailed ? (
              <img
                src={STOREFRONT_HERO_IMAGE}
                alt={t.heroImageAlt}
                referrerPolicy="no-referrer"
                onError={() => setHeroImageFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-3">
                <SiteLogo language={language} size="md" />
              </div>
            )}
          </div>
        </section>

        {/* Non-Empty Category Navigation Bar */}
        <div ref={categoryNavRef} className="sticky z-20">
          <CatalogCategoryBar
            nonEmptyRootCategories={nonEmptyRootCategories}
            categoryCounts={categoryCounts}
            uncategorizedCount={index.uncategorizedProductIds.length}
            activeCategory={activeCategory}
            activeCategoryPath={activeCategoryPath}
            visibleSubcategories={visibleSubcategories}
            selectedUncategorized={visibleCategoryId ? visibleCategoryId === 'uncategorized' : selectedUncategorized}
            language={language}
            onSelectCategory={handleSelectCategory}
            onSelectUncategorized={handleSelectUncategorized}
          />
        </div>

        {/* Error Banner with Retry */}
        {errorMessage && (
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
        )}

        {/* Product Grid */}
        {loading && !tree ? (
          <section className="grid grid-cols-1 min-[350px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 min-[350px]:gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#e6e4dd] rounded-xl p-3 sm:p-4 space-y-3"
              >
                <div className="aspect-[4/3] rounded-lg bg-[#f2f0ea] animate-pulse" />
                <Skeleton active paragraph={{ rows: 2 }} title={{ width: '75%' }} />
              </div>
            ))}
          </section>
        ) : !errorMessage && index.products.length === 0 ? (
          <section className="bg-white border border-[#e6e4dd] rounded-xl p-8 sm:p-10">
            <Empty
              description={
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">{tc.emptyTitle}</div>
                  <div className="text-sm text-slate-500">{tc.emptyDescription}</div>
                </div>
              }
            >
              <Button
                type="default"
                size="large"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => void loadTree()}
                className="!min-h-[44px]"
              >
                {tc.retryButton}
              </Button>
            </Empty>
          </section>
        ) : !errorMessage && productSections.length === 0 ? (
          <section className="bg-white border border-[#e6e4dd] rounded-xl p-8 sm:p-10">
            <Empty
              description={
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">{tc.emptyFilteredTitle}</div>
                  <div className="text-sm text-slate-500">{tc.emptyFilteredDescription}</div>
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
                  {tc.clearFilters}
                </Button>
              )}
            </Empty>
          </section>
        ) : !errorMessage ? (
          <div className="space-y-6">
            {productSections.map(({ id, title, products }) => (
              <section key={id} id={`catalog-section-${id}`} className="space-y-3">
                <h2 className="flex items-baseline gap-2 text-lg font-semibold text-slate-900">
                  {title}
                  <span className="text-xs font-normal text-slate-500">
                    {products.length} {tc.productsCountSuffix}
                  </span>
                </h2>
                <div className="grid grid-cols-1 min-[350px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 min-[350px]:gap-3 sm:gap-4 lg:gap-5">
                  {products.map(({ product, categoryNames }) => (
                    <CatalogProductCard
                      key={product.id}
                      product={product}
                      categoryNames={categoryNames}
                      language={language}
                      onRequireAuth={handleRequireAuthFromCard}
                      onSocialError={handleSocialError}
                      onOpenVariantPicker={setVariantModalProduct}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </main>

      <CatalogVariantModal
        product={variantModalProduct}
        language={language}
        onClose={() => setVariantModalProduct(null)}
      />

      <GuestAuthModal
        open={authModalOpen}
        language={language}
        productTitle={authModalProduct?.title?.trim() || authModalProduct?.slug}
        productId={authModalProduct?.id}
        productPath={`/${location.search}`}
        oauthIntent="social"
        onCancel={() => {
          setAuthModalOpen(false);
          setAuthModalProduct(null);
        }}
        onAuthenticated={handleModalAuthenticated}
      />

      <SiteFooter language={language} />
    </div>
  );
}
