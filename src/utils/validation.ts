const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,64}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?\d[\d\s()-]*$/;
const ORDER_PHONE_CHARS_REGEX = /^\+?[\d\s()-]+$/;

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MAX_DIMENSION = 2048;
export const AVATAR_ALLOWED_TYPES = ['image/png', 'image/jpeg'] as const;

export function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidUsername(value: string): boolean {
  return USERNAME_REGEX.test(value.trim());
}

export interface NameValidationResult {
  valid: boolean;
  trimmed: string;
  reason?: 'required' | 'max_length';
}

export function validatePersonName(value: string): NameValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, trimmed, reason: 'required' };
  }
  if (trimmed.length > 100) {
    return { valid: false, trimmed, reason: 'max_length' };
  }
  return { valid: true, trimmed };
}

export function validateOptionalPersonName(value: string): NameValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: true, trimmed };
  }
  if (trimmed.length > 100) {
    return { valid: false, trimmed, reason: 'max_length' };
  }
  return { valid: true, trimmed };
}

export interface PhoneValidationResult {
  valid: boolean;
  trimmed: string;
  reason?: 'required' | 'invalid_format' | 'invalid_digits_length' | 'max_length';
}

export function validatePhone(value: string): PhoneValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: true, trimmed };
  }
  if (trimmed.length > 32) {
    return { valid: false, trimmed, reason: 'max_length' };
  }
  if (!PHONE_REGEX.test(trimmed)) {
    return { valid: false, trimmed, reason: 'invalid_format' };
  }
  return { valid: true, trimmed };
}

export function validateOrderPhone(value: string): PhoneValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, trimmed, reason: 'required' };
  }
  if (trimmed.length > 32) {
    return { valid: false, trimmed, reason: 'max_length' };
  }
  if (!ORDER_PHONE_CHARS_REGEX.test(trimmed)) {
    return { valid: false, trimmed, reason: 'invalid_format' };
  }
  const strippedDigits = trimmed.replace(/^\+/, '').replace(/[\s()-]/g, '');
  if (!/^\d{7,15}$/.test(strippedDigits)) {
    return { valid: false, trimmed, reason: 'invalid_digits_length' };
  }
  return { valid: true, trimmed };
}

export interface AvatarValidationResult {
  valid: boolean;
  reason?: 'invalid_type' | 'too_large' | 'invalid_dimensions' | 'unreadable';
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image'));
    };
    img.src = objectUrl;
  });
}

export async function validateAvatarFile(file: File): Promise<AvatarValidationResult> {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
    return { valid: false, reason: 'invalid_type' };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { valid: false, reason: 'too_large' };
  }
  try {
    const { width, height } = await readImageDimensions(file);
    if (width <= 0 || height <= 0 || width > AVATAR_MAX_DIMENSION || height > AVATAR_MAX_DIMENSION) {
      return { valid: false, reason: 'invalid_dimensions' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'unreadable' };
  }
}

export interface CategoryImageValidationResult {
  valid: boolean;
  reason?: 'invalid_type' | 'too_large' | 'invalid_dimensions' | 'unreadable';
}

export const BRANCH_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BRANCH_IMAGE_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export async function validateCategoryImageFile(
  file: File,
): Promise<CategoryImageValidationResult> {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
    return { valid: false, reason: 'invalid_type' };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { valid: false, reason: 'too_large' };
  }
  try {
    const { width, height } = await readImageDimensions(file);
    if (width <= 0 || height <= 0 || width > AVATAR_MAX_DIMENSION || height > AVATAR_MAX_DIMENSION) {
      return { valid: false, reason: 'invalid_dimensions' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'unreadable' };
  }
}

export async function validateBranchImageFile(
  file: File,
): Promise<CategoryImageValidationResult> {
  if (!BRANCH_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof BRANCH_IMAGE_ALLOWED_TYPES)[number])) {
    return { valid: false, reason: 'invalid_type' };
  }
  if (file.size > BRANCH_IMAGE_MAX_BYTES) {
    return { valid: false, reason: 'too_large' };
  }
  try {
    const { width, height } = await readImageDimensions(file);
    if (width <= 0 || height <= 0) {
      return { valid: false, reason: 'invalid_dimensions' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'unreadable' };
  }
}

export function isValidLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

export interface PasswordValidationResult {
  valid: boolean;
  charLength: number;
  byteLength: number;
  reason?: 'min_length' | 'max_length' | 'max_bytes';
}

export function validatePasswordRules(password: string): PasswordValidationResult {
  const charLength = password.length;
  const byteLength = getUtf8ByteLength(password);

  if (charLength < 8) {
    return { valid: false, charLength, byteLength, reason: 'min_length' };
  }
  if (charLength > 72) {
    return { valid: false, charLength, byteLength, reason: 'max_length' };
  }
  if (byteLength > 72) {
    return { valid: false, charLength, byteLength, reason: 'max_bytes' };
  }
  return { valid: true, charLength, byteLength };
}

export function normalizeOtpDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export type RequiredProfileField = 'firstName' | 'lastName' | 'phone';

export function getMissingProfileFields(profile: {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  phone: string | null | undefined;
}): RequiredProfileField[] {
  const missing: RequiredProfileField[] = [];
  if (!profile.firstName || !profile.firstName.trim()) {
    missing.push('firstName');
  }
  if (!profile.lastName || !profile.lastName.trim()) {
    missing.push('lastName');
  }
  if (!profile.phone || !profile.phone.trim()) {
    missing.push('phone');
  }
  return missing;
}

export function isProfileComplete(profile: {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  phone: string | null | undefined;
}): boolean {
  return getMissingProfileFields(profile).length === 0;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

export function slugifyCategoryText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['‘’`ʻ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

const TELEGRAM_USERNAME_REGEX = /^@[a-zA-Z0-9_]{3,64}$/;
const TELEGRAM_URL_REGEX = /^https?:\/\/(?:t\.me|telegram\.me)\/[a-zA-Z0-9_+/?=-]{3,}$/i;
const TELEGRAM_SHORT_URL_REGEX = /^(?:t\.me|telegram\.me)\/[a-zA-Z0-9_+/?=-]{3,}$/i;
const TELEGRAM_CHAT_ID_REGEX = /^-?\d+$/;

export function isValidTelegramAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 160) return false;
  return (
    TELEGRAM_USERNAME_REGEX.test(trimmed) ||
    TELEGRAM_URL_REGEX.test(trimmed) ||
    TELEGRAM_SHORT_URL_REGEX.test(trimmed)
  );
}

export function isValidTelegramChatId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return false;
  return TELEGRAM_CHAT_ID_REGEX.test(trimmed);
}

export function generateRequestUuid(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Safe RFC4122 v4 fallback if crypto.randomUUID is unavailable in older non-HTTPS contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

