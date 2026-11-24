import type { Language } from '../types/auth';
import { isFiniteCoordinatePair } from '../utils/geo';
import { roundCoordinate7 } from '../utils/orderStatus';

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  street: string | null;
  houseNumber: string | null;
  district: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  addressLine: string | null;
  areaSummary: string | null;
  fullAddress: string | null;
  isApproximate: boolean;
  provider: 'mapbox' | 'nominatim';
}

interface ReverseGeocodeParams {
  latitude: number;
  longitude: number;
  language: Language;
  signal?: AbortSignal;
}

const MAPBOX_PUBLIC_TOKEN =
  (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined)?.trim() ?? '';

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function dedupeAddressParts(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of parts) {
    const part = cleanString(raw);
    if (!part) continue;
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(part);
  }

  return result;
}

interface MapboxV6ContextEntry {
  name?: string;
  address_number?: string;
  street_name?: string;
}

interface MapboxV6Feature {
  properties?: {
    feature_type?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    context?: {
      address?: MapboxV6ContextEntry;
      street?: MapboxV6ContextEntry;
      neighborhood?: MapboxV6ContextEntry;
      locality?: MapboxV6ContextEntry;
      place?: MapboxV6ContextEntry;
      district?: MapboxV6ContextEntry;
      region?: MapboxV6ContextEntry;
      country?: MapboxV6ContextEntry;
    };
  };
}

interface MapboxV6Response {
  features?: MapboxV6Feature[];
}

function pickBestMapboxFeature(features: MapboxV6Feature[]): MapboxV6Feature | null {
  if (!Array.isArray(features) || features.length === 0) return null;

  const priority = ['address', 'street', 'neighborhood', 'locality', 'place', 'district', 'region'];
  for (const type of priority) {
    const match = features.find((f) => f.properties?.feature_type === type);
    if (match) return match;
  }

  return features[0];
}

function parseMapboxV6Feature(
  feature: MapboxV6Feature,
  latitude: number,
  longitude: number,
): ReverseGeocodeResult | null {
  const props = feature.properties;
  if (!props) return null;

  const ctx = props.context ?? {};
  const featureType = props.feature_type ?? '';

  const houseNumber = cleanString(ctx.address?.address_number);
  const street =
    cleanString(ctx.street?.name) ??
    cleanString(ctx.address?.street_name) ??
    (featureType === 'street' ? cleanString(props.name) : null);

  const district =
    cleanString(ctx.neighborhood?.name) ??
    cleanString(ctx.locality?.name) ??
    cleanString(ctx.district?.name) ??
    (featureType === 'neighborhood' || featureType === 'locality' || featureType === 'district'
      ? cleanString(props.name)
      : null);

  const city =
    cleanString(ctx.place?.name) ??
    cleanString(ctx.locality?.name) ??
    (featureType === 'place' ? cleanString(props.name) : null);

  const region =
    cleanString(ctx.region?.name) ??
    (featureType === 'region' ? cleanString(props.name) : null);

  const country =
    cleanString(ctx.country?.name) ??
    (featureType === 'country' ? cleanString(props.name) : null);

  // Build street + house number cleanly without ever inventing a missing house number
  const addressLineParts = dedupeAddressParts([
    street,
    houseNumber,
  ]);

  let addressLine: string | null =
    addressLineParts.length > 0 ? addressLineParts.join(', ') : null;

  if (!addressLine && (featureType === 'address' || featureType === 'neighborhood' || featureType === 'locality')) {
    addressLine = cleanString(props.name);
  }
  if (!addressLine) {
    addressLine = district ?? city ?? region;
  }

  const areaParts = dedupeAddressParts([
    district,
    city,
    region,
    country,
  ]);
  const areaSummary = areaParts.length > 0 ? areaParts.join(', ') : null;

  const fullParts = dedupeAddressParts([
    addressLine,
    district,
    city,
    region,
    country,
  ]);
  const fullAddress =
    fullParts.length > 0
      ? fullParts.join(', ')
      : cleanString(props.full_address) ?? cleanString(props.place_formatted);

  if (!fullAddress && !addressLine && !city) {
    return null;
  }

  return {
    latitude,
    longitude,
    street,
    houseNumber,
    district,
    city,
    region,
    country,
    addressLine,
    areaSummary,
    fullAddress,
    isApproximate: !houseNumber,
    provider: 'mapbox',
  };
}

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  path?: string;
  residential?: string;
  square?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  borough?: string;
  county?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state_district?: string;
  state?: string;
  region?: string;
  province?: string;
  country?: string;
  amenity?: string;
  building?: string;
  shop?: string;
  office?: string;
}

interface NominatimResponse {
  display_name?: string;
  name?: string;
  address?: NominatimAddress;
}

function parseNominatimResponse(
  data: NominatimResponse,
  latitude: number,
  longitude: number,
): ReverseGeocodeResult | null {
  const addr = data.address;
  if (!addr && !cleanString(data.display_name)) {
    return null;
  }

  const street =
    cleanString(addr?.road) ??
    cleanString(addr?.pedestrian) ??
    cleanString(addr?.footway) ??
    cleanString(addr?.residential) ??
    cleanString(addr?.path) ??
    cleanString(addr?.square);

  const houseNumber = cleanString(addr?.house_number);

  const district =
    cleanString(addr?.neighbourhood) ??
    cleanString(addr?.suburb) ??
    cleanString(addr?.city_district) ??
    cleanString(addr?.quarter) ??
    cleanString(addr?.borough) ??
    cleanString(addr?.county);

  const city =
    cleanString(addr?.city) ??
    cleanString(addr?.town) ??
    cleanString(addr?.village) ??
    cleanString(addr?.municipality) ??
    cleanString(addr?.state_district);

  const region =
    cleanString(addr?.state) ??
    cleanString(addr?.region) ??
    cleanString(addr?.province);

  const country = cleanString(addr?.country);

  const poiFallback =
    cleanString(addr?.amenity) ??
    cleanString(addr?.building) ??
    cleanString(addr?.shop) ??
    cleanString(addr?.office) ??
    cleanString(data.name);

  let addressLine: string | null = null;
  if (street && houseNumber) {
    addressLine = `${street}, ${houseNumber}`;
  } else if (street) {
    addressLine = street;
  } else if (poiFallback) {
    addressLine = poiFallback;
  } else if (district) {
    addressLine = district;
  } else if (city) {
    addressLine = city;
  }

  const areaParts = dedupeAddressParts([district, city, region, country]);
  const areaSummary = areaParts.length > 0 ? areaParts.join(', ') : null;

  const fullParts = dedupeAddressParts([
    addressLine,
    district,
    city,
    region,
    country,
  ]);
  const fullAddress =
    fullParts.length > 0 ? fullParts.join(', ') : cleanString(data.display_name);

  if (!fullAddress && !addressLine && !city) {
    return null;
  }

  return {
    latitude,
    longitude,
    street,
    houseNumber,
    district,
    city,
    region,
    country,
    addressLine,
    areaSummary,
    fullAddress,
    isApproximate: !houseNumber,
    provider: 'nominatim',
  };
}

async function fetchMapboxReverse(
  latitude: number,
  longitude: number,
  language: Language,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult | null> {
  if (!MAPBOX_PUBLIC_TOKEN) return null;

  const params = new URLSearchParams({
    longitude: String(longitude),
    latitude: String(latitude),
    permanent: 'true',
    language: language === 'ru' ? 'ru' : 'uz',
    types: 'address,street,neighborhood,locality,place,district,region',
    access_token: MAPBOX_PUBLIC_TOKEN,
  });

  const response = await fetch(
    `https://api.mapbox.com/search/geocode/v6/reverse?${params.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as MapboxV6Response;
  const best = pickBestMapboxFeature(data.features ?? []);
  if (!best) return null;

  return parseMapboxV6Feature(best, latitude, longitude);
}

async function fetchNominatimReverse(
  latitude: number,
  longitude: number,
  language: Language,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '18',
    addressdetails: '1',
    'accept-language': language === 'ru' ? 'ru,uz,en' : 'uz,ru,en',
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status ${response.status}`);
  }

  const data = (await response.json()) as NominatimResponse;
  const parsed = parseNominatimResponse(data, latitude, longitude);
  if (!parsed) {
    throw new Error('Reverse geocoding returned no address details');
  }

  return parsed;
}

/**
 * Shared reverse geocoding entry point for Checkout and Admin Branch forms.
 * Uses Mapbox Geocoding v6 (`permanent=true`) when VITE_MAPBOX_ACCESS_TOKEN is configured,
 * falling back to OpenStreetMap Nominatim when no token is provided or if Mapbox yields no match.
 */
export async function reverseGeocodeCoordinates({
  latitude,
  longitude,
  language,
  signal,
}: ReverseGeocodeParams): Promise<ReverseGeocodeResult> {
  if (!isFiniteCoordinatePair(latitude, longitude)) {
    throw new Error('Invalid coordinates for reverse geocoding');
  }

  const lat = roundCoordinate7(latitude);
  const lng = roundCoordinate7(longitude);

  if (MAPBOX_PUBLIC_TOKEN) {
    try {
      const mapboxResult = await fetchMapboxReverse(lat, lng, language, signal);
      if (mapboxResult) {
        return mapboxResult;
      }
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
      // Fall back to Nominatim if Mapbox request failed temporarily
    }
  }

  return fetchNominatimReverse(lat, lng, language, signal);
}
