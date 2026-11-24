import type { PageMetadata } from './category';

export interface AdminBrandRecordData {
  slug: string;
  name: string;
  logoMediaId: string | null;
  active: boolean;
}

export interface AdminBrandRecord {
  id: string;
  data: AdminBrandRecordData;
  logoUrl?: string | null;
}

export interface AdminBrandListResponse {
  content: AdminBrandRecord[];
  page: PageMetadata;
}

export interface AdminBrandJsonPayload {
  name: string;
  slug: string;
  active: boolean;
  logoMediaId: string | null;
}

export interface AdminBrandMultipartPayload {
  name: string;
  slug: string;
  active: boolean;
}
