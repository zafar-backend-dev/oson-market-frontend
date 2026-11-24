export type Language = 'uz' | 'ru';

export type UserRole = 'USER' | 'ADMIN';

export type AuthScreenMode = 'sign-in' | 'sign-up' | 'forgot-password';

export interface SignUpPayload {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
}

export interface SignUpVerifyPayload {
  challengeId: string;
  code: string;
}

export interface SignInPayload {
  login: string;
  password: string;
}

export interface SignInVerifyPayload {
  challengeId: string;
  code: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  challengeId: string;
  code: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

export interface UpdateUsernamePayload {
  username: string;
}

export interface UpdateLanguagePayload {
  language: Language;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface RequestEmailChangePayload {
  email: string;
  currentPassword: string;
}

export interface VerifyEmailChangePayload {
  challengeId: string;
  code: string;
}

export interface ChallengeResponse {
  challengeId: string;
  message: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface MessageResponse {
  message: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  language: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
  fields?: string[];
  retryAfterSeconds?: number;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number;
}
