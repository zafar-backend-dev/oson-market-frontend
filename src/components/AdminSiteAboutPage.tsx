import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App as AntApp, Button, Input, Result, Skeleton, Spin } from 'antd';
import { Clock, ExternalLink, FileText, Globe, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { sessionManager } from '../services/sessionManager';
import {
  isValidHttpsUrl,
  siteAboutApi,
  SOCIAL_PLATFORM_KEYS,
  SOCIAL_PLATFORM_META,
  SOCIAL_URL_MAX_LENGTH,
  type SiteAboutResponse,
  type SiteSocialLinks,
  type SocialPlatformKey,
} from '../services/siteAboutApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import { formatOrderDateTime } from '../utils/orderStatus';
import { isProfileComplete } from '../utils/validation';
import { SiteFooter } from './SiteFooter';
import { SocialPlatformIcon } from './SocialPlatformIcon';
import { StoreHeader } from './StoreHeader';

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 10_000;

interface AdminSiteAboutPageProps {
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

type SocialFieldKey = `social.${SocialPlatformKey}`;
type AboutFieldKey = 'uzTitle' | 'uzDescription' | 'ruTitle' | 'ruDescription' | SocialFieldKey;

type AboutFieldErrors = Partial<Record<AboutFieldKey, string>>;

function createEmptySocialInputs(): Record<SocialPlatformKey, string> {
  return {
    TELEGRAM: '',
    INSTAGRAM: '',
    FACEBOOK: '',
    YOUTUBE: '',
    TIKTOK: '',
    X: '',
    LINKEDIN: '',
    WHATSAPP: '',
  };
}

function mapBackendFieldName(fieldName: string): AboutFieldKey | null {
  const normalized = fieldName.trim().toLowerCase();
  if (normalized === 'uz.title' || normalized === 'uztitle') return 'uzTitle';
  if (normalized === 'uz.description' || normalized === 'uzdescription') return 'uzDescription';
  if (normalized === 'ru.title' || normalized === 'rutitle') return 'ruTitle';
  if (normalized === 'ru.description' || normalized === 'rudescription') return 'ruDescription';

  for (const key of SOCIAL_PLATFORM_KEYS) {
    const lowerKey = key.toLowerCase();
    if (
      normalized === `sociallinks.${lowerKey}` ||
      normalized === `sociallinks[${lowerKey}]` ||
      normalized === lowerKey
    ) {
      return `social.${key}`;
    }
  }
  return null;
}

export function AdminSiteAboutPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminSiteAboutPageProps) {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  const t = translations[language];
  const ta = t.adminSiteAbout;
  const isAdmin = profile.role === 'ADMIN';
  const hasAccessToken = Boolean(session.accessToken);
  const profileComplete = isProfileComplete(profile);

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [uzTitle, setUzTitle] = useState('');
  const [uzDescription, setUzDescription] = useState('');
  const [ruTitle, setRuTitle] = useState('');
  const [ruDescription, setRuDescription] = useState('');
  const [socialInputs, setSocialInputs] = useState<Record<SocialPlatformKey, string>>(
    createEmptySocialInputs,
  );
  const [fieldErrors, setFieldErrors] = useState<AboutFieldErrors>({});

  const [savedAbout, setSavedAbout] = useState<SiteAboutResponse | null>(null);
  const [isNotCreatedYet, setIsNotCreatedYet] = useState(false);

  const accessTokenRef = useRef(session.accessToken);
  accessTokenRef.current = session.accessToken;
  const hasLoadedOnceRef = useRef(false);
  const isDirtyRef = useRef(false);

  const getEffectiveToken = useCallback(
    () => (sessionManager.getCurrentAccessToken() || accessTokenRef.current)?.trim() || session.accessToken,
    [session.accessToken],
  );

  // Re-verify profile if cached role is not ADMIN
  useEffect(() => {
    if (isAdmin) {
      setVerifyingProfile(false);
      return;
    }

    let cancelled = false;
    setVerifyingProfile(true);

    (async () => {
      try {
        const freshProfile = await authApi.getProfile(getEffectiveToken(), language);
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

  const applyServerAboutToForm = useCallback((res: SiteAboutResponse) => {
    const emptyState =
      !res.uz &&
      !res.ru &&
      !res.updatedAt &&
      Object.keys(res.socialLinks ?? {}).length === 0;
    setSavedAbout(res);
    setIsNotCreatedYet(emptyState);
    setUzTitle(res.uz?.title ?? '');
    setUzDescription(res.uz?.description ?? '');
    setRuTitle(res.ru?.title ?? '');
    setRuDescription(res.ru?.description ?? '');

    const nextSocials = createEmptySocialInputs();
    for (const key of SOCIAL_PLATFORM_KEYS) {
      const val = res.socialLinks?.[key];
      if (typeof val === 'string' && val.trim()) {
        nextSocials[key] = val.trim();
      }
    }
    setSocialInputs(nextSocials);

    setFieldErrors({});
    isDirtyRef.current = false;
    hasLoadedOnceRef.current = true;
  }, []);

  const loadAbout = useCallback(
    async (options?: { forceOverwrite?: boolean }) => {
      if (!isAdmin) return;
      setLoading(true);
      setLoadError(null);
      setForbiddenState(null);

      try {
        const res = await siteAboutApi.getAdminAbout(getEffectiveToken(), language);
        if (options?.forceOverwrite || !isDirtyRef.current) {
          applyServerAboutToForm(res);
        } else {
          setSavedAbout(res);
          setIsNotCreatedYet(!res.uz && !res.ru && !res.updatedAt);
          hasLoadedOnceRef.current = true;
        }
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint: error.endpoint || 'GET /api/admin/site/about',
              message: error.message,
            });
            return;
          }
          setLoadError(error.message);
        } else {
          setLoadError(ta.loadErrorFallback);
        }
      } finally {
        setLoading(false);
      }
    },
    [applyServerAboutToForm, getEffectiveToken, isAdmin, language, onUnauthorized, ta.loadErrorFallback],
  );

  useEffect(() => {
    if (!isAdmin) return;
    if (!hasLoadedOnceRef.current) {
      void loadAbout({ forceOverwrite: true });
    }
  }, [isAdmin, hasAccessToken, loadAbout]);

  const clearFieldError = (key: AboutFieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateForm = (): AboutFieldErrors => {
    const errors: AboutFieldErrors = {};

    const cleanUzTitle = uzTitle.trim();
    if (!cleanUzTitle) {
      errors.uzTitle = ta.validation.titleRequiredUz;
    } else if (cleanUzTitle.length > TITLE_MAX_LENGTH) {
      errors.uzTitle = ta.validation.titleMaxLengthUz;
    }

    const cleanUzDescription = uzDescription.replace(/\r\n/g, '\n').trim();
    if (!cleanUzDescription) {
      errors.uzDescription = ta.validation.descriptionRequiredUz;
    } else if (cleanUzDescription.length > DESCRIPTION_MAX_LENGTH) {
      errors.uzDescription = ta.validation.descriptionMaxLengthUz;
    }

    const cleanRuTitle = ruTitle.trim();
    if (!cleanRuTitle) {
      errors.ruTitle = ta.validation.titleRequiredRu;
    } else if (cleanRuTitle.length > TITLE_MAX_LENGTH) {
      errors.ruTitle = ta.validation.titleMaxLengthRu;
    }

    const cleanRuDescription = ruDescription.replace(/\r\n/g, '\n').trim();
    if (!cleanRuDescription) {
      errors.ruDescription = ta.validation.descriptionRequiredRu;
    } else if (cleanRuDescription.length > DESCRIPTION_MAX_LENGTH) {
      errors.ruDescription = ta.validation.descriptionMaxLengthRu;
    }

    for (const key of SOCIAL_PLATFORM_KEYS) {
      const trimmedUrl = (socialInputs[key] ?? '').trim();
      if (!trimmedUrl) continue;
      if (trimmedUrl.length > SOCIAL_URL_MAX_LENGTH) {
        errors[`social.${key}`] = ta.validation.socialUrlMaxLength;
      } else if (!isValidHttpsUrl(trimmedUrl)) {
        errors[`social.${key}`] = ta.validation.socialUrlHttps;
      }
    }

    return errors;
  };

  const handleSave = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!isAdmin || saving) return;

    setSubmitError(null);
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaving(true);

    const socialLinksPayload: SiteSocialLinks = {};
    for (const key of SOCIAL_PLATFORM_KEYS) {
      const trimmedUrl = (socialInputs[key] ?? '').trim();
      if (trimmedUrl) {
        socialLinksPayload[key] = trimmedUrl;
      }
    }

    const payload = {
      uz: {
        title: uzTitle.trim(),
        description: uzDescription.replace(/\r\n/g, '\n').trim(),
      },
      ru: {
        title: ruTitle.trim(),
        description: ruDescription.replace(/\r\n/g, '\n').trim(),
      },
      socialLinks: socialLinksPayload,
    };

    try {
      const updated = await siteAboutApi.updateAdminAbout(getEffectiveToken(), payload, language);
      applyServerAboutToForm(updated);
      message.success(ta.savedSuccess);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setSubmitError(error.message || ta.backendForbiddenSubtitle);
          return;
        }
        if (error.fields && error.fields.length > 0) {
          const nextFieldErrors: AboutFieldErrors = {};
          for (const rawField of error.fields) {
            const colonIndex = rawField.indexOf(':');
            const fieldKeyPart = colonIndex >= 0 ? rawField.slice(0, colonIndex) : rawField;
            const fieldMsgPart =
              colonIndex >= 0 ? rawField.slice(colonIndex + 1).trim() : error.message;
            const mapped = mapBackendFieldName(fieldKeyPart);
            if (mapped) {
              nextFieldErrors[mapped] = fieldMsgPart || error.message || ta.saveErrorFallback;
            }
          }
          if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
          }
        }
        setSubmitError(error.message || ta.saveErrorFallback);
      } else {
        setSubmitError(ta.saveErrorFallback);
      }
    } finally {
      setSaving(false);
    }
  };

  const formattedUpdatedAt = savedAbout?.updatedAt
    ? formatOrderDateTime(savedAbout.updatedAt, language)
    : ta.notCreatedYet;

  const uzTitleCount = uzTitle.trim().length;
  const uzDescriptionCount = uzDescription.replace(/\r\n/g, '\n').trim().length;
  const ruTitleCount = ruTitle.trim().length;
  const ruDescriptionCount = ruDescription.replace(/\r\n/g, '\n').trim().length;

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {verifyingProfile ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center">
            <Spin size="large" />
            <p className="text-sm font-medium text-slate-600">{ta.checkingPermissions}</p>
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
                    onClick={onLogout}
                    className="!min-h-[44px]"
                  >
                    {ta.switchAccountButton}
                  </Button>
                  <Button
                    size="large"
                    onClick={() => navigate('/')}
                    className="!min-h-[44px]"
                  >
                    {ta.backToStore}
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
                  <p>{ta.backendForbiddenSubtitle}</p>
                  {forbiddenState.message && (
                    <p className="text-sm font-medium text-slate-700">{forbiddenState.message}</p>
                  )}
                  {forbiddenState.endpoint && (
                    <div className="text-xs font-mono text-slate-500">
                      {ta.backendForbiddenEndpointLabel}: {forbiddenState.endpoint}
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
                  {ta.backToStore}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Header Bar */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#15803d]">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>{t.brandName}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {ta.title}
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">{ta.subtitle}</p>
                <div className="inline-flex items-center gap-1.5 pt-1 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {ta.lastUpdatedLabel}:{' '}
                    <strong className="font-medium text-slate-700 tabular-nums">
                      {formattedUpdatedAt}
                    </strong>
                  </span>
                </div>
              </div>

              <Button
                size="large"
                icon={<RefreshCw className="w-4 h-4" />}
                loading={loading}
                disabled={saving}
                onClick={() => void loadAbout({ forceOverwrite: true })}
                className="!min-h-[44px] shrink-0"
              >
                {ta.refreshButton}
              </Button>
            </section>

            {/* Load Error with Retry */}
            {loadError && (
              <Alert
                type="error"
                showIcon
                title={loadError}
                action={
                  <Button
                    type="primary"
                    size="small"
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={() => void loadAbout({ forceOverwrite: !isDirtyRef.current })}
                  >
                    {ta.retryButton}
                  </Button>
                }
                className="rounded-xl"
              />
            )}

            {/* Submit / Permission Error */}
            {submitError && (
              <Alert
                type="error"
                showIcon
                closable
                title={submitError}
                onClose={() => setSubmitError(null)}
                className="rounded-xl"
              />
            )}

            {/* Initial Skeleton */}
            {loading && !hasLoadedOnceRef.current ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6">
                  <Skeleton active paragraph={{ rows: 7 }} />
                </div>
                <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6">
                  <Skeleton active paragraph={{ rows: 7 }} />
                </div>
              </div>
            ) : !loadError || hasLoadedOnceRef.current ? (
              <form onSubmit={(e) => void handleSave(e)} noValidate className="space-y-6">
                {isNotCreatedYet && (
                  <Alert
                    type="info"
                    showIcon
                    title={ta.emptyNoticeTitle}
                    description={ta.emptyNoticeDescription}
                    className="rounded-xl"
                  />
                )}

                {/* Side-by-side Language Cards on Desktop, Stacked on Mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Uzbek Section */}
                  <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#f2f0ea]">
                      <h2 className="text-base font-semibold text-slate-900">
                        {ta.uzSectionTitle}
                      </h2>
                      <span className="inline-flex items-center rounded-md border border-[#e6e4dd] bg-[#faf9f5] px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {ta.uzSectionBadge}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="about-uz-title"
                          className="text-sm font-medium text-slate-800"
                        >
                          {ta.titleLabel} <span className="text-red-500">*</span>
                        </label>
                        <span
                          className={`text-xs tabular-nums ${
                            uzTitleCount > TITLE_MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {uzTitleCount} / {TITLE_MAX_LENGTH}
                        </span>
                      </div>
                      <Input
                        id="about-uz-title"
                        size="large"
                        value={uzTitle}
                        disabled={saving}
                        status={fieldErrors.uzTitle ? 'error' : undefined}
                        placeholder={ta.titlePlaceholderUz}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setUzTitle(e.target.value);
                          clearFieldError('uzTitle');
                        }}
                      />
                      {fieldErrors.uzTitle && (
                        <p className="text-xs text-red-600 pt-0.5">{fieldErrors.uzTitle}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="about-uz-description"
                          className="text-sm font-medium text-slate-800"
                        >
                          {ta.descriptionLabel} <span className="text-red-500">*</span>
                        </label>
                        <span
                          className={`text-xs tabular-nums ${
                            uzDescriptionCount > DESCRIPTION_MAX_LENGTH
                              ? 'text-red-600 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          {uzDescriptionCount} / {DESCRIPTION_MAX_LENGTH.toLocaleString(language === 'ru' ? 'ru-RU' : 'uz-UZ')}
                        </span>
                      </div>
                      <Input.TextArea
                        id="about-uz-description"
                        value={uzDescription}
                        disabled={saving}
                        status={fieldErrors.uzDescription ? 'error' : undefined}
                        placeholder={ta.descriptionPlaceholderUz}
                        autoSize={{ minRows: 7, maxRows: 16 }}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setUzDescription(e.target.value);
                          clearFieldError('uzDescription');
                        }}
                      />
                      {fieldErrors.uzDescription && (
                        <p className="text-xs text-red-600 pt-0.5">{fieldErrors.uzDescription}</p>
                      )}
                    </div>
                  </section>

                  {/* Russian Section */}
                  <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#f2f0ea]">
                      <h2 className="text-base font-semibold text-slate-900">
                        {ta.ruSectionTitle}
                      </h2>
                      <span className="inline-flex items-center rounded-md border border-[#e6e4dd] bg-[#faf9f5] px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {ta.ruSectionBadge}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="about-ru-title"
                          className="text-sm font-medium text-slate-800"
                        >
                          {ta.titleLabel} <span className="text-red-500">*</span>
                        </label>
                        <span
                          className={`text-xs tabular-nums ${
                            ruTitleCount > TITLE_MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {ruTitleCount} / {TITLE_MAX_LENGTH}
                        </span>
                      </div>
                      <Input
                        id="about-ru-title"
                        size="large"
                        value={ruTitle}
                        disabled={saving}
                        status={fieldErrors.ruTitle ? 'error' : undefined}
                        placeholder={ta.titlePlaceholderRu}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setRuTitle(e.target.value);
                          clearFieldError('ruTitle');
                        }}
                      />
                      {fieldErrors.ruTitle && (
                        <p className="text-xs text-red-600 pt-0.5">{fieldErrors.ruTitle}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="about-ru-description"
                          className="text-sm font-medium text-slate-800"
                        >
                          {ta.descriptionLabel} <span className="text-red-500">*</span>
                        </label>
                        <span
                          className={`text-xs tabular-nums ${
                            ruDescriptionCount > DESCRIPTION_MAX_LENGTH
                              ? 'text-red-600 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          {ruDescriptionCount} / {DESCRIPTION_MAX_LENGTH.toLocaleString(language === 'ru' ? 'ru-RU' : 'uz-UZ')}
                        </span>
                      </div>
                      <Input.TextArea
                        id="about-ru-description"
                        value={ruDescription}
                        disabled={saving}
                        status={fieldErrors.ruDescription ? 'error' : undefined}
                        placeholder={ta.descriptionPlaceholderRu}
                        autoSize={{ minRows: 7, maxRows: 16 }}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          setRuDescription(e.target.value);
                          clearFieldError('ruDescription');
                        }}
                      />
                      {fieldErrors.ruDescription && (
                        <p className="text-xs text-red-600 pt-0.5">{fieldErrors.ruDescription}</p>
                      )}
                    </div>
                  </section>
                </div>

                {/* Social Links Section */}
                <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f2f0ea]">
                    <div className="space-y-0.5 min-w-0">
                      <div className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
                        <Globe className="w-4 h-4 text-[#16a34a] shrink-0" />
                        <h2>{ta.socialLinksSectionTitle}</h2>
                      </div>
                      <p className="text-xs text-slate-500">{ta.socialLinksSectionSubtitle}</p>
                    </div>

                    {SOCIAL_PLATFORM_KEYS.some((key) => Boolean(socialInputs[key]?.trim())) && (
                      <Button
                        size="small"
                        danger
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        disabled={saving}
                        onClick={() => {
                          isDirtyRef.current = true;
                          setSocialInputs(createEmptySocialInputs());
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            for (const key of SOCIAL_PLATFORM_KEYS) {
                              delete next[`social.${key}`];
                            }
                            return next;
                          });
                        }}
                        className="!min-h-[36px] shrink-0 self-start sm:self-auto"
                      >
                        {ta.socialLinksClearAllButton}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SOCIAL_PLATFORM_KEYS.map((key) => {
                      const meta = SOCIAL_PLATFORM_META[key];
                      const fieldKey: SocialFieldKey = `social.${key}`;
                      const rawValue = socialInputs[key] ?? '';
                      const trimmedLength = rawValue.trim().length;
                      const fieldError = fieldErrors[fieldKey];

                      return (
                        <div key={key} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <label
                              htmlFor={`about-social-${key.toLowerCase()}`}
                              className="inline-flex items-center gap-2 text-sm font-medium text-slate-800"
                            >
                              <SocialPlatformIcon
                                platform={key}
                                className="w-4 h-4 text-slate-600 shrink-0"
                              />
                              <span>{meta.label}</span>
                            </label>
                            {trimmedLength > 0 && (
                              <span
                                className={`text-xs tabular-nums ${
                                  trimmedLength > SOCIAL_URL_MAX_LENGTH
                                    ? 'text-red-600 font-semibold'
                                    : 'text-slate-400'
                                }`}
                              >
                                {trimmedLength} / {SOCIAL_URL_MAX_LENGTH}
                              </span>
                            )}
                          </div>

                          <Input
                            id={`about-social-${key.toLowerCase()}`}
                            type="url"
                            size="large"
                            allowClear
                            value={rawValue}
                            disabled={saving}
                            status={fieldError ? 'error' : undefined}
                            placeholder={meta.placeholder}
                            onChange={(e) => {
                              isDirtyRef.current = true;
                              const nextVal = e.target.value;
                              setSocialInputs((prev) => ({ ...prev, [key]: nextVal }));
                              clearFieldError(fieldKey);
                            }}
                          />

                          {fieldError ? (
                            <p className="text-xs text-red-600 pt-0.5">{fieldError}</p>
                          ) : (
                            <p className="text-[11px] text-slate-400">{ta.socialLinksUrlHint}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Save Action Footer */}
                <div className="bg-white border border-[#e6e4dd] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {ta.lastUpdatedLabel}:{' '}
                    <span className="font-medium text-slate-700 tabular-nums">
                      {formattedUpdatedAt}
                    </span>
                  </div>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    icon={<Save className="w-4 h-4" />}
                    loading={saving}
                    disabled={saving || loading}
                    className="!min-h-[44px] w-full sm:w-auto sm:min-w-[160px]"
                  >
                    {ta.saveButton}
                  </Button>
                </div>

                {/* Plain-text Saved Preview (preserves line breaks, no HTML parsing) */}
                {savedAbout &&
                  (savedAbout.uz ||
                    savedAbout.ru ||
                    Object.keys(savedAbout.socialLinks ?? {}).length > 0) && (
                    <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          {ta.savedPreviewTitle}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">{ta.savedPreviewSubtitle}</p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {savedAbout.uz && (
                          <div className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5] p-4 space-y-2">
                            <div className="text-xs font-semibold text-slate-500">
                              {ta.uzSectionTitle}
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 break-words">
                              {savedAbout.uz.title}
                            </h3>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                              {savedAbout.uz.description}
                            </p>
                          </div>
                        )}

                        {savedAbout.ru && (
                          <div className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5] p-4 space-y-2">
                            <div className="text-xs font-semibold text-slate-500">
                              {ta.ruSectionTitle}
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 break-words">
                              {savedAbout.ru.title}
                            </h3>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                              {savedAbout.ru.description}
                            </p>
                          </div>
                        )}
                      </div>

                      {Object.keys(savedAbout.socialLinks ?? {}).length > 0 && (
                        <div className="pt-2 border-t border-[#f2f0ea] space-y-2.5">
                          <div className="text-xs font-semibold text-slate-500">
                            {ta.socialLinksSectionTitle}
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            {SOCIAL_PLATFORM_KEYS.flatMap((key) => {
                              const url = savedAbout.socialLinks[key];
                              if (!url || !isValidHttpsUrl(url)) return [];
                              return [
                                <a
                                  key={key}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 min-h-[40px] rounded-lg border border-[#e6e4dd] bg-[#faf9f5] text-xs sm:text-sm font-medium text-slate-800 hover:border-[#86efac] hover:bg-[#f0fdf4] hover:text-[#15803d] transition-colors max-w-full"
                                >
                                  <SocialPlatformIcon
                                    platform={key}
                                    className="w-4 h-4 text-[#16a34a] shrink-0"
                                  />
                                  <span>{SOCIAL_PLATFORM_META[key].label}</span>
                                  <ExternalLink
                                    className="w-3.5 h-3.5 text-slate-400 shrink-0"
                                    aria-hidden="true"
                                  />
                                </a>,
                              ];
                            })}
                          </div>
                        </div>
                      )}
                    </section>
                  )}
              </form>
            ) : null}
          </>
        )}
      </main>

      <SiteFooter language={language} />
    </div>
  );
}
