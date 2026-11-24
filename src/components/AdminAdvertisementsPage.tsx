import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
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
  Archive,
  CalendarClock,
  Eye,
  Film,
  History,
  Image as ImageIcon,
  Megaphone,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Slash,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { adminAdvertisementApi } from '../services/adminAdvertisementApi';
import { authApi, AuthApiError } from '../services/authApi';
import { sessionManager } from '../services/sessionManager';
import type {
  AdminAdvertisementItem,
  AdvertisementChannel,
  AdvertisementStatus,
} from '../types/adminAdvertisement';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import {
  AD_REASON_MAX_LENGTH,
  AD_SEARCH_MAX_LENGTH,
  formatAdvertisementDateTime,
  getAllowedAdvertisementStatusTransitions,
  getStatusBadgeStyle,
  getVisibilityBadgeStyle,
  inferAdvertisementMediaKind,
} from '../utils/advertisement';
import { isProfileComplete } from '../utils/validation';
import { AdminAdvertisementFormDrawer } from './AdminAdvertisementFormDrawer';
import { AdminAdvertisementHistoryDrawer } from './AdminAdvertisementHistoryDrawer';
import { SiteFooter } from './SiteFooter';
import { StoreHeader } from './StoreHeader';

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 20;

interface AdminAdvertisementsPageProps {
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

function pickLocalizedTitle(item: AdminAdvertisementItem, language: Language): {
  primary: string;
  secondary: string | null;
} {
  const uzTitle = item.advertisement.uz.title?.trim() || '';
  const ruTitle = item.advertisement.ru.title?.trim() || '';
  if (language === 'ru') {
    const primary = ruTitle || uzTitle || '—';
    const secondary = uzTitle && uzTitle !== primary ? uzTitle : null;
    return { primary, secondary };
  }
  const primary = uzTitle || ruTitle || '—';
  const secondary = ruTitle && ruTitle !== primary ? ruTitle : null;
  return { primary, secondary };
}

export function AdminAdvertisementsPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminAdvertisementsPageProps) {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  const ta = translations[language].adminAdvertisements;
  const isAdmin = profile.role === 'ADMIN';
  const hasAccessToken = Boolean(session.accessToken);
  const profileComplete = isProfileComplete(profile);

  const accessTokenRef = useRef(session.accessToken);
  accessTokenRef.current = session.accessToken;

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  // List & pagination state
  const [items, setItems] = useState<AdminAdvertisementItem[]>([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // Filter / Search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | AdvertisementChannel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdvertisementStatus>('ALL');

  const listSeqRef = useRef(0);

  // Create / Edit Drawer state
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [externalUpdatedItem, setExternalUpdatedItem] = useState<AdminAdvertisementItem | null>(
    null,
  );

  // History Drawer state
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; title: string } | null>(null);

  // Status transitions state (single-flight lock per action)
  const [statusSubmittingId, setStatusSubmittingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminAdvertisementItem | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveReasonError, setArchiveReasonError] = useState<string | null>(null);
  const [archiveModalError, setArchiveModalError] = useState<string | null>(null);

  // Re-verify role if cached profile is not ADMIN
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

  // Debounce search (~300 ms) and reset page=0 when query changes
  useEffect(() => {
    const normalized = searchInput.trim().slice(0, AD_SEARCH_MAX_LENGTH);
    if (normalized === debouncedQuery) return;

    const timer = window.setTimeout(() => {
      setPage(0);
      setDebouncedQuery(normalized);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput, debouncedQuery]);

  const loadAdvertisements = useCallback(
    async (
      targetPage: number,
      targetSize: number,
      targetQuery: string,
      targetChannel: 'ALL' | AdvertisementChannel,
      targetStatus: 'ALL' | AdvertisementStatus,
    ) => {
      if (!isAdmin) return;
      const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
      if (!token) return;

      const seq = ++listSeqRef.current;
      setLoading(true);
      setPageError(null);
      setForbiddenState(null);

      try {
        const res = await adminAdvertisementApi.listAdvertisements(
          token,
          {
            q: targetQuery || undefined,
            channel: targetChannel === 'ALL' ? undefined : targetChannel,
            status: targetStatus === 'ALL' ? undefined : targetStatus,
            page: targetPage,
            size: targetSize,
          },
          language,
        );

        if (seq !== listSeqRef.current) return;

        setItems(res.content);
        setTotalElements(res.page.totalElements);
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
              endpoint: error.endpoint || 'GET /api/admin/advertisements',
              message: error.message,
            });
            return;
          }
          setPageError(error.message);
        } else {
          setPageError(ta.notifications.loadDetailError);
        }
      } finally {
        if (seq === listSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [isAdmin, language, onUnauthorized, ta.notifications.loadDetailError],
  );

  useEffect(() => {
    if (!isAdmin || verifyingProfile) return;
    void loadAdvertisements(page, size, debouncedQuery, channelFilter, statusFilter);
  }, [
    isAdmin,
    verifyingProfile,
    page,
    size,
    debouncedQuery,
    channelFilter,
    statusFilter,
    loadAdvertisements,
  ]);

  const handleCommitSearchNow = () => {
    const normalized = searchInput.trim().slice(0, AD_SEARCH_MAX_LENGTH);
    if (normalized !== debouncedQuery) {
      setPage(0);
      setDebouncedQuery(normalized);
    }
  };

  const handleChannelFilterChange = (next: 'ALL' | AdvertisementChannel) => {
    setPage(0);
    setChannelFilter(next);
  };

  const handleStatusFilterChange = (next: 'ALL' | AdvertisementStatus) => {
    setPage(0);
    setStatusFilter(next);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedQuery('');
    setChannelFilter('ALL');
    setStatusFilter('ALL');
    setPage(0);
  };

  const upsertItemInList = useCallback((updated: AdminAdvertisementItem) => {
    setItems((prev) =>
      prev.map((row) =>
        row.advertisement.id === updated.advertisement.id ? updated : row,
      ),
    );
    setExternalUpdatedItem(updated);
  }, []);

  const handleOpenCreate = () => {
    setEditingAdId(null);
    setFormDrawerOpen(true);
  };

  const handleOpenEdit = (item: AdminAdvertisementItem) => {
    setEditingAdId(item.advertisement.id);
    setFormDrawerOpen(true);
  };

  const handleOpenHistory = (item: AdminAdvertisementItem) => {
    const { primary } = pickLocalizedTitle(item, language);
    setHistoryTarget({
      id: item.advertisement.id,
      title: primary,
    });
    setHistoryDrawerOpen(true);
  };

  const handleDrawerSaved = useCallback(
    (savedItem: AdminAdvertisementItem, mode: 'create' | 'update') => {
      if (mode === 'update') {
        upsertItemInList(savedItem);
      }
      void loadAdvertisements(page, size, debouncedQuery, channelFilter, statusFilter);
    },
    [
      channelFilter,
      debouncedQuery,
      loadAdvertisements,
      page,
      size,
      statusFilter,
      upsertItemInList,
    ],
  );

  const handleRequestPublish = useCallback(
    async (item: AdminAdvertisementItem): Promise<AdminAdvertisementItem | null> => {
      if (statusSubmittingId) return null;
      const ad = item.advertisement;

      if (!ad.media?.url) {
        message.error(ta.validation.publishMediaRequired);
        return null;
      }

      if (ad.endsAt) {
        const endsMs = new Date(ad.endsAt).getTime();
        if (!Number.isNaN(endsMs) && endsMs <= Date.now()) {
          message.error(ta.validation.publishEndsAtPast);
          return null;
        }
      }

      const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
      if (!token) return null;

      setStatusSubmittingId(ad.id);
      try {
        const updated = await adminAdvertisementApi.updateStatus(
          token,
          ad.id,
          {
            expectedRevision: ad.revision,
            status: 'PUBLISHED',
            reason: null,
          },
          language,
        );
        upsertItemInList(updated);
        message.success(ta.notifications.publishedSuccess);
        void loadAdvertisements(page, size, debouncedQuery, channelFilter, statusFilter);
        return updated;
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return null;
          }
          if (error.status === 403) {
            setFormDrawerOpen(false);
            setForbiddenState({
              endpoint: error.endpoint || `PATCH /api/admin/advertisements/${ad.id}/status`,
              message: error.message,
            });
            return null;
          }
          if (error.status === 409) {
            message.warning(error.message);
            void loadAdvertisements(page, size, debouncedQuery, channelFilter, statusFilter);
            return null;
          }
          message.error(error.message);
        } else {
          message.error(ta.notifications.loadDetailError);
        }
        return null;
      } finally {
        setStatusSubmittingId(null);
      }
    },
    [
      channelFilter,
      debouncedQuery,
      language,
      loadAdvertisements,
      message,
      onUnauthorized,
      page,
      size,
      statusFilter,
      statusSubmittingId,
      ta.notifications.loadDetailError,
      ta.notifications.publishedSuccess,
      ta.validation.publishEndsAtPast,
      ta.validation.publishMediaRequired,
      upsertItemInList,
    ],
  );

  const handleRequestPause = useCallback(
    async (item: AdminAdvertisementItem): Promise<AdminAdvertisementItem | null> => {
      if (statusSubmittingId) return null;
      const ad = item.advertisement;
      const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
      if (!token) return null;

      setStatusSubmittingId(ad.id);
      try {
        const updated = await adminAdvertisementApi.updateStatus(
          token,
          ad.id,
          {
            expectedRevision: ad.revision,
            status: 'PAUSED',
            reason: null,
          },
          language,
        );
        upsertItemInList(updated);
        message.success(ta.notifications.pausedSuccess);
        void loadAdvertisements(page, size, debouncedQuery, channelFilter, statusFilter);
        return updated;
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return null;
          }
          if (error.status === 403) {
            setFormDrawerOpen(false);
            setForbiddenState({
              endpoint: error.endpoint || `PATCH /api/admin/advertisements/${ad.id}/status`,
              message: error.message,
            });
            return null;
          }
          if (error.status === 409) {
            message.warning(error.message);
            void loadAdvertisements(page, size, debouncedQuery, channelFilter, statusFilter);
            return null;
          }
          message.error(error.message);
        } else {
          message.error(ta.notifications.loadDetailError);
        }
        return null;
      } finally {
        setStatusSubmittingId(null);
      }
    },
    [
      channelFilter,
      debouncedQuery,
      language,
      loadAdvertisements,
      message,
      onUnauthorized,
      page,
      size,
      statusFilter,
      statusSubmittingId,
      ta.notifications.loadDetailError,
      ta.notifications.pausedSuccess,
      upsertItemInList,
    ],
  );

  const handleOpenArchiveModal = (item: AdminAdvertisementItem) => {
    setArchiveTarget(item);
    setArchiveReason('');
    setArchiveReasonError(null);
    setArchiveModalError(null);
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget || statusSubmittingId) return;
    const trimmedReason = archiveReason.trim();
    if (trimmedReason.length > AD_REASON_MAX_LENGTH) {
      setArchiveReasonError(ta.validation.reasonMax);
      return;
    }

    const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
    if (!token) return;

    const ad = archiveTarget.advertisement;
    setArchiveModalError(null);
    setStatusSubmittingId(ad.id);

    try {
      const updated = await adminAdvertisementApi.updateStatus(
        token,
        ad.id,
        {
          expectedRevision: ad.revision,
          status: 'ARCHIVED',
          reason: trimmedReason || null,
        },
        language,
      );
      upsertItemInList(updated);
      message.success(ta.notifications.archivedSuccess);
      setArchiveTarget(null);
      setArchiveReason('');
      void loadAdvertisements(page, size, debouncedQuery, channelFilter, statusFilter);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setArchiveTarget(null);
          setFormDrawerOpen(false);
          setForbiddenState({
            endpoint: error.endpoint || `PATCH /api/admin/advertisements/${ad.id}/status`,
            message: error.message,
          });
          return;
        }
        if (error.status === 409) {
          setArchiveModalError(error.message);
          void loadAdvertisements(page, size, debouncedQuery, channelFilter, statusFilter);
          return;
        }
        setArchiveModalError(error.message);
      } else {
        setArchiveModalError(ta.notifications.loadDetailError);
      }
    } finally {
      setStatusSubmittingId(null);
    }
  };

  const renderMediaBadge = (item: AdminAdvertisementItem) => {
    const kind = inferAdvertisementMediaKind(item.advertisement.media);
    if (kind === 'IMAGE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#faf9f5] border border-[#e6e4dd] text-xs font-medium text-slate-700 whitespace-nowrap">
          <ImageIcon className="w-3.5 h-3.5 text-[#16a34a]" />
          <span>{ta.mediaKinds.IMAGE}</span>
        </span>
      );
    }
    if (kind === 'VIDEO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#faf9f5] border border-[#e6e4dd] text-xs font-medium text-slate-700 whitespace-nowrap">
          <Film className="w-3.5 h-3.5 text-[#16a34a]" />
          <span>{ta.mediaKinds.VIDEO}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-500 whitespace-nowrap">
        <Slash className="w-3 h-3 text-slate-400" />
        <span>{ta.mediaKinds.NONE}</span>
      </span>
    );
  };

  const renderScheduleCell = (item: AdminAdvertisementItem) => {
    const { startsAt, endsAt } = item.advertisement;
    if (!startsAt && !endsAt) {
      return <span className="text-xs text-slate-500">{ta.scheduleUnlimited}</span>;
    }
    return (
      <div className="space-y-0.5 text-xs text-slate-700 tabular-nums">
        <div className="whitespace-nowrap">
          <span className="text-slate-400">{ta.scheduleFromPrefix}:</span>{' '}
          {formatAdvertisementDateTime(startsAt, language)}
        </div>
        <div className="whitespace-nowrap">
          <span className="text-slate-400">{ta.scheduleToPrefix}:</span>{' '}
          {formatAdvertisementDateTime(endsAt, language)}
        </div>
      </div>
    );
  };

  const renderVisibilityAndStatus = (item: AdminAdvertisementItem) => {
    const ad = item.advertisement;
    return (
      <div className="flex flex-col items-start gap-1">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold whitespace-nowrap ${getVisibilityBadgeStyle(
            item.visibility,
          )}`}
        >
          {ta.visibilities[item.visibility]}
        </span>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded border font-medium ${getStatusBadgeStyle(
              ad.status,
            )}`}
          >
            {ta.editStatusPrefix}: {ta.statuses[ad.status]}
          </span>
          <span className="font-mono text-slate-400">v{ad.revision}</span>
        </div>
      </div>
    );
  };

  const renderRowActions = (item: AdminAdvertisementItem, compact = false) => {
    const ad = item.advertisement;
    const isArchived = ad.status === 'ARCHIVED';
    const transitions = getAllowedAdvertisementStatusTransitions(ad.status);
    const rowBusy = statusSubmittingId === ad.id;

    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${compact ? '' : 'justify-end'}`}>
        <Button
          size="small"
          icon={isArchived ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
          onClick={() => handleOpenEdit(item)}
          className="!inline-flex !items-center !min-h-[34px]"
        >
          {isArchived ? ta.actions.view : ta.actions.edit}
        </Button>

        {transitions.includes('PUBLISHED') && (
          <Button
            size="small"
            type="primary"
            ghost
            icon={<Send className="w-3.5 h-3.5" />}
            disabled={Boolean(statusSubmittingId)}
            loading={rowBusy}
            onClick={() => void handleRequestPublish(item)}
            className="!inline-flex !items-center !min-h-[34px]"
          >
            {ta.actions.publish}
          </Button>
        )}

        {transitions.includes('PAUSED') && (
          <Button
            size="small"
            icon={<PauseCircle className="w-3.5 h-3.5" />}
            disabled={Boolean(statusSubmittingId)}
            loading={rowBusy}
            onClick={() => void handleRequestPause(item)}
            className="!inline-flex !items-center !min-h-[34px]"
          >
            {ta.actions.pause}
          </Button>
        )}

        {transitions.includes('ARCHIVED') && (
          <Button
            size="small"
            danger
            icon={<Archive className="w-3.5 h-3.5" />}
            disabled={Boolean(statusSubmittingId)}
            onClick={() => handleOpenArchiveModal(item)}
            className="!inline-flex !items-center !min-h-[34px]"
          >
            {ta.actions.archive}
          </Button>
        )}

        <Button
          size="small"
          icon={<History className="w-3.5 h-3.5" />}
          onClick={() => handleOpenHistory(item)}
          className="!inline-flex !items-center !min-h-[34px]"
        >
          {ta.actions.history}
        </Button>
      </div>
    );
  };

  const columns: ColumnsType<AdminAdvertisementItem> = [
    {
      title: ta.columns.title,
      key: 'title',
      render: (_, item) => {
        const { primary, secondary } = pickLocalizedTitle(item, language);
        return (
          <div className="min-w-[180px] max-w-[280px] space-y-0.5">
            <button
              type="button"
              onClick={() => handleOpenEdit(item)}
              className="text-left text-sm font-semibold text-slate-900 hover:text-[#15803d] line-clamp-2 cursor-pointer transition-colors"
            >
              {primary}
            </button>
            {secondary && (
              <div className="text-xs text-slate-500 line-clamp-1">{secondary}</div>
            )}
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              {ta.sortOrderLabel}: #{item.advertisement.sortOrder}
            </div>
          </div>
        );
      },
    },
    {
      title: ta.columns.media,
      key: 'media',
      width: 120,
      render: (_, item) => renderMediaBadge(item),
    },
    {
      title: ta.columns.channels,
      key: 'channels',
      width: 130,
      render: (_, item) => (
        <div className="flex flex-wrap gap-1">
          {item.advertisement.channels.map((ch) => (
            <span
              key={ch}
              className="inline-flex items-center px-2 py-0.5 rounded bg-[#faf9f5] border border-[#e6e4dd] text-xs font-medium text-slate-700 whitespace-nowrap"
            >
              {ch}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: ta.columns.schedule,
      key: 'schedule',
      width: 190,
      render: (_, item) => renderScheduleCell(item),
    },
    {
      title: ta.columns.status,
      key: 'status',
      width: 185,
      render: (_, item) => renderVisibilityAndStatus(item),
    },
    {
      title: ta.columns.updatedAt,
      key: 'updatedAt',
      width: 150,
      render: (_, item) => (
        <span className="text-xs text-slate-600 tabular-nums whitespace-nowrap">
          {formatAdvertisementDateTime(item.advertisement.updatedAt, language)}
        </span>
      ),
    },
    {
      title: ta.columns.actions,
      key: 'actions',
      align: 'right',
      render: (_, item) => renderRowActions(item),
    },
  ];

  const hasActiveFilters = Boolean(
    debouncedQuery || channelFilter !== 'ALL' || statusFilter !== 'ALL',
  );

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
                {ta.checkingPermissions}
              </span>
            </div>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : !isAdmin ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={ta.userRoleBlockedTitle}
              subTitle={ta.userRoleBlockedSubtitle}
              extra={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => navigate('/')}
                    className="!min-h-[44px]"
                  >
                    {ta.backToStore}
                  </Button>
                  <Button size="large" onClick={onLogout} className="!min-h-[44px]">
                    {ta.switchAccountButton}
                  </Button>
                </div>
              }
            />
          </div>
        ) : forbiddenState ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={ta.backendForbiddenTitle}
              subTitle={
                <div className="space-y-2 max-w-lg mx-auto">
                  <p className="text-slate-600">{ta.backendForbiddenSubtitle}</p>
                  <p className="text-sm text-rose-700 font-medium">{forbiddenState.message}</p>
                  {forbiddenState.endpoint && (
                    <div className="text-xs text-slate-500 font-mono">
                      {ta.backendForbiddenEndpointLabel}: {forbiddenState.endpoint}
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
                      void loadAdvertisements(
                        page,
                        size,
                        debouncedQuery,
                        channelFilter,
                        statusFilter,
                      )
                    }
                    className="!min-h-[44px]"
                  >
                    {ta.retryButton}
                  </Button>
                  <Button size="large" onClick={() => navigate('/')} className="!min-h-[44px]">
                    {ta.backToStore}
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
                    {ta.title}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e4dd] bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 tabular-nums">
                    <Megaphone className="w-3.5 h-3.5 text-[#16a34a]" />
                    <span>
                      {totalElements} {ta.totalCountSuffix}
                    </span>
                  </span>
                </div>
                <p className="text-sm text-slate-600">{ta.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  size="large"
                  icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                  loading={loading}
                  onClick={() =>
                    void loadAdvertisements(
                      page,
                      size,
                      debouncedQuery,
                      channelFilter,
                      statusFilter,
                    )
                  }
                  className="!inline-flex !items-center !min-h-[44px]"
                >
                  {ta.refreshButton}
                </Button>

                <Button
                  type="primary"
                  size="large"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreate}
                  className="!inline-flex !items-center !min-h-[44px]"
                >
                  {ta.createButton}
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
                    maxLength={AD_SEARCH_MAX_LENGTH}
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
                    placeholder={ta.searchPlaceholder}
                    aria-label={ta.searchPlaceholder}
                  />
                </div>

                <div className="lg:col-span-3 space-y-1">
                  <label className="block text-xs font-medium text-slate-600">
                    {ta.channelFilterLabel}
                  </label>
                  <Select<'ALL' | AdvertisementChannel>
                    size="large"
                    className="w-full"
                    value={channelFilter}
                    onChange={handleChannelFilterChange}
                    options={[
                      { value: 'ALL', label: ta.allChannels },
                      { value: 'WEB', label: ta.channels.WEB },
                      { value: 'APP', label: ta.channels.APP },
                    ]}
                  />
                </div>

                <div className="lg:col-span-3 space-y-1">
                  <label className="block text-xs font-medium text-slate-600">
                    {ta.statusFilterLabel}
                  </label>
                  <Select<'ALL' | AdvertisementStatus>
                    size="large"
                    className="w-full"
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    options={[
                      { value: 'ALL', label: ta.allStatuses },
                      { value: 'DRAFT', label: ta.statuses.DRAFT },
                      { value: 'PUBLISHED', label: ta.statuses.PUBLISHED },
                      { value: 'PAUSED', label: ta.statuses.PAUSED },
                      { value: 'ARCHIVED', label: ta.statuses.ARCHIVED },
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
                    {ta.clearFilters}
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
                      void loadAdvertisements(
                        page,
                        size,
                        debouncedQuery,
                        channelFilter,
                        statusFilter,
                      )
                    }
                  >
                    {ta.retryButton}
                  </Button>
                }
              />
            )}

            {/* Content Area */}
            {loading && items.length === 0 ? (
              <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Skeleton key={idx} active paragraph={{ rows: 1 }} />
                ))}
              </div>
            ) : items.length === 0 && !pageError ? (
              <div className="bg-white border border-[#e6e4dd] rounded-xl p-10 text-center">
                <Empty
                  description={
                    <div className="space-y-1.5">
                      <div className="font-semibold text-slate-900">
                        {hasActiveFilters ? ta.emptyFilteredTitle : ta.emptyTitle}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                        {hasActiveFilters ? ta.emptyFilteredDescription : ta.emptyDescription}
                      </div>
                    </div>
                  }
                >
                  {hasActiveFilters ? (
                    <Button onClick={handleClearFilters}>{ta.clearFilters}</Button>
                  ) : (
                    <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
                      {ta.createButton}
                    </Button>
                  )}
                </Empty>
              </div>
            ) : (
              <>
                {/* Desktop Table (lg+) */}
                <div className="hidden lg:block bg-white border border-[#e6e4dd] rounded-xl overflow-hidden">
                  <Table<AdminAdvertisementItem>
                    rowKey={(row) => row.advertisement.id}
                    columns={columns}
                    dataSource={items}
                    loading={loading}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                  />
                </div>

                {/* Mobile & Tablet Cards (< lg) */}
                <div className="lg:hidden space-y-3">
                  {items.map((item) => {
                    const ad = item.advertisement;
                    const { primary, secondary } = pickLocalizedTitle(item, language);
                    return (
                      <article
                        key={ad.id}
                        className="bg-white border border-[#e6e4dd] rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="text-left text-base font-semibold text-slate-900 hover:text-[#15803d] line-clamp-2 cursor-pointer"
                            >
                              {primary}
                            </button>
                            {secondary && (
                              <div className="text-xs text-slate-500 line-clamp-1">{secondary}</div>
                            )}
                          </div>
                          {renderVisibilityAndStatus(item)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {renderMediaBadge(item)}
                          {ad.channels.map((ch) => (
                            <span
                              key={ch}
                              className="inline-flex items-center px-2 py-0.5 rounded bg-[#faf9f5] border border-[#e6e4dd] font-medium text-slate-700"
                            >
                              {ch}
                            </span>
                          ))}
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#faf9f5] border border-[#e6e4dd] font-mono text-slate-500 tabular-nums">
                            {ta.sortOrderLabel}: #{ad.sortOrder}
                          </span>
                        </div>

                        <div className="rounded-lg bg-[#faf9f5] border border-[#f2f0ea] px-3 py-2 flex items-start gap-2 text-xs text-slate-600">
                          <CalendarClock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0 space-y-1">
                            {renderScheduleCell(item)}
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              {ta.columns.updatedAt}:{' '}
                              {formatAdvertisementDateTime(ad.updatedAt, language)}
                            </div>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-[#f2f0ea]">
                          {renderRowActions(item, true)}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Server Pagination */}
                {totalElements > 0 && (
                  <div className="bg-white border border-[#e6e4dd] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs sm:text-sm text-slate-500 tabular-nums">
                      {totalElements} {ta.totalCountSuffix}
                    </span>
                    <Pagination
                      current={page + 1}
                      pageSize={size}
                      total={totalElements}
                      showSizeChanger
                      pageSizeOptions={['10', '20', '50', '100']}
                      onChange={(nextPage, nextSize) => {
                        const nextZeroPage = nextSize !== size ? 0 : Math.max(0, nextPage - 1);
                        setSize(nextSize);
                        setPage(nextZeroPage);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <SiteFooter language={language} />

      {/* Create / Edit / Read-only Archived Drawer */}
      <AdminAdvertisementFormDrawer
        open={formDrawerOpen}
        advertisementId={editingAdId}
        language={language}
        accessToken={session.accessToken}
        statusBusy={Boolean(statusSubmittingId)}
        onClose={() => setFormDrawerOpen(false)}
        onSaved={handleDrawerSaved}
        onRequestPublish={handleRequestPublish}
        onRequestPause={handleRequestPause}
        onRequestArchive={handleOpenArchiveModal}
        onOpenHistory={handleOpenHistory}
        onUnauthorized={onUnauthorized}
        onForbidden={(endpoint, msg) => setForbiddenState({ endpoint, message: msg })}
        externalUpdatedItem={externalUpdatedItem}
      />

      {/* History & Snapshot Drawer */}
      <AdminAdvertisementHistoryDrawer
        open={historyDrawerOpen}
        advertisementId={historyTarget?.id ?? null}
        advertisementTitle={historyTarget?.title ?? ''}
        language={language}
        accessToken={session.accessToken}
        onClose={() => setHistoryDrawerOpen(false)}
        onUnauthorized={onUnauthorized}
        onForbidden={(endpoint, msg) => setForbiddenState({ endpoint, message: msg })}
      />

      {/* Archive Confirmation Modal */}
      <Modal
        open={Boolean(archiveTarget)}
        onCancel={() => {
          if (!statusSubmittingId) {
            setArchiveTarget(null);
            setArchiveReason('');
            setArchiveReasonError(null);
            setArchiveModalError(null);
          }
        }}
        destroyOnHidden
        mask={{ closable: !statusSubmittingId }}
        title={ta.archiveModal.title}
        footer={[
          <Button
            key="cancel"
            disabled={Boolean(statusSubmittingId)}
            onClick={() => {
              setArchiveTarget(null);
              setArchiveReason('');
              setArchiveReasonError(null);
              setArchiveModalError(null);
            }}
            className="!min-h-[40px]"
          >
            {ta.archiveModal.cancelButton}
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            loading={Boolean(archiveTarget && statusSubmittingId === archiveTarget.advertisement.id)}
            disabled={Boolean(statusSubmittingId)}
            onClick={() => void handleConfirmArchive()}
            className="!min-h-[40px]"
          >
            {ta.archiveModal.confirmButton}
          </Button>,
        ]}
      >
        {archiveTarget && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-600">{ta.archiveModal.subtitle}</p>

            <div className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5] px-3.5 py-2.5 text-sm font-semibold text-slate-900">
              {pickLocalizedTitle(archiveTarget, language).primary}
            </div>

            {archiveModalError && (
              <Alert type="error" showIcon title={archiveModalError} className="rounded-lg" />
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                {ta.archiveModal.reasonLabel}
              </label>
              <Input.TextArea
                rows={3}
                maxLength={AD_REASON_MAX_LENGTH}
                showCount
                disabled={Boolean(statusSubmittingId)}
                value={archiveReason}
                onChange={(e) => {
                  setArchiveReason(e.target.value);
                  if (archiveReasonError) setArchiveReasonError(null);
                }}
                placeholder={ta.archiveModal.reasonPlaceholder}
                status={archiveReasonError ? 'error' : undefined}
              />
              {archiveReasonError && (
                <div className="text-xs text-red-600">{archiveReasonError}</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
