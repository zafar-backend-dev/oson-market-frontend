import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Empty,
  Popconfirm,
  Result,
  Skeleton,
  Spin,
} from 'antd';
import {
  ArrowLeft,
  Image as ImageIcon,
  Layers,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { productApi } from '../services/productApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import type { AdminCategoryItem } from '../types/category';
import type {
  AdminBrandItem,
  AdminProductData,
  AdminProductDetailResponse,
  AdminProductTranslation,
} from '../types/product';
import { formatPriceLabel, hasVariantDiscount } from '../utils/price';
import { isProfileComplete } from '../utils/validation';
import { ProductFormDrawer, type SelectOptionItem } from './ProductFormDrawer';
import { StoreHeader } from './StoreHeader';

interface AdminProductDetailPageProps {
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

function getCategoryLabel(item: AdminCategoryItem, lang: Language): string {
  const primary = item.data[lang]?.name?.trim();
  if (primary) return primary;
  const secondaryLang: Language = lang === 'uz' ? 'ru' : 'uz';
  const secondary = item.data[secondaryLang]?.name?.trim();
  if (secondary) return secondary;
  return item.data.slug?.trim() || '—';
}

function getBrandLabel(item: AdminBrandItem, lang: Language): string {
  const direct = item.data.name?.trim();
  if (direct) return direct;
  const primary = item.data[lang]?.name?.trim();
  if (primary) return primary;
  const secondaryLang: Language = lang === 'uz' ? 'ru' : 'uz';
  const secondary = item.data[secondaryLang]?.name?.trim();
  if (secondary) return secondary;
  return item.data.slug?.trim() || '—';
}

export function resolveProductDisplayTitle(data: AdminProductData, lang: Language): string {
  const secondaryLang: Language = lang === 'uz' ? 'ru' : 'uz';
  const candidates = [
    data[lang]?.title,
    data[lang]?.name,
    data[secondaryLang]?.title,
    data[secondaryLang]?.name,
    data.title,
    data.name,
    data.slug,
  ];
  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }
  return '—';
}

function formatDateTime(value: string | null | undefined, lang: Language): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusDisplay(
  status: string | undefined,
  statusNames: { DRAFT: string; ACTIVE: string; ARCHIVED: string },
): { label: string; dotClass: string; textClass: string } {
  switch (status) {
    case 'ACTIVE':
      return {
        label: statusNames.ACTIVE,
        dotClass: 'bg-[#16a34a]',
        textClass: 'text-[#15803d]',
      };
    case 'ARCHIVED':
      return {
        label: statusNames.ARCHIVED,
        dotClass: 'bg-slate-400',
        textClass: 'text-slate-500',
      };
    case 'DRAFT':
    default:
      return {
        label: status === 'DRAFT' || !status ? statusNames.DRAFT : status,
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-700',
      };
  }
}

function getVariantStatusLabel(
  status: string | null | undefined,
  variantStatusNames: { ACTIVE: string; INACTIVE: string; DRAFT: string },
): string {
  if (!status) return '—';
  if (status === 'ACTIVE') return variantStatusNames.ACTIVE;
  if (status === 'INACTIVE') return variantStatusNames.INACTIVE;
  if (status === 'DRAFT') return variantStatusNames.DRAFT;
  return status;
}

function ProtectedProductImage({
  imageUrl,
  accessToken,
  language,
  alt,
}: {
  imageUrl: string | null;
  accessToken: string;
  language: Language;
  alt: string;
}) {
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(imageUrl));
  const [failed, setFailed] = useState(false);
  const hasAccessToken = Boolean(accessToken);

  useEffect(() => {
    if (!imageUrl || !hasAccessToken) {
      setBlobSrc(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let activeUrl: string | null = null;
    setLoading(true);
    setFailed(false);

    (async () => {
      try {
        const blob = await productApi.fetchImageBlob(accessToken, imageUrl, language);
        if (cancelled) return;
        if (!blob) {
          setBlobSrc(null);
          return;
        }
        activeUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(activeUrl);
          return;
        }
        setBlobSrc(activeUrl);
      } catch {
        if (!cancelled) {
          setBlobSrc(null);
          setFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, hasAccessToken, language]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f7f6f2]">
        <Spin size="small" />
      </div>
    );
  }

  if (!blobSrc || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f7f6f2] text-slate-400">
        <ImageIcon className="w-6 h-6" />
      </div>
    );
  }

  return (
    <img
      src={blobSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover"
    />
  );
}

function TranslationContentCard({
  heading,
  translation,
  labels,
}: {
  heading: string;
  translation: AdminProductTranslation | null | undefined;
  labels: {
    titleLabel: string;
    shortDescriptionLabel: string;
    descriptionLabel: string;
    seoTitleLabel: string;
    seoDescriptionLabel: string;
    emptyField: string;
    missingTranslationNotice: string;
  };
}) {
  const titleVal = translation?.title?.trim() || translation?.name?.trim() || '';
  const shortDescVal = translation?.shortDescription?.trim() || '';
  const descVal = translation?.description?.trim() || '';
  const seoTitleVal = translation?.seoTitle?.trim() || '';
  const seoDescVal = translation?.seoDescription?.trim() || '';

  const hasAnyContent = Boolean(titleVal || shortDescVal || descVal || seoTitleVal || seoDescVal);

  return (
    <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900 pb-3 border-b border-[#f2f0ea]">
        {heading}
      </h2>

      {!hasAnyContent ? (
        <p className="text-xs italic text-slate-400">{labels.missingTranslationNotice}</p>
      ) : (
        <dl className="space-y-3.5">
          <div>
            <dt className="text-xs font-medium text-slate-500">{labels.titleLabel}</dt>
            <dd className="text-sm font-semibold text-slate-900 mt-0.5 break-words">
              {titleVal || labels.emptyField}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">{labels.shortDescriptionLabel}</dt>
            <dd className="text-sm text-slate-700 mt-0.5 whitespace-pre-line break-words">
              {shortDescVal || labels.emptyField}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">{labels.descriptionLabel}</dt>
            <dd className="text-sm text-slate-700 mt-0.5 whitespace-pre-line break-words">
              {descVal || labels.emptyField}
            </dd>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#f2f0ea]">
            <div>
              <dt className="text-xs font-medium text-slate-500">{labels.seoTitleLabel}</dt>
              <dd className="text-xs sm:text-sm text-slate-700 mt-0.5 break-words">
                {seoTitleVal || labels.emptyField}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">{labels.seoDescriptionLabel}</dt>
              <dd className="text-xs sm:text-sm text-slate-700 mt-0.5 break-words">
                {seoDescVal || labels.emptyField}
              </dd>
            </div>
          </div>
        </dl>
      )}
    </div>
  );
}

export function AdminProductDetailPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminProductDetailPageProps) {
  const { productId } = useParams<{ productId: string }>();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const t = translations[language];
  const tp = t.adminProducts;
  const td = tp.detail;

  const isAdmin = profile.role === 'ADMIN';

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [detail, setDetail] = useState<AdminProductDetailResponse | null>(null);
  const [categoriesList, setCategoriesList] = useState<AdminCategoryItem[]>([]);
  const [brandsList, setBrandsList] = useState<AdminBrandItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  const [deletingProduct, setDeletingProduct] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusVariantId, setFocusVariantId] = useState<string | null>(null);

  const hasAccessToken = Boolean(session.accessToken);

  // Verify ADMIN role via GET /api/profile if needed
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

  const loadDetailAndOptions = useCallback(async () => {
    if (!isAdmin || !productId) return;
    setLoading(true);
    setPageError(null);
    setForbiddenState(null);

    try {
      const [productRes, allCats, allBrands] = await Promise.all([
        productApi.getProductById(session.accessToken, productId, language),
        productApi.listAllCategories(session.accessToken, language),
        productApi.listAllBrands(session.accessToken, language),
      ]);
      setDetail(productRes);
      setCategoriesList(allCats);
      setBrandsList(allBrands);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `GET /api/admin/products/${productId}`,
            message: error.message || tp.backendForbiddenSubtitle,
          });
          return;
        }
        setPageError(error.message || tp.notFoundError);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, language, onUnauthorized, productId, hasAccessToken, tp.backendForbiddenSubtitle, tp.notFoundError]);

  const reloadDetailOnly = useCallback(async () => {
    if (!isAdmin || !productId) return;
    try {
      const productRes = await productApi.getProductById(session.accessToken, productId, language);
      setDetail(productRes);
      setPageError(null);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `GET /api/admin/products/${productId}`,
            message: error.message || tp.backendForbiddenSubtitle,
          });
          return;
        }
        setPageError(error.message || tp.notFoundError);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, language, onUnauthorized, productId, hasAccessToken, tp.backendForbiddenSubtitle, tp.notFoundError]);

  useEffect(() => {
    if (isAdmin && productId) {
      void loadDetailAndOptions();
    }
  }, [isAdmin, loadDetailAndOptions, productId]);

  const categoryMap = useMemo(() => {
    const map: Record<string, AdminCategoryItem> = {};
    for (const cat of categoriesList) {
      map[cat.id] = cat;
    }
    return map;
  }, [categoriesList]);

  const brandMap = useMemo(() => {
    const map: Record<string, AdminBrandItem> = {};
    for (const brand of brandsList) {
      map[brand.id] = brand;
    }
    return map;
  }, [brandsList]);

  const categoryOptions: SelectOptionItem[] = useMemo(() => {
    return [...categoriesList]
      .sort((a, b) => (a.data.sortOrder ?? 0) - (b.data.sortOrder ?? 0))
      .map((cat) => ({
        value: cat.id,
        label: getCategoryLabel(cat, language),
      }));
  }, [categoriesList, language]);

  const brandOptions: SelectOptionItem[] = useMemo(() => {
    return brandsList.map((brand) => ({
      value: brand.id,
      label: getBrandLabel(brand, language),
    }));
  }, [brandsList, language]);

  const handleOpenEditProduct = (variantIdToFocus?: string | null) => {
    setActionError(null);
    setFocusVariantId(variantIdToFocus ?? null);
    setDrawerOpen(true);
  };

  const handleDrawerSaved = async (savedItem: AdminProductDetailResponse) => {
    setDrawerOpen(false);
    setFocusVariantId(null);
    setActionError(null);
    setDetail(savedItem);
    message.success(tp.notifications.updatedSuccess);
    await reloadDetailOnly();
  };

  const handleDeleteProduct = async () => {
    if (!detail) return;
    setActionError(null);
    setDeletingProduct(true);

    try {
      await productApi.deleteProduct(session.accessToken, detail.id, language);
      message.success(tp.notifications.deletedSuccess);
      navigate('/admin/products', { replace: true });
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `DELETE /api/admin/products/${detail.id}`,
            message: error.message || tp.backendForbiddenSubtitle,
          });
          return;
        }
        setActionError(error.message);
        message.error(error.message);
      }
    } finally {
      setDeletingProduct(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!detail) return;
    setActionError(null);
    setDeletingVariantId(variantId);

    try {
      await productApi.deleteVariant(session.accessToken, detail.id, variantId, language);
      message.success(td.variantDeletedSuccess);
      await reloadDetailOnly();
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint:
              error.endpoint || `DELETE /api/admin/products/${detail.id}/variants/${variantId}`,
            message: error.message || tp.backendForbiddenSubtitle,
          });
          return;
        }
        setActionError(error.message);
        message.error(error.message);
        if (error.status === 404) {
          await reloadDetailOnly();
        }
      }
    } finally {
      setDeletingVariantId(null);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!detail) return;
    setActionError(null);
    setDeletingImageId(imageId);

    try {
      await productApi.deleteProductImage(session.accessToken, detail.id, imageId, language);
      message.success(td.imageDeletedSuccess);
      await reloadDetailOnly();
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint:
              error.endpoint || `DELETE /api/admin/products/${detail.id}/images/${imageId}`,
            message: error.message || tp.backendForbiddenSubtitle,
          });
          return;
        }
        setActionError(error.message);
        message.error(error.message);
        if (error.status === 404) {
          await reloadDetailOnly();
        }
      }
    } finally {
      setDeletingImageId(null);
    }
  };

  const displayTitle = detail ? resolveProductDisplayTitle(detail.data, language) : '';
  const statusInfo = detail
    ? getStatusDisplay(detail.data.status, tp.statusNames)
    : getStatusDisplay('DRAFT', tp.statusNames);

  const brandName = detail?.data.brandId
    ? brandMap[detail.data.brandId]
      ? getBrandLabel(brandMap[detail.data.brandId], language)
      : '—'
    : tp.noBrand;

  const categoryNames = detail
    ? (detail.data.categoryIds ?? [])
        .map((cid) => (categoryMap[cid] ? getCategoryLabel(categoryMap[cid], language) : null))
        .filter((name): name is string => Boolean(name))
    : [];

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={isProfileComplete(profile)}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        {verifyingProfile ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <Spin />
              <span className="text-sm font-medium text-slate-700">{tp.checkingPermissions}</span>
            </div>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : !isAdmin ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tp.userRoleBlockedTitle}
              subTitle={tp.userRoleBlockedSubtitle}
              extra={[
                <Button
                  key="switch-account"
                  type="primary"
                  size="large"
                  onClick={onLogout}
                  className="!min-h-[44px]"
                >
                  {tp.switchAccountButton}
                </Button>,
                <Button
                  key="back-store"
                  size="large"
                  onClick={() => navigate(isProfileComplete(profile) ? '/' : '/profile')}
                  className="!min-h-[44px]"
                >
                  {tp.backToStore}
                </Button>,
              ]}
            />
          </div>
        ) : forbiddenState ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tp.backendForbiddenTitle}
              subTitle={
                <div className="space-y-2 max-w-xl mx-auto">
                  <p className="text-sm text-slate-600">{tp.backendForbiddenSubtitle}</p>
                  {forbiddenState.endpoint && (
                    <p className="text-xs font-mono-tabular text-slate-800">
                      {tp.backendForbiddenEndpointLabel}: {forbiddenState.endpoint}
                    </p>
                  )}
                  {forbiddenState.message && (
                    <p className="text-xs text-red-700">{forbiddenState.message}</p>
                  )}
                </div>
              }
              extra={[
                <Button
                  key="retry"
                  type="primary"
                  size="large"
                  onClick={() => void loadDetailAndOptions()}
                  className="!min-h-[44px]"
                >
                  {t.workspace.retryButton}
                </Button>,
                <Button
                  key="back"
                  size="large"
                  onClick={() => navigate('/admin/products')}
                  className="!min-h-[44px]"
                >
                  {td.backToList}
                </Button>,
              ]}
            />
          </div>
        ) : loading ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <Spin />
              <span className="text-sm font-medium text-slate-700">{td.loadingTitle}</span>
            </div>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : pageError || !detail ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-8 space-y-4">
            <Alert
              type="error"
              showIcon
              title={pageError || tp.notFoundError}
              className="rounded-lg"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="primary"
                size="large"
                onClick={() => void loadDetailAndOptions()}
                className="!min-h-[44px]"
              >
                {t.workspace.retryButton}
              </Button>
              <Button
                size="large"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/admin/products')}
                className="!min-h-[44px] !inline-flex !items-center !justify-center"
              >
                {td.backToList}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Navigation + Product Title Header */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  size="middle"
                  icon={<ArrowLeft className="w-4 h-4" />}
                  onClick={() => navigate('/admin/products')}
                  className="!min-h-[40px] !inline-flex !items-center !justify-center"
                >
                  {td.backToList}
                </Button>

                <span
                  className={`inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap ${statusInfo.textClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                  <span>{statusInfo.label}</span>
                </span>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#15803d]">
                    <Package className="w-4 h-4 shrink-0" />
                    <span>{t.brandName}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 break-words">
                    {displayTitle}
                  </h1>
                  <div className="text-xs sm:text-sm font-mono-tabular text-slate-500 break-all">
                    {detail.data.slug}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <Button
                    size="large"
                    icon={<RefreshCw className="w-4 h-4" />}
                    onClick={() => void reloadDetailOnly()}
                    className="!min-h-[44px] !inline-flex !items-center !justify-center whitespace-nowrap"
                  >
                    {tp.refreshButton}
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<Pencil className="w-4 h-4" />}
                    onClick={() => handleOpenEditProduct(null)}
                    className="!min-h-[44px] !inline-flex !items-center !justify-center whitespace-nowrap"
                  >
                    {td.editProductButton}
                  </Button>
                  <Popconfirm
                    title={tp.actions.deleteConfirmTitle}
                    description={tp.actions.deleteConfirmDescription}
                    okText={tp.actions.deleteConfirmOk}
                    cancelText={tp.actions.deleteConfirmCancel}
                    okButtonProps={{ danger: true, loading: deletingProduct }}
                    onConfirm={handleDeleteProduct}
                  >
                    <Button
                      danger
                      size="large"
                      icon={<Trash2 className="w-4 h-4" />}
                      loading={deletingProduct}
                      className="!min-h-[44px] !inline-flex !items-center !justify-center whitespace-nowrap"
                    >
                      {tp.actions.delete}
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </section>

            {actionError && (
              <Alert
                type="error"
                showIcon
                closable
                title={actionError}
                onClose={() => setActionError(null)}
                className="rounded-xl"
              />
            )}

            {/* Metadata & Timestamps */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 pb-3 border-b border-[#f2f0ea]">
                {td.metadataTitle}
              </h2>

              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <dt className="text-xs font-medium text-slate-500">{tp.columns.brand}</dt>
                  <dd className="text-sm font-medium text-slate-900 mt-1">{brandName}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">{tp.columns.categories}</dt>
                  <dd className="text-sm text-slate-800 mt-1">
                    {categoryNames.length > 0 ? categoryNames.join(' · ') : tp.noCategory}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">{tp.columns.productKind}</dt>
                  <dd className="text-sm text-slate-800 mt-1">
                    {detail.data.productKind?.trim() || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">{tp.columns.warranty}</dt>
                  <dd className="text-sm font-mono-tabular text-slate-800 mt-1">
                    {typeof detail.data.warrantyMonths === 'number'
                      ? `${detail.data.warrantyMonths} ${tp.warrantyMonthsSuffix}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">{td.createdAtLabel}</dt>
                  <dd className="text-sm font-mono-tabular text-slate-700 mt-1">
                    {formatDateTime(detail.createdAt, language)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">{td.updatedAtLabel}</dt>
                  <dd className="text-sm font-mono-tabular text-slate-700 mt-1">
                    {formatDateTime(detail.updatedAt, language)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">{td.publishedAtLabel}</dt>
                  <dd className="text-sm font-mono-tabular text-slate-700 mt-1">
                    {formatDateTime(detail.publishedAt, language)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Localized Content (UZ & RU) */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TranslationContentCard
                heading={td.uzContentTitle}
                translation={detail.data.uz}
                labels={td}
              />
              <TranslationContentCard
                heading={td.ruContentTitle}
                translation={detail.data.ru}
                labels={td}
              />
            </section>

            {/* Variants & Galleries */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#16a34a]" />
                    <h2 className="text-base font-semibold text-slate-900">{td.variantsTitle}</h2>
                    <span className="text-xs font-mono-tabular text-slate-500">
                      ({detail.variants?.length ?? 0})
                    </span>
                  </div>
                </div>

                <Button
                  type="default"
                  size="large"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => handleOpenEditProduct(null)}
                  className="!min-h-[44px] !inline-flex !items-center !justify-center whitespace-nowrap"
                >
                  {td.addNewVariantButton}
                </Button>
              </div>

              {!Array.isArray(detail.variants) || detail.variants.length === 0 ? (
                <div className="bg-white border border-[#e6e4dd] rounded-xl py-10 px-6">
                  <Empty
                    description={
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">
                          {td.emptyVariantsTitle}
                        </div>
                        <div className="text-xs text-slate-500 max-w-md mx-auto">
                          {td.emptyVariantsSubtitle}
                        </div>
                      </div>
                    }
                  >
                    <Button
                      type="primary"
                      size="large"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => handleOpenEditProduct(null)}
                      className="!min-h-[44px] !inline-flex !items-center !justify-center"
                    >
                      {td.addNewVariantButton}
                    </Button>
                  </Empty>
                </div>
              ) : (
                <div className="space-y-4">
                  {detail.variants.map((variant, vIdx) => {
                    const sortedImages = Array.isArray(variant.images)
                      ? [...variant.images].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      : [];

                    const hasAnySize =
                      variant.lengthMm !== null ||
                      variant.widthMm !== null ||
                      variant.heightMm !== null;

                    return (
                      <article
                        key={variant.id}
                        className={`bg-white border rounded-xl p-5 sm:p-6 space-y-5 ${
                          variant.defaultType ? 'border-[#86efac]' : 'border-[#e6e4dd]'
                        }`}
                      >
                        {/* Variant Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#f2f0ea]">
                          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                            <span className="text-sm font-semibold text-slate-900">
                              {tp.form.variantCardTitle} #{vIdx + 1}
                            </span>
                            <span className="font-mono-tabular text-sm font-semibold text-slate-800 break-all">
                              {(language === 'ru' ? variant.titleRu || variant.titleUz : variant.titleUz || variant.titleRu) || variant.sku}
                            </span>
                            {variant.defaultType && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803d]">
                                <Star className="w-3.5 h-3.5 fill-[#15803d]" />
                                {td.defaultVariantBadge}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="middle"
                              icon={<Pencil className="w-3.5 h-3.5" />}
                              disabled={deletingVariantId === variant.id}
                              onClick={() => handleOpenEditProduct(variant.id)}
                              className="!min-h-[40px] !inline-flex !items-center !justify-center"
                            >
                              {td.editVariantButton}
                            </Button>

                            <Popconfirm
                              title={td.deleteVariantConfirmTitle}
                              description={td.deleteVariantConfirmDescription}
                              okText={td.deleteConfirmOk}
                              cancelText={td.deleteConfirmCancel}
                              okButtonProps={{
                                danger: true,
                                loading: deletingVariantId === variant.id,
                              }}
                              onConfirm={() => void handleDeleteVariant(variant.id)}
                            >
                              <Button
                                danger
                                size="middle"
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                loading={deletingVariantId === variant.id}
                                className="!min-h-[40px] !inline-flex !items-center !justify-center"
                              >
                                {td.deleteVariantButton}
                              </Button>
                            </Popconfirm>
                          </div>
                        </div>

                        {/* Variant Attributes */}
                        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                          <div>
                            <dt className="text-xs font-medium text-slate-500">
                              {td.priceLabel}
                            </dt>
                            <dd className="text-sm font-mono-tabular text-slate-900 mt-0.5">
                              {(() => {
                                const regular = variant.price?.regularPrice ?? variant.regularPrice ?? null;
                                const sale = variant.price?.salePrice ?? variant.salePrice ?? null;
                                const amount = variant.price?.amount ?? sale ?? regular;
                                const currency = variant.price?.currency ?? 'UZS';
                                if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
                                  return <span className="text-slate-500">{td.noPrice}</span>;
                                }
                                const discounted = hasVariantDiscount({
                                  regularPrice: regular,
                                  salePrice: sale,
                                  amount,
                                });
                                return (
                                  <div className="flex flex-wrap items-baseline gap-x-2">
                                    <span className="font-semibold">
                                      {formatPriceLabel(amount, language, currency)}
                                    </span>
                                    {discounted && typeof regular === 'number' && (
                                      <span className="text-xs text-slate-400 line-through">
                                        {formatPriceLabel(regular, language, currency)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium text-slate-500">
                              {td.barcodeLabel}
                            </dt>
                            <dd className="text-sm font-mono-tabular text-slate-800 mt-0.5 break-all">
                              {variant.barcode?.trim() || '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium text-slate-500">
                              {td.variantStatusLabel}
                            </dt>
                            <dd className="text-sm text-slate-800 mt-0.5">
                              {getVariantStatusLabel(variant.status, tp.variantStatusNames)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium text-slate-500">{td.weightLabel}</dt>
                            <dd className="text-sm font-mono-tabular text-slate-800 mt-0.5">
                              {typeof variant.weightGrams === 'number'
                                ? `${variant.weightGrams} g`
                                : td.noDimensions}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium text-slate-500">
                              {td.dimensionsLabel}
                            </dt>
                            <dd className="text-sm font-mono-tabular text-slate-800 mt-0.5">
                              {hasAnySize
                                ? `${variant.lengthMm ?? '—'} × ${variant.widthMm ?? '—'} × ${variant.heightMm ?? '—'} mm`
                                : td.noDimensions}
                            </dd>
                          </div>
                        </dl>

                        {/* Variant Image Gallery */}
                        <div className="pt-3 border-t border-[#f2f0ea] space-y-3">
                          <div className="text-xs font-semibold text-slate-800">
                            {td.galleryTitle} ({sortedImages.length})
                          </div>

                          {sortedImages.length === 0 ? (
                            <p className="text-xs text-slate-500">{td.noImages}</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                              {sortedImages.map((img, iIdx) => (
                                <div
                                  key={img.id}
                                  className={`rounded-lg border overflow-hidden flex flex-col ${
                                    img.primaryImage
                                      ? 'border-[#16a34a] bg-[#f0fdf4]/40'
                                      : 'border-[#e6e4dd] bg-[#faf9f5]'
                                  }`}
                                >
                                  <div className="aspect-[4/3] w-full bg-[#f7f6f2] border-b border-[#e6e4dd]">
                                    <ProtectedProductImage
                                      imageUrl={img.imageUrl}
                                      accessToken={session.accessToken}
                                      language={language}
                                      alt={`${variant.sku} #${iIdx + 1}`}
                                    />
                                  </div>

                                  <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                      <span className="font-mono-tabular text-slate-600">
                                        {td.sortOrderLabel}: {img.sortOrder}
                                      </span>
                                      {img.primaryImage && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803d]">
                                          <Star className="w-3 h-3 fill-[#15803d]" />
                                          {td.primaryImageBadge}
                                        </span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                      <Button
                                        size="middle"
                                        icon={<Pencil className="w-3.5 h-3.5" />}
                                        disabled={deletingImageId === img.id}
                                        onClick={() => handleOpenEditProduct(variant.id)}
                                        className="!min-h-[38px] !inline-flex !items-center !justify-center"
                                      >
                                        {td.editImageButton}
                                      </Button>

                                      <Popconfirm
                                        title={td.deleteImageConfirmTitle}
                                        description={td.deleteImageConfirmDescription}
                                        okText={td.deleteConfirmOk}
                                        cancelText={td.deleteConfirmCancel}
                                        okButtonProps={{
                                          danger: true,
                                          loading: deletingImageId === img.id,
                                        }}
                                        onConfirm={() => void handleDeleteImage(img.id)}
                                      >
                                        <Button
                                          danger
                                          size="middle"
                                          icon={<Trash2 className="w-3.5 h-3.5" />}
                                          loading={deletingImageId === img.id}
                                          className="!min-h-[38px] !w-full !inline-flex !items-center !justify-center"
                                        >
                                          {td.deleteImageButton}
                                        </Button>
                                      </Popconfirm>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <ProductFormDrawer
        open={drawerOpen}
        editingProductId={detail?.id ?? productId ?? null}
        focusVariantId={focusVariantId}
        language={language}
        accessToken={session.accessToken}
        categoryOptions={categoryOptions}
        brandOptions={brandOptions}
        onClose={() => {
          setDrawerOpen(false);
          setFocusVariantId(null);
        }}
        onSaved={handleDrawerSaved}
        onUnauthorized={onUnauthorized}
        onForbidden={(msg, endpoint) => {
          if (endpoint?.startsWith('GET ')) {
            setForbiddenState({
              endpoint,
              message: msg || tp.backendForbiddenSubtitle,
            });
          }
        }}
        onNotFound={() => {
          setActionError(tp.notFoundError);
          void reloadDetailOnly();
        }}
      />
    </div>
  );
}
