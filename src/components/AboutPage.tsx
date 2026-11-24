import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Skeleton } from 'antd';
import { ArrowLeft, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import {
  siteAboutApi,
  SOCIAL_PLATFORM_KEYS,
  SOCIAL_PLATFORM_META,
  type PublicSiteAboutResponse,
} from '../services/siteAboutApi';
import type { Language, UserProfile } from '../types/auth';
import { formatOrderDateTime } from '../utils/orderStatus';
import { isProfileComplete } from '../utils/validation';
import { SiteFooter } from './SiteFooter';
import { SocialPlatformIcon } from './SocialPlatformIcon';
import { StoreHeader } from './StoreHeader';

interface AboutPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile | null;
  onLogout?: () => void;
}

export function AboutPage({
  language,
  onLanguageChange,
  profile,
  onLogout,
}: AboutPageProps) {
  const t = translations[language];
  const ta = t.aboutPage;
  const profileComplete = profile ? isProfileComplete(profile) : false;

  const [about, setAbout] = useState<PublicSiteAboutResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAbout = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await siteAboutApi.getPublicAbout(language);
      setAbout(response);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(t.adminSiteAbout.loadErrorFallback);
      }
    } finally {
      setLoading(false);
    }
  }, [language, t.adminSiteAbout.loadErrorFallback]);

  useEffect(() => {
    void loadAbout();
  }, [loadAbout]);

  const activeLocaleContent = useMemo(() => {
    if (!about) return { title: null as string | null, description: null as string | null };

    // Prefer active language object from { uz, ru } immediately when language toggles
    if (about.uz || about.ru) {
      const picked = language === 'ru' ? (about.ru ?? about.uz) : (about.uz ?? about.ru);
      if (picked) {
        return {
          title: picked.title.trim() ? picked.title : null,
          description: picked.description.trim() ? picked.description : null,
        };
      }
      return { title: null, description: null };
    }

    return {
      title: about.title?.trim() ? about.title : null,
      description: about.description?.trim() ? about.description : null,
    };
  }, [about, language]);

  const activeSocialEntries = useMemo(
    () =>
      about
        ? SOCIAL_PLATFORM_KEYS.flatMap((key) => {
            const url = about.socialLinks[key];
            return url ? [{ key, url, label: SOCIAL_PLATFORM_META[key].label }] : [];
          })
        : [],
    [about],
  );

  const hasTextContent = Boolean(
    activeLocaleContent.title?.trim() || activeLocaleContent.description?.trim(),
  );
  const hasAnyContent = hasTextContent || activeSocialEntries.length > 0;

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col overflow-x-hidden">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>{ta.backToStore}</span>
          </Link>

          <Button
            icon={<RefreshCw className="w-4 h-4" />}
            loading={loading}
            onClick={() => void loadAbout()}
            className="!min-h-[40px]"
          >
            {ta.refreshButton}
          </Button>
        </div>

        {loading && !about ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10 space-y-5">
            <Skeleton active title={{ width: '45%' }} paragraph={{ rows: 6 }} />
          </div>
        ) : errorMessage && !about ? (
          <Alert
            type="error"
            showIcon
            title={errorMessage}
            action={
              <Button
                type="primary"
                size="small"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => void loadAbout()}
              >
                {ta.retryButton}
              </Button>
            }
            className="rounded-xl"
          />
        ) : !hasAnyContent ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-8 sm:p-12">
            <Empty
              description={
                <div className="space-y-1.5">
                  <div className="text-base font-semibold text-slate-800">{ta.emptyTitle}</div>
                  <div className="text-sm text-slate-500">{ta.emptyDescription}</div>
                </div>
              }
            />
          </div>
        ) : (
          <article className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-10 space-y-6">
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
                    onClick={() => void loadAbout()}
                  >
                    {ta.retryButton}
                  </Button>
                }
              />
            )}

            <header className="space-y-2.5 pb-4 border-b border-[#f2f0ea]">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display break-words">
                {activeLocaleContent.title || ta.defaultTitle}
              </h1>
              {about?.updatedAt && (
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                  <span>
                    {ta.lastUpdatedLabel}:{' '}
                    <span className="font-medium text-slate-600 tabular-nums">
                      {formatOrderDateTime(about.updatedAt, language)}
                    </span>
                  </span>
                </div>
              )}
            </header>

            {activeLocaleContent.description ? (
              <div className="max-w-[72ch] text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                {activeLocaleContent.description}
              </div>
            ) : !activeLocaleContent.title ? (
              <p className="text-sm text-slate-500">{ta.emptyTitle}</p>
            ) : null}

            {activeSocialEntries.length > 0 && (
              <section
                aria-labelledby="about-social-links-heading"
                className="pt-5 border-t border-[#f2f0ea] space-y-3"
              >
                <h2
                  id="about-social-links-heading"
                  className="text-sm sm:text-base font-semibold text-slate-900"
                >
                  {ta.socialLinksTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  {activeSocialEntries.map(({ key, url, label }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 min-h-[44px] rounded-lg border border-[#e6e4dd] bg-[#faf9f5] text-sm font-medium text-slate-800 hover:border-[#86efac] hover:bg-[#f0fdf4] hover:text-[#15803d] transition-colors max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2"
                    >
                      <SocialPlatformIcon platform={key} className="w-4 h-4 shrink-0 text-[#16a34a]" />
                      <span className="truncate">{label}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </main>

      <SiteFooter language={language} />
    </div>
  );
}
