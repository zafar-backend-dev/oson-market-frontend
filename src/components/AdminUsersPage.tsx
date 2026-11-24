import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Drawer,
  Empty,
  Input,
  Modal,
  Pagination,
  Result,
  Select,
  Skeleton,
  Spin,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircle2,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { adminUserApi } from '../services/adminUserApi';
import { authApi, AuthApiError } from '../services/authApi';
import { sessionManager } from '../services/sessionManager';
import type { AdminUserAccountStatus, AdminUserRecord } from '../types/adminUser';
import type { AuthSession, Language, UserProfile, UserRole } from '../types/auth';
import { formatOrderDateTime } from '../utils/orderStatus';
import { isProfileComplete } from '../utils/validation';
import { SiteFooter } from './SiteFooter';
import { StoreHeader } from './StoreHeader';

const SEARCH_MAX_LENGTH = 255;
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 20;

interface AdminUsersPageProps {
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

interface PendingStatusChange {
  user: AdminUserRecord;
  targetStatus: AdminUserAccountStatus;
}

function getFullName(user: AdminUserRecord, fallback: string): string {
  const combined = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return combined || fallback;
}

function formatLanguageValue(rawLang: string | null, language: Language, notProvided: string): string {
  if (!rawLang) return notProvided;
  const normalized = rawLang.trim().toLowerCase();
  if (normalized === 'uz') return translations[language].workspace.languageNames.uz;
  if (normalized === 'ru') return translations[language].workspace.languageNames.ru;
  return rawLang;
}

export function AdminUsersPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminUsersPageProps) {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  const t = translations[language];
  const tau = t.adminUsers;
  const isAdmin = profile.role === 'ADMIN';
  const hasAccessToken = Boolean(session.accessToken);
  const profileComplete = isProfileComplete(profile);

  const accessTokenRef = useRef(session.accessToken);
  accessTokenRef.current = session.accessToken;

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  // List state
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // Filter / Search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdminUserAccountStatus>('ALL');

  // Monotonic sequence guard against out-of-order responses
  const listSeqRef = useRef(0);
  const detailSeqRef = useRef(0);

  // Detail Drawer state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<AdminUserRecord | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailErrorStatus, setDetailErrorStatus] = useState<number | null>(null);

  // Status Confirmation Modal state
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusModalError, setStatusModalError] = useState<string | null>(null);

  // Verify role if cached profile is not ADMIN
  useEffect(() => {
    if (isAdmin) {
      setVerifyingProfile(false);
      return;
    }

    let cancelled = false;
    setVerifyingProfile(true);

    (async () => {
      try {
        const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
        const freshProfile = await authApi.getProfile(token, language);
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

  // Debounce search input (~300 ms) and reset page=0 when query changes
  useEffect(() => {
    const normalized = searchInput.trim().slice(0, SEARCH_MAX_LENGTH);
    if (normalized === debouncedQuery) return;

    const timer = window.setTimeout(() => {
      setPage(0);
      setDebouncedQuery(normalized);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput, debouncedQuery]);

  const loadUsers = useCallback(
    async (
      targetPage: number,
      targetSize: number,
      targetQuery: string,
      targetRole: 'ALL' | UserRole,
      targetStatus: 'ALL' | AdminUserAccountStatus,
    ) => {
      if (!isAdmin) return;
      const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
      if (!token) return;

      const seq = ++listSeqRef.current;
      setLoading(true);
      setPageError(null);
      setForbiddenState(null);

      try {
        const res = await adminUserApi.listUsers(
          token,
          {
            q: targetQuery || undefined,
            role: targetRole === 'ALL' ? undefined : targetRole,
            status: targetStatus === 'ALL' ? undefined : targetStatus,
            page: targetPage,
            size: targetSize,
          },
          language,
        );

        if (seq !== listSeqRef.current) return;

        setUsers(res.content);
        setTotalElements(res.page.totalElements);
        setTotalPages(res.page.totalPages);
        if (res.page.number !== targetPage) {
          setPage(res.page.number);
        }
      } catch (error) {
        if (seq !== listSeqRef.current) return;

        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint: error.endpoint || 'GET /api/admin/users',
              message: error.message,
            });
            return;
          }
          setPageError(error.message);
        } else {
          setPageError(
            language === 'ru'
              ? 'Не удалось загрузить список пользователей.'
              : 'Foydalanuvchilar ro‘yxatini yuklab bo‘lmadi.',
          );
        }
      } finally {
        if (seq === listSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [isAdmin, language, onUnauthorized],
  );

  useEffect(() => {
    if (!isAdmin || !hasAccessToken) return;
    void loadUsers(page, size, debouncedQuery, roleFilter, statusFilter);
  }, [isAdmin, hasAccessToken, page, size, debouncedQuery, roleFilter, statusFilter, loadUsers]);

  const loadUserDetail = useCallback(
    async (userId: string) => {
      if (!isAdmin) return;
      const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
      if (!token) return;

      const seq = ++detailSeqRef.current;
      setDetailLoading(true);
      setDetailError(null);
      setDetailErrorStatus(null);
      setDetailRecord(null);

      try {
        const detail = await adminUserApi.getUserDetail(token, userId, language);
        if (seq !== detailSeqRef.current) return;
        setDetailRecord(detail);
      } catch (error) {
        if (seq !== detailSeqRef.current) return;

        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setDetailOpen(false);
            setForbiddenState({
              endpoint: error.endpoint || `GET /api/admin/users/${userId}`,
              message: error.message,
            });
            return;
          }
          setDetailErrorStatus(error.status);
          setDetailError(
            error.status === 404
              ? error.message || tau.notifications.notFoundError
              : error.message,
          );
        } else {
          setDetailErrorStatus(500);
          setDetailError(
            language === 'ru'
              ? 'Не удалось загрузить данные пользователя.'
              : 'Foydalanuvchi ma’lumotlarini yuklab bo‘lmadi.',
          );
        }
      } finally {
        if (seq === detailSeqRef.current) {
          setDetailLoading(false);
        }
      }
    },
    [isAdmin, language, onUnauthorized, tau.notifications.notFoundError],
  );

  const handleOpenDetail = (user: AdminUserRecord) => {
    setSelectedUserId(user.id);
    setDetailOpen(true);
    void loadUserDetail(user.id);
  };

  const handleCloseDetail = () => {
    detailSeqRef.current += 1;
    setDetailOpen(false);
    setSelectedUserId(null);
    setDetailRecord(null);
    setDetailError(null);
    setDetailErrorStatus(null);
  };

  const handleCommitSearchNow = () => {
    const normalized = searchInput.trim().slice(0, SEARCH_MAX_LENGTH);
    setPage(0);
    setDebouncedQuery(normalized);
  };

  const handleRoleFilterChange = (nextRole: 'ALL' | UserRole) => {
    setPage(0);
    setRoleFilter(nextRole);
  };

  const handleStatusFilterChange = (nextStatus: 'ALL' | AdminUserAccountStatus) => {
    setPage(0);
    setStatusFilter(nextStatus);
  };

  const handleClearFilters = () => {
    setPage(0);
    setSearchInput('');
    setDebouncedQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  };

  const handleOpenStatusConfirm = (user: AdminUserRecord) => {
    if (user.role !== 'USER') return;
    const isBlocked = String(user.status).toUpperCase() === 'BLOCKED';
    const targetStatus: AdminUserAccountStatus = isBlocked ? 'ACTIVE' : 'BLOCKED';
    setStatusModalError(null);
    setPendingStatusChange({ user, targetStatus });
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusChange || statusSubmitting) return;
    const { user, targetStatus } = pendingStatusChange;
    if (user.role !== 'USER') return;

    const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
    if (!token) return;

    setStatusSubmitting(true);
    setStatusModalError(null);

    try {
      const updatedUser = await adminUserApi.updateUserStatus(
        token,
        user.id,
        targetStatus,
        language,
      );

      if (detailOpen && (detailRecord?.id === updatedUser.id || selectedUserId === updatedUser.id)) {
        setDetailRecord(updatedUser);
      }

      setPendingStatusChange(null);
      message.success(
        targetStatus === 'BLOCKED'
          ? tau.notifications.blockedSuccess
          : tau.notifications.activatedSuccess,
      );

      await loadUsers(page, size, debouncedQuery, roleFilter, statusFilter);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          setPendingStatusChange(null);
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setStatusModalError(error.message);
          return;
        }
        if (error.status === 404) {
          setStatusModalError(error.message || tau.notifications.notFoundError);
          return;
        }
        setStatusModalError(error.message);
      } else {
        setStatusModalError(
          language === 'ru'
            ? 'Не удалось обновить статус пользователя.'
            : 'Foydalanuvchi holatini yangilab bo‘lmadi.',
        );
      }
    } finally {
      setStatusSubmitting(false);
    }
  };

  const hasActiveFilters =
    Boolean(debouncedQuery) ||
    Boolean(searchInput.trim()) ||
    roleFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const renderRoleBadge = (role: UserRole) => {
    const isAdminRole = role === 'ADMIN';
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border whitespace-nowrap ${
          isAdminRole
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-[#f7f6f2] text-slate-700 border-[#e6e4dd]'
        }`}
      >
        <Shield className="w-3 h-3 shrink-0" />
        <span>{isAdminRole ? tau.roleNames.ADMIN : tau.roleNames.USER}</span>
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    const isBlocked = String(status).toUpperCase() === 'BLOCKED';
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border whitespace-nowrap ${
          isBlocked
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isBlocked ? 'bg-rose-500' : 'bg-[#16a34a]'
          }`}
        />
        <span>{isBlocked ? tau.statusNames.BLOCKED : tau.statusNames.ACTIVE}</span>
      </span>
    );
  };

  const columns: ColumnsType<AdminUserRecord> = [
    {
      title: tau.columns.fullName,
      key: 'fullName',
      render: (_, record) => {
        const fullName = getFullName(record, tau.notProvided);
        const hasName = Boolean(record.firstName || record.lastName);
        return (
          <div className="min-w-0 max-w-[220px]">
            <div
              className={`text-sm font-semibold truncate ${
                hasName ? 'text-slate-900' : 'text-slate-400 font-normal italic'
              }`}
            >
              {fullName}
            </div>
            <div className="text-xs text-slate-500 font-mono truncate mt-0.5">
              @{record.username}
            </div>
          </div>
        );
      },
    },
    {
      title: tau.columns.email,
      dataIndex: 'email',
      key: 'email',
      render: (email: string, record) => (
        <div className="min-w-0 max-w-[240px]">
          <div className="text-sm text-slate-800 truncate">{email}</div>
          {record.emailVerifiedAt && (
            <div className="inline-flex items-center gap-1 text-[11px] text-[#15803d] mt-0.5">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>{tau.detail.emailVerifiedBadge}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: tau.columns.phone,
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string | null) =>
        phone ? (
          <span className="text-sm text-slate-700 font-mono whitespace-nowrap tabular-nums">
            {phone}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic whitespace-nowrap">{tau.notProvided}</span>
        ),
    },
    {
      title: tau.columns.role,
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => renderRoleBadge(role),
    },
    {
      title: tau.columns.status,
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderStatusBadge(status),
    },
    {
      title: tau.columns.createdAt,
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string | null) =>
        createdAt ? (
          <span className="text-xs text-slate-600 tabular-nums whitespace-nowrap">
            {formatOrderDateTime(createdAt, language)}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic whitespace-nowrap">{tau.notProvided}</span>
        ),
    },
    {
      title: tau.columns.actions,
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        const isUserRole = record.role === 'USER';
        const isBlocked = String(record.status).toUpperCase() === 'BLOCKED';
        return (
          <div className="inline-flex items-center justify-end gap-2">
            <Button
              size="small"
              icon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => handleOpenDetail(record)}
              className="!inline-flex !items-center !min-h-[34px]"
            >
              {tau.actions.viewDetails}
            </Button>

            {isUserRole && (
              <Button
                size="small"
                danger={!isBlocked}
                type={isBlocked ? 'primary' : 'default'}
                icon={
                  isBlocked ? (
                    <UserCheck className="w-3.5 h-3.5" />
                  ) : (
                    <UserX className="w-3.5 h-3.5" />
                  )
                }
                onClick={() => handleOpenStatusConfirm(record)}
                disabled={statusSubmitting && pendingStatusChange?.user.id === record.id}
                className="!inline-flex !items-center !min-h-[34px]"
              >
                {isBlocked ? tau.actions.activate : tau.actions.block}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const isTargetBlockedAction = pendingStatusChange?.targetStatus === 'BLOCKED';

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
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-8 space-y-4">
            <div className="flex items-center gap-3">
              <Spin />
              <span className="text-sm font-medium text-slate-700">
                {tau.checkingPermissions}
              </span>
            </div>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : !isAdmin ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tau.userRoleBlockedTitle}
              subTitle={tau.userRoleBlockedSubtitle}
              extra={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => navigate('/')}
                    className="!min-h-[44px]"
                  >
                    {tau.backToStore}
                  </Button>
                  <Button size="large" onClick={onLogout} className="!min-h-[44px]">
                    {tau.switchAccountButton}
                  </Button>
                </div>
              }
            />
          </div>
        ) : forbiddenState ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tau.backendForbiddenTitle}
              subTitle={
                <div className="space-y-2 max-w-lg mx-auto">
                  <p className="text-slate-600">{tau.backendForbiddenSubtitle}</p>
                  <p className="text-sm text-rose-700 font-medium">{forbiddenState.message}</p>
                  {forbiddenState.endpoint && (
                    <div className="text-xs text-slate-500 font-mono">
                      {tau.backendForbiddenEndpointLabel}: {forbiddenState.endpoint}
                    </div>
                  )}
                </div>
              }
              extra={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() =>
                      void loadUsers(page, size, debouncedQuery, roleFilter, statusFilter)
                    }
                    className="!min-h-[44px]"
                  >
                    {tau.retryButton}
                  </Button>
                  <Button size="large" onClick={() => navigate('/')} className="!min-h-[44px]">
                    {tau.backToStore}
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* Header Bar */}
            <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    {tau.title}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e4dd] bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 tabular-nums">
                    <Users className="w-3.5 h-3.5 text-[#16a34a]" />
                    <span>
                      {tau.totalCountLabel}: {totalElements}
                    </span>
                  </span>
                </div>
                <p className="text-sm text-slate-600">{tau.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  size="large"
                  icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                  loading={loading}
                  onClick={() =>
                    void loadUsers(page, size, debouncedQuery, roleFilter, statusFilter)
                  }
                  className="!inline-flex !items-center !min-h-[44px]"
                >
                  {tau.refreshButton}
                </Button>
              </div>
            </section>

            {/* Search & Filter Bar */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-2 lg:col-span-6 space-y-1">
                  <Input
                    size="large"
                    allowClear
                    maxLength={SEARCH_MAX_LENGTH}
                    value={searchInput}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setSearchInput(nextValue);
                      if (nextValue === '' && debouncedQuery !== '') {
                        setPage(0);
                        setDebouncedQuery('');
                      }
                    }}
                    onPressEnter={handleCommitSearchNow}
                    prefix={<Search className="w-4 h-4 text-slate-400 mr-1" />}
                    placeholder={tau.searchPlaceholder}
                    aria-label={tau.searchPlaceholder}
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                    <span>{tau.searchMaxHint}</span>
                    <span className="tabular-nums">
                      {searchInput.length}/{SEARCH_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-1">
                  <label className="block text-xs font-medium text-slate-600">
                    {tau.roleFilterLabel}
                  </label>
                  <Select<'ALL' | UserRole>
                    size="large"
                    className="w-full"
                    value={roleFilter}
                    onChange={handleRoleFilterChange}
                    options={[
                      { value: 'ALL', label: tau.roleFilterAll },
                      { value: 'USER', label: tau.roleNames.USER },
                      { value: 'ADMIN', label: tau.roleNames.ADMIN },
                    ]}
                  />
                </div>

                <div className="lg:col-span-3 space-y-1">
                  <label className="block text-xs font-medium text-slate-600">
                    {tau.statusFilterLabel}
                  </label>
                  <Select<'ALL' | AdminUserAccountStatus>
                    size="large"
                    className="w-full"
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    options={[
                      { value: 'ALL', label: tau.statusFilterAll },
                      { value: 'ACTIVE', label: tau.statusNames.ACTIVE },
                      { value: 'BLOCKED', label: tau.statusNames.BLOCKED },
                    ]}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end pt-1">
                  <Button
                    size="middle"
                    onClick={handleClearFilters}
                    className="!min-h-[38px]"
                  >
                    {tau.clearFilters}
                  </Button>
                </div>
              )}
            </section>

            {/* Error Banner */}
            {pageError && (
              <Alert
                type="error"
                showIcon
                title={pageError}
                action={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() =>
                      void loadUsers(page, size, debouncedQuery, roleFilter, statusFilter)
                    }
                  >
                    {tau.retryButton}
                  </Button>
                }
              />
            )}

            {/* Desktop Table + Mobile Compact Cards */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl overflow-hidden">
              {loading && users.length === 0 ? (
                <div className="p-6">
                  <Skeleton active paragraph={{ rows: 6 }} />
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 sm:p-12">
                  <Empty
                    image={<Users className="w-10 h-10 text-slate-300 mx-auto" />}
                    description={
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900">{tau.emptyTitle}</div>
                        <div className="text-sm text-slate-500 max-w-md mx-auto">
                          {hasActiveFilters ? tau.emptyFilteredDescription : tau.emptyDescription}
                        </div>
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
                        {tau.clearFilters}
                      </Button>
                    )}
                  </Empty>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table<AdminUserRecord>
                      rowKey="id"
                      columns={columns}
                      dataSource={users}
                      loading={loading}
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                    />
                  </div>

                  {/* Mobile & Tablet Compact Cards */}
                  <div className="lg:hidden divide-y divide-[#f2f0ea]">
                    {users.map((user) => {
                      const fullName = getFullName(user, tau.notProvided);
                      const hasName = Boolean(user.firstName || user.lastName);
                      const isUserRole = user.role === 'USER';
                      const isBlocked = String(user.status).toUpperCase() === 'BLOCKED';

                      return (
                        <div
                          key={user.id}
                          className="p-4 space-y-3 hover:bg-[#faf9f5] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div
                                className={`text-sm font-semibold truncate ${
                                  hasName ? 'text-slate-900' : 'text-slate-400 italic font-normal'
                                }`}
                              >
                                {fullName}
                              </div>
                              <div className="text-xs text-slate-500 font-mono truncate mt-0.5">
                                @{user.username}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                              {renderRoleBadge(user.role)}
                              {renderStatusBadge(user.status)}
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-slate-600">
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate text-slate-800">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {user.phone ? (
                                <span className="font-mono tabular-nums text-slate-700">
                                  {user.phone}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">{tau.notProvided}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <span className="text-xs text-slate-500 tabular-nums">
                              {user.createdAt
                                ? formatOrderDateTime(user.createdAt, language)
                                : tau.notProvided}
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="middle"
                                icon={<Eye className="w-4 h-4" />}
                                onClick={() => handleOpenDetail(user)}
                                className="!inline-flex !items-center !min-h-[40px]"
                              >
                                {tau.actions.viewDetails}
                              </Button>

                              {isUserRole && (
                                <Button
                                  size="middle"
                                  danger={!isBlocked}
                                  type={isBlocked ? 'primary' : 'default'}
                                  icon={
                                    isBlocked ? (
                                      <UserCheck className="w-4 h-4" />
                                    ) : (
                                      <UserX className="w-4 h-4" />
                                    )
                                  }
                                  onClick={() => handleOpenStatusConfirm(user)}
                                  disabled={
                                    statusSubmitting && pendingStatusChange?.user.id === user.id
                                  }
                                  className="!inline-flex !items-center !min-h-[40px]"
                                >
                                  {isBlocked ? tau.actions.activate : tau.actions.block}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Footer driven by backend page object */}
                  {(totalPages > 1 || totalElements > 0) && (
                    <div className="border-t border-[#f2f0ea] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 tabular-nums">
                        {tau.paginationTotalTemplate.replace('{total}', String(totalElements))}
                      </span>

                      <Pagination
                        current={page + 1}
                        pageSize={size}
                        total={totalElements}
                        showSizeChanger
                        pageSizeOptions={['10', '20', '50', '100']}
                        onChange={(nextPage, nextSize) => {
                          const clampedSize = Math.min(100, Math.max(1, nextSize));
                          if (clampedSize !== size) {
                            setSize(clampedSize);
                            setPage(0);
                          } else {
                            setPage(Math.max(0, nextPage - 1));
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

      <SiteFooter language={language} />

      {/* User Detail Drawer (Always fetches fresh data via GET /api/admin/users/{id}) */}
      <Drawer
        title={tau.detail.title}
        placement="right"
        open={detailOpen}
        onClose={handleCloseDetail}
        size={480}
        footer={
          detailRecord ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {detailRecord.role === 'USER' ? (
                  <Button
                    size="large"
                    danger={String(detailRecord.status).toUpperCase() !== 'BLOCKED'}
                    type={
                      String(detailRecord.status).toUpperCase() === 'BLOCKED'
                        ? 'primary'
                        : 'default'
                    }
                    icon={
                      String(detailRecord.status).toUpperCase() === 'BLOCKED' ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )
                    }
                    onClick={() => handleOpenStatusConfirm(detailRecord)}
                    loading={statusSubmitting && pendingStatusChange?.user.id === detailRecord.id}
                    className="!inline-flex !items-center !min-h-[44px]"
                  >
                    {String(detailRecord.status).toUpperCase() === 'BLOCKED'
                      ? tau.actions.activate
                      : tau.actions.block}
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500">{tau.detail.adminImmutableNote}</span>
                )}
              </div>

              <Button size="large" onClick={handleCloseDetail} className="!min-h-[44px]">
                {tau.detail.closeButton}
              </Button>
            </div>
          ) : null
        }
      >
        {detailLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Spin size="small" />
              <span>{tau.detail.loading}</span>
            </div>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : detailError ? (
          <Alert
            type="error"
            showIcon
            title={detailError}
            action={
              selectedUserId && detailErrorStatus !== 404 ? (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => void loadUserDetail(selectedUserId)}
                >
                  {tau.retryButton}
                </Button>
              ) : undefined
            }
          />
        ) : detailRecord ? (
          <div className="space-y-5">
            {/* Identity Summary */}
            <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-bold text-slate-900 break-words">
                    {getFullName(detailRecord, tau.notProvided)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5 break-all">
                    @{detailRecord.username}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                  {renderRoleBadge(detailRecord.role)}
                  {renderStatusBadge(detailRecord.status)}
                </div>
              </div>
              <div className="pt-2 border-t border-[#e6e4dd] text-xs text-slate-500">
                <span>{tau.detail.accountIdLabel}: </span>
                <span className="font-mono text-slate-700 break-all">{detailRecord.id}</span>
              </div>
            </div>

            {/* Profile & Account Fields */}
            <dl className="divide-y divide-[#f2f0ea] border border-[#e6e4dd] rounded-xl bg-white">
              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-xs font-medium text-slate-500">{tau.detail.firstNameLabel}</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {detailRecord.firstName ?? (
                    <span className="text-slate-400 italic font-normal">{tau.notProvided}</span>
                  )}
                </dd>
              </div>

              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-xs font-medium text-slate-500">{tau.detail.lastNameLabel}</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {detailRecord.lastName ?? (
                    <span className="text-slate-400 italic font-normal">{tau.notProvided}</span>
                  )}
                </dd>
              </div>

              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-xs font-medium text-slate-500">{tau.detail.usernameLabel}</dt>
                <dd className="text-sm font-mono text-slate-900 break-all">
                  @{detailRecord.username}
                </dd>
              </div>

              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-xs font-medium text-slate-500">{tau.detail.emailLabel}</dt>
                <dd className="text-sm text-slate-900 break-all">{detailRecord.email}</dd>
              </div>

              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-xs font-medium text-slate-500">
                  {tau.detail.emailVerificationLabel}
                </dt>
                <dd className="text-sm">
                  {detailRecord.emailVerifiedAt ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5 text-[#15803d] font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{tau.detail.emailVerifiedBadge}</span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        ({formatOrderDateTime(detailRecord.emailVerifiedAt, language)})
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{tau.detail.emailUnverifiedBadge}</span>
                    </span>
                  )}
                </dd>
              </div>

              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-xs font-medium text-slate-500">{tau.detail.phoneLabel}</dt>
                <dd className="text-sm font-mono tabular-nums text-slate-900">
                  {detailRecord.phone ?? (
                    <span className="text-slate-400 italic font-sans font-normal">
                      {tau.notProvided}
                    </span>
                  )}
                </dd>
              </div>

              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-xs font-medium text-slate-500">{tau.detail.languageLabel}</dt>
                <dd className="text-sm text-slate-900">
                  {formatLanguageValue(detailRecord.language, language, tau.notProvided)}
                </dd>
              </div>

              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-xs font-medium text-slate-500">{tau.detail.createdAtLabel}</dt>
                <dd className="text-sm text-slate-700 tabular-nums">
                  {detailRecord.createdAt
                    ? formatOrderDateTime(detailRecord.createdAt, language)
                    : tau.notProvided}
                </dd>
              </div>

              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-xs font-medium text-slate-500">{tau.detail.updatedAtLabel}</dt>
                <dd className="text-sm text-slate-700 tabular-nums">
                  {detailRecord.updatedAt
                    ? formatOrderDateTime(detailRecord.updatedAt, language)
                    : tau.notProvided}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Drawer>

      {/* Block / Activate Confirmation Modal */}
      <Modal
        open={Boolean(pendingStatusChange)}
        title={isTargetBlockedAction ? tau.confirmModal.blockTitle : tau.confirmModal.activateTitle}
        onCancel={() => {
          if (statusSubmitting) return;
          setPendingStatusChange(null);
          setStatusModalError(null);
        }}
        closable={!statusSubmitting}
        mask={{ closable: !statusSubmitting }}
        footer={
          pendingStatusChange ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                size="large"
                disabled={statusSubmitting}
                onClick={() => {
                  setPendingStatusChange(null);
                  setStatusModalError(null);
                }}
                className="!min-h-[42px]"
              >
                {tau.confirmModal.cancelButton}
              </Button>
              <Button
                size="large"
                type="primary"
                danger={isTargetBlockedAction}
                loading={statusSubmitting}
                disabled={statusSubmitting}
                onClick={() => void handleConfirmStatusChange()}
                className="!min-h-[42px]"
              >
                {isTargetBlockedAction
                  ? tau.confirmModal.blockConfirmButton
                  : tau.confirmModal.activateConfirmButton}
              </Button>
            </div>
          ) : null
        }
      >
        {pendingStatusChange && (
          <div className="space-y-4 pt-1">
            <p className="text-sm text-slate-700">
              {isTargetBlockedAction
                ? tau.confirmModal.blockDescription
                : tau.confirmModal.activateDescription}
            </p>

            <div className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5] p-3.5 space-y-1">
              <div className="text-xs font-medium text-slate-500">
                {tau.confirmModal.accountSummaryLabel}
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {getFullName(pendingStatusChange.user, tau.notProvided)}
              </div>
              <div className="text-xs text-slate-600 font-mono">
                @{pendingStatusChange.user.username} · {pendingStatusChange.user.email}
              </div>
            </div>

            {isTargetBlockedAction && (
              <Alert
                type="warning"
                showIcon
                title={tau.confirmModal.blockSessionWarning}
              />
            )}

            {statusModalError && (
              <Alert
                type="error"
                showIcon
                title={statusModalError}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
