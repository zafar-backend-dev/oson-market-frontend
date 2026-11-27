import { clearMobileGoogleAttempt, getMobileGoogleVerifier, startGoogleLogin } from './mobileGoogle';
import { API_BASE_URL } from '../constants';
import type {
  ApiErrorBody,
  AuthSession,
  ChallengeResponse,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  Language,
  MessageResponse,
  RequestEmailChangePayload,
  ResetPasswordPayload,
  SignInPayload,
  SignInVerifyPayload,
  SignUpPayload,
  SignUpVerifyPayload,
  TokenResponse,
  UpdateLanguagePayload,
  UpdateProfilePayload,
  UpdateUsernamePayload,
  UserProfile,
  VerifyEmailChangePayload,
} from '../types/auth';
import { AuthApiError, getDefaultHttpErrorMessage } from './apiError';
import { fetchWithSessionRefresh, sessionManager } from './sessionManager';

export { API_BASE_URL, AuthApiError };

export const OTP_VALIDITY_SECONDS = 300;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

const inFlightGoogleExchanges = new Map<string, Promise<TokenResponse>>();

function parseRetryAfterHeader(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const parsed = Number.parseInt(headerValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function requestJson<T>(
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    language: Language;
    body?: unknown;
    formData?: FormData;
    accessToken?: string;
    credentials?: RequestCredentials;
    skipAuthRetry?: boolean;
  },
): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined && !options.formData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetchWithSessionRefresh(path, {
    method: options.method,
    language: options.language,
    accessToken: options.accessToken,
    headers,
    credentials: options.credentials,
    skipAuthRetry: options.skipAuthRetry,
    body: options.formData
      ? options.formData
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: ApiErrorBody | T | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as ApiErrorBody | T;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errorBody = (parsed ?? {}) as ApiErrorBody;
    const retryHeader = parseRetryAfterHeader(response.headers.get('Retry-After'));
    const retryAfterSeconds =
      typeof errorBody.retryAfterSeconds === 'number' && errorBody.retryAfterSeconds > 0
        ? errorBody.retryAfterSeconds
        : retryHeader;

    throw new AuthApiError({
      status: response.status,
      code: errorBody.code || `http.${response.status}`,
      message: errorBody.message || getDefaultHttpErrorMessage(response.status, options.language),
      fields: Array.isArray(errorBody.fields) ? errorBody.fields : [],
      retryAfterSeconds,
      endpoint: `${options.method} ${path.split('?')[0]}`,
    });
  }

  return (parsed ?? {}) as T;
}

export const authApi = {
  signUp(payload: SignUpPayload, language: Language): Promise<ChallengeResponse> {
    return requestJson<ChallengeResponse>('/api/auth/sign-up', {
      method: 'POST',
      language,
      skipAuthRetry: true,
      body: {
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        email: payload.email.trim().toLowerCase(),
        username: payload.username.trim().toLowerCase(),
        password: payload.password,
        termsAccepted: payload.termsAccepted,
        privacyAcknowledged: payload.privacyAcknowledged,
      },
    });
  },

  verifySignUp(payload: SignUpVerifyPayload, language: Language): Promise<TokenResponse> {
    return requestJson<TokenResponse>('/api/auth/sign-up/verify', {
      method: 'POST',
      language,
      credentials: 'include',
      skipAuthRetry: true,
      body: {
        challengeId: payload.challengeId,
        code: payload.code,
      },
    });
  },

  signIn(payload: SignInPayload, language: Language): Promise<ChallengeResponse> {
    return requestJson<ChallengeResponse>('/api/auth/sign-in', {
      method: 'POST',
      language,
      skipAuthRetry: true,
      body: {
        login: payload.login.trim().toLowerCase(),
        password: payload.password,
        termsAccepted: payload.termsAccepted,
        privacyAcknowledged: payload.privacyAcknowledged,
      },
    });
  },

  verifySignIn(payload: SignInVerifyPayload, language: Language): Promise<TokenResponse> {
    return requestJson<TokenResponse>('/api/auth/sign-in/verify', {
      method: 'POST',
      language,
      credentials: 'include',
      skipAuthRetry: true,
      body: {
        challengeId: payload.challengeId,
        code: payload.code,
      },
    });
  },

  forgotPassword(payload: ForgotPasswordPayload, language: Language): Promise<ChallengeResponse> {
    return requestJson<ChallengeResponse>('/api/auth/forgot-password', {
      method: 'POST',
      language,
      skipAuthRetry: true,
      body: {
        email: payload.email.trim().toLowerCase(),
      },
    });
  },

  resetPassword(payload: ResetPasswordPayload, language: Language): Promise<MessageResponse> {
    return requestJson<MessageResponse>('/api/auth/reset-password', {
      method: 'POST',
      language,
      skipAuthRetry: true,
      body: {
        challengeId: payload.challengeId,
        code: payload.code,
        newPassword: payload.newPassword,
      },
    });
  },

  exchangeGoogleCode(loginCode: string, language: Language): Promise<TokenResponse> {
    const existing = inFlightGoogleExchanges.get(loginCode);
    if (existing) {
      return existing;
    }

    const verifier = getMobileGoogleVerifier();
    const endpoint = verifier ? '/api/auth/google/mobile/exchange' : '/api/auth/google/exchange';
    const requestPromise = requestJson<TokenResponse>(endpoint, {
      method: 'POST',
      language,
      credentials: 'include',
      skipAuthRetry: true,
      body: verifier ? { loginCode, verifier } : { loginCode },
    });

    if (verifier) void requestPromise.then(clearMobileGoogleAttempt, clearMobileGoogleAttempt);
    inFlightGoogleExchanges.set(loginCode, requestPromise);
    return requestPromise;
  },

  refresh(language: Language): Promise<AuthSession> {
    return sessionManager.refreshSession(language, 'manual');
  },

  logout(language: Language): Promise<void> {
    return sessionManager.logout(language);
  },

  getMe(accessToken: string, language: Language): Promise<UserProfile> {
    return requestJson<UserProfile>('/api/auth/me', {
      method: 'GET',
      language,
      accessToken,
    });
  },

  async getProfile(accessToken: string, language: Language): Promise<UserProfile> {
    try {
      return await requestJson<UserProfile>('/api/profile', {
        method: 'GET',
        language,
        accessToken,
      });
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 404) {
        return requestJson<UserProfile>('/api/auth/me', {
          method: 'GET',
          language,
          accessToken,
        });
      }
      throw error;
    }
  },

  updateProfile(
    accessToken: string,
    payload: UpdateProfilePayload,
    language: Language,
  ): Promise<UserProfile> {
    return requestJson<UserProfile>('/api/profile', {
      method: 'PUT',
      language,
      accessToken,
      body: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
      },
    });
  },

  updateUsername(
    accessToken: string,
    payload: UpdateUsernamePayload,
    language: Language,
  ): Promise<UserProfile> {
    return requestJson<UserProfile>('/api/profile/username', {
      method: 'PUT',
      language,
      accessToken,
      body: {
        username: payload.username.trim().toLowerCase(),
      },
    });
  },

  updateLanguage(
    accessToken: string,
    payload: UpdateLanguagePayload,
    language: Language,
  ): Promise<UserProfile> {
    return requestJson<UserProfile>('/api/profile/language', {
      method: 'PUT',
      language,
      accessToken,
      body: {
        language: payload.language,
      },
    });
  },

  changePassword(
    accessToken: string,
    payload: ChangePasswordPayload,
    language: Language,
  ): Promise<MessageResponse> {
    return requestJson<MessageResponse>('/api/profile/password', {
      method: 'PUT',
      language,
      accessToken,
      body: {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      },
    });
  },

  requestEmailChange(
    accessToken: string,
    payload: RequestEmailChangePayload,
    language: Language,
  ): Promise<ChallengeResponse> {
    return requestJson<ChallengeResponse>('/api/profile/email', {
      method: 'POST',
      language,
      accessToken,
      body: {
        email: payload.email.trim().toLowerCase(),
        currentPassword: payload.currentPassword,
      },
    });
  },

  verifyEmailChange(
    accessToken: string,
    payload: VerifyEmailChangePayload,
    language: Language,
  ): Promise<MessageResponse> {
    return requestJson<MessageResponse>('/api/profile/email/verify', {
      method: 'POST',
      language,
      accessToken,
      body: {
        challengeId: payload.challengeId,
        code: payload.code,
      },
    });
  },

  uploadAvatar(accessToken: string, file: File, language: Language): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return requestJson<UserProfile>('/api/profile/avatar', {
      method: 'PUT',
      language,
      accessToken,
      formData,
    });
  },

  async fetchAvatarBlob(accessToken: string, language: Language): Promise<Blob | null> {
    const response = await fetchWithSessionRefresh('/api/profile/avatar', {
      method: 'GET',
      accessToken,
      language,
      networkErrorMessage:
        language === 'ru'
          ? 'Не удалось загрузить фото профиля.'
          : 'Profil rasmini yuklab bo‘lmadi.',
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      let errorBody: ApiErrorBody = {};
      try {
        errorBody = (await response.json()) as ApiErrorBody;
      } catch {
        errorBody = {};
      }
      throw new AuthApiError({
        status: response.status,
        code: errorBody.code || `http.${response.status}`,
        message: errorBody.message || getDefaultHttpErrorMessage(response.status, language),
      });
    }

    return response.blob();
  },

  deleteAvatar(accessToken: string, language: Language): Promise<void> {
    return requestJson<void>('/api/profile/avatar', {
      method: 'DELETE',
      language,
      accessToken,
    });
  },

  startGoogleLogin(language: Language): Promise<void> {
    return startGoogleLogin(this.getGoogleAuthorizationUrl(), language);
  },

  getGoogleAuthorizationUrl(): string {
    return `${API_BASE_URL}/oauth2/authorization/google?termsAccepted=true&privacyAcknowledged=true`;
  },
};
