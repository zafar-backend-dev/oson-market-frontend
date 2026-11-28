import { AdminLegalPage } from './components/AdminLegalPage';
import { LegalLinks, LegalPage } from './components/LegalPage';
import { AdminAndroidReleasePage } from './components/AdminAndroidReleasePage';
import { AndroidUpdateNotice } from './components/AndroidUpdateNotice';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ANDROID_APK_URL } from './constants';
import { AppDownloadPage } from './components/AppDownloadPage';
import { watchOrderAlertTaps } from './services/orderAlerts';
import { startPromotionPush } from './services/promotionPush';
import { Capacitor } from '@capacitor/core';
import { StoreHeader } from './components/StoreHeader';
import { SupportChat } from './components/SupportChat';
import { AndroidDownloadOffer } from './components/AndroidDownloadOffer';
import { watchMobileLinks } from './services/mobileGoogle';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App as AntApp, Button, ConfigProvider, Skeleton, Spin } from 'antd';
import enUS from 'antd/locale/en_US';
import ruRU from 'antd/locale/ru_RU';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AboutPage } from './components/AboutPage';
import { AdminAdvertisementsPage } from './components/AdminAdvertisementsPage';
import { AdminBranchesPage } from './components/AdminBranchesPage';
import { AdminBrandsPage } from './components/AdminBrandsPage';
import { AdminCategoriesPage } from './components/AdminCategoriesPage';
import { AdminOrderDetailPage } from './components/AdminOrderDetailPage';
import { AdminOrdersPage } from './components/AdminOrdersPage';
import { AdminProductDetailPage } from './components/AdminProductDetailPage';
import { AdminProductsPage } from './components/AdminProductsPage';
import { AdminSiteAboutPage } from './components/AdminSiteAboutPage';
import { AdminSiteLogoPage } from './components/AdminSiteLogoPage';
import { AdminStatisticsPage } from './components/AdminStatisticsPage';
import { AdminTelegramRecipientsPage } from './components/AdminTelegramRecipientsPage';
import { AdminUsersPage } from './components/AdminUsersPage';
import { AuthPortal } from './components/AuthPortal';
import { BranchesPage } from './components/BranchesPage';
import { CatalogPage } from './components/CatalogPage';
import { CatalogProductDetailPage } from './components/CatalogProductDetailPage';
import { CartDrawer } from './components/CartDrawer';
import { DashboardWorkspace } from './components/DashboardWorkspace';
import { GoogleCallbackView } from './components/GoogleCallbackView';
import { MyOrdersPage } from './components/MyOrdersPage';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { OrderDetailPage } from './components/OrderDetailPage';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ProductSocialCacheProvider } from './contexts/ProductSocialCacheContext';
import { SiteLogoProvider } from './contexts/SiteLogoContext';
import { translations } from './i18n/translations';
import { authApi, AuthApiError } from './services/authApi';
import { fetchWithSessionRefresh, sessionManager } from './services/sessionManager';
import type { AuthSession, Language, UserProfile } from './types/auth';
import { readPendingProductOrder } from './utils/catalog';
import { isProfileComplete } from './utils/validation';

function MobileLinks() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => watchMobileLinks(path => navigateRef.current(path, { replace: true })), []);
  useEffect(() => watchOrderAlertTaps(path => navigateRef.current(path)), []);
  return null;
}

const LANG_STORAGE_KEY = 'oson_market_lang';
const RETURN_TO_STORAGE_KEY = 'oson_market_return_to';
const GOOGLE_CALLBACK_PATH = '/auth/google/callback';

function isGoogleCallbackPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === GOOGLE_CALLBACK_PATH;
}

function isAuthRoutePath(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '');
  return clean === '/auth' || clean.startsWith('/auth/');
}

function isPublicCatalogPath(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return (
    clean === '/' ||
    clean === '/catalog' ||
    clean === '/branches' ||
    clean === '/about' ||
    clean.startsWith('/products/') ||
    clean.startsWith('/catalog/products/')
  );
}

function isSafeInternalReturnPath(target: string): boolean {
  if (!target.startsWith('/') || target.startsWith('//') || target.includes('://')) {
    return false;
  }
  const pathname = target.split(/[?#]/)[0] || '/';
  return !isAuthRoutePath(pathname);
}

function saveCurrentReturnTo(): void {
  if (typeof window === 'undefined') return;
  const fullPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (!isSafeInternalReturnPath(fullPath)) return;
  if (isPublicCatalogPath(window.location.pathname)) return;
  try {
    window.sessionStorage.setItem(RETURN_TO_STORAGE_KEY, fullPath);
  } catch {
    // Ignore storage access errors
  }
}

function clearSavedReturnTo(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
  } catch {
    // Ignore storage access errors
  }
}

function consumeReturnToRoute(user: UserProfile): string | null {
  if (typeof window === 'undefined') return null;
  let saved: string | null = null;
  try {
    saved = window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
    window.sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!saved || !isSafeInternalReturnPath(saved)) return null;
  const pathname = (saved.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/';
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && user.role !== 'ADMIN') {
    return null;
  }
  return saved;
}

function readStoredLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ru' || saved === 'uz') return saved;
  } catch {
    // Ignore storage access errors
  }
  return 'uz';
}

interface OsonMarketShellProps {
  language: Language;
  onUpdateLanguage: (lang: Language) => void;
}

function OsonMarketShell({ language, onUpdateLanguage }: OsonMarketShellProps) {
  const { message } = AntApp.useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState<AuthSession | null>(() =>
    sessionManager.getCurrentSession(),
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bootstrapping, setBootstrapping] = useState<boolean>(
    () =>
      !isGoogleCallbackPath(window.location.pathname) &&
      Boolean(sessionManager.getCurrentSession()),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [externalNotice, setExternalNotice] = useState<{
    type: 'info' | 'warning' | 'success' | 'error';
    text: string;
  } | null>(null);

  const bootHandledRef = useRef(false);
  const lastRecoveredTokenRef = useRef<string | null>(session?.accessToken ?? null);
  const lastWarningToastAtRef = useRef<number>(0);

  const showWarningOnce = useCallback(
    (text: string) => {
      const now = Date.now();
      if (now - lastWarningToastAtRef.current < 2000) {
        return;
      }
      lastWarningToastAtRef.current = now;
      message.warning(text);
    },
    [message],
  );

  const t = translations[language];

  useEffect(() => {
    sessionManager.setLanguage(language);
  }, [language]);

  useEffect(() => {
    return sessionManager.subscribeSession((nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
      }
    });
  }, []);

  const clearLocalSession = useCallback(
    (notice?: { type: 'info' | 'warning' | 'success' | 'error'; text: string }) => {
      sessionManager.clearLocalSession();
      setProfile(null);
      setBootstrapError(null);
      setBootstrapping(false);
      if (notice) {
        setExternalNotice(notice);
      }
    },
    [],
  );

  useEffect(() => {
    return sessionManager.subscribeInvalidated(({ message: reasonMsg }) => {
      setProfile(null);
      setBootstrapError(null);
      setBootstrapping(false);

      const pathname = window.location.pathname;
      if (isGoogleCallbackPath(pathname)) {
        return;
      }

      const warningText = reasonMsg || translations[language].notifications.sessionExpired;
      if (isPublicCatalogPath(pathname)) {
        showWarningOnce(warningText);
        return;
      }

      setExternalNotice({
        type: 'warning',
        text: warningText,
      });
      if (!isAuthRoutePath(pathname)) {
        saveCurrentReturnTo();
        navigate('/auth/sign-in', { replace: true });
      }
    });
  }, [language, navigate, showWarningOnce]);

  const syncProfileLanguage = useCallback(
    (user: UserProfile) => {
      if (user.language === 'uz' || user.language === 'ru') {
        onUpdateLanguage(user.language);
      }
    },
    [onUpdateLanguage],
  );

  const handleUnauthorized = useCallback(
    (msg?: string) => {
      const warningText = msg || translations[language].notifications.unauthorizedCleared;
      clearLocalSession();
      if (isPublicCatalogPath(window.location.pathname)) {
        showWarningOnce(warningText);
        return;
      }
      saveCurrentReturnTo();
      setExternalNotice({
        type: 'warning',
        text: warningText,
      });
      navigate('/auth/sign-in', { replace: true });
    },
    [clearLocalSession, language, navigate, showWarningOnce],
  );

  const handleUnauthorizedInPlace = useCallback(() => {
    clearLocalSession();
  }, [clearLocalSession]);

  const handleRequireRelogin = useCallback(
    (msg: string) => {
      setProfile(null);
      setBootstrapError(null);
      setBootstrapping(false);
      setExternalNotice({
        type: 'success',
        text: msg,
      });
      void sessionManager.logout(language);
      navigate('/auth/sign-in', { replace: true });
    },
    [language, navigate],
  );

  const fetchCurrentProfile = useCallback(
    async (
      activeSession: AuthSession,
      activeLang: Language,
      showToast = false,
      allowGuestFallback = false,
    ) => {
      let resolvedSession = activeSession;

      // Refresh expired or soon-to-expire access token before loading profile or redirecting to login
      if (sessionManager.isSessionExpiredOrExpiring(resolvedSession)) {
        try {
          resolvedSession = await sessionManager.refreshSession(activeLang, 'bootstrap');
        } catch (error) {
          if (error instanceof AuthApiError) {
            if (error.status === 401) {
              setProfile(null);
              setBootstrapError(null);
              if (allowGuestFallback && isPublicCatalogPath(window.location.pathname)) {
                return;
              }
              saveCurrentReturnTo();
              setExternalNotice({
                type: 'warning',
                text: error.message || translations[activeLang].notifications.sessionExpired,
              });
              navigate('/auth/sign-in', { replace: true });
              return;
            }
            // Network or temporary server error: keep local session; schedule retry runs in sessionManager
            setBootstrapError(error.message);
            if (allowGuestFallback && isPublicCatalogPath(window.location.pathname)) {
              return;
            }
            throw error;
          }
          throw error;
        }
      }

      try {
        const user = await authApi.getProfile(resolvedSession.accessToken, activeLang);
        setProfile(user);
        syncProfileLanguage(user);
        setBootstrapError(null);
        if (showToast) {
          const toastLang: Language =
            user.language === 'uz' || user.language === 'ru' ? user.language : activeLang;
          message.success(translations[toastLang].notifications.profileRefreshed);
        }
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            clearLocalSession();
            if (allowGuestFallback && isPublicCatalogPath(window.location.pathname)) {
              return;
            }
            saveCurrentReturnTo();
            setExternalNotice({
              type: 'warning',
              text: error.message || translations[activeLang].notifications.unauthorizedCleared,
            });
            navigate('/auth/sign-in', { replace: true });
            return;
          }
          setBootstrapError(error.message);
          if (allowGuestFallback && isPublicCatalogPath(window.location.pathname)) {
            return;
          }
          throw error;
        }
      }
    },
    [clearLocalSession, message, navigate, syncProfileLanguage],
  );

  useEffect(() => {
    if (bootHandledRef.current) return;
    bootHandledRef.current = true;

    const initialSession = sessionManager.getCurrentSession();
    if (isGoogleCallbackPath(location.pathname) || !initialSession) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setBootstrapping(true);
      try {
        await fetchCurrentProfile(initialSession, language, false, true);
      } catch {
        // Error state already captured in bootstrapError
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically load profile if background 15s/online refresh recovered a valid session after bootstrap failure
  useEffect(() => {
    if (!session || profile || bootstrapping || isGoogleCallbackPath(location.pathname)) {
      return;
    }
    if (lastRecoveredTokenRef.current === session.accessToken) {
      return;
    }
    lastRecoveredTokenRef.current = session.accessToken;

    let cancelled = false;
    (async () => {
      try {
        await fetchCurrentProfile(session, language, false, isPublicCatalogPath(location.pathname));
      } catch {
        // Ignore; bootstrapError stays populated for protected route retry UI
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, profile, bootstrapping, language, location.pathname, fetchCurrentProfile]);

  const handleLanguageChange = async (nextLang: Language) => {
    onUpdateLanguage(nextLang);
    sessionManager.setLanguage(nextLang);
    const activeToken = sessionManager.getCurrentAccessToken() ?? session?.accessToken;
    if (activeToken && profile) {
      setRefreshing(true);
      try {
        const updated = await authApi.updateLanguage(
          activeToken,
          { language: nextLang },
          nextLang,
        );
        setProfile(updated);
        syncProfileLanguage(updated);
      } catch (error) {
        if (error instanceof AuthApiError && error.status === 401) {
          handleUnauthorized(error.message);
        }
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleAuthenticated = async (
    nextSession: AuthSession,
    flow: 'sign-in' | 'sign-up',
  ) => {
    const user = await authApi.getProfile(nextSession.accessToken, language);
    lastRecoveredTokenRef.current = nextSession.accessToken;
    sessionManager.setSession(nextSession);
    setProfile(user);
    syncProfileLanguage(user);
    setExternalNotice(null);
    setBootstrapError(null);
    setBootstrapping(false);

    const savedReturnTo = consumeReturnToRoute(user);
    const targetRoute = isProfileComplete(user) ? (savedReturnTo ?? '/') : '/profile';
    navigate(targetRoute, { replace: true });

    const toastLang: Language =
      user.language === 'uz' || user.language === 'ru' ? user.language : language;
    if (flow === 'sign-up') {
      message.success(translations[toastLang].notifications.signedUpSuccess);
    } else {
      message.success(translations[toastLang].notifications.signedInSuccess);
    }
  };

  const handleAuthenticatedInPlace = useCallback(
    (nextSession: AuthSession, nextProfile: UserProfile) => {
      lastRecoveredTokenRef.current = nextSession.accessToken;
      sessionManager.setSession(nextSession);
      setProfile(nextProfile);
      syncProfileLanguage(nextProfile);
      setExternalNotice(null);
      setBootstrapError(null);
      setBootstrapping(false);

      const toastLang: Language =
        nextProfile.language === 'uz' || nextProfile.language === 'ru'
          ? nextProfile.language
          : language;
      message.success(translations[toastLang].notifications.signedInSuccess);
    },
    [language, message, syncProfileLanguage],
  );

  const handleGoogleAuthenticated = useCallback(
    (nextSession: AuthSession, nextProfile: UserProfile) => {
      lastRecoveredTokenRef.current = nextSession.accessToken;
      sessionManager.setSession(nextSession);
      setProfile(nextProfile);
      syncProfileLanguage(nextProfile);
      setExternalNotice(null);
      setBootstrapError(null);
      setBootstrapping(false);

      const pendingOrder = readPendingProductOrder();
      const savedReturnTo = consumeReturnToRoute(nextProfile);
      const targetRoute = pendingOrder
        ? `${pendingOrder.productPath}${
            pendingOrder.variantId
              ? `?variant=${encodeURIComponent(pendingOrder.variantId)}`
              : ''
          }`
        : isProfileComplete(nextProfile)
          ? (savedReturnTo ?? '/')
          : '/profile';
      navigate(targetRoute, { replace: true });

      const toastLang: Language =
        nextProfile.language === 'uz' || nextProfile.language === 'ru'
          ? nextProfile.language
          : language;
      message.success(translations[toastLang].notifications.signedInSuccess);
    },
    [language, message, navigate, syncProfileLanguage],
  );

  const handleProfileUpdated = useCallback(
    (nextProfile: UserProfile) => {
      setProfile(nextProfile);
      syncProfileLanguage(nextProfile);
    },
    [syncProfileLanguage],
  );

  const handleProfileCompleted = useCallback(
    (nextProfile: UserProfile) => {
      setProfile(nextProfile);
      syncProfileLanguage(nextProfile);
      const toastLang: Language =
        nextProfile.language === 'uz' || nextProfile.language === 'ru'
          ? nextProfile.language
          : language;
      message.success(translations[toastLang].workspace.profileCompletion.savedSuccess);
      navigate('/', { replace: true });
    },
    [language, message, navigate, syncProfileLanguage],
  );

  const handleReturnFromGoogleCallback = useCallback(() => {
    navigate('/auth/sign-in', { replace: true });
  }, [navigate]);

  const handlePasswordResetComplete = (serverMessage: string) => {
    sessionManager.clearLocalSession();
    setProfile(null);
    setExternalNotice({
      type: 'success',
      text: serverMessage || t.notifications.passwordResetSuccess,
    });
  };

  const handleRefreshProfile = async () => {
    if (!session) return;
    setRefreshing(true);
    try {
      await fetchCurrentProfile(session, language, true);
    } catch {
      // Handled in fetchCurrentProfile
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = useCallback(() => {
    clearSavedReturnTo();
    setProfile(null);
    setBootstrapError(null);
    setBootstrapping(false);
    setExternalNotice({
      type: 'info',
      text: translations[language].notifications.loggedOut,
    });
    void sessionManager.logout(language);
    navigate('/auth/sign-in', { replace: true });
  }, [language, navigate]);

  const clearDeletedAccountSession = () => {
    clearSavedReturnTo();
    setProfile(null);
    setBootstrapError(null);
    setBootstrapping(false);
    void sessionManager.logout(language);
  };

  const requestAndroidRelease = useCallback((method: 'GET' | 'PUT' | 'POST', path: string, body?: string, signal?: AbortSignal) =>
    fetchWithSessionRefresh(path, { method, body, signal, language, accessToken: session?.accessToken, credentials: 'omit', headers: body ? { 'Content-Type': 'application/json' } : undefined }), [language, session?.accessToken]);
  const isAuthenticated = Boolean(session && profile);
  const showBottomNav = Capacitor.isNativePlatform() && profile?.role !== 'ADMIN'
    && !location.pathname.startsWith('/auth/');

  return (
    <ProductSocialCacheProvider
      language={language}
      accessToken={session?.accessToken ?? null}
      isAuthenticated={isAuthenticated}
      onUnauthorizedInPlace={handleUnauthorizedInPlace}
    >
      <NotificationProvider
        accessToken={session?.accessToken ?? null}
        isAuthenticated={isAuthenticated}
        language={language}
        onUnauthorized={handleUnauthorized}
      >
        <div className={showBottomNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : undefined}>
        <Routes>
        <Route path="/privacy-policy" element={<><StoreHeader language={language} profile={profile} profileComplete={profile ? isProfileComplete(profile) : false} onLanguageChange={handleLanguageChange} onLogout={handleLogout} /><LegalPage kind="privacy" language={language} request={requestAndroidRelease} eligible={profile?.role === 'USER'} /></>} />
        <Route path="/terms" element={<><StoreHeader language={language} profile={profile} profileComplete={profile ? isProfileComplete(profile) : false} onLanguageChange={handleLanguageChange} onLogout={handleLogout} /><LegalPage kind="terms" language={language} request={requestAndroidRelease} eligible={profile?.role === 'USER'} /></>} />
        <Route path="/delete-account" element={<><StoreHeader language={language} profile={profile} profileComplete={profile ? isProfileComplete(profile) : false} onLanguageChange={handleLanguageChange} onLogout={handleLogout} /><LegalPage kind="delete" language={language} request={requestAndroidRelease} eligible={profile?.role === 'USER'} onAccountDeleted={clearDeletedAccountSession} /></>} />
        <Route path="/contact" element={<><StoreHeader language={language} profile={profile} profileComplete={profile ? isProfileComplete(profile) : false} onLanguageChange={handleLanguageChange} onLogout={handleLogout} /><LegalPage kind="contact" language={language} request={requestAndroidRelease} eligible={profile?.role === 'USER'} /></>} />
      {!Capacitor.isNativePlatform() && <Route path="/chat" element={<><StoreHeader language={language} profile={profile} profileComplete={profile ? isProfileComplete(profile) : false} onLanguageChange={handleLanguageChange} onLogout={handleLogout} /><AppDownloadPage key="chat" language={language} apkUrl={ANDROID_APK_URL} chat /></>} />}
      <Route path="/download" element={<><StoreHeader language={language} profile={profile} profileComplete={profile ? isProfileComplete(profile) : false} onLanguageChange={handleLanguageChange} onLogout={handleLogout} /><AppDownloadPage key="download" language={language} apkUrl={ANDROID_APK_URL} /></>} />

      <Route
        path={GOOGLE_CALLBACK_PATH}
        element={
          <GoogleCallbackView
            language={language}
            onLanguageChange={handleLanguageChange}
            onSaveSession={(nextSession) => {
              lastRecoveredTokenRef.current = nextSession.accessToken;
              sessionManager.setSession(nextSession);
            }}
            onGoogleAuthenticated={handleGoogleAuthenticated}
            onClearSession={() => sessionManager.clearLocalSession()}
            onReturnToLogin={handleReturnFromGoogleCallback}
          />
        }
      />

      {bootstrapping || (Boolean(session) && !profile && !bootstrapError) ? (
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center p-4 sm:p-6">
              <div className="w-full max-w-[520px] bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <Spin />
                  <span className="text-sm font-medium text-slate-700">
                    {t.workspace.checkingProfile}
                  </span>
                </div>
                <Skeleton active paragraph={{ rows: 3 }} />
              </div>
            </div>
          }
        />
      ) : session && !profile && bootstrapError && !isPublicCatalogPath(location.pathname) ? (
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center p-4 sm:p-6">
              <div className="w-full max-w-[520px] bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-8 space-y-5">
                <Alert type="error" showIcon title={bootstrapError} className="rounded-lg" />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="primary"
                    size="large"
                    loading={refreshing}
                    onClick={async () => {
                      setRefreshing(true);
                      try {
                        await fetchCurrentProfile(session, language, false);
                      } catch {
                        // Handled in fetchCurrentProfile
                      } finally {
                        setRefreshing(false);
                      }
                    }}
                    className="!min-h-[44px]"
                  >
                    {t.workspace.retryButton}
                  </Button>
                  <Button size="large" onClick={handleLogout} className="!min-h-[44px]">
                    {t.workspace.logoutButton}
                  </Button>
                </div>
              </div>
            </div>
          }
        />
      ) : isAuthenticated && session && profile ? (
        <>
          <Route
            path="/"
            element={
              isProfileComplete(profile) ? (
                <CatalogPage
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  profile={profile}
                  isAuthenticated
                  onAuthenticatedInPlace={handleAuthenticatedInPlace}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/profile" replace />
              )
            }
          />
          <Route
            path="/catalog"
            element={
              isProfileComplete(profile) ? (
                <CatalogPage
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  profile={profile}
                  isAuthenticated
                  onAuthenticatedInPlace={handleAuthenticatedInPlace}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/profile" replace />
              )
            }
          />
          <Route
            path="/branches"
            element={
              isProfileComplete(profile) ? (
                <BranchesPage
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  profile={profile}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/profile" replace />
              )
            }
          />
          <Route
            path="/about"
            element={
              <AboutPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/products/:idOrSlug"
            element={
              <CatalogProductDetailPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                accessToken={session.accessToken}
                isAuthenticated
                onAuthenticatedInPlace={handleAuthenticatedInPlace}
                onUnauthorizedInPlace={handleUnauthorizedInPlace}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/catalog/products/:idOrSlug"
            element={
              <CatalogProductDetailPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                accessToken={session.accessToken}
                isAuthenticated
                onAuthenticatedInPlace={handleAuthenticatedInPlace}
                onUnauthorizedInPlace={handleUnauthorizedInPlace}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <>
              <DashboardWorkspace
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                refreshing={refreshing}
                onRefreshProfile={handleRefreshProfile}
                onProfileUpdated={handleProfileUpdated}
                onProfileCompleted={handleProfileCompleted}
                onRequireRelogin={handleRequireRelogin}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
              <LegalLinks language={language} profile />
              </>
            }
          />
          <Route
            path="/security"
            element={
              isProfileComplete(profile) ? (
                <DashboardWorkspace
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  profile={profile}
                  session={session}
                  refreshing={refreshing}
                  onRefreshProfile={handleRefreshProfile}
                  onProfileUpdated={handleProfileUpdated}
                  onProfileCompleted={handleProfileCompleted}
                  onRequireRelogin={handleRequireRelogin}
                  onUnauthorized={handleUnauthorized}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/profile" replace />
              )
            }
          />
          {Capacitor.isNativePlatform() && <Route path="/chat" element={profile.role !== 'ADMIN' ? <>
            <SupportChat onBack={Capacitor.isNativePlatform()
              ? () => window.history.state?.idx > 0 ? navigate(-1) : navigate('/', { replace: true })
              : undefined}
              actorId={profile.id} language={language} token={session.accessToken} request={(path, init) =>
              fetchWithSessionRefresh(path, { method: init?.method === 'POST' ? 'POST' : 'GET',
                language, accessToken: session.accessToken, body: init?.body ?? undefined, credentials: 'omit' })} />
          </> : <Navigate to="/" replace />} />}
          <Route path="/admin/legal" element={profile.role === 'ADMIN' ? <><StoreHeader language={language} profile={profile} profileComplete={isProfileComplete(profile)} onLanguageChange={handleLanguageChange} onLogout={handleLogout} /><AdminLegalPage language={language} request={requestAndroidRelease} /></> : <Navigate to="/" replace />} />
          <Route path="/admin/android-release" element={profile.role === 'ADMIN' ? <>
            <StoreHeader language={language} profile={profile} profileComplete={isProfileComplete(profile)} onLanguageChange={handleLanguageChange} onLogout={handleLogout} />
            <AdminAndroidReleasePage language={language} request={requestAndroidRelease} />
          </> : <Navigate to="/" replace />} />
          <Route path="/admin/chat" element={!Capacitor.isNativePlatform() && profile.role === 'ADMIN' ? <>
            <StoreHeader language={language} profile={profile} profileComplete={isProfileComplete(profile)}
              onLanguageChange={handleLanguageChange} onLogout={handleLogout} />
            <SupportChat key={location.search} admin actorId={profile.id} language={language} token={session.accessToken} request={(path, init) =>
              fetchWithSessionRefresh(path, { method: init?.method === 'POST' ? 'POST' : 'GET',
                language, accessToken: session.accessToken, body: init?.body ?? undefined, credentials: 'omit' })} />
          </> : <Navigate to="/" replace />} />
          <Route
            path="/orders"
            element={
              isProfileComplete(profile) ? (
                <MyOrdersPage
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  profile={profile}
                  session={session}
                  onUnauthorized={handleUnauthorized}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/profile" replace />
              )
            }
          />
          <Route
            path="/orders/:orderId"
            element={
              isProfileComplete(profile) ? (
                <OrderDetailPage
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  profile={profile}
                  session={session}
                  onUnauthorized={handleUnauthorized}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/profile" replace />
              )
            }
          />
          <Route
            path="/admin/categories"
            element={
              <AdminCategoriesPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/brands"
            element={
              <AdminBrandsPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/products"
            element={
              <AdminProductsPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/products/:productId"
            element={
              <AdminProductDetailPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminOrdersPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/orders/telegram-recipients"
            element={
              <AdminTelegramRecipientsPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/branches"
            element={
              <AdminBranchesPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/orders/:orderId"
            element={
              <AdminOrderDetailPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/site-logo"
            element={
              <AdminSiteLogoPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/about"
            element={
              <AdminSiteAboutPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminUsersPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/statistics"
            element={
              <AdminStatisticsPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin/advertisements"
            element={
              <AdminAdvertisementsPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={profile}
                session={session}
                onProfileUpdated={handleProfileUpdated}
                onUnauthorized={handleUnauthorized}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="*"
            element={<Navigate to={isProfileComplete(profile) ? '/' : '/profile'} replace />}
          />
        </>
      ) : (
        <>
          <Route
            path="/"
            element={
              <CatalogPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={null}
                isAuthenticated={false}
                onAuthenticatedInPlace={handleAuthenticatedInPlace}
              />
            }
          />
          <Route
            path="/catalog"
            element={
              <CatalogPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={null}
                isAuthenticated={false}
                onAuthenticatedInPlace={handleAuthenticatedInPlace}
              />
            }
          />
          <Route
            path="/branches"
            element={
              <BranchesPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={null}
              />
            }
          />
          <Route
            path="/about"
            element={
              <AboutPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={null}
              />
            }
          />
          <Route
            path="/products/:idOrSlug"
            element={
              <CatalogProductDetailPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={null}
                accessToken={null}
                isAuthenticated={false}
                onAuthenticatedInPlace={handleAuthenticatedInPlace}
                onUnauthorizedInPlace={handleUnauthorizedInPlace}
              />
            }
          />
          <Route
            path="/catalog/products/:idOrSlug"
            element={
              <CatalogProductDetailPage
                language={language}
                onLanguageChange={handleLanguageChange}
                profile={null}
                accessToken={null}
                isAuthenticated={false}
                onAuthenticatedInPlace={handleAuthenticatedInPlace}
                onUnauthorizedInPlace={handleUnauthorizedInPlace}
              />
            }
          />
          {Capacitor.isNativePlatform() && <Route path="/chat" element={<Navigate to="/auth/sign-in" replace />} />}
          <Route path="/profile" element={<Navigate to="/auth/sign-in" replace />} />
          <Route path="/security" element={<Navigate to="/auth/sign-in" replace />} />
          <Route path="/orders/*" element={<Navigate to="/auth/sign-in" replace />} />
          <Route path="/orders" element={<Navigate to="/auth/sign-in" replace />} />
          <Route path="/admin/*" element={<Navigate to="/auth/sign-in" replace />} />
          <Route
            path="/auth/*"
            element={
              <AuthPortal
                language={language}
                onLanguageChange={handleLanguageChange}
                externalNotice={externalNotice}
                onClearExternalNotice={() => setExternalNotice(null)}
                onAuthenticated={handleAuthenticated}
                onPasswordResetComplete={handlePasswordResetComplete}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
      </Routes>
        </div>
      {showBottomNav && <MobileBottomNav language={language} />}

      <CartDrawer
        language={language}
        profile={profile}
        accessToken={session?.accessToken ?? null}
        isAuthenticated={isAuthenticated}
        onAuthenticatedInPlace={handleAuthenticatedInPlace}
        onUnauthorizedInPlace={handleUnauthorizedInPlace}
      />

      <NotificationsDrawer language={language} />
      <AndroidDownloadOffer guest={!bootstrapping && !session && isPublicCatalogPath(location.pathname)} language={language} />
      </NotificationProvider>
    </ProductSocialCacheProvider>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => readStoredLanguage());
  useEffect(() => startPromotionPush(language), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translations[language].pageTitle;
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {
      // Ignore storage access errors
    }
  }, [language]);

  return (
    <BrowserRouter>
      <MobileLinks />
      <ConfigProvider
        locale={language === 'ru' ? ruRU : enUS}
        theme={{
          token: {
            colorPrimary: '#16a34a',
            colorInfo: '#16a34a',
            colorBgLayout: '#f7f6f2',
            colorBorder: '#e6e4dd',
            colorBorderSecondary: '#f2f0ea',
            colorTextBase: '#0f172a',
            borderRadius: 8,
            controlHeightLG: 44,
            fontFamily:
              "'DM Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          components: {
            Button: {
              fontWeight: 500,
            },
            Segmented: {
              trackBg: '#f1f5f9',
              itemSelectedBg: '#ffffff',
            },
          },
        }}
      >
        <AntApp>
          <AndroidUpdateNotice language={language} />
          <SiteLogoProvider>
            <CartProvider>
              <OsonMarketShell language={language} onUpdateLanguage={setLanguage} />
            </CartProvider>
          </SiteLogoProvider>
        </AntApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}
