import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Empty,
  Pagination,
  Popconfirm,
  Result,
  Skeleton,
  Spin,
  Switch,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FolderTree, Package, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { categoryApi } from '../services/categoryApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import type { AdminCategoryItem, AdminCategoryPayload } from '../types/category';
import { isProfileComplete } from '../utils/validation';
import { CategoryFormDrawer, type ParentCategoryOption } from './CategoryFormDrawer';
import { CategoryImageThumb } from './CategoryImageThumb';
import { StoreHeader } from './StoreHeader';

interface AdminCategoriesPageProps {
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

function getCategoryDisplayName(
  item: AdminCategoryItem,
  lang: Language,
  fallbackMissing: string,
): string {
  const primary = item.data[lang]?.name?.trim();
  if (primary) return primary;
  const secondaryLang: Language = lang === 'uz' ? 'ru' : 'uz';
  const secondary = item.data[secondaryLang]?.name?.trim();
  if (secondary) return secondary;
  if (item.data.slug?.trim()) return item.data.slug.trim();
  return fallbackMissing;
}

export function AdminCategoriesPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminCategoriesPageProps) {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const t = translations[language];
  const tc = t.adminCategories;

  const isAdmin = profile.role === 'ADMIN';

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [items, setItems] = useState<AdminCategoryItem[]>([]);
  const [lookupMap, setLookupMap] = useState<Record<string, AdminCategoryItem>>({});

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [drawerInitialItem, setDrawerInitialItem] = useState<AdminCategoryItem | null>(null);

  const hasAccessToken = Boolean(session.accessToken);

  // If current profile is not ADMIN yet, re-verify via GET /api/profile on page open
  // without flashing a permission-denied screen while loading.
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
    // Run verification when entering /admin/categories with a non-admin cached profile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, hasAccessToken]);

  const mergeLookupItems = useCallback((list: AdminCategoryItem[]) => {
    setLookupMap((prev) => {
      const next = { ...prev };
      for (const item of list) {
        next[item.id] = item;
      }
      return next;
    });
  }, []);

  const loadCategories = useCallback(
    async (targetPage: number, targetSize: number) => {
      if (!isAdmin) return;
      setLoading(true);
      setPageError(null);
      setForbiddenState(null);

      try {
        const pageRes = await categoryApi.list(
          session.accessToken,
          { page: targetPage, size: targetSize },
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

        const nextLookup: Record<string, AdminCategoryItem> = {};
        for (const item of content) {
          nextLookup[item.id] = item;
        }

        // Only fetch full parent lookup list when there are more categories than this page
        if ((pageMeta.totalElements ?? content.length) > content.length) {
          const lookupRes = await categoryApi
            .list(session.accessToken, { page: 0, size: 100 }, language)
            .catch(() => null);
          if (lookupRes && Array.isArray(lookupRes.content)) {
            for (const item of lookupRes.content) {
              nextLookup[item.id] = item;
            }
          }
        }

        // Resolve any parent categories that aren't in the first 100 lookup entries
        const missingParentIds = Array.from(
          new Set(
            content
              .map((item) => item.data.parentId)
              .filter((pid): pid is string => Boolean(pid && !nextLookup[pid])),
          ),
        );

        if (missingParentIds.length > 0) {
          const resolvedParents = await Promise.all(
            missingParentIds.map((pid) =>
              categoryApi.getById(session.accessToken, pid, language).catch(() => null),
            ),
          );
          for (const parentItem of resolvedParents) {
            if (parentItem) {
              nextLookup[parentItem.id] = parentItem;
            }
          }
        }

        setLookupMap((prev) => ({ ...prev, ...nextLookup }));
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint: error.endpoint || 'GET /api/admin/categories',
              message: error.message || tc.forbiddenSubtitle,
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
    [isAdmin, language, onUnauthorized, hasAccessToken, tc.forbiddenSubtitle],
  );

  useEffect(() => {
    if (isAdmin) {
      void loadCategories(page, size);
    }
  }, [isAdmin, loadCategories, page, size]);

  const parentOptions: ParentCategoryOption[] = useMemo(() => {
    return Object.values(lookupMap)
      .sort((a, b) => (a.data.sortOrder ?? 0) - (b.data.sortOrder ?? 0))
      .map((item) => {
        const name = getCategoryDisplayName(item, language, tc.missingTranslation);
        return {
          value: item.id,
          label: `${name} (${item.data.slug})`,
        };
      });
  }, [language, lookupMap, tc.missingTranslation]);

  const resolveParentLabel = (parentId: string | null): string => {
    if (!parentId) return tc.rootCategory;
    const parentItem = lookupMap[parentId];
    if (!parentItem) return '—';
    return getCategoryDisplayName(parentItem, language, tc.missingTranslation);
  };

  const handleOpenCreate = () => {
    setActionError(null);
    setEditingCategoryId(null);
    setDrawerInitialItem(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (record: AdminCategoryItem) => {
    setActionError(null);
    setEditingCategoryId(record.id);
    setDrawerInitialItem(null);
    setDrawerOpen(true);
  };

  const handleDrawerSaved = async (savedItem: AdminCategoryItem, mode: 'create' | 'edit') => {
    mergeLookupItems([savedItem]);
    setDrawerOpen(false);
    setEditingCategoryId(null);
    setDrawerInitialItem(null);
    setActionError(null);

    message.success(
      mode === 'create' ? tc.notifications.createdSuccess : tc.notifications.updatedSuccess,
    );

    if (mode === 'create' && page !== 0) {
      setPage(0);
    } else {
      await loadCategories(page, size);
    }
  };

  const handleToggleActive = async (record: AdminCategoryItem, nextActive: boolean) => {
    setActionError(null);
    setTogglingId(record.id);

    try {
      const fullItem = await categoryApi.getById(session.accessToken, record.id, language);
      mergeLookupItems([fullItem]);

      const uzName = fullItem.data.uz?.name?.trim() ?? '';
      const ruName = fullItem.data.ru?.name?.trim() ?? '';

      if (!uzName || !ruName) {
        message.warning(tc.incompleteToggleNotice);
        setEditingCategoryId(fullItem.id);
        setDrawerInitialItem({
          ...fullItem,
          data: {
            ...fullItem.data,
            active: nextActive,
          },
        });
        setDrawerOpen(true);
        return;
      }

      const payload: AdminCategoryPayload = {
        slug: fullItem.data.slug,
        parentId: fullItem.data.parentId ?? null,
        imageMediaId: fullItem.data.imageMediaId ?? null,
        sortOrder: typeof fullItem.data.sortOrder === 'number' ? fullItem.data.sortOrder : 0,
        active: nextActive,
        uz: {
          name: uzName,
          description: fullItem.data.uz?.description ?? null,
          seoTitle: fullItem.data.uz?.seoTitle ?? null,
          seoDescription: fullItem.data.uz?.seoDescription ?? null,
        },
        ru: {
          name: ruName,
          description: fullItem.data.ru?.description ?? null,
          seoTitle: fullItem.data.ru?.seoTitle ?? null,
          seoDescription: fullItem.data.ru?.seoDescription ?? null,
        },
      };

      const updated = await categoryApi.update(session.accessToken, fullItem.id, payload, language);
      mergeLookupItems([updated]);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      message.success(tc.notifications.statusUpdatedSuccess);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `PUT /api/admin/categories/${record.id}`,
            message: error.message || tc.forbiddenSubtitle,
          });
          return;
        }
        if (error.status === 404) {
          const msg = error.message || tc.notFoundError;
          setActionError(msg);
          message.error(msg);
          await loadCategories(page, size);
          return;
        }
        setActionError(error.message);
        message.error(error.message);
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (record: AdminCategoryItem) => {
    setActionError(null);
    setDeletingId(record.id);

    try {
      await categoryApi.remove(session.accessToken, record.id, language);
      message.success(tc.notifications.deletedSuccess);

      if (items.length <= 1 && page > 0) {
        setPage(page - 1);
      } else {
        await loadCategories(page, size);
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `DELETE /api/admin/categories/${record.id}`,
            message: error.message || tc.forbiddenSubtitle,
          });
          return;
        }
        if (error.status === 404) {
          const msg = error.message || tc.notFoundError;
          setActionError(msg);
          message.error(msg);
          await loadCategories(page, size);
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

  const columns: ColumnsType<AdminCategoryItem> = [
    {
      title: tc.columns.uzName,
      key: 'uzName',
      width: 240,
      render: (_, record) => {
        const uzName = record.data.uz?.name?.trim();
        const itemImageUrl = record.imageUrl ?? record.data.imageUrl ?? null;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <CategoryImageThumb
              imageUrl={itemImageUrl}
              accessToken={session.accessToken}
              language={language}
              alt={uzName || record.data.slug || tc.form.imageAlt}
              sizeClass="w-9 h-9"
            />
            {uzName ? (
              <span className="font-medium text-slate-900 truncate">{uzName}</span>
            ) : (
              <span className="text-xs italic text-slate-400">{tc.missingTranslation}</span>
            )}
          </div>
        );
      },
    },
    {
      title: tc.columns.ruName,
      key: 'ruName',
      width: 210,
      render: (_, record) => {
        const ruName = record.data.ru?.name?.trim();
        return ruName ? (
          <span className="font-medium text-slate-800">{ruName}</span>
        ) : (
          <span className="text-xs italic text-slate-400">{tc.missingTranslation}</span>
        );
      },
    },
    {
      title: tc.columns.slug,
      key: 'slug',
      width: 170,
      render: (_, record) => (
        <span className="font-mono-tabular text-xs sm:text-sm text-slate-600">
          {record.data.slug}
        </span>
      ),
    },
    {
      title: tc.columns.parent,
      key: 'parentId',
      width: 190,
      render: (_, record) => {
        const pid = record.data.parentId;
        if (!pid) {
          return <span className="text-xs text-slate-500">{tc.rootCategory}</span>;
        }
        const parentItem = lookupMap[pid];
        if (!parentItem) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        return (
          <span className="text-sm text-slate-700">
            {getCategoryDisplayName(parentItem, language, tc.missingTranslation)}
          </span>
        );
      },
    },
    {
      title: tc.columns.sortOrder,
      key: 'sortOrder',
      width: 90,
      align: 'right',
      render: (_, record) => (
        <span className="font-mono-tabular text-sm text-slate-700">
          {record.data.sortOrder ?? 0}
        </span>
      ),
    },
    {
      title: tc.columns.status,
      key: 'active',
      width: 145,
      render: (_, record) => (
        <div className="inline-flex items-center gap-2.5">
          <Switch
            checked={Boolean(record.data.active)}
            loading={togglingId === record.id}
            disabled={deletingId === record.id}
            onChange={(checked) => handleToggleActive(record, checked)}
            aria-label={`${tc.columns.status}: ${record.data.slug}`}
          />
          <span
            className={`text-xs font-medium whitespace-nowrap ${
              record.data.active ? 'text-[#15803d]' : 'text-slate-500'
            }`}
          >
            {record.data.active ? tc.activeLabel : tc.inactiveLabel}
          </span>
        </div>
      ),
    },
    {
      title: tc.columns.actions,
      key: 'actions',
      width: 340,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button
            size="middle"
            icon={<Package className="w-3.5 h-3.5" />}
            disabled={togglingId === record.id || deletingId === record.id}
            onClick={() => navigate(`/admin/products?categoryId=${encodeURIComponent(record.id)}`)}
            className="!inline-flex !items-center !min-h-[38px]"
          >
            {tc.actions.viewProducts}
          </Button>
          <Button
            size="middle"
            icon={<Plus className="w-3.5 h-3.5" />}
            disabled={togglingId === record.id || deletingId === record.id}
            onClick={() =>
              navigate(`/admin/products?categoryId=${encodeURIComponent(record.id)}&create=1`)
            }
            title={tc.actions.addProduct}
            aria-label={tc.actions.addProduct}
            className="!inline-flex !items-center !min-h-[38px]"
          />
          <Button
            size="middle"
            icon={<Pencil className="w-3.5 h-3.5" />}
            disabled={togglingId === record.id || deletingId === record.id}
            onClick={() => handleOpenEdit(record)}
            className="!inline-flex !items-center !min-h-[38px]"
          >
            {tc.actions.edit}
          </Button>
          <Popconfirm
            title={tc.actions.deleteConfirmTitle}
            description={tc.actions.deleteConfirmDescription}
            okText={tc.actions.deleteConfirmOk}
            cancelText={tc.actions.deleteConfirmCancel}
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
            onConfirm={() => handleDelete(record)}
          >
            <Button
              danger
              size="middle"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              loading={deletingId === record.id}
              disabled={togglingId === record.id}
              className="!inline-flex !items-center !min-h-[38px]"
            >
              {tc.actions.delete}
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
              <span className="text-sm font-medium text-slate-700">{tc.checkingPermissions}</span>
            </div>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : !isAdmin ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tc.userRoleBlockedTitle}
              subTitle={tc.userRoleBlockedSubtitle}
              extra={[
                <Button
                  key="switch-account"
                  type="primary"
                  size="large"
                  onClick={onLogout}
                  className="!min-h-[44px]"
                >
                  {tc.switchAccountButton}
                </Button>,
                <Button
                  key="back-store"
                  size="large"
                  onClick={() => navigate(isProfileComplete(profile) ? '/' : '/profile')}
                  className="!min-h-[44px]"
                >
                  {tc.backToStore}
                </Button>,
              ]}
            />
          </div>
        ) : forbiddenState ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tc.backendForbiddenTitle}
              subTitle={
                <div className="space-y-2 max-w-xl mx-auto">
                  <p className="text-sm text-slate-600">{tc.backendForbiddenSubtitle}</p>
                  {forbiddenState.endpoint && (
                    <p className="text-xs font-mono-tabular text-slate-800">
                      {tc.backendForbiddenEndpointLabel}: {forbiddenState.endpoint}
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
                  onClick={() => void loadCategories(page, size)}
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
                  {tc.backToStore}
                </Button>,
              ]}
            />
          </div>
        ) : (
          <>
            {/* Header Toolbar */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#15803d]">
                  <FolderTree className="w-4 h-4 shrink-0" />
                  <span>{t.brandName}</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    {tc.title}
                  </h1>
                  <span className="text-xs font-medium text-slate-500 font-mono-tabular">
                    {tc.totalCountLabel}: {totalElements}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{tc.subtitle}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                <Button
                  size="large"
                  icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                  onClick={() => void loadCategories(page, size)}
                  disabled={loading}
                  className="!min-h-[44px] !inline-flex !items-center !justify-center whitespace-nowrap"
                >
                  {tc.refreshButton}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreate}
                  className="!min-h-[44px] !inline-flex !items-center !justify-center whitespace-nowrap"
                >
                  {tc.createButton}
                </Button>
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
                    onClick={() => void loadCategories(page, size)}
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
                        <div className="text-sm font-semibold text-slate-900">{tc.emptyTitle}</div>
                        <div className="text-xs text-slate-500">{tc.emptyDescription}</div>
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
                      {tc.createButton}
                    </Button>
                  </Empty>
                </div>
              ) : (
                <Table<AdminCategoryItem>
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
                        <div className="text-sm font-semibold text-slate-900">{tc.emptyTitle}</div>
                        <div className="text-xs text-slate-500">{tc.emptyDescription}</div>
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
                      {tc.createButton}
                    </Button>
                  </Empty>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[#f2f0ea]">
                    {items.map((record) => {
                      const uzName = record.data.uz?.name?.trim();
                      const ruName = record.data.ru?.name?.trim();
                      const parentName = resolveParentLabel(record.data.parentId);

                      return (
                        <div key={record.id} className="p-4 sm:p-5 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <CategoryImageThumb
                                imageUrl={record.imageUrl ?? record.data.imageUrl ?? null}
                                accessToken={session.accessToken}
                                language={language}
                                alt={uzName || ruName || record.data.slug || tc.form.imageAlt}
                                sizeClass="w-11 h-11"
                              />
                              <div className="min-w-0 space-y-0.5">
                                <div className="text-sm font-semibold text-slate-900 break-words">
                                  {uzName ? (
                                    uzName
                                  ) : (
                                    <span className="italic font-normal text-slate-400">
                                      {tc.missingTranslation}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 break-words">
                                  {ruName ? (
                                    ruName
                                  ) : (
                                    <span className="italic text-slate-400">
                                      {tc.missingTranslation}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="inline-flex items-center gap-2 shrink-0 pt-0.5">
                              <Switch
                                checked={Boolean(record.data.active)}
                                loading={togglingId === record.id}
                                disabled={deletingId === record.id}
                                onChange={(checked) => handleToggleActive(record, checked)}
                                aria-label={`${tc.columns.status}: ${record.data.slug}`}
                              />
                              <span
                                className={`text-xs font-medium whitespace-nowrap ${
                                  record.data.active ? 'text-[#15803d]' : 'text-slate-500'
                                }`}
                              >
                                {record.data.active ? tc.activeLabel : tc.inactiveLabel}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span className="font-mono-tabular text-slate-700">
                              {record.data.slug}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{parentName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">
                              {tc.sortOrderShortLabel}: {record.data.sortOrder ?? 0}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <Button
                              size="large"
                              icon={<Package className="w-3.5 h-3.5" />}
                              disabled={togglingId === record.id || deletingId === record.id}
                              onClick={() =>
                                navigate(`/admin/products?categoryId=${encodeURIComponent(record.id)}`)
                              }
                              className="!min-h-[44px] !inline-flex !items-center !justify-center"
                            >
                              {tc.actions.viewProducts}
                            </Button>

                            <Button
                              size="large"
                              icon={<Plus className="w-3.5 h-3.5" />}
                              disabled={togglingId === record.id || deletingId === record.id}
                              onClick={() =>
                                navigate(
                                  `/admin/products?categoryId=${encodeURIComponent(record.id)}&create=1`,
                                )
                              }
                              className="!min-h-[44px] !inline-flex !items-center !justify-center"
                            >
                              {tc.actions.addProduct}
                            </Button>

                            <Button
                              size="large"
                              icon={<Pencil className="w-3.5 h-3.5" />}
                              disabled={togglingId === record.id || deletingId === record.id}
                              onClick={() => handleOpenEdit(record)}
                              className="!min-h-[44px] !inline-flex !items-center !justify-center"
                            >
                              {tc.actions.edit}
                            </Button>

                            <Popconfirm
                              title={tc.actions.deleteConfirmTitle}
                              description={tc.actions.deleteConfirmDescription}
                              okText={tc.actions.deleteConfirmOk}
                              cancelText={tc.actions.deleteConfirmCancel}
                              okButtonProps={{ danger: true, loading: deletingId === record.id }}
                              onConfirm={() => handleDelete(record)}
                            >
                              <Button
                                danger
                                size="large"
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                loading={deletingId === record.id}
                                disabled={togglingId === record.id}
                                className="!min-h-[44px] !w-full !inline-flex !items-center !justify-center"
                              >
                                {tc.actions.delete}
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

      <CategoryFormDrawer
        open={drawerOpen}
        editingCategoryId={editingCategoryId}
        initialItem={drawerInitialItem}
        language={language}
        accessToken={session.accessToken}
        parentOptions={parentOptions}
        onClose={() => {
          setDrawerOpen(false);
          setEditingCategoryId(null);
          setDrawerInitialItem(null);
        }}
        onSaved={handleDrawerSaved}
        onUnauthorized={onUnauthorized}
        onForbidden={(msg, endpoint) => {
          if (endpoint?.startsWith('GET ')) {
            setForbiddenState({
              endpoint,
              message: msg || tc.forbiddenSubtitle,
            });
          }
        }}
        onNotFound={() => {
          setActionError(tc.notFoundError);
          void loadCategories(page, size);
        }}
      />
    </div>
  );
}
