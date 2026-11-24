import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Drawer,
  Empty,
  InputNumber,
  Pagination,
  Popconfirm,
  Result,
  Skeleton,
  Spin,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Eye, MapPin, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { branchApi } from '../services/branchApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import {
  extractBranchCoordinates,
  getAdminBranchDisplayName,
  isAdminBranchActive,
  type AdminBranchRecord,
  type BranchLocation,
  type DeliveryQuoteResponse,
} from '../types/branch';
import { formatDistanceKm, roundCoordinate7 } from '../utils/orderStatus';
import { formatPriceLabel } from '../utils/price';
import { isProfileComplete, isValidLatitude, isValidLongitude } from '../utils/validation';
import { BranchFormDrawer } from './BranchFormDrawer';
import { BranchImageThumb } from './BranchImageThumb';
import { LocationPickerMap } from './LocationPickerMap';
import { StoreHeader } from './StoreHeader';

interface AdminBranchesPageProps {
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

export function AdminBranchesPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminBranchesPageProps) {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const t = translations[language];
  const tab = t.adminBranches;
  const to = t.orders;
  const tr = t.adminTelegramRecipients;

  const isAdmin = profile.role === 'ADMIN';
  const hasAccessToken = Boolean(session.accessToken);

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [items, setItems] = useState<AdminBranchRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  // Detail Drawer & Admin Delivery Quote Tester State
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<AdminBranchRecord | null>(null);
  const [detailImgSrc, setDetailImgSrc] = useState<string | null>(null);
  const detailBlobRef = useRef<string | null>(null);

  const [testCoords, setTestCoords] = useState<BranchLocation>({
    latitude: 41.32,
    longitude: 69.25,
  });
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteResult, setQuoteResult] = useState<DeliveryQuoteResponse | null>(null);

  const revokeDetailBlob = () => {
    if (detailBlobRef.current) {
      URL.revokeObjectURL(detailBlobRef.current);
      detailBlobRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeDetailBlob();
    };
  }, []);

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

  const loadBranches = useCallback(
    async (targetPage: number, targetSize: number) => {
      if (!isAdmin) return;
      setLoading(true);
      setPageError(null);
      setForbiddenState(null);

      try {
        const res = await branchApi.listAdminBranches(
          session.accessToken,
          { page: targetPage, size: targetSize },
          language,
        );
        const content = Array.isArray(res.content) ? res.content : [];
        setItems(content);
        setTotalElements(res.page?.totalElements ?? content.length);
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint: error.endpoint || 'GET /api/admin/branches',
              message: error.message,
            });
            return;
          }
          setPageError(error.message);
        } else {
          setPageError(
            language === 'ru'
              ? 'Не удалось загрузить список филиалов.'
              : 'Filiallar ro‘yxatini yuklab bo‘lmadi.',
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
    if (isAdmin) {
      void loadBranches(page, size);
    }
  }, [isAdmin, loadBranches, page, size]);

  const openDetailDrawer = async (record: AdminBranchRecord) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailRecord(record);
    setQuoteError(null);
    setQuoteResult(null);
    revokeDetailBlob();
    setDetailImgSrc(null);

    try {
      const fresh = await branchApi.getAdminBranchById(session.accessToken, record.id, language);
      setDetailRecord(fresh);
      const coords = extractBranchCoordinates(fresh);
      if (coords) {
        setTestCoords({
          latitude: roundCoordinate7(coords.latitude + 0.01),
          longitude: roundCoordinate7(coords.longitude + 0.01),
        });
      }
      if (fresh.imageUrl) {
        try {
          const blob = await branchApi.fetchAdminBranchImageBlob(
            session.accessToken,
            fresh.imageUrl || fresh.id,
            language,
          );
          if (blob) {
            const objUrl = URL.createObjectURL(blob);
            detailBlobRef.current = objUrl;
            setDetailImgSrc(objUrl);
          }
        } catch {
          // Non-fatal image preview failure
        }
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setDetailOpen(false);
          setForbiddenState({
            endpoint: error.endpoint || `GET /api/admin/branches/${record.id}`,
            message: error.message,
          });
          return;
        }
        setDetailError(error.message);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTestQuote = async () => {
    if (!detailRecord) return;
    if (!isValidLatitude(testCoords.latitude) || !isValidLongitude(testCoords.longitude)) {
      setQuoteError(tab.validation.coordinatesRequired);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await branchApi.quoteAdminBranchDelivery(
        session.accessToken,
        detailRecord.id,
        testCoords,
        language,
      );
      setQuoteResult(res);
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

  const handleArchiveBranch = async (record: AdminBranchRecord) => {
    setArchivingId(record.id);
    setActionError(null);
    try {
      await branchApi.archiveAdminBranch(session.accessToken, record.id, language);
      message.success(tab.notifications.archivedSuccess);
      await loadBranches(page, size);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `DELETE /api/admin/branches/${record.id}`,
            message: error.message,
          });
          return;
        }
        setActionError(error.message);
      }
    } finally {
      setArchivingId(null);
    }
  };

  const renderBranchStatusText = (record: AdminBranchRecord) => {
    const statusUpper = typeof record.status === 'string' ? record.status.toUpperCase() : '';
    if (statusUpper === 'ARCHIVED') {
      return <span className="text-xs font-medium text-slate-400">{tab.statusArchived}</span>;
    }
    const active = isAdminBranchActive(record);
    return (
      <span className={`text-xs font-semibold ${active ? 'text-[#15803d]' : 'text-amber-700'}`}>
        {active ? tab.statusActive : tab.statusInactive}
      </span>
    );
  };

  const renderServicesText = (record: AdminBranchRecord) => {
    const list: string[] = [];
    if (record.pickupEnabled) list.push(tab.pickupBadge);
    if (record.deliveryEnabled) list.push(tab.deliveryBadge);
    if (list.length === 0) {
      return <span className="text-xs text-slate-400">{tab.noServicesLabel}</span>;
    }
    return <span className="text-xs font-medium text-slate-700">{list.join(' · ')}</span>;
  };

  const columns: ColumnsType<AdminBranchRecord> = [
    {
      title: tab.columns.name,
      key: 'name',
      render: (_: unknown, record) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <BranchImageThumb
            imageUrl={record.imageUrl}
            branchId={record.id}
            accessToken={session.accessToken}
            language={language}
            alt={getAdminBranchDisplayName(record, language)}
          />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => void openDetailDrawer(record)}
              className="font-semibold text-slate-900 hover:text-[#15803d] text-left cursor-pointer block truncate"
            >
              {getAdminBranchDisplayName(record, language)}
            </button>
            <div className="text-xs font-mono text-slate-500 truncate">{record.code}</div>
          </div>
        </div>
      ),
    },
    {
      title: tab.columns.address,
      key: 'address',
      render: (_: unknown, record) => (
        <div className="text-xs text-slate-700 max-w-[220px]">
          <div className="font-medium text-slate-800 truncate">{record.city}</div>
          <div className="text-slate-500 truncate">{record.addressLine}</div>
        </div>
      ),
    },
    {
      title: tab.columns.phone,
      dataIndex: 'phone',
      key: 'phone',
      render: (phone?: string | null) => (
        <span className="text-xs font-mono text-slate-700 tabular-nums whitespace-nowrap">
          {phone?.trim() || '—'}
        </span>
      ),
    },
    {
      title: tab.columns.workingHours,
      dataIndex: 'workingHours',
      key: 'workingHours',
      render: (wh?: string | null) => (
        <span className="text-xs text-slate-700 tabular-nums whitespace-nowrap">
          {wh?.trim() || '—'}
        </span>
      ),
    },
    {
      title: tab.columns.status,
      key: 'status',
      render: (_: unknown, record) => renderBranchStatusText(record),
    },
    {
      title: tab.columns.services,
      key: 'services',
      render: (_: unknown, record) => renderServicesText(record),
    },
    {
      title: tab.columns.pricePerKm,
      dataIndex: 'pricePerKm',
      key: 'pricePerKm',
      align: 'right',
      render: (pricePerKm: number) => (
        <span className="text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
          {new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'uz-UZ').format(pricePerKm ?? 0)}{' '}
          {tab.perKmSuffix}
        </span>
      ),
    },
    {
      title: tab.columns.actions,
      key: 'actions',
      align: 'right',
      render: (_: unknown, record) => {
        const isArchived =
          typeof record.status === 'string' && record.status.toUpperCase() === 'ARCHIVED';
        return (
          <div className="inline-flex items-center gap-1.5">
            <Button
              type="text"
              size="small"
              icon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => void openDetailDrawer(record)}
              title={tab.viewButton}
            />
            <Button
              type="text"
              size="small"
              icon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => {
                setEditingBranchId(record.id);
                setFormDrawerOpen(true);
              }}
              title={tab.editButton}
            />
            {!isArchived && (
              <Popconfirm
                title={tab.archiveConfirmTitle}
                description={tab.archiveConfirmDescription}
                okText={tab.archiveConfirmOk}
                cancelText={tab.archiveConfirmCancel}
                okButtonProps={{ danger: true, loading: archivingId === record.id }}
                onConfirm={() => handleArchiveBranch(record)}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  loading={archivingId === record.id}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  title={tab.archiveButton}
                />
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  const profileComplete = isProfileComplete(profile);
  const detailCoords = detailRecord ? extractBranchCoordinates(detailRecord) : null;

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
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
            <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{t.brandName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{tab.menuGroupLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {tab.totalCountLabel}: {totalElements}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
                  {tab.title}
                </h1>
                <p className="text-sm text-slate-600">{tab.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  size="large"
                  icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                  onClick={() => void loadBranches(page, size)}
                  disabled={loading}
                  className="!min-h-[44px]"
                >
                  {tab.refreshButton}
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setEditingBranchId(null);
                    setFormDrawerOpen(true);
                  }}
                  className="!min-h-[44px]"
                >
                  {tab.createButton}
                </Button>
              </div>
            </div>

            {pageError && (
              <Alert
                type="error"
                showIcon
                title={pageError}
                action={
                  <Button type="primary" size="small" onClick={() => void loadBranches(page, size)}>
                    {t.catalog.retryButton}
                  </Button>
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

            <section className="bg-white border border-[#e6e4dd] rounded-xl overflow-hidden">
              {loading && items.length === 0 ? (
                <div className="p-6">
                  <Skeleton active paragraph={{ rows: 5 }} />
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 sm:p-12">
                  <Empty
                    image={<MapPin className="w-10 h-10 text-slate-300 mx-auto" />}
                    description={
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900">{tab.emptyTitle}</div>
                        <div className="text-sm text-slate-500 max-w-md mx-auto">
                          {tab.emptyDescription}
                        </div>
                      </div>
                    }
                  >
                    <Button
                      type="primary"
                      size="large"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => {
                        setEditingBranchId(null);
                        setFormDrawerOpen(true);
                      }}
                      className="!min-h-[44px]"
                    >
                      {tab.createButton}
                    </Button>
                  </Empty>
                </div>
              ) : (
                <>
                  <div className="hidden lg:block">
                    <Table<AdminBranchRecord>
                      rowKey="id"
                      columns={columns}
                      dataSource={items}
                      loading={loading}
                      pagination={false}
                    />
                  </div>

                  <div className="lg:hidden divide-y divide-[#f2f0ea]">
                    {items.map((record) => {
                      const isArchived =
                        typeof record.status === 'string' &&
                        record.status.toUpperCase() === 'ARCHIVED';
                      return (
                        <div key={record.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <BranchImageThumb
                                imageUrl={record.imageUrl}
                                branchId={record.id}
                                accessToken={session.accessToken}
                                language={language}
                                alt={getAdminBranchDisplayName(record, language)}
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate">
                                  {getAdminBranchDisplayName(record, language)}
                                </div>
                                <div className="text-xs font-mono text-slate-500 truncate">
                                  {record.code}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0">{renderBranchStatusText(record)}</div>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1">
                            <div>
                              {record.city} · {record.addressLine}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 tabular-nums">
                              <span className="font-mono">{record.phone?.trim() || '—'}</span>
                              <span aria-hidden="true">·</span>
                              <span>{record.workingHours?.trim() || '—'}</span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                              {renderServicesText(record)}
                              <span className="font-semibold text-slate-900 tabular-nums">
                                {new Intl.NumberFormat(
                                  language === 'ru' ? 'ru-RU' : 'uz-UZ',
                                ).format(record.pricePerKm ?? 0)}{' '}
                                {tab.perKmSuffix}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Button
                              size="small"
                              icon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => void openDetailDrawer(record)}
                              className="!min-h-[40px]"
                            >
                              {tab.viewButton}
                            </Button>
                            <Button
                              size="small"
                              icon={<Pencil className="w-3.5 h-3.5" />}
                              onClick={() => {
                                setEditingBranchId(record.id);
                                setFormDrawerOpen(true);
                              }}
                              className="!min-h-[40px]"
                            >
                              {tab.editButton}
                            </Button>
                            {!isArchived && (
                              <Popconfirm
                                title={tab.archiveConfirmTitle}
                                description={tab.archiveConfirmDescription}
                                okText={tab.archiveConfirmOk}
                                cancelText={tab.archiveConfirmCancel}
                                okButtonProps={{ danger: true, loading: archivingId === record.id }}
                                onConfirm={() => handleArchiveBranch(record)}
                              >
                                <Button
                                  size="small"
                                  danger
                                  loading={archivingId === record.id}
                                  icon={<Trash2 className="w-3.5 h-3.5" />}
                                  className="!min-h-[40px]"
                                >
                                  {tab.archiveButton}
                                </Button>
                              </Popconfirm>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalElements > size && (
                    <div className="border-t border-[#f2f0ea] px-4 py-3.5 flex justify-end">
                      <Pagination
                        current={page + 1}
                        pageSize={size}
                        total={totalElements}
                        showSizeChanger
                        pageSizeOptions={['10', '20', '50']}
                        onChange={(nextPage, nextSize) => {
                          setPage(nextPage - 1);
                          setSize(nextSize);
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

      <BranchFormDrawer
        open={formDrawerOpen}
        branchId={editingBranchId}
        accessToken={session.accessToken}
        language={language}
        onClose={() => setFormDrawerOpen(false)}
        onSaved={() => {
          void loadBranches(page, size);
        }}
        onUnauthorized={onUnauthorized}
        onForbidden={(endpoint, msg) =>
          setForbiddenState({ endpoint, message: msg || tr.backendForbiddenSubtitle })
        }
      />

      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        size={560}
        title={
          <span className="font-display font-bold text-slate-900">{tab.detailDrawerTitle}</span>
        }
      >
        {detailLoading && !detailRecord ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : detailError ? (
          <Alert type="error" showIcon title={detailError} />
        ) : detailRecord ? (
          <div className="space-y-5">
            {detailImgSrc && (
              <div className="w-full h-44 rounded-xl border border-[#e6e4dd] overflow-hidden bg-[#faf9f5]">
                <img
                  src={detailImgSrc}
                  alt={getAdminBranchDisplayName(detailRecord, language)}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  {getAdminBranchDisplayName(detailRecord, language)}
                </h2>
                <div className="text-xs font-mono text-slate-500 mt-0.5">{detailRecord.code}</div>
              </div>
              {renderBranchStatusText(detailRecord)}
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500">{tab.nameUzLabel}</dt>
                <dd className="font-medium text-slate-900">{detailRecord.nameUz || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{tab.nameRuLabel}</dt>
                <dd className="font-medium text-slate-900">{detailRecord.nameRu || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{tab.cityLabel}</dt>
                <dd className="font-medium text-slate-900">{detailRecord.city}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{tab.addressLineLabel}</dt>
                <dd className="font-medium text-slate-900">{detailRecord.addressLine}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{tab.phoneLabel}</dt>
                <dd className="font-mono text-slate-900 tabular-nums">
                  {detailRecord.phone || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{tab.emailLabel}</dt>
                <dd className="font-mono text-slate-900 break-all">
                  {detailRecord.email || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{tab.workingHoursLabel}</dt>
                <dd className="font-medium text-slate-900 tabular-nums">
                  {detailRecord.workingHours || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{tab.pricePerKmLabel}</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">
                  {new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'uz-UZ').format(
                    detailRecord.pricePerKm ?? 0,
                  )}{' '}
                  {tab.perKmSuffix}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">{tab.columns.services}</dt>
                <dd className="mt-0.5">{renderServicesText(detailRecord)}</dd>
              </div>
            </dl>

            {/* Admin Delivery Quote Tester */}
            <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900">{tab.quoteTesterTitle}</div>
              <p className="text-xs text-slate-500">{to.mapPickHint}</p>

              <LocationPickerMap
                latitude={testCoords.latitude}
                longitude={testCoords.longitude}
                branchMarker={
                  detailCoords
                    ? {
                        latitude: detailCoords.latitude,
                        longitude: detailCoords.longitude,
                        label: getAdminBranchDisplayName(detailRecord, language),
                      }
                    : null
                }
                onChange={(loc) => setTestCoords(loc)}
                heightClass="h-48"
              />

              <div className="grid grid-cols-2 gap-3">
                <InputNumber
                  value={testCoords.latitude}
                  step={0.0001}
                  precision={7}
                  className="!w-full font-mono"
                  onChange={(val) => {
                    if (typeof val === 'number' && isValidLatitude(val)) {
                      setTestCoords((prev) => ({
                        latitude: roundCoordinate7(val),
                        longitude: prev.longitude,
                      }));
                    }
                  }}
                />
                <InputNumber
                  value={testCoords.longitude}
                  step={0.0001}
                  precision={7}
                  className="!w-full font-mono"
                  onChange={(val) => {
                    if (typeof val === 'number' && isValidLongitude(val)) {
                      setTestCoords((prev) => ({
                        latitude: prev.latitude,
                        longitude: roundCoordinate7(val),
                      }));
                    }
                  }}
                />
              </div>

              <Button
                type="primary"
                loading={quoteLoading}
                onClick={() => void handleTestQuote()}
                className="!min-h-[40px]"
              >
                {tab.quoteTesterButton}
              </Button>

              {quoteError && <Alert type="error" showIcon title={quoteError} className="text-xs" />}

              {quoteResult && (
                <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{to.distanceLabel}:</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatDistanceKm(quoteResult.distanceKm, language)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">{to.ratePerKmLabel}:</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatPriceLabel(quoteResult.pricePerKm, language, quoteResult.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#dcfce7]">
                    <span className="font-semibold text-[#15803d]">{to.deliveryFeeLabel}:</span>
                    <span className="font-bold text-[#15803d] tabular-nums">
                      {formatPriceLabel(quoteResult.deliveryPrice, language, quoteResult.currency)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-0.5">{to.straightLineHint}</div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
