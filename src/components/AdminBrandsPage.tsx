import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Drawer,
  Empty,
  Input,
  Pagination,
  Popconfirm,
  Result,
  Select,
  Skeleton,
  Spin,
  Switch,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Eye, Pencil, Plus, RefreshCw, Search, Tag, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { brandApi } from '../services/brandApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import type { AdminBrandRecord } from '../types/brand';
import { isProfileComplete } from '../utils/validation';
import { BrandFormDrawer } from './BrandFormDrawer';
import { BrandLogoThumb } from './BrandLogoThumb';
import { StoreHeader } from './StoreHeader';

interface AdminBrandsPageProps {
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

type ActiveFilterValue = 'all' | 'true' | 'false';

export function AdminBrandsPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminBrandsPageProps) {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const t = translations[language];
  const tb = t.adminBrands;

  const isAdmin = profile.role === 'ADMIN';

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');

  const [totalElements, setTotalElements] = useState(0);
  const [items, setItems] = useState<AdminBrandRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  // Detail Drawer State
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<AdminBrandRecord | null>(null);
  const [detailLogoSrc, setDetailLogoSrc] = useState<string | null>(null);
  const [detailLogoFailed, setDetailLogoFailed] = useState(false);
  const detailLogoBlobRef = useRef<string | null>(null);

  const revokeDetailLogoBlob = () => {
    if (detailLogoBlobRef.current) {
      URL.revokeObjectURL(detailLogoBlobRef.current);
      detailLogoBlobRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeDetailLogoBlob();
    };
  }, []);

  const hasAccessToken = Boolean(session.accessToken);

  // Re-verify cached non-admin profile before deciding access
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

  // Debounce search input and reset page to 0
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === debouncedQuery) return;
    const timer = window.setTimeout(() => {
      setPage(0);
      setDebouncedQuery(trimmed);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, debouncedQuery]);

  const loadBrands = useCallback(
    async (
      targetPage: number,
      targetSize: number,
      query: string,
      statusFilter: ActiveFilterValue,
    ) => {
      if (!isAdmin) return;
      setLoading(true);
      setPageError(null);
      setForbiddenState(null);

      try {
        const activeParam =
          statusFilter === 'true' ? true : statusFilter === 'false' ? false : undefined;

        const res = await brandApi.list(
          session.accessToken,
          {
            page: targetPage,
            size: targetSize,
            q: query,
            active: activeParam,
          },
          language,
        );

        const content = Array.isArray(res.content) ? res.content : [];
        const pageMeta = res.page ?? {
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
              endpoint: error.endpoint || 'GET /api/admin/brands',
              message: error.message,
            });
            return;
          }
          setPageError(error.message);
        } else {
          setPageError(
            language === 'ru'
              ? 'Произошла ошибка. Попробуйте ещё раз.'
              : 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.',
          );
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, language, onUnauthorized, hasAccessToken],
  );

  useEffect(() => {
    if (!isAdmin) return;
    void loadBrands(page, size, debouncedQuery, activeFilter);
  }, [isAdmin, page, size, debouncedQuery, activeFilter, loadBrands]);

  // Load detail logo with Bearer token whenever detailRecord updates
  useEffect(() => {
    revokeDetailLogoBlob();
    setDetailLogoFailed(false);

    if (!detailOpen || !detailRecord?.logoUrl) {
      setDetailLogoSrc(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const blob = await brandApi.fetchLogoBlob(
          session.accessToken,
          detailRecord.logoUrl!,
          language,
        );
        if (cancelled) return;
        if (!blob) {
          setDetailLogoSrc(null);
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        detailLogoBlobRef.current = objectUrl;
        setDetailLogoSrc(objectUrl);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthApiError && error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        setDetailLogoSrc(null);
      }
    })();

    return () => {
      cancelled = true;
      revokeDetailLogoBlob();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpen, detailRecord?.id, detailRecord?.logoUrl, language, onUnauthorized, hasAccessToken]);

  const handleOpenDetail = async (brandId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailRecord(null);
    revokeDetailLogoBlob();
    setDetailLogoSrc(null);

    try {
      const fetched = await brandApi.getById(session.accessToken, brandId, language);
      setDetailRecord(fetched);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setDetailOpen(false);
          setForbiddenState({
            endpoint: error.endpoint || `GET /api/admin/brands/${brandId}`,
            message: error.message,
          });
          return;
        }
        if (error.status === 404) {
          setDetailError(error.message || tb.notFoundError);
          void loadBrands(page, size, debouncedQuery, activeFilter);
          return;
        }
        setDetailError(error.message);
      } else {
        setDetailError(
          language === 'ru'
            ? 'Произошла ошибка. Попробуйте ещё раз.'
            : 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.',
        );
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setDetailRecord(null);
    setDetailError(null);
    revokeDetailLogoBlob();
    setDetailLogoSrc(null);
  };

  const handleOpenCreate = () => {
    setActionError(null);
    setEditingBrandId(null);
    setFormDrawerOpen(true);
  };

  const handleOpenEdit = (brandId: string) => {
    setActionError(null);
    setEditingBrandId(brandId);
    setFormDrawerOpen(true);
  };

  const handleToggleActive = async (record: AdminBrandRecord, nextActive: boolean) => {
    setActionError(null);
    setTogglingId(record.id);

    try {
      const updated = await brandApi.updateJson(
        session.accessToken,
        record.id,
        {
          name: record.data.name,
          slug: record.data.slug,
          active: nextActive,
          logoMediaId: record.data.logoMediaId ?? null,
        },
        language,
      );

      setItems((prev) => prev.map((item) => (item.id === record.id ? updated : item)));
      if (detailRecord?.id === record.id) {
        setDetailRecord(updated);
      }
      void message.success(tb.messages.statusUpdatedSuccess);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `PUT /api/admin/brands/${record.id}`,
            message: error.message,
          });
          return;
        }
        if (error.status === 404) {
          void message.warning(error.message || tb.notFoundError);
          void loadBrands(page, size, debouncedQuery, activeFilter);
          return;
        }
        setActionError(error.message);
      } else {
        setActionError(
          language === 'ru'
            ? 'Произошла ошибка. Попробуйте ещё раз.'
            : 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.',
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (record: AdminBrandRecord) => {
    setActionError(null);
    setDeletingId(record.id);

    try {
      await brandApi.remove(session.accessToken, record.id, language);
      void message.success(tb.messages.deletedSuccess);

      if (detailRecord?.id === record.id) {
        handleCloseDetail();
      }

      const nextPage = items.length === 1 && page > 0 ? page - 1 : page;
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await loadBrands(page, size, debouncedQuery, activeFilter);
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `DELETE /api/admin/brands/${record.id}`,
            message: error.message,
          });
          return;
        }
        if (error.status === 404) {
          void message.warning(error.message || tb.notFoundError);
          if (detailRecord?.id === record.id) {
            handleCloseDetail();
          }
          await loadBrands(page, size, debouncedQuery, activeFilter);
          return;
        }
        setActionError(error.message);
        void message.error(error.message);
      } else {
        setActionError(
          language === 'ru'
            ? 'Произошла ошибка. Попробуйте ещё раз.'
            : 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.',
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = (savedRecord: AdminBrandRecord, mode: 'create' | 'edit') => {
    setFormDrawerOpen(false);
    setEditingBrandId(null);
    void message.success(
      mode === 'create' ? tb.messages.createdSuccess : tb.messages.updatedSuccess,
    );

    if (detailRecord?.id === savedRecord.id) {
      setDetailRecord(savedRecord);
    }

    if (mode === 'create' && page !== 0) {
      setPage(0);
    } else {
      void loadBrands(page, size, debouncedQuery, activeFilter);
    }
  };

  const handleClearFilters = () => {
    setPage(0);
    setSearchInput('');
    setDebouncedQuery('');
    setActiveFilter('all');
  };

  const hasActiveFilters = Boolean(debouncedQuery || activeFilter !== 'all');
  const profileComplete = isProfileComplete(profile);

  const columns: ColumnsType<AdminBrandRecord> = [
    {
      title: tb.columns.brand,
      key: 'brand',
      width: '38%',
      render: (_, record) => (
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogoThumb
            logoUrl={record.logoUrl}
            accessToken={session.accessToken}
            language={language}
            alt={record.data.name}
          />
          <button
            type="button"
            onClick={() => void handleOpenDetail(record.id)}
            className="text-left font-medium text-slate-900 hover:text-[#15803d] transition-colors truncate cursor-pointer"
          >
            {record.data.name}
          </button>
        </div>
      ),
    },
    {
      title: tb.columns.slug,
      key: 'slug',
      width: '24%',
      render: (_, record) => (
        <code className="text-xs font-mono text-slate-700 bg-[#f7f6f2] border border-[#e6e4dd] rounded px-2 py-0.5 break-all">
          {record.data.slug}
        </code>
      ),
    },
    {
      title: tb.columns.status,
      key: 'status',
      width: '18%',
      render: (_, record) => (
        <div className="flex items-center gap-2.5">
          <Switch
            checked={Boolean(record.data.active)}
            loading={togglingId === record.id}
            onChange={(checked) => void handleToggleActive(record, checked)}
            aria-label={`${record.data.name} — ${tb.columns.status}`}
          />
          <span
            className={`text-xs font-medium whitespace-nowrap ${
              record.data.active ? 'text-[#15803d]' : 'text-slate-500'
            }`}
          >
            {record.data.active ? tb.activeLabel : tb.inactiveLabel}
          </span>
        </div>
      ),
    },
    {
      title: tb.columns.actions,
      key: 'actions',
      width: '20%',
      align: 'right',
      render: (_, record) => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <Button
            type="default"
            size="small"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => void handleOpenDetail(record.id)}
            className="!min-h-[36px] !px-2.5"
            aria-label={tb.actions.view}
            title={tb.actions.view}
          >
            <span className="hidden xl:inline">{tb.actions.view}</span>
          </Button>
          <Button
            type="default"
            size="small"
            icon={<Pencil className="w-3.5 h-3.5" />}
            onClick={() => handleOpenEdit(record.id)}
            className="!min-h-[36px] !px-2.5"
            aria-label={tb.actions.edit}
            title={tb.actions.edit}
          >
            <span className="hidden xl:inline">{tb.actions.edit}</span>
          </Button>
          <Popconfirm
            title={tb.actions.deleteConfirmTitle}
            description={tb.actions.deleteConfirmDescription}
            okText={tb.actions.deleteConfirmOk}
            cancelText={tb.actions.deleteConfirmCancel}
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
            onConfirm={() => void handleDelete(record)}
          >
            <Button
              danger
              type="default"
              size="small"
              loading={deletingId === record.id}
              icon={<Trash2 className="w-3.5 h-3.5" />}
              className="!min-h-[36px] !px-2.5"
              aria-label={tb.actions.delete}
              title={tb.actions.delete}
            />
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
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        {verifyingProfile ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center">
            <Spin size="large" />
            <p className="text-sm font-medium text-slate-600">{tb.checkingPermissions}</p>
          </div>
        ) : !isAdmin ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tb.userRoleBlockedTitle}
              subTitle={tb.userRoleBlockedSubtitle}
              extra={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="primary"
                    size="large"
                    onClick={onLogout}
                    className="!min-h-[44px]"
                  >
                    {tb.switchAccountButton}
                  </Button>
                  <Button
                    type="default"
                    size="large"
                    onClick={() => navigate(profileComplete ? '/' : '/profile')}
                    className="!min-h-[44px]"
                  >
                    {tb.backToStore}
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* Page Header */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#15803d]">
                  <Tag className="w-4 h-4 shrink-0" />
                  <span>{t.workspace.menuBrands}</span>
                  {totalElements > 0 && (
                    <span className="text-slate-500 font-normal">
                      · {tb.totalCountLabel}: {totalElements}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {tb.title}
                </h1>
                <p className="text-sm text-slate-600">{tb.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  type="default"
                  size="large"
                  icon={<RefreshCw className="w-4 h-4" />}
                  loading={loading}
                  onClick={() => void loadBrands(page, size, debouncedQuery, activeFilter)}
                  className="!min-h-[44px]"
                >
                  {tb.refreshButton}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreate}
                  className="!min-h-[44px]"
                >
                  {tb.createButton}
                </Button>
              </div>
            </section>

            {/* Filters Bar */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <Input
                  size="large"
                  allowClear
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onPressEnter={() => {
                    const trimmed = searchInput.trim();
                    setPage(0);
                    setDebouncedQuery(trimmed);
                  }}
                  prefix={<Search className="w-4 h-4 text-slate-400" />}
                  placeholder={tb.searchPlaceholder}
                />
              </div>

              <div className="flex items-center gap-2.5 sm:w-56 shrink-0">
                <Select<ActiveFilterValue>
                  size="large"
                  value={activeFilter}
                  onChange={(val) => {
                    setPage(0);
                    setActiveFilter(val);
                  }}
                  className="w-full"
                  aria-label={tb.statusFilterLabel}
                  options={[
                    { value: 'all', label: tb.statusFilterAll },
                    { value: 'true', label: tb.statusFilterActive },
                    { value: 'false', label: tb.statusFilterInactive },
                  ]}
                />
              </div>

              {hasActiveFilters && (
                <Button
                  type="default"
                  size="large"
                  onClick={handleClearFilters}
                  className="!min-h-[40px] shrink-0"
                >
                  {tb.clearFilters}
                </Button>
              )}
            </section>

            {forbiddenState && (
              <Alert
                type="error"
                showIcon
                title={tb.backendForbiddenTitle}
                description={
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p>{tb.backendForbiddenSubtitle}</p>
                    {forbiddenState.endpoint && (
                      <p className="font-mono text-xs text-slate-700">
                        {tb.backendForbiddenEndpointLabel}: {forbiddenState.endpoint}
                      </p>
                    )}
                    <p className="text-slate-700">{forbiddenState.message}</p>
                  </div>
                }
              />
            )}

            {actionError && (
              <Alert
                type="error"
                showIcon
                closable
                onClose={() => setActionError(null)}
                title={actionError}
              />
            )}

            {pageError && (
              <Alert
                type="error"
                showIcon
                title={pageError}
                action={
                  <Button
                    size="small"
                    onClick={() => void loadBrands(page, size, debouncedQuery, activeFilter)}
                  >
                    {t.workspace.retryButton}
                  </Button>
                }
              />
            )}

            {/* Content Area */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl overflow-hidden">
              {loading && items.length === 0 ? (
                <div className="p-6">
                  <Skeleton active paragraph={{ rows: 5 }} />
                </div>
              ) : items.length === 0 ? (
                <div className="p-10">
                  <Empty
                    description={
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800">{tb.emptyTitle}</div>
                        <div className="text-sm text-slate-500">
                          {hasActiveFilters ? tb.emptyFilteredDescription : tb.emptyDescription}
                        </div>
                      </div>
                    }
                  >
                    {hasActiveFilters ? (
                      <Button
                        type="default"
                        size="large"
                        onClick={handleClearFilters}
                        className="!min-h-[44px]"
                      >
                        {tb.clearFilters}
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        size="large"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={handleOpenCreate}
                        className="!min-h-[44px]"
                      >
                        {tb.createButton}
                      </Button>
                    )}
                  </Empty>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block">
                    <Table<AdminBrandRecord>
                      rowKey="id"
                      columns={columns}
                      dataSource={items}
                      loading={loading}
                      pagination={false}
                      size="middle"
                    />
                  </div>

                  {/* Mobile / Tablet Card List */}
                  <div className="lg:hidden divide-y divide-[#e6e4dd]">
                    {items.map((record) => (
                      <div key={record.id} className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <BrandLogoThumb
                              logoUrl={record.logoUrl}
                              accessToken={session.accessToken}
                              language={language}
                              alt={record.data.name}
                              sizeClass="w-12 h-12"
                            />
                            <div className="min-w-0 space-y-1">
                              <button
                                type="button"
                                onClick={() => void handleOpenDetail(record.id)}
                                className="text-left text-base font-semibold text-slate-900 hover:text-[#15803d] transition-colors truncate block max-w-full cursor-pointer"
                              >
                                {record.data.name}
                              </button>
                              <code className="inline-block text-xs font-mono text-slate-700 bg-[#f7f6f2] border border-[#e6e4dd] rounded px-2 py-0.5 break-all">
                                {record.data.slug}
                              </code>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Switch
                              checked={Boolean(record.data.active)}
                              loading={togglingId === record.id}
                              onChange={(checked) => void handleToggleActive(record, checked)}
                            />
                            <span
                              className={`text-xs font-medium ${
                                record.data.active ? 'text-[#15803d]' : 'text-slate-500'
                              }`}
                            >
                              {record.data.active ? tb.activeLabel : tb.inactiveLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            type="default"
                            icon={<Eye className="w-4 h-4" />}
                            onClick={() => void handleOpenDetail(record.id)}
                            className="!min-h-[44px] flex-1"
                          >
                            {tb.actions.view}
                          </Button>
                          <Button
                            type="default"
                            icon={<Pencil className="w-4 h-4" />}
                            onClick={() => handleOpenEdit(record.id)}
                            className="!min-h-[44px] flex-1"
                          >
                            {tb.actions.edit}
                          </Button>
                          <Popconfirm
                            title={tb.actions.deleteConfirmTitle}
                            description={tb.actions.deleteConfirmDescription}
                            okText={tb.actions.deleteConfirmOk}
                            cancelText={tb.actions.deleteConfirmCancel}
                            okButtonProps={{ danger: true, loading: deletingId === record.id }}
                            onConfirm={() => void handleDelete(record)}
                          >
                            <Button
                              danger
                              type="default"
                              loading={deletingId === record.id}
                              icon={<Trash2 className="w-4 h-4" />}
                              className="!min-h-[44px]"
                              aria-label={tb.actions.delete}
                            />
                          </Popconfirm>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalElements > 0 && (
                    <div className="border-t border-[#e6e4dd] px-4 sm:px-6 py-4 flex justify-end">
                      <Pagination
                        current={page + 1}
                        pageSize={size}
                        total={totalElements}
                        showSizeChanger
                        pageSizeOptions={['10', '20', '50', '100']}
                        onChange={(nextPage, nextSize) => {
                          if (nextSize !== size) {
                            setSize(Math.min(100, nextSize));
                            setPage(0);
                          } else {
                            setPage(nextPage - 1);
                          }
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>

      {/* Brand Detail Drawer */}
      <Drawer
        title={<span className="font-display font-bold text-slate-900">{tb.detail.title}</span>}
        open={detailOpen}
        onClose={handleCloseDetail}
        size={460}
        footer={
          detailRecord ? (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2.5 py-1">
              <Popconfirm
                title={tb.actions.deleteConfirmTitle}
                description={tb.actions.deleteConfirmDescription}
                okText={tb.actions.deleteConfirmOk}
                cancelText={tb.actions.deleteConfirmCancel}
                okButtonProps={{ danger: true, loading: deletingId === detailRecord.id }}
                onConfirm={() => void handleDelete(detailRecord)}
              >
                <Button
                  danger
                  size="large"
                  loading={deletingId === detailRecord.id}
                  icon={<Trash2 className="w-4 h-4" />}
                  className="!min-h-[44px]"
                >
                  {tb.detail.deleteButton}
                </Button>
              </Popconfirm>

              <Button
                type="primary"
                size="large"
                icon={<Pencil className="w-4 h-4" />}
                onClick={() => {
                  const targetId = detailRecord.id;
                  handleCloseDetail();
                  handleOpenEdit(targetId);
                }}
                className="!min-h-[44px]"
              >
                {tb.detail.editButton}
              </Button>
            </div>
          ) : null
        }
      >
        {detailLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : detailError ? (
          <Alert type="error" showIcon title={detailError} />
        ) : detailRecord ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-5 flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-[#e6e4dd] bg-white flex items-center justify-center overflow-hidden shrink-0">
                {detailLogoSrc && !detailLogoFailed ? (
                  <img
                    src={detailLogoSrc}
                    alt={detailRecord.data.name}
                    referrerPolicy="no-referrer"
                    onError={() => setDetailLogoFailed(true)}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <Tag className="w-6 h-6 text-slate-400" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-bold text-slate-900 break-words">
                  {detailRecord.data.name}
                </h2>
                {!detailLogoSrc && (
                  <div className="text-xs text-slate-500">{tb.detail.noLogo}</div>
                )}
              </div>
            </div>

            <dl className="divide-y divide-[#e6e4dd] border border-[#e6e4dd] rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                <dt className="text-xs font-medium text-slate-500">{tb.detail.nameLabel}</dt>
                <dd className="text-sm font-semibold text-slate-900 text-right break-words">
                  {detailRecord.data.name}
                </dd>
              </div>
              <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                <dt className="text-xs font-medium text-slate-500">{tb.detail.slugLabel}</dt>
                <dd className="text-right">
                  <code className="text-xs font-mono text-slate-700 bg-[#f7f6f2] border border-[#e6e4dd] rounded px-2 py-0.5 break-all">
                    {detailRecord.data.slug}
                  </code>
                </dd>
              </div>
              <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                <dt className="text-xs font-medium text-slate-500">{tb.detail.statusLabel}</dt>
                <dd
                  className={`text-sm font-semibold ${
                    detailRecord.data.active ? 'text-[#15803d]' : 'text-slate-500'
                  }`}
                >
                  {detailRecord.data.active ? tb.activeLabel : tb.inactiveLabel}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Drawer>

      {/* Create / Edit Drawer */}
      <BrandFormDrawer
        open={formDrawerOpen}
        editingBrandId={editingBrandId}
        language={language}
        accessToken={session.accessToken}
        onClose={() => {
          setFormDrawerOpen(false);
          setEditingBrandId(null);
        }}
        onSaved={handleSaved}
        onUnauthorized={onUnauthorized}
        onForbidden={(msg, endpoint) => {
          setForbiddenState({ endpoint, message: msg || tb.backendForbiddenTitle });
        }}
        onNotFound={() => {
          setFormDrawerOpen(false);
          setEditingBrandId(null);
          void loadBrands(page, size, debouncedQuery, activeFilter);
        }}
      />
    </div>
  );
}
