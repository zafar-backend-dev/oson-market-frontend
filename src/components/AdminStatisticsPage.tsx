import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Result, Select, Skeleton, Spin } from 'antd';
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  FolderKanban,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { translations } from '../i18n/translations';
import {
  adminStatisticsApi,
  DEFAULT_RANKING_LIMIT,
  detectDatePreset,
  formatShortYmdDate,
  getDefaultDateRange,
  validateDateRange,
  type AnySectionStatisticsData,
} from '../services/adminStatisticsApi';
import { authApi, AuthApiError } from '../services/authApi';
import { sessionManager } from '../services/sessionManager';
import {
  STATISTICS_SECTIONS,
  type DatePresetKey,
  type StatisticsSection,
} from '../types/adminStatistics';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import { isProfileComplete } from '../utils/validation';
import {
  BranchesStatisticsView,
  CatalogStatisticsView,
  CustomersStatisticsView,
  EngagementStatisticsView,
  OperationsStatisticsView,
  OrdersStatisticsView,
  OverviewStatisticsView,
} from './AdminStatisticsSections';
import { SiteFooter } from './SiteFooter';
import { StoreHeader } from './StoreHeader';

interface AdminStatisticsPageProps {
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

function parseSectionParam(raw: string | null): StatisticsSection {
  if (!raw) return 'OVERVIEW';
  const upper = raw.trim().toUpperCase();
  return STATISTICS_SECTIONS.includes(upper as StatisticsSection)
    ? (upper as StatisticsSection)
    : 'OVERVIEW';
}

function parseLimitParam(raw: string | null): number {
  const num = raw ? Number(raw) : DEFAULT_RANKING_LIMIT;
  if (num === 50 || num === 100) return num;
  return DEFAULT_RANKING_LIMIT;
}

const SECTION_ICONS: Record<StatisticsSection, React.ReactNode> = {
  OVERVIEW: <BarChart3 className="w-4 h-4 shrink-0" />,
  ORDERS: <ShoppingBag className="w-4 h-4 shrink-0" />,
  CATALOG: <FolderKanban className="w-4 h-4 shrink-0" />,
  CUSTOMERS: <Users className="w-4 h-4 shrink-0" />,
  BRANCHES: <Building2 className="w-4 h-4 shrink-0" />,
  ENGAGEMENT: <Activity className="w-4 h-4 shrink-0" />,
  OPERATIONS: <Settings2 className="w-4 h-4 shrink-0" />,
};

const SECTIONS_WITH_LIMIT = new Set<StatisticsSection>([
  'ORDERS',
  'CATALOG',
  'BRANCHES',
  'ENGAGEMENT',
]);

export function AdminStatisticsPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminStatisticsPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const t = translations[language];
  const ts = t.adminStatistics;
  const isAdmin = profile.role === 'ADMIN';
  const hasAccessToken = Boolean(session.accessToken);
  const profileComplete = isProfileComplete(profile);

  const accessTokenRef = useRef(session.accessToken);
  accessTokenRef.current = session.accessToken;

  const initialDefaults = useMemo(() => getDefaultDateRange(30), []);

  const [section, setSection] = useState<StatisticsSection>(() =>
    parseSectionParam(searchParams.get('section')),
  );
  const [fromDate, setFromDate] = useState<string>(
    () => searchParams.get('from')?.trim() || initialDefaults.from,
  );
  const [toDate, setToDate] = useState<string>(
    () => searchParams.get('to')?.trim() || initialDefaults.to,
  );
  const [limit, setLimit] = useState<number>(() => parseLimitParam(searchParams.get('limit')));
  const [presetMode, setPresetMode] = useState<DatePresetKey>(() =>
    detectDatePreset(
      searchParams.get('from')?.trim() || initialDefaults.from,
      searchParams.get('to')?.trim() || initialDefaults.to,
    ),
  );

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [report, setReport] = useState<AnySectionStatisticsData | null>(null);

  const requestSeqRef = useRef(0);

  // Sync URL query params when section, dates, or limit change
  useEffect(() => {
    const next = new URLSearchParams();
    next.set('section', section);
    next.set('from', fromDate);
    next.set('to', toDate);
    if (SECTIONS_WITH_LIMIT.has(section)) {
      next.set('limit', String(limit));
    }
    const nextString = next.toString();
    const currentString = searchParams.toString();
    if (nextString !== currentString) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, fromDate, toDate, limit, setSearchParams]);

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

  const dateValidationError = useMemo(
    () => validateDateRange(fromDate, toDate, language),
    [fromDate, toDate, language],
  );

  const loadStatistics = useCallback(
    async (
      targetSection: StatisticsSection,
      targetFrom: string,
      targetTo: string,
      targetLimit: number,
    ) => {
      if (!isAdmin) return;
      if (validateDateRange(targetFrom, targetTo, language) !== null) return;

      const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
      if (!token) return;

      const seq = ++requestSeqRef.current;
      setLoading(true);
      setPageError(null);
      setForbiddenState(null);

      try {
        const res = await adminStatisticsApi.getSection(
          token,
          targetSection,
          { from: targetFrom, to: targetTo, limit: targetLimit },
          language,
        );

        if (seq !== requestSeqRef.current) return;
        setReport(res);
      } catch (error) {
        if (seq !== requestSeqRef.current) return;

        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint:
                error.endpoint ||
                (targetSection === 'OVERVIEW'
                  ? '/api/admin/statistics'
                  : `/api/admin/statistics/${targetSection}`),
              message: error.message,
            });
            return;
          }
          setPageError(error.message);
        } else {
          setPageError(
            language === 'ru'
              ? 'Не удалось загрузить отчёт статистики.'
              : 'Statistika hisobotini yuklab bo‘lmadi.',
          );
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [isAdmin, language, onUnauthorized],
  );

  useEffect(() => {
    if (!isAdmin || !hasAccessToken || dateValidationError) return;
    void loadStatistics(section, fromDate, toDate, limit);
  }, [isAdmin, hasAccessToken, section, fromDate, toDate, limit, dateValidationError, loadStatistics]);

  const handleSelectPreset = (preset: DatePresetKey) => {
    setPresetMode(preset);
    if (preset === 'custom') return;
    const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
    const nextRange = getDefaultDateRange(days);
    setFromDate(nextRange.from);
    setToDate(nextRange.to);
  };

  const handleSelectSection = (nextSection: StatisticsSection) => {
    if (nextSection === section) return;
    setSection(nextSection);
    setReport(null);
    setPageError(null);
  };

  const activePeriodLabel = useMemo(() => {
    const f = report?.data.from || fromDate;
    const tEnd = report?.data.to || toDate;
    return `${ts.periodBadgePrefix}: ${formatShortYmdDate(f, language)} — ${formatShortYmdDate(tEnd, language)}`;
  }, [report, fromDate, toDate, ts.periodBadgePrefix, language]);

  const activeReportMatchesSection = report?.sectionKey === section;

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
                {ts.checkingPermissions}
              </span>
            </div>
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        ) : !isAdmin ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={ts.userRoleBlockedTitle}
              subTitle={ts.userRoleBlockedSubtitle}
              extra={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => navigate('/')}
                    className="!min-h-[44px]"
                  >
                    {ts.backToStore}
                  </Button>
                  <Button size="large" onClick={onLogout} className="!min-h-[44px]">
                    {ts.switchAccountButton}
                  </Button>
                </div>
              }
            />
          </div>
        ) : forbiddenState ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={ts.backendForbiddenTitle}
              subTitle={
                <div className="space-y-2 max-w-lg mx-auto">
                  <p className="text-slate-600">{ts.backendForbiddenSubtitle}</p>
                  <p className="text-sm text-rose-700 font-medium">{forbiddenState.message}</p>
                  {forbiddenState.endpoint && (
                    <div className="text-xs text-slate-500 font-mono">
                      {ts.backendForbiddenEndpointLabel}: {forbiddenState.endpoint}
                    </div>
                  )}
                </div>
              }
              extra={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => void loadStatistics(section, fromDate, toDate, limit)}
                    className="!min-h-[44px]"
                  >
                    {ts.retryButton}
                  </Button>
                  <Button size="large" onClick={() => navigate('/')} className="!min-h-[44px]">
                    {ts.backToStore}
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* Page Title + Date Range Controls + Refresh */}
            <section className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    {ts.title}
                  </h1>
                  <p className="text-sm text-slate-600">{ts.subtitle}</p>
                  <div className="text-xs text-slate-500">
                    {ts.timezoneLabel}:{' '}
                    <span className="font-medium text-slate-700">
                      {report?.data.timezone === 'Asia/Tashkent' || !report?.data.timezone
                        ? ts.tashkentTimezoneValue
                        : report.data.timezone}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {SECTIONS_WITH_LIMIT.has(section) && (
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                        {ts.limitLabel}:
                      </span>
                      <Select<number>
                        size="large"
                        value={limit}
                        onChange={(val) => setLimit(val)}
                        className="w-[88px]"
                        options={[
                          { value: 20, label: '20' },
                          { value: 50, label: '50' },
                          { value: 100, label: '100' },
                        ]}
                      />
                    </div>
                  )}

                  <Button
                    size="large"
                    icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                    loading={loading}
                    disabled={Boolean(dateValidationError)}
                    onClick={() => void loadStatistics(section, fromDate, toDate, limit)}
                    className="!inline-flex !items-center !min-h-[44px]"
                  >
                    {ts.refreshButton}
                  </Button>
                </div>
              </div>

              {/* Date Presets + Custom From/To Date Inputs */}
              <div className="bg-white border border-[#e6e4dd] rounded-xl p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  {/* Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { key: '7d', label: ts.presets.last7 },
                        { key: '30d', label: ts.presets.last30 },
                        { key: '90d', label: ts.presets.last90 },
                        { key: 'custom', label: ts.presets.custom },
                      ] as const
                    ).map((item) => {
                      const active = presetMode === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleSelectPreset(item.key)}
                          className={`inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg border text-xs sm:text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 ${
                            active
                              ? 'border-[#16a34a] bg-[#f0fdf4] text-[#15803d] font-semibold'
                              : 'border-[#e6e4dd] bg-white text-slate-700 hover:bg-[#faf9f5]'
                          }`}
                        >
                          {item.key === 'custom' && <Calendar className="w-3.5 h-3.5 shrink-0" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Date Inputs */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:items-end gap-2.5">
                    <div className="space-y-1">
                      <label
                        htmlFor="stats-date-from"
                        className="block text-xs font-medium text-slate-600"
                      >
                        {ts.fromLabel}
                      </label>
                      <input
                        id="stats-date-from"
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          setPresetMode('custom');
                          setFromDate(e.target.value);
                        }}
                        aria-invalid={Boolean(dateValidationError)}
                        className={`w-full sm:w-[154px] h-10 px-3 rounded-lg border text-sm bg-white text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#16a34a] ${
                          dateValidationError ? 'border-rose-400' : 'border-[#e6e4dd]'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="stats-date-to"
                        className="block text-xs font-medium text-slate-600"
                      >
                        {ts.toLabel}
                      </label>
                      <input
                        id="stats-date-to"
                        type="date"
                        value={toDate}
                        onChange={(e) => {
                          setPresetMode('custom');
                          setToDate(e.target.value);
                        }}
                        aria-invalid={Boolean(dateValidationError)}
                        className={`w-full sm:w-[154px] h-10 px-3 rounded-lg border text-sm bg-white text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#16a34a] ${
                          dateValidationError ? 'border-rose-400' : 'border-[#e6e4dd]'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {dateValidationError && (
                  <p role="alert" className="text-xs font-medium text-rose-600">
                    {dateValidationError}
                  </p>
                )}
              </div>

              {/* 7 Section Navigation Tabs */}
              <div
                role="tablist"
                aria-label={ts.title}
                className="flex flex-wrap items-center gap-1.5 bg-white border border-[#e6e4dd] rounded-xl p-1.5"
              >
                {STATISTICS_SECTIONS.map((secKey) => {
                  const isActive = section === secKey;
                  return (
                    <button
                      key={secKey}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleSelectSection(secKey)}
                      className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 min-h-[40px] rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 ${
                        isActive
                          ? 'bg-[#16a34a] text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-[#f7f6f2]'
                      }`}
                    >
                      {SECTION_ICONS[secKey]}
                      <span>{ts.sections[secKey]}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Error Banner (keeps current filters intact & allows retry) */}
            {pageError && (
              <Alert
                type="error"
                showIcon
                title={pageError}
                action={
                  <Button
                    type="primary"
                    size="small"
                    disabled={Boolean(dateValidationError)}
                    onClick={() => void loadStatistics(section, fromDate, toDate, limit)}
                  >
                    {ts.retryButton}
                  </Button>
                }
              />
            )}

            {/* Loading Skeleton on initial load / section switch */}
            {loading && !activeReportMatchesSection ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-[#e6e4dd] rounded-xl p-5"
                    >
                      <Skeleton active paragraph={{ rows: 2 }} title={{ width: '55%' }} />
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-[#e6e4dd] rounded-xl p-6">
                  <Skeleton active paragraph={{ rows: 6 }} />
                </div>
              </div>
            ) : activeReportMatchesSection && report ? (
              <div className={loading ? 'opacity-65 transition-opacity' : ''}>
                {report.sectionKey === 'OVERVIEW' && (
                  <OverviewStatisticsView
                    data={report.data}
                    language={language}
                    periodLabel={activePeriodLabel}
                    onSelectSection={handleSelectSection}
                  />
                )}
                {report.sectionKey === 'ORDERS' && (
                  <OrdersStatisticsView
                    data={report.data}
                    language={language}
                    periodLabel={activePeriodLabel}
                  />
                )}
                {report.sectionKey === 'CATALOG' && (
                  <CatalogStatisticsView data={report.data} language={language} />
                )}
                {report.sectionKey === 'CUSTOMERS' && (
                  <CustomersStatisticsView
                    data={report.data}
                    language={language}
                    periodLabel={activePeriodLabel}
                  />
                )}
                {report.sectionKey === 'BRANCHES' && (
                  <BranchesStatisticsView
                    data={report.data}
                    language={language}
                    periodLabel={activePeriodLabel}
                  />
                )}
                {report.sectionKey === 'ENGAGEMENT' && (
                  <EngagementStatisticsView
                    data={report.data}
                    language={language}
                    periodLabel={activePeriodLabel}
                  />
                )}
                {report.sectionKey === 'OPERATIONS' && (
                  <OperationsStatisticsView
                    data={report.data}
                    language={language}
                    periodLabel={activePeriodLabel}
                  />
                )}
              </div>
            ) : null}
          </>
        )}
      </main>

      <SiteFooter language={language} />
    </div>
  );
}
