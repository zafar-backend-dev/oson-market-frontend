export type AdvertisementChannel = 'WEB' | 'APP';

export type AdvertisementStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';

export type AdvertisementVisibility =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'LIVE'
  | 'ENDED'
  | 'PAUSED'
  | 'ARCHIVED';

export type AdvertisementMediaKind = 'IMAGE' | 'VIDEO';

export interface AdvertisementLocaleContent {
  title: string;
  description: string | null;
}

export interface AdvertisementMedia {
  mediaType: AdvertisementMediaKind | string | null;
  contentType: string | null;
  url: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  width: number | null;
  height: number | null;
}

export interface AdminAdvertisement {
  id: string;
  revision: number;
  status: AdvertisementStatus;
  uz: AdvertisementLocaleContent;
  ru: AdvertisementLocaleContent;
  channels: AdvertisementChannel[];
  targetUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  media: AdvertisementMedia | null;
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
}

export interface AdminAdvertisementItem {
  advertisement: AdminAdvertisement;
  visibility: AdvertisementVisibility;
}

export interface AdminAdvertisementPageMetadata {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminAdvertisementListResponse {
  content: AdminAdvertisementItem[];
  page: AdminAdvertisementPageMetadata;
}

export interface AdminAdvertisementsListParams {
  q?: string;
  channel?: AdvertisementChannel;
  status?: AdvertisementStatus;
  page?: number;
  size?: number;
}

export interface AdminAdvertisementPayload {
  uz: {
    title: string;
    description: string | null;
  };
  ru: {
    title: string;
    description: string | null;
  };
  channels: AdvertisementChannel[];
  targetUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
}

export interface UpdateAdvertisementStatusPayload {
  expectedRevision: number;
  status: AdvertisementStatus;
  reason: string | null;
}

export interface AdminAdvertisementSnapshot {
  revision: number | null;
  status: AdvertisementStatus | null;
  uz: AdvertisementLocaleContent;
  ru: AdvertisementLocaleContent;
  channels: AdvertisementChannel[];
  targetUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number | null;
  media: AdvertisementMedia | null;
}

export interface AdminAdvertisementHistoryEntry {
  id: string;
  revision: number;
  action: string;
  actorId: string | null;
  changedAt: string | null;
  reason: string | null;
  snapshot: AdminAdvertisementSnapshot;
}

export interface AdminAdvertisementHistoryResponse {
  content: AdminAdvertisementHistoryEntry[];
  page: AdminAdvertisementPageMetadata;
}
