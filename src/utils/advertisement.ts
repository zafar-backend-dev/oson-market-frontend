import type { Language } from '../types/auth';
import type {
  AdvertisementMedia,
  AdvertisementMediaKind,
  AdvertisementStatus,
  AdvertisementVisibility,
} from '../types/adminAdvertisement';
import { AVATAR_MAX_DIMENSION, readImageDimensions } from './validation';

export const AD_TITLE_MAX_LENGTH = 160;
export const AD_DESCRIPTION_MAX_LENGTH = 3000;
export const AD_REASON_MAX_LENGTH = 1000;
export const AD_TARGET_URL_MAX_LENGTH = 2048;
export const AD_SEARCH_MAX_LENGTH = 160;

export const AD_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const AD_IMAGE_MAX_DIMENSION = AVATAR_MAX_DIMENSION;
export const AD_VIDEO_MAX_BYTES = 25 * 1024 * 1024;
export const AD_ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg'] as const;
export const AD_ALLOWED_VIDEO_TYPES = ['video/mp4'] as const;

export interface AdvertisementMediaValidationResult {
  valid: boolean;
  kind?: AdvertisementMediaKind;
  width?: number;
  height?: number;
  reason?: 'invalid_type' | 'image_too_large' | 'video_too_large' | 'invalid_dimensions' | 'unreadable';
}

export function inferAdvertisementMediaKind(
  media: Pick<AdvertisementMedia, 'mediaType' | 'contentType' | 'url' | 'fileName'> | null | undefined,
): AdvertisementMediaKind | null {
  if (!media) return null;
  const rawType = (media.mediaType ?? '').toString().trim().toUpperCase();
  if (rawType === 'VIDEO') return 'VIDEO';
  if (rawType === 'IMAGE') return 'IMAGE';

  const mime = (media.contentType ?? '').toLowerCase();
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('image/')) return 'IMAGE';

  const hint = `${media.fileName ?? ''} ${media.url ?? ''}`.toLowerCase();
  if (/\.mp4(\?|$)/i.test(hint)) return 'VIDEO';
  if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(hint)) return 'IMAGE';
  return null;
}

function readVideoMetadata(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const dims = {
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      };
      URL.revokeObjectURL(objectUrl);
      resolve(dims);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid video'));
    };
    video.src = objectUrl;
  });
}

export async function validateAdvertisementMediaFile(
  file: File,
): Promise<AdvertisementMediaValidationResult> {
  const mime = (file.type || '').toLowerCase();

  if (AD_ALLOWED_IMAGE_TYPES.includes(mime as (typeof AD_ALLOWED_IMAGE_TYPES)[number])) {
    if (file.size > AD_IMAGE_MAX_BYTES) {
      return { valid: false, reason: 'image_too_large' };
    }
    try {
      const { width, height } = await readImageDimensions(file);
      if (
        width <= 0 ||
        height <= 0 ||
        width > AD_IMAGE_MAX_DIMENSION ||
        height > AD_IMAGE_MAX_DIMENSION
      ) {
        return { valid: false, reason: 'invalid_dimensions' };
      }
      return { valid: true, kind: 'IMAGE', width, height };
    } catch {
      return { valid: false, reason: 'unreadable' };
    }
  }

  if (AD_ALLOWED_VIDEO_TYPES.includes(mime as (typeof AD_ALLOWED_VIDEO_TYPES)[number])) {
    if (file.size > AD_VIDEO_MAX_BYTES) {
      return { valid: false, reason: 'video_too_large' };
    }
    try {
      const { width, height } = await readVideoMetadata(file);
      return { valid: true, kind: 'VIDEO', width, height };
    } catch {
      return { valid: false, reason: 'unreadable' };
    }
  }

  return { valid: false, reason: 'invalid_type' };
}

export function isValidAdvertisementTargetUrl(rawValue: string): boolean {
  return /^\/products\/[A-Za-z0-9_-]{1,210}$/.test(rawValue.trim());
}

export function getAllowedAdvertisementStatusTransitions(
  status: AdvertisementStatus,
): AdvertisementStatus[] {
  switch (status) {
    case 'DRAFT':
      return ['PUBLISHED', 'ARCHIVED'];
    case 'PUBLISHED':
      return ['PAUSED', 'ARCHIVED'];
    case 'PAUSED':
      return ['PUBLISHED', 'ARCHIVED'];
    case 'ARCHIVED':
    default:
      return [];
  }
}

export function toLocalDateTimeInputValue(isoUtc: string | null | undefined): string {
  if (!isoUtc) return '';
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromLocalDateTimeInputValue(localValue: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function getLocalTimeZoneDisplay(): string {
  try {
    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    return `${tzName} (UTC${sign}${hh}:${mm})`;
  } catch {
    return 'UTC';
  }
}

export function formatAdvertisementUtcPreview(localValue: string): string | null {
  const iso = fromLocalDateTimeInputValue(localValue);
  if (!iso) return null;
  return `${iso.slice(0, 16).replace('T', ' ')} UTC`;
}

export function formatAdvertisementDateTime(
  iso: string | null | undefined,
  language: Language,
): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatAdvertisementFileSize(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getVisibilityBadgeStyle(visibility: AdvertisementVisibility): string {
  switch (visibility) {
    case 'LIVE':
      return 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]';
    case 'SCHEDULED':
      return 'bg-sky-50 border-sky-200 text-sky-700';
    case 'ENDED':
      return 'bg-amber-50 border-amber-200 text-amber-800';
    case 'PAUSED':
      return 'bg-orange-50 border-orange-200 text-orange-800';
    case 'ARCHIVED':
      return 'bg-slate-100 border-slate-200 text-slate-600';
    case 'DRAFT':
    default:
      return 'bg-[#faf9f5] border-[#e6e4dd] text-slate-700';
  }
}

export function getStatusBadgeStyle(status: AdvertisementStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]';
    case 'PAUSED':
      return 'bg-orange-50 border-orange-200 text-orange-800';
    case 'ARCHIVED':
      return 'bg-slate-100 border-slate-200 text-slate-600';
    case 'DRAFT':
    default:
      return 'bg-[#faf9f5] border-[#e6e4dd] text-slate-700';
  }
}
