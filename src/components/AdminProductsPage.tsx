import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Empty,
  Pagination,
  Popconfirm,
  Result,
  Select,
  Skeleton,
  Spin,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Eye, Package, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { productApi } from '../services/productApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import type { AdminCategoryItem } from '../types/category';
import type {
  AdminBrandItem,
  AdminProductDetailResponse,
  AdminProductListItem,
} from '../types/product';
import { isProfileComplete, isValidUuid } from '../utils/validation';
import { resolveProductDisplayTitle } from './AdminProductDetailPage';
import { ProductFormDrawer, type SelectOptionItem } from './ProductFormDrawer';
import { StoreHeader } from './StoreHeader';

interface AdminProductsPageProps {
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

export function AdminProductsPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminProductsPageProps) {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const t = translations[language];
  const tp = t.adminProducts;

  const isAdmin = profile.role === 'ADMIN';

  const rawCategoryParam = searchParams.get('categoryId');
  const selectedCategoryId =
    rawCategoryParam && isValidUuid(rawCategoryParam) ? rawCategoryParam.trim() : null;

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [items, setItems] = useState<AdminProductListItem[]>([]);

  const [categoriesList, setCategoriesList] = useState<AdminCategoryItem[]>([]);
  const [brandsList, setBrandsList] = useState<AdminBrandItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const hasAccessToken = Boolean(session.accessToken);

  // Verify profile role via GET /api/profile when cached role is not ADMIN yet
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

  // Support opening drawer automatically when navigated via category "+ Mahsulot" (?categoryId=...&create=1)
  useEffect(() => {
    if (!isAdmin) return;
    if (searchParams.get('create') === '1') {
      setEditingProductId(null);
      setActionError(null);
      setDrawerOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  }, [isAdmin, searchParams, setSearchParams]);

  const loadSelectOptions = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingOptions(true);
    try {
      const [allCats, allBrands] = await Promise.all([
        productApi.listAllCategories(session.accessToken, language),
        productApi.listAllBrands(session.accessToken, language),
      ]);
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
            endpoint: error.endpoint || 'GET /api/admin/categories',
            message: error.message || tp.backendForbiddenSubtitle,
          });
        }
      }
    } finally {
      setLoadingOptions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, language, onUnauthorized, hasAccessToken, tp.backendForbiddenSubtitle]);

  const loadProducts = useCallback(
    async (targetPage: number, targetSize: number, categoryIdFilter: string | null) => {
      if (!isAdmin) return;
      setLoading(true);
      setPageError(null);
      setForbiddenState(null);

      try {
        const pageRes = await productApi.listProducts(
          session.accessToken,
          {
            page: targetPage,
            size: targetSize,
            categoryId: categoryIdFilter,
          },
          language,
        );
        const content = Array.isArray(pageRes.content) ? pageRes.content : [];
        const pageMeta = pageRes.page ?? {
          size: targetSize,
          number: targetPage,
          totalElements: content.length,
          totalPages: 1,
        };
        setItems(content);
        setTotalElements(pageMeta.totalElements ?? content.length);
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint: error.endpoint || 'GET /api/admin/products',
              message: error.message || tp.backendForbiddenSubtitle,
            });
            return;
          }
          setPageError(error.message);
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, language, onUnauthorized, hasAccessToken, tp.backendForbiddenSubtitle],
  );

  useEffect(() => {
    if (isAdmin) {
      void loadSelectOptions();
    }
  }, [isAdmin, loadSelectOptions]);

  useEffect(() => {
    if (isAdmin) {
      void loadProducts(page, size, selectedCategoryId);
    }
  }, [isAdmin, loadProducts, page, size, selectedCategoryId]);

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

  const resolveCategoryNames = (categoryIds?: string[]): string[] => {
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) return [];
    const names: string[] = [];
    for (const cid of categoryIds) {
      const cat = categoryMap[cid];
      if (cat) {
        names.push(getCategoryLabel(cat, language));
      }
    }
    return names;
  };

  const resolveBrandName = (brandId: string | null): string => {
    if (!brandId) return tp.noBrand;
    const brand = brandMap[brandId];
    if (!brand) return '—';
    return getBrandLabel(brand, language);
  };

  const handleCategoryFilterChange = (nextCategoryId?: string) => {
    setPage(0);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    if (nextCategoryId && nextCategoryId.trim()) {
      next.set('categoryId', nextCategoryId.trim());
    } else {
      next.delete('categoryId');
    }
    setSearchParams(next);
  };

  const handleOpenCreate = () => {
    setActionError(null);
    setEditingProductId(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (record: AdminProductListItem) => {
    setActionError(null);
    setEditingProductId(record.id);
    setDrawerOpen(true);
  };

  const handleDrawerSaved = async (
    _savedItem: AdminProductDetailResponse,
    mode: 'create' | 'edit',
  ) => {
    setDrawerOpen(false);
    setEditingProductId(null);
    setActionError(null);

    message.success(
      mode === 'create' ? tp.notifications.createdSuccess : tp.notifications.updatedSuccess,
    );

    if (mode === 'create' && page !== 0) {
      setPage(0);
    } else {
      await loadProducts(page, size, selectedCategoryId);
    }
  };

  const handleDelete = async (record: AdminProductListItem) => {
    setActionError(null);
    setDeletingId(record.id);

    try {
      await productApi.deleteProduct(session.accessToken, record.id, language);
      message.success(tp.notifications.deletedSuccess);

      if (items.length <= 1 && page > 0) {
        setPage(page - 1);
      } else {
        await loadProducts(page, size, selectedCategoryId);
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `DELETE /api/admin/products/${record.id}`,
            message: error.message || tp.backendForbiddenSubtitle,
          });
          return;
        }
        if (error.status === 404) {
          const msg = error.message || tp.notFoundError;
          setActionError(msg);
          message.error(msg);
          await loadProducts(page, size, selectedCategoryId);
          return;
        }
        setActionError(error.message);
        message.error(error.message);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handlePaginationChange = (nextCurrent: number, nextSize: number) => {
    const clampedSize = Math.min(100, Math.max(1, nextSize));
    if (clampedSize !== size) {
      setSize(clampedSize);
      setPage(0);
    } else {
      setPage(Math.max(0, nextCurrent - 1));
    }
  };

  const columns: ColumnsType<AdminProductListItem> = [
    {
      title: tp.columns.productName,
      key: 'productName',
      width: 240,
      render: (_, record) => {
        const title = resolveProductDisplayTitle(record.data, language);
        const showSubSlug = title !== record.data.slug;
        return (
          <div className="min-w-0 space-y-0.5">
            <button
              type="button"
              onClick={() => navigate(`/admin/products/${encodeURIComponent(record.id)}`)}
              className="text-left font-medium text-slate-900 hover:text-[#15803d] transition-colors cursor-pointer break-words"
            >
              {title}
            </button>
            {showSubSlug && (
              <div className="font-mono-tabular text-xs text-slate-500 break-all">
                {record.data.slug}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: tp.columns.brand,
      key: 'brand',
      width: 160,
      render: (_, record) => {
        const label = resolveBrandName(record.data.brandId);
        return (
          <span
            className={`text-sm ${
              record.data.brandId ? 'text-slate-800' : 'text-slate-400 italic'
            }`}
          >
            {label}
          </span>
        );
      },
    },
    {
      title: tp.columns.categories,
      key: 'categories',
      width: 250,
      render: (_, record) => {
        const names = resolveCategoryNames(record.data.categoryIds);
        if (names.length === 0) {
          return <span className="text-xs italic text-slate-400">{tp.noCategory}</span>;
        }
        return <span className="text-sm text-slate-700">{names.join(' · ')}</span>;
      },
    },
    {
      title: tp.columns.productKind,
      key: 'productKind',
      width: 130,
      render: (_, record) => (
        <span className="text-xs sm:text-sm text-slate-600">
          {record.data.productKind?.trim() || '—'}
        </span>
      ),
    },
    {
      title: tp.columns.warranty,
      key: 'warrantyMonths',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <span className="font-mono-tabular text-sm text-slate-700">
          {typeof record.data.warrantyMonths === 'number'
            ? `${record.data.warrantyMonths} ${tp.warrantyMonthsSuffix}`
            : '—'}
        </span>
      ),
    },
    {
      title: tp.columns.status,
      key: 'status',
      width: 130,
      render: (_, record) => {
        const info = getStatusDisplay(record.data.status, tp.statusNames);
        return (
          <span
            className={`inline-flex items-center gap-2 text-xs font-medium whitespace-nowrap ${info.textClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
            <span>{info.label}</span>
          </span>
        );
      },
    },
    {
      title: tp.columns.actions,
      key: 'actions',
      width: 300,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button
            size="middle"
            icon={<Eye className="w-3.5 h-3.5" />}
            disabled={deletingId === record.id}
            onClick={() => navigate(`/admin/products/${encodeURIComponent(record.id)}`)}
            className="!inline-flex !items-center !min-h-[38px]"
          >
            {tp.actions.viewDetails}
          </Button>
          <Button
            size="middle"
            icon={<Pencil className="w-3.5 h-3.5" />}
            disabled={deletingId === record.id}
            onClick={() => handleOpenEdit(record)}
            className="!inline-flex !items-center !min-h-[38px]"
          >
            {tp.actions.edit}
          </Button>
          <Popconfirm
            title={tp.actions.deleteConfirmTitle}
            description={tp.actions.deleteConfirmDescription}
            okText={tp.actions.deleteConfirmOk}
            cancelText={tp.actions.deleteConfirmCancel}
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
            onConfirm={() => handleDelete(record)}
          >
            <Button
              danger
              size="middle"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              loading={deletingId === record.id}
              className="!inline-flex !items-center !min-h-[38px]"
            >
              {tp.actions.delete}
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

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
                  onClick={() => {
                    void loadSelectOptions();
                    void loadProducts(page, size, selectedCategoryId);
                  }}
                  className="!min-h-[44px]"
                >
                  {t.workspace.retryButton}
                </Button>,
                <Button
                  key="back"
                  size="large"
                  onClick={() => navigate('/')}
                  className="!min-h-[44px]"
                >
                  {tp.backToStore}
                </Button>,
              ]}
            />
          </div>
        ) : (
          <>
            {/* Header & Category Filter Toolbar */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#15803d]">
                    <Package className="w-4 h-4 shrink-0" />
                    <span>{t.brandName}</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                      {tp.title}
                    </h1>
                    <span className="text-xs font-medium text-slate-500 font-mono-tabular">
                      {tp.totalCountLabel}: {totalElements}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{tp.subtitle}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <Button
                    size="large"
                    icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                    onClick={() => {
                      void loadSelectOptions();
                      void loadProducts(page, size, selectedCategoryId);
                    }}
                    disabled={loading}
                    className="!min-h-[44px] !inline-flex !items-center !justify-center whitespace-nowrap"
                  >
                    {tp.refreshButton}
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleOpenCreate}
                    className="!min-h-[44px] !inline-flex !items-center !justify-center whitespace-nowrap"
                  >
                    {tp.createButton}
                  </Button>
                </div>
              </div>

              <div className="pt-3 border-t border-[#f2f0ea] flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
                  {tp.filterByCategoryLabel}:
                </label>
                <div className="w-full sm:w-80">
                  <Select
                    size="large"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    loading={loadingOptions}
                    value={selectedCategoryId ?? undefined}
                    placeholder={tp.allCategoriesOption}
                    options={categoryOptions}
                    onChange={handleCategoryFilterChange}
                    className="!w-full"
                  />
                </div>
              </div>
            </section>

            {pageError && (
              <Alert
                type="error"
                showIcon
                closable
                title={pageError}
                onClose={() => setPageError(null)}
                action={
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => void loadProducts(page, size, selectedCategoryId)}
                  >
                    {t.workspace.retryButton}
                  </Button>
                }
                className="rounded-xl"
              />
            )}

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

            {/* Desktop Table (>= 1024px) */}
            <section className="hidden lg:block bg-white border border-[#e6e4dd] rounded-xl overflow-hidden">
              {!loading && items.length === 0 ? (
                <div className="py-12 px-6">
                  <Empty
                    description={
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">{tp.emptyTitle}</div>
                        <div className="text-xs text-slate-500">
                          {selectedCategoryId ? tp.emptyFilteredDescription : tp.emptyDescription}
                        </div>
                      </div>
                    }
                  >
                    <Button
                      type="primary"
                      size="large"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={handleOpenCreate}
                      className="!min-h-[44px] !inline-flex !items-center !justify-center"
                    >
                      {tp.createButton}
                    </Button>
                  </Empty>
                </div>
              ) : (
                <Table<AdminProductListItem>
                  rowKey="id"
                  columns={columns}
                  dataSource={items}
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    current: page + 1,
                    pageSize: size,
                    total: totalElements,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    className: '!px-5 !py-3',
                    onChange: handlePaginationChange,
                  }}
                />
              )}
            </section>

            {/* Mobile & Tablet Compact List (< 1024px) */}
            <section className="lg:hidden bg-white border border-[#e6e4dd] rounded-xl overflow-hidden">
              {loading && items.length === 0 ? (
                <div className="p-5">
                  <Skeleton active paragraph={{ rows: 5 }} />
                </div>
              ) : items.length === 0 ? (
                <div className="py-10 px-5">
                  <Empty
                    description={
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">{tp.emptyTitle}</div>
                        <div className="text-xs text-slate-500">
                          {selectedCategoryId ? tp.emptyFilteredDescription : tp.emptyDescription}
                        </div>
                      </div>
                    }
                  >
                    <Button
                      type="primary"
                      size="large"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={handleOpenCreate}
                      className="!min-h-[44px] !inline-flex !items-center !justify-center"
                    >
                      {tp.createButton}
                    </Button>
                  </Empty>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[#f2f0ea]">
                    {items.map((record) => {
                      const statusInfo = getStatusDisplay(record.data.status, tp.statusNames);
                      const categoryNames = resolveCategoryNames(record.data.categoryIds);
                      const brandLabel = resolveBrandName(record.data.brandId);
                      const displayTitle = resolveProductDisplayTitle(record.data, language);
                      const showSubSlug = displayTitle !== record.data.slug;

                      return (
                        <div key={record.id} className="p-4 sm:p-5 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/admin/products/${encodeURIComponent(record.id)}`)
                                }
                                className="text-left text-sm font-semibold text-slate-900 hover:text-[#15803d] transition-colors cursor-pointer break-words"
                              >
                                {displayTitle}
                              </button>
                              {showSubSlug && (
                                <div className="font-mono-tabular text-xs text-slate-500 break-all">
                                  {record.data.slug}
                                </div>
                              )}
                              <div className="text-xs text-slate-600">
                                {categoryNames.length > 0 ? (
                                  categoryNames.join(' · ')
                                ) : (
                                  <span className="italic text-slate-400">{tp.noCategory}</span>
                                )}
                              </div>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 pt-0.5 ${statusInfo.textClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                              <span>{statusInfo.label}</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span>{brandLabel}</span>
                            {record.data.productKind && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{record.data.productKind}</span>
                              </>
                            )}
                            {typeof record.data.warrantyMonths === 'number' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono-tabular">
                                  {record.data.warrantyMonths} {tp.warrantyMonthsSuffix}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                            <Button
                              size="large"
                              icon={<Eye className="w-3.5 h-3.5" />}
                              disabled={deletingId === record.id}
                              onClick={() =>
                                navigate(`/admin/products/${encodeURIComponent(record.id)}`)
                              }
                              className="col-span-2 sm:col-span-1 !min-h-[44px] !inline-flex !items-center !justify-center"
                            >
                              {tp.actions.viewDetails}
                            </Button>

                            <Button
                              size="large"
                              icon={<Pencil className="w-3.5 h-3.5" />}
                              disabled={deletingId === record.id}
                              onClick={() => handleOpenEdit(record)}
                              className="!min-h-[44px] !inline-flex !items-center !justify-center"
                            >
                              {tp.actions.edit}
                            </Button>

                            <Popconfirm
                              title={tp.actions.deleteConfirmTitle}
                              description={tp.actions.deleteConfirmDescription}
                              okText={tp.actions.deleteConfirmOk}
                              cancelText={tp.actions.deleteConfirmCancel}
                              okButtonProps={{ danger: true, loading: deletingId === record.id }}
                              onConfirm={() => handleDelete(record)}
                            >
                              <Button
                                danger
                                size="large"
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                loading={deletingId === record.id}
                                className="!min-h-[44px] !w-full !inline-flex !items-center !justify-center"
                              >
                                {tp.actions.delete}
                              </Button>
                            </Popconfirm>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-[#f2f0ea] px-4 py-3 flex justify-center">
                    <Pagination
                      current={page + 1}
                      pageSize={size}
                      total={totalElements}
                      showSizeChanger
                      pageSizeOptions={['10', '20', '50', '100']}
                      onChange={handlePaginationChange}
                    />
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>

      <ProductFormDrawer
        open={drawerOpen}
        editingProductId={editingProductId}
        defaultCategoryId={selectedCategoryId}
        language={language}
        accessToken={session.accessToken}
        categoryOptions={categoryOptions}
        brandOptions={brandOptions}
        onClose={() => {
          setDrawerOpen(false);
          setEditingProductId(null);
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
          void loadProducts(page, size, selectedCategoryId);
        }}
      />
    </div>
  );
}
