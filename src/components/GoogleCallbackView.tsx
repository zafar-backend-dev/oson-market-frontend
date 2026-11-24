import { useEffect, useState } from 'react';
import { Button, Result, Spin } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { buildAuthSession } from '../services/sessionManager';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import { LanguageSelector } from './LanguageSelector';
import { SiteLogo } from './SiteLogo';

export interface GoogleCallbackParams {
  loginCode: string | null;
  error: string | null;
}

type CallbackErrorState =
  | { kind: 'conflict' }
  | { kind: 'unverified' }
  | { kind: 'failed' }
  | { kind: 'missing_code' }
  | { kind: 'exchange_unauthorized'; serverMessage?: string }
  | { kind: 'profile_unauthorized'; serverMessage?: string }
  | { kind: 'server'; serverMessage: string };

let cachedGoogleCallbackParams: GoogleCallbackParams | null = null;

export function readAndStripGoogleCallbackParams(): GoogleCallbackParams {
  if (cachedGoogleCallbackParams) {
    return cachedGoogleCallbackParams;
  }

  const params = new URLSearchParams(window.location.search);
  const extracted: GoogleCallbackParams = {
    loginCode: params.get('loginCode'),
    error: params.get('error'),
  };

  cachedGoogleCallbackParams = extracted;

  if (window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  return extracted;
}

export function clearCachedGoogleCallbackParams(): void {
  cachedGoogleCallbackParams = null;
}

function mapGoogleErrorParam(errorCode: string): CallbackErrorState {
  switch (errorCode.trim()) {
    case 'auth.google.conflict':
      return { kind: 'conflict' };
    case 'auth.google.unverified':
      return { kind: 'unverified' };
    case 'auth.google.failed':
    default:
      return { kind: 'failed' };
  }
}

interface GoogleCallbackViewProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onSaveSession: (session: AuthSession) => void;
  onGoogleAuthenticated: (session: AuthSession, profile: UserProfile) => void;
  onClearSession: () => void;
  onReturnToLogin: () => void;
}

export function GoogleCallbackView({
  language,
  onLanguageChange,
  onSaveSession,
  onGoogleAuthenticated,
  onClearSession,
  onReturnToLogin,
}: GoogleCallbackViewProps) {
  const t = translations[language];
  const [callbackParams] = useState<GoogleCallbackParams>(() =>
    readAndStripGoogleCallbackParams(),
  );
  const [errorState, setErrorState] = useState<CallbackErrorState | null>(() => {
    if (callbackParams.error) {
      return mapGoogleErrorParam(callbackParams.error);
    }
    if (!callbackParams.loginCode) {
      return { kind: 'missing_code' };
    }
    return null;
  });

  useEffect(() => {
    if (callbackParams.error || !callbackParams.loginCode) {
      return;
    }

    let active = true;
    const loginCode = callbackParams.loginCode;

    async function completeGoogleLogin() {
      let session: AuthSession;

      try {
        const tokenRes = await authApi.exchangeGoogleCode(loginCode, language);
        if (!active) return;

        session = buildAuthSession(tokenRes);

        onSaveSession(session);
      } catch (error) {
        if (!active) return;

        if (error instanceof AuthApiError) {
          if (error.code === 'auth.google.conflict') {
            setErrorState({ kind: 'conflict' });
            return;
          }
          if (error.code === 'auth.google.unverified') {
            setErrorState({ kind: 'unverified' });
            return;
          }
          if (error.code === 'auth.google.failed') {
            setErrorState({ kind: 'failed' });
            return;
          }
          if (error.status === 401) {
            setErrorState({
              kind: 'exchange_unauthorized',
              serverMessage: error.message,
            });
            return;
          }
          setErrorState({ kind: 'server', serverMessage: error.message });
          return;
        }

        setErrorState({ kind: 'failed' });
        return;
      }

      try {
        const profile = await authApi.getProfile(session.accessToken, language);
        if (!active) return;

        clearCachedGoogleCallbackParams();
        onGoogleAuthenticated(session, profile);
      } catch (error) {
        if (!active) return;

        // Clear temporarily saved auth state on profile 401 or network/server failure
        onClearSession();

        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            setErrorState({
              kind: 'profile_unauthorized',
              serverMessage: error.message,
            });
            return;
          }
          setErrorState({ kind: 'server', serverMessage: error.message });
          return;
        }

        setErrorState({ kind: 'profile_unauthorized' });
      }
    }

    completeGoogleLogin();

    return () => {
      active = false;
    };
    // Single-flight exchange deduplication per loginCode is enforced in authApi.exchangeGoogleCode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackToLogin = () => {
    clearCachedGoogleCallbackParams();
    onReturnToLogin();
  };

  const handleStartNewGoogleLogin = () => {
    clearCachedGoogleCallbackParams();
    void authApi.startGoogleLogin(language);
  };

  const resolvedErrorMessage = (() => {
    if (!errorState) return null;
    switch (errorState.kind) {
      case 'conflict':
        return t.googleCallback.conflictError;
      case 'unverified':
        return t.googleCallback.unverifiedError;
      case 'failed':
        return t.googleCallback.failedError;
      case 'missing_code':
        return t.googleCallback.missingCodeError;
      case 'exchange_unauthorized':
        return errorState.serverMessage || t.googleCallback.expiredOrInvalidCodeError;
      case 'profile_unauthorized':
        return errorState.serverMessage || t.googleCallback.unauthorizedProfileError;
      case 'server':
        return errorState.serverMessage;
    }
  })();

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <header className="bg-white border-b border-[#e6e4dd]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <button
            type="button"
            onClick={handleBackToLogin}
            aria-label={t.brandName}
            className="inline-flex items-center whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SiteLogo language={language} size="md" />
          </button>

          <LanguageSelector
            value={language}
            onChange={onLanguageChange}
            ariaLabel={t.languageLabel}
          />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[460px] bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-8">
          {!resolvedErrorMessage ? (
            <div className="py-6 flex flex-col items-center text-center space-y-5">
              <Spin size="large" />
              <div className="space-y-1.5">
                <h1 className="text-lg font-semibold text-slate-900">
                  {t.googleCallback.loadingTitle}
                </h1>
                <p className="text-sm text-slate-500">{t.googleCallback.loadingSubtitle}</p>
              </div>
            </div>
          ) : (
            <Result
              status="error"
              title={t.googleCallback.errorTitle}
              subTitle={resolvedErrorMessage}
              className="!p-0"
              extra={[
                <Button
                  key="new-google-login"
                  type="primary"
                  size="large"
                  onClick={handleStartNewGoogleLogin}
                >
                  {t.googleCallback.startNewGoogleLogin}
                </Button>,
                <Button
                  key="back"
                  size="large"
                  icon={<ArrowLeft className="w-3.5 h-3.5" />}
                  onClick={handleBackToLogin}
                >
                  {t.googleCallback.backToLogin}
                </Button>,
              ]}
            />
          )}
        </div>
      </main>
    </div>
  );
}
