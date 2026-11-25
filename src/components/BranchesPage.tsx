import { BranchDirections } from './BranchDirections';
import { getCurrentLocation, locationErrorMessage, supportsLocation } from '../services/deviceLocation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Empty, Skeleton } from 'antd';
import {
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import { branchApi, resolveBranchImageUrl } from '../services/branchApi';
import {
  reverseGeocodeCoordinates,
  type ReverseGeocodeResult,
} from '../services/geocodingApi';
import type { Language, UserProfile } from '../types/auth';
import type { BranchLocation, PublicBranchItem } from '../types/branch';
import {
  formatBranchDistance,
  formatFallbackPointAddress,
  isFiniteCoordinatePair,
  sortBranchesByDistance,
} from '../utils/geo';
import { roundCoordinate7 } from '../utils/orderStatus';
import { isProfileComplete } from '../utils/validation';
import { LocationPickerMap, type MapExtraMarker } from './LocationPickerMap';
import { PublicCatalogImage } from './PublicCatalogImage';
import { SiteFooter } from './SiteFooter';
import { StoreHeader } from './StoreHeader';

interface BranchesPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile | null;
  onLogout?: () => void;
}

export function BranchesPage({
  language,
  onLanguageChange,
  profile,
  onLogout,
}: BranchesPageProps) {
  const t = translations[language];
  const tb = t.branchesPage;
  const to = t.orders;
  const profileComplete = profile ? isProfileComplete(profile) : false;

  const [branches, setBranches] = useState<PublicBranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<BranchLocation | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [focusedBranchId, setFocusedBranchId] = useState<string | null>(null);

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoNotice, setGeoNotice] = useState<{
    type: 'warning' | 'success';
    text: string;
  } | null>(null);

  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<ReverseGeocodeResult | null>(null);

  const geocodeSeqRef = useRef(0);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      geocodeAbortRef.current?.abort();
    };
  }, []);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await branchApi.listAllPublicBranches(language);
      setBranches(list);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(to.branchesLoadError);
      }
    } finally {
      setLoading(false);
    }
  }, [language, to.branchesLoadError]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const triggerReverseGeocode = useCallback(
    async (loc: BranchLocation, targetLanguage: Language) => {
      geocodeAbortRef.current?.abort();
      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      const seq = ++geocodeSeqRef.current;

      setGeocodeLoading(true);
      setGeocodeResult(null);

      try {
        const res = await reverseGeocodeCoordinates({
          latitude: loc.latitude,
          longitude: loc.longitude,
          language: targetLanguage,
          signal: controller.signal,
        });
        if (seq !== geocodeSeqRef.current || controller.signal.aborted) {
          return;
        }
        setGeocodeResult(res);
      } catch (error) {
        if (
          seq !== geocodeSeqRef.current ||
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }
        setGeocodeResult(null);
      } finally {
        if (seq === geocodeSeqRef.current && !controller.signal.aborted) {
          setGeocodeLoading(false);
        }
      }
    },
    [],
  );

  const applyUserLocation = useCallback(
    (loc: BranchLocation) => {
      if (!isFiniteCoordinatePair(loc.latitude, loc.longitude)) return;
      const rounded: BranchLocation = {
        latitude: roundCoordinate7(loc.latitude),
        longitude: roundCoordinate7(loc.longitude),
      };
      setUserLocation(rounded);
      void triggerReverseGeocode(rounded, language);
    },
    [language, triggerReverseGeocode],
  );

  useEffect(() => {
    if (!userLocation) return;
    void triggerReverseGeocode(userLocation, language);
  }, [language, userLocation, triggerReverseGeocode]);

  const handleGetBrowserLocation = () => {
    if (!supportsLocation()) {
      setGeoNotice({ type: 'warning', text: to.locationUnsupportedHint });
      setMapOpen(true);
      return;
    }

    setGeoLoading(true);
    setGeoNotice(null);
    void getCurrentLocation().then(
      (pos) => {
        setGeoLoading(false);
        const next: BranchLocation = {
          latitude: roundCoordinate7(pos.coords.latitude),
          longitude: roundCoordinate7(pos.coords.longitude),
        };
        setGeoNotice({ type: 'success', text: to.locationFoundHint });
        applyUserLocation(next);
      },
      (error: unknown) => {
        setGeoLoading(false);
        setGeoNotice({ type: 'warning', text: locationErrorMessage(error, language, to.locationPermissionDeniedHint) });
        setMapOpen(true);
      },
    );
  };

  const handleClearLocation = () => {
    geocodeAbortRef.current?.abort();
    geocodeSeqRef.current += 1;
    setUserLocation(null);
    setGeocodeResult(null);
    setGeocodeLoading(false);
    setGeoNotice(null);
  };

  const sortedBranches = useMemo(
    () => sortBranchesByDistance(branches, userLocation),
    [branches, userLocation],
  );

  const mapMarkers: MapExtraMarker[] = useMemo(
    () =>
      sortedBranches.flatMap(({ branch, coordinates }) => {
        if (!coordinates) return [];
        return [
          {
            id: branch.id,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            label: branch.name,
            active: branch.id === focusedBranchId,
            onClick: () => setFocusedBranchId(branch.id),
          },
        ];
      }),
    [sortedBranches, focusedBranchId],
  );

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Header + Location Actions */}
        <section className="rounded-xl border border-[#e6e4dd] bg-white p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display text-balance">
                {tb.title}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">{tb.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                type="primary"
                size="large"
                icon={<Crosshair className="w-4 h-4" />}
                loading={geoLoading}
                onClick={handleGetBrowserLocation}
                className="!min-h-[44px]"
              >
                {geoLoading ? tb.gettingLocationLabel : tb.getLocationButton}
              </Button>

              <Button
                size="large"
                icon={<MapPin className="w-4 h-4" />}
                onClick={() => setMapOpen((prev) => !prev)}
                className="!min-h-[44px]"
              >
                {mapOpen ? tb.hideMapButton : tb.pickOnMapButton}
              </Button>

              {userLocation && (
                <Button
                  size="large"
                  icon={<RotateCcw className="w-4 h-4" />}
                  onClick={handleClearLocation}
                  className="!min-h-[44px]"
                >
                  {tb.clearLocationButton}
                </Button>
              )}

              <Button
                size="large"
                icon={<RefreshCw className="w-4 h-4" />}
                loading={loading}
                onClick={() => void loadBranches()}
                aria-label={tb.refreshButton}
                className="!min-h-[44px]"
              />
            </div>
          </div>

          {geoNotice && (
            <Alert type={geoNotice.type} showIcon title={geoNotice.text} className="text-xs sm:text-sm" />
          )}

          {/* Reference Status Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-[#f2f0ea] text-xs sm:text-sm">
            {userLocation ? (
              <div className="space-y-0.5 min-w-0">
                <div className="font-semibold text-[#15803d]">{tb.sortedByNearestNotice}</div>
                <div className="text-slate-600 flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-slate-700">{tb.selectedPointLabel}:</span>
                  {geocodeLoading ? (
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16a34a]" />
                      <span>{tb.resolvingAddressLabel}</span>
                    </span>
                  ) : (
                    <span className="text-slate-800">
                      {geocodeResult?.fullAddress ??
                        formatFallbackPointAddress(
                          userLocation.latitude,
                          userLocation.longitude,
                          language,
                        )}
                    </span>
                  )}
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    ({userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">{tb.defaultOrderNotice}</p>
            )}

            <div className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
              {tb.totalBranchesLabel}: {branches.length}
            </div>
          </div>

          {/* Interactive Map Picker */}
          {mapOpen && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-slate-500">{tb.mapHint}</p>
              <LocationPickerMap
                latitude={userLocation?.latitude ?? null}
                longitude={userLocation?.longitude ?? null}
                extraMarkers={mapMarkers}
                onChange={applyUserLocation}
                heightClass="h-64 sm:h-80"
              />
            </div>
          )}
        </section>

        {/* Branches Grid */}
        {loading && branches.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#e6e4dd] bg-white p-5 space-y-3"
              >
                <Skeleton active avatar={{ shape: 'square', size: 64 }} paragraph={{ rows: 3 }} />
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <div className="rounded-xl border border-[#e6e4dd] bg-white p-6 space-y-4">
            <Alert type="error" showIcon title={errorMessage} />
            <Button type="primary" onClick={() => void loadBranches()} className="!min-h-[44px]">
              {t.catalog.retryButton}
            </Button>
          </div>
        ) : sortedBranches.length === 0 ? (
          <div className="rounded-xl border border-[#e6e4dd] bg-white p-10">
            <Empty
              description={
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">{tb.emptyTitle}</div>
                  <div className="text-sm text-slate-500">{tb.emptyDescription}</div>
                </div>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedBranches.map(({ branch, coordinates, distanceMeters }) => {
              const distanceText = formatBranchDistance(distanceMeters, language);
              const isFocused = branch.id === focusedBranchId;
              const services = [
                branch.pickupEnabled ? tb.pickupAvailable : null,
                branch.deliveryEnabled ? tb.deliveryAvailable : null,
              ].filter(Boolean);

              return (
                <article
                  key={branch.id}
                  onClick={() => {
                    if (coordinates) {
                      setFocusedBranchId(branch.id);
                      setMapOpen(true);
                    }
                  }}
                  className={`rounded-xl border bg-white p-5 flex flex-col justify-between gap-4 transition-colors ${
                    coordinates ? 'cursor-pointer' : ''
                  } ${
                    isFocused
                      ? 'border-[#16a34a] bg-[#f0fdf4]/40'
                      : 'border-[#e6e4dd] hover:border-[#cbd5e1]'
                  }`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3.5">
                      <div className="w-16 h-16 rounded-lg border border-[#e6e4dd] bg-[#faf9f5] overflow-hidden shrink-0">
                        <PublicCatalogImage
                          url={branch.imageUrl ? resolveBranchImageUrl(branch.imageUrl) : null}
                          alt={branch.name}
                          fallbackVariant="brand"
                          className="w-full h-full"
                          imgClassName="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <h2 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                          {branch.name}
                        </h2>
                        {services.length > 0 && (
                          <div className="text-xs font-medium text-[#15803d]">
                            {services.join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-700">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          {[branch.city, branch.addressLine].filter(Boolean).join(', ')}
                        </span>
                      </div>

                      {branch.workingHours && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {tb.workingHoursLabel}: {branch.workingHours}
                          </span>
                        </div>
                      )}

                      {branch.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a
                            href={`tel:${branch.phone.replace(/\s+/g, '')}`}
                            onClick={(ev) => ev.stopPropagation()}
                            className="hover:text-[#16a34a] transition-colors"
                          >
                            {branch.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <BranchDirections key={branch.id} branch={branch} language={language} />

                  {/* Distance Footer */}
                  <div className="pt-3 border-t border-[#f2f0ea] flex items-center justify-between gap-2 text-xs">
                    {userLocation ? (
                      <>
                        <span className="text-slate-500">{tb.distanceLabel}:</span>
                        <span
                          className={`font-semibold tabular-nums ${
                            distanceText ? 'text-[#15803d]' : 'text-slate-400'
                          }`}
                        >
                          {distanceText ?? tb.distanceUnavailable}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-500">{tb.distanceLabel}:</span>
                        <span className="text-slate-400">
                          {coordinates ? '—' : tb.distanceUnavailable}
                        </span>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter language={language} />
    </div>
  );
}
