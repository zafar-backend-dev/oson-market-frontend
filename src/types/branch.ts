export type BranchStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | (string & {});

export interface BranchLocation {
  latitude: number;
  longitude: number;
}

export interface BranchPageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminBranchRecord {
  id: string;
  code: string;
  nameUz?: string | null;
  nameRu?: string | null;
  name?: string | null;
  addressLine: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  workingHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: BranchLocation | null;
  status?: BranchStatus;
  active?: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pricePerKm: number;
  imageUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminBranchListResponse {
  content: AdminBranchRecord[];
  page: BranchPageMetadata;
}

export interface AdminBranchPayload {
  code: string;
  nameUz: string;
  nameRu: string;
  addressLine: string;
  city: string;
  phone: string;
  email: string;
  workingHours: string;
  location: BranchLocation;
  active: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pricePerKm: number;
}

export interface PublicBranchItem {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  workingHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  imageUrl?: string | null;
}

export interface PublicBranchListResponse {
  content: PublicBranchItem[];
  page: BranchPageMetadata;
}

export interface DeliveryQuoteResponse {
  branchId: string;
  distanceKm: number;
  pricePerKm: number;
  deliveryPrice: number;
  currency: string;
  distanceMethod: 'STRAIGHT_LINE' | (string & {});
}

export function extractBranchCoordinates(branch: {
  latitude?: number | null;
  longitude?: number | null;
  location?: BranchLocation | null;
}): BranchLocation | null {
  const lat =
    typeof branch.latitude === 'number' && Number.isFinite(branch.latitude)
      ? branch.latitude
      : typeof branch.location?.latitude === 'number' &&
          Number.isFinite(branch.location.latitude)
        ? branch.location.latitude
        : null;

  const lng =
    typeof branch.longitude === 'number' && Number.isFinite(branch.longitude)
      ? branch.longitude
      : typeof branch.location?.longitude === 'number' &&
          Number.isFinite(branch.location.longitude)
        ? branch.location.longitude
        : null;

  if (lat === null || lng === null) return null;
  return { latitude: lat, longitude: lng };
}

export function isAdminBranchActive(branch: Pick<AdminBranchRecord, 'status' | 'active'>): boolean {
  if (typeof branch.status === 'string' && branch.status.trim()) {
    return branch.status.toUpperCase() === 'ACTIVE';
  }
  return Boolean(branch.active);
}

export function getAdminBranchDisplayName(
  branch: Pick<AdminBranchRecord, 'nameUz' | 'nameRu' | 'name' | 'code'>,
  language: 'uz' | 'ru',
): string {
  const preferred = language === 'ru' ? branch.nameRu : branch.nameUz;
  const secondary = language === 'ru' ? branch.nameUz : branch.nameRu;
  return preferred?.trim() || secondary?.trim() || branch.name?.trim() || branch.code;
}
