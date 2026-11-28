import { unregisterOrderPush } from './orderPush';
import { fetchSessionRequest } from './sessionTransport';
import { API_BASE_URL } from '../constants';
import type { ApiErrorBody, AuthSession, Language, TokenResponse } from '../types/auth';
import { AuthApiError, getDefaultHttpErrorMessage } from './apiError';

export const SESSION_STORAGE_KEY = 'oson_market_session';
export const PROACTIVE_REFRESH_LEAD_MS = 60_000;
export const REFRESH_RETRY_DELAY_MS = 15_000;

export type SessionRefreshReason =
  | 'proactive'
  | 'bootstrap'
  | 'visibility'
  | 'reactive-401'
  | 'expired-preflight'
  | 'retry'
  | 'manual';

export interface SessionInvalidatedEvent {
  status: 401;
  message?: string;
}

export function buildAuthSession(tokenRes: TokenResponse): AuthSession {
  const rawExpiresIn =
    (tokenRes as TokenResponse & { expires_in?: unknown }).expiresIn ??
    (tokenRes as TokenResponse & { expires_in?: unknown }).expires_in;
  const parsedExpiresIn =
    typeof rawExpiresIn === 'number'
      ? rawExpiresIn
      : typeof rawExpiresIn === 'string'
        ? Number(rawExpiresIn)
        : NaN;

  const expiresIn =
    Number.isFinite(parsedExpiresIn) && parsedExpiresIn > 0 ? parsedExpiresIn : 900;

  return {
    accessToken: tokenRes.accessToken,
    tokenType: tokenRes.tokenType || 'Bearer',
    expiresIn,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

function shouldProactivelyRefresh(session: AuthSession): boolean {
  const remainingMs = session.expiresAt - Date.now();
  if (session.expiresIn <= 60) {
    // Short-TTL test tokens: avoid refreshing on every single request; refresh at <= 10s or expired
    return remainingMs <= Math.min(10_000, Math.floor((session.expiresIn * 1000) / 3));
  }
  return remainingMs <= PROACTIVE_REFRESH_LEAD_MS;
}

function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || typeof parsed?.expiresAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage access errors
  }
}

function isTemporaryServerStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

function getNetworkErrorMessage(language: Language): string {
  return language === 'ru'
    ? 'Не удалось связаться с сервером. Пожалуйста, попробуйте чуть позже.'
    : 'Server bilan bog‘lanib bo‘lmadi. Iltimos, birozdan so‘ng qayta urinib ko‘ring.';
}

let currentSession: AuthSession | null = readStoredSession();
let authEpoch = 0;
let currentLanguage: Language = 'uz';
let inFlightRefresh: { epoch: number; promise: Promise<AuthSession> } | null = null;
let proactiveTimerId: number | null = null;
let retryTimerId: number | null = null;
let onlineListenerCleanup: (() => void) | null = null;
let lifecycleListenersInitialized = false;

const sessionListeners = new Set<(session: AuthSession | null) => void>();
const invalidatedListeners = new Set<(event: SessionInvalidatedEvent) => void>();

function notifySessionListeners(session: AuthSession | null): void {
  for (const listener of sessionListeners) {
    listener(session);
  }
}

function notifyInvalidatedListeners(event: SessionInvalidatedEvent): void {
  for (const listener of invalidatedListeners) {
    listener(event);
  }
}

function clearProactiveTimer(): void {
  if (proactiveTimerId !== null && typeof window !== 'undefined') {
    window.clearTimeout(proactiveTimerId);
  }
  proactiveTimerId = null;
}

function clearRetrySchedule(): void {
  if (retryTimerId !== null && typeof window !== 'undefined') {
    window.clearTimeout(retryTimerId);
  }
  retryTimerId = null;
  if (onlineListenerCleanup) {
    onlineListenerCleanup();
    onlineListenerCleanup = null;
  }
}

function clearAllTimers(): void {
  clearProactiveTimer();
  clearRetrySchedule();
}

function scheduleProactiveRefresh(session: AuthSession): void {
  clearProactiveTimer();
  if (typeof window === 'undefined') return;

  const remainingMs = session.expiresAt - Date.now();
  let delayMs: number;

  if (session.expiresIn <= 60) {
    // Short-TTL test tokens: refresh halfway through remaining lifetime to avoid tight loops
    delayMs = Math.max(5_000, Math.floor(Math.max(0, remainingMs) * 0.5));
  } else {
    delayMs = Math.max(0, remainingMs - PROACTIVE_REFRESH_LEAD_MS);
  }

  proactiveTimerId = window.setTimeout(() => {
    proactiveTimerId = null;
    if (!currentSession || currentSession.accessToken !== session.accessToken) return;
    void sessionManager.refreshSession(currentLanguage, 'proactive').catch(() => {
      // Handled inside refreshSession (401 invalidates; network/5xx schedules retry)
    });
  }, delayMs);
}

function scheduleRefreshRetry(): void {
  if (typeof window === 'undefined' || !currentSession) return;
  if (retryTimerId !== null) return;

  const triggerRetry = () => {
    clearRetrySchedule();
    if (!currentSession) return;
    void sessionManager.refreshSession(currentLanguage, 'retry').catch(() => {
      // Handled inside refreshSession
    });
  };

  const handleOnline = () => {
    triggerRetry();
  };

  window.addEventListener('online', handleOnline);
  onlineListenerCleanup = () => {
    window.removeEventListener('online', handleOnline);
  };

  retryTimerId = window.setTimeout(() => {
    triggerRetry();
  }, REFRESH_RETRY_DELAY_MS);
}

function ensureLifecycleListeners(): void {
  if (lifecycleListenersInitialized || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  lifecycleListenersInitialized = true;

  const handleReturnToTab = () => {
    if (document.visibilityState !== 'visible') return;
    if (!currentSession) return;

    if (shouldProactivelyRefresh(currentSession)) {
      void sessionManager.refreshSession(currentLanguage, 'visibility').catch(() => {
        // Handled inside refreshSession
      });
    } else {
      scheduleProactiveRefresh(currentSession);
    }
  };

  document.addEventListener('visibilitychange', handleReturnToTab);
  window.addEventListener('focus', handleReturnToTab);
  window.addEventListener('pageshow', handleReturnToTab);
}

ensureLifecycleListeners();

// If a non-expired stored session exists on module load, arm the proactive refresh timer.
// Expired / soon-to-expire stored sessions are refreshed before profile loading in App bootstrap.
if (currentSession && !shouldProactivelyRefresh(currentSession)) {
  scheduleProactiveRefresh(currentSession);
}

function invalidateSessionFromRefresh401(serverMessage?: string): void {
  authEpoch += 1;
  clearAllTimers();
  inFlightRefresh = null;
  currentSession = null;
  writeStoredSession(null);
  notifySessionListeners(null);
  notifyInvalidatedListeners({ status: 401, message: serverMessage });
}

export const sessionManager = {
  setLanguage(language: Language): void {
    currentLanguage = language;
  },

  getCurrentSession(): AuthSession | null {
    return currentSession;
  },

  getCurrentAccessToken(): string | null {
    return currentSession?.accessToken ?? null;
  },

  getAuthEpoch(): number {
    return authEpoch;
  },

  isSessionExpiredOrExpiring(session: AuthSession | null = currentSession): boolean {
    if (!session) return false;
    return session.expiresAt - Date.now() <= PROACTIVE_REFRESH_LEAD_MS;
  },

  subscribeSession(listener: (session: AuthSession | null) => void): () => void {
    sessionListeners.add(listener);
    return () => {
      sessionListeners.delete(listener);
    };
  },

  subscribeInvalidated(listener: (event: SessionInvalidatedEvent) => void): () => void {
    invalidatedListeners.add(listener);
    return () => {
      invalidatedListeners.delete(listener);
    };
  },

  setSession(nextSession: AuthSession): void {
    authEpoch += 1;
    clearAllTimers();
    inFlightRefresh = null;
    currentSession = nextSession;
    writeStoredSession(nextSession);
    notifySessionListeners(nextSession);
    scheduleProactiveRefresh(nextSession);
  },

  clearLocalSession(): void {
    authEpoch += 1;
    clearAllTimers();
    inFlightRefresh = null;
    currentSession = null;
    writeStoredSession(null);
    notifySessionListeners(null);
  },

  async logout(language: Language = currentLanguage): Promise<void> {
    const pushLogout = unregisterOrderPush(currentSession?.accessToken ?? null).catch(() => {});
    // Bump epoch and clear local state/timers synchronously so any in-flight refresh
    // initiated prior to logout cannot restore the session upon resolving later.
    authEpoch += 1;
    clearAllTimers();
    inFlightRefresh = null;
    currentSession = null;
    writeStoredSession(null);
    notifySessionListeners(null);

    try {
      await fetchSessionRequest(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': language,
        },
        credentials: 'include',
        body: '{}',
      });
    } catch {
      // Local auth state and timers are already cleared even if offline
    }
    await pushLogout;
  },

  refreshSession(
    language: Language = currentLanguage,
    _reason: SessionRefreshReason = 'manual',
  ): Promise<AuthSession> {
    const startEpoch = authEpoch;

    if (inFlightRefresh && inFlightRefresh.epoch === startEpoch) {
      return inFlightRefresh.promise;
    }

    clearRetrySchedule();

    const refreshPromise = (async (): Promise<AuthSession> => {
      let response: Response;
      try {
        // Refresh endpoint relies strictly on HttpOnly oson_refresh cookie; never send Authorization
        response = await fetchSessionRequest(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Language': language,
          },
          credentials: 'include',
          body: '{}',
        });
      } catch {
        if (authEpoch !== startEpoch || !currentSession) {
          throw new AuthApiError({
            status: 401,
            code: 'auth.logged_out',
            message: getDefaultHttpErrorMessage(401, language),
            endpoint: 'POST /api/auth/refresh',
          });
        }

        // Preserve local session on network outage and retry after 15s or reconnect
        scheduleRefreshRetry();
        throw new AuthApiError({
          status: 0,
          code: 'network.unreachable',
          message: getNetworkErrorMessage(language),
          isNetworkError: true,
          endpoint: 'POST /api/auth/refresh',
        });
      }

      // Discard result if user logged out or switched session while refresh was in flight
      if (authEpoch !== startEpoch) {
        throw new AuthApiError({
          status: 401,
          code: 'auth.logged_out',
          message: getDefaultHttpErrorMessage(401, language),
          endpoint: 'POST /api/auth/refresh',
        });
      }

      if (response.status === 401) {
        let errorBody: ApiErrorBody = {};
        try {
          const txt = await response.text();
          errorBody = txt ? (JSON.parse(txt) as ApiErrorBody) : {};
        } catch {
          errorBody = {};
        }
        if (authEpoch !== startEpoch) throw new AuthApiError({ status: 401, code: 'auth.logged_out', message: getDefaultHttpErrorMessage(401, language) });
        const msg = errorBody.message || getDefaultHttpErrorMessage(401, language);
        invalidateSessionFromRefresh401(msg);
        throw new AuthApiError({
          status: 401,
          code: errorBody.code || 'http.401',
          message: msg,
          fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
          endpoint: 'POST /api/auth/refresh',
        });
      }

      const text = await response.text();
      let parsed: ApiErrorBody | TokenResponse | null = null;
      if (text) {
        try {
          parsed = JSON.parse(text) as ApiErrorBody | TokenResponse;
        } catch {
          parsed = null;
        }
      }

      if (!response.ok) {
        const errorBody = (parsed ?? {}) as ApiErrorBody;
        if (isTemporaryServerStatus(response.status) && currentSession) {
          // Preserve local session on temporary server error and retry after 15s or reconnect
          scheduleRefreshRetry();
        }
        throw new AuthApiError({
          status: response.status,
          code: errorBody.code || `http.${response.status}`,
          message: errorBody.message || getDefaultHttpErrorMessage(response.status, language),
          fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
          endpoint: 'POST /api/auth/refresh',
        });
      }

      const tokenRes = parsed as TokenResponse | null;
      if (!tokenRes?.accessToken) {
        if (currentSession) {
          scheduleRefreshRetry();
        }
        throw new AuthApiError({
          status: 500,
          code: 'auth.refresh.invalid_response',
          message: getDefaultHttpErrorMessage(500, language),
          endpoint: 'POST /api/auth/refresh',
        });
      }

      // Re-check epoch before writing refreshed token to state/storage
      if (authEpoch !== startEpoch) {
        throw new AuthApiError({
          status: 401,
          code: 'auth.logged_out',
          message: getDefaultHttpErrorMessage(401, language),
          endpoint: 'POST /api/auth/refresh',
        });
      }

      const nextSession = buildAuthSession(tokenRes);
      currentSession = nextSession;
      writeStoredSession(nextSession);
      notifySessionListeners(nextSession);
      scheduleProactiveRefresh(nextSession);
      return nextSession;
    })();

    inFlightRefresh = { epoch: startEpoch, promise: refreshPromise };
    void refreshPromise.finally(() => {
      if (inFlightRefresh?.promise === refreshPromise) {
        inFlightRefresh = null;
      }
    }).catch(() => {});

    return refreshPromise;
  },

  async ensureValidAccessToken(
    language: Language = currentLanguage,
    fallbackToken?: string,
  ): Promise<string | undefined> {
    if (inFlightRefresh && inFlightRefresh.epoch === authEpoch) {
      try {
        const refreshed = await inFlightRefresh.promise;
        return refreshed.accessToken;
      } catch (err) {
        if (currentSession && currentSession.expiresAt > Date.now() + 2_000) {
          return currentSession.accessToken;
        }
        throw err;
      }
    }

    if (currentSession) {
      if (shouldProactivelyRefresh(currentSession)) {
        try {
          const reason: SessionRefreshReason =
            currentSession.expiresAt <= Date.now() ? 'expired-preflight' : 'proactive';
          const refreshed = await this.refreshSession(language, reason);
          return refreshed.accessToken;
        } catch (err) {
          // If refresh failed transiently (network / 5xx) and current token has not yet expired,
          // let the caller proceed while background retry continues; 401 always throws & clears session.
          if (
            !(err instanceof AuthApiError && err.status === 401) &&
            currentSession &&
            currentSession.expiresAt > Date.now() + 2_000
          ) {
            return currentSession.accessToken;
          }
          throw err;
        }
      }
      return currentSession.accessToken;
    }

    return fallbackToken;
  },
};

export interface FetchWithAuthOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  language: Language;
  accessToken?: string;
  headers?: Record<string, string>;
  body?: BodyInit;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  skipAuthRetry?: boolean;
  networkErrorMessage?: string;
}

export async function fetchWithSessionRefresh(
  pathOrUrl: string,
  options: FetchWithAuthOptions,
): Promise<Response> {
  const resolvedUrl = /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : `${API_BASE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  const cleanEndpoint = `${options.method} ${pathOrUrl.split('?')[0]}`;

  const performFetch = async (token?: string): Promise<Response> => {
    const headers: Record<string, string> = {
      'Accept-Language': options.language,
      ...(options.headers ?? {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const transport = /^\/api\/auth\/(?:sign-in\/verify|sign-up\/verify|google\/mobile\/exchange)$/.test(pathOrUrl)
        ? fetchSessionRequest
        : fetch;
      return await transport(resolvedUrl, {
        method: options.method,
        headers,
        credentials: options.credentials,
        body: options.body,
        signal: options.signal,
      });
    } catch {
      throw new AuthApiError({
        status: 0,
        code: 'network.unreachable',
        message: options.networkErrorMessage || getNetworkErrorMessage(options.language),
        isNetworkError: true,
        endpoint: cleanEndpoint,
      });
    }
  };

  if (options.skipAuthRetry) {
    return performFetch(options.accessToken);
  }

  const startEpoch = authEpoch;
  const tokenToUse = await sessionManager.ensureValidAccessToken(
    options.language,
    options.accessToken,
  );

  const response = await performFetch(tokenToUse);

  if (response.status !== 401 || !tokenToUse) {
    return response;
  }

  if (authEpoch !== startEpoch) {
    return response;
  }

  // If another concurrent request already completed refresh while this request was in flight,
  // reuse the fresh token directly without triggering a duplicate /api/auth/refresh call.
  const latestToken = sessionManager.getCurrentAccessToken();
  let retryToken: string;

  if (latestToken && latestToken !== tokenToUse) {
    retryToken = latestToken;
  } else {
    const refreshedSession = await sessionManager.refreshSession(
      options.language,
      'reactive-401',
    );
    if (authEpoch !== startEpoch) {
      return response;
    }
    retryToken = refreshedSession.accessToken;
  }

  // Retry original protected request strictly once with the refreshed JWT
  return performFetch(retryToken);
}
