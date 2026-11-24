import type { Language } from '../types/auth';
import {
  extractBranchCoordinates,
  type BranchLocation,
} from '../types/branch';
import { roundCoordinate7 } from './orderStatus';

const EARTH_RADIUS_METERS = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;

export const MAX_ORDER_DELIVERY_ADDRESS_LENGTH = 255;

export function isFiniteCoordinatePair(
  latitude?: number | null,
  longitude?: number | null,
): boolean {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Exact unrounded straight-line Haversine distance in meters.
 * Used strictly for client-side sorting and display; delivery pricing always comes from the server quote API.
 */
export function calculateHaversineDistanceMeters(
  origin: BranchLocation,
  target: BranchLocation,
): number {
  const lat1 = origin.latitude * DEG_TO_RAD;
  const lat2 = target.latitude * DEG_TO_RAD;
  const deltaLat = (target.latitude - origin.latitude) * DEG_TO_RAD;
  const deltaLng = (target.longitude - origin.longitude) * DEG_TO_RAD;

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);

  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return EARTH_RADIUS_METERS * c;
}

export interface BranchWithDistance<T> {
  branch: T;
  coordinates: BranchLocation | null;
  distanceMeters: number | null;
}

/**
 * Sorts branches nearest-first using unrounded Haversine distance when a valid reference
 * location is provided. Branches without valid coordinates are placed at the bottom.
 * When referenceLocation is null, preserves the original API order.
 */
export function sortBranchesByDistance<
  T extends {
    id: string;
    latitude?: number | null;
    longitude?: number | null;
    location?: BranchLocation | null;
  },
>(branches: T[], referenceLocation: BranchLocation | null): BranchWithDistance<T>[] {
  const hasValidReference =
    referenceLocation !== null &&
    isFiniteCoordinatePair(referenceLocation.latitude, referenceLocation.longitude);

  const mapped = branches.map((branch, index) => {
    const coordinates = extractBranchCoordinates(branch);
    const hasCoords =
      coordinates !== null &&
      isFiniteCoordinatePair(coordinates.latitude, coordinates.longitude);

    const distanceMeters =
      hasValidReference && hasCoords && coordinates && referenceLocation
        ? calculateHaversineDistanceMeters(referenceLocation, coordinates)
        : null;

    return {
      branch,
      coordinates: hasCoords ? coordinates : null,
      distanceMeters,
      originalIndex: index,
    };
  });

  if (!hasValidReference) {
    return mapped.map(({ branch, coordinates, distanceMeters }) => ({
      branch,
      coordinates,
      distanceMeters,
    }));
  }

  mapped.sort((a, b) => {
    if (a.distanceMeters === null && b.distanceMeters === null) {
      return a.originalIndex - b.originalIndex;
    }
    if (a.distanceMeters === null) return 1;
    if (b.distanceMeters === null) return -1;
    if (a.distanceMeters !== b.distanceMeters) {
      return a.distanceMeters - b.distanceMeters;
    }
    return a.originalIndex - b.originalIndex;
  });

  return mapped.map(({ branch, coordinates, distanceMeters }) => ({
    branch,
    coordinates,
    distanceMeters,
  }));
}

/**
 * Formats distance for UI display:
 * - < 1 km -> meters (e.g. "350 m" / "350 м")
 * - >= 1 km -> km with 1 decimal comma (e.g. "2,4 km" / "2,4 км")
 */
export function formatBranchDistance(
  distanceMeters: number | null | undefined,
  language: Language,
): string | null {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return null;
  }

  const roundedMeters = Math.round(distanceMeters);
  if (roundedMeters < 1000) {
    return `${roundedMeters} ${language === 'ru' ? 'м' : 'm'}`;
  }

  const km = (distanceMeters / 1000).toFixed(1).replace('.', ',');
  return `${km} ${language === 'ru' ? 'км' : 'km'}`;
}

export function formatFallbackPointAddress(
  latitude: number,
  longitude: number,
  language: Language,
): string {
  const latStr = roundCoordinate7(latitude).toFixed(6);
  const lngStr = roundCoordinate7(longitude).toFixed(6);
  return language === 'ru'
    ? `Точка на карте (${latStr}, ${lngStr})`
    : `Xaritada tanlangan nuqta (${latStr}, ${lngStr})`;
}

export function truncateAddressMax255(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_ORDER_DELIVERY_ADDRESS_LENGTH) {
    return normalized;
  }
  return Array.from(normalized).slice(0, MAX_ORDER_DELIVERY_ADDRESS_LENGTH).join('').trim();
}

export function composeOrderDeliveryAddress(
  resolvedFullAddress: string | null | undefined,
  optionalNote: string | null | undefined,
  latitude: number,
  longitude: number,
  language: Language,
): string {
  const baseAddress =
    resolvedFullAddress?.trim() || formatFallbackPointAddress(latitude, longitude, language);
  const cleanNote = optionalNote?.trim() ?? '';

  if (!cleanNote) {
    return truncateAddressMax255(baseAddress);
  }

  const combined = `${baseAddress}, ${cleanNote}`;
  return truncateAddressMax255(combined);
}
