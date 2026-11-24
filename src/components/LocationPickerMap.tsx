import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { BranchLocation } from '../types/branch';
import { roundCoordinate7 } from '../utils/orderStatus';

const DEFAULT_CENTER: BranchLocation = {
  latitude: 41.311081,
  longitude: 69.240562,
};

export interface MapExtraMarker {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
  active?: boolean;
  onClick?: () => void;
}

interface LocationPickerMapProps {
  latitude?: number | null;
  longitude?: number | null;
  branchMarker?: {
    latitude: number;
    longitude: number;
    label?: string;
  } | null;
  extraMarkers?: MapExtraMarker[];
  onChange?: (location: BranchLocation) => void;
  disabled?: boolean;
  heightClass?: string;
}

function isFiniteCoord(lat?: number | null, lng?: number | null): lat is number {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

function createPinIcon(fillColor: string, ringColor: string, size: number) {
  const half = size / 2;
  return L.divIcon({
    className: 'oson-map-pin-icon',
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
      <svg width="${size}" height="${size}" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="11" fill="${ringColor}" fill-opacity="0.24"/>
        <circle cx="14" cy="14" r="7" fill="${fillColor}" stroke="#ffffff" stroke-width="2.5"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

export function LocationPickerMap({
  latitude,
  longitude,
  branchMarker,
  extraMarkers,
  onChange,
  disabled = false,
  heightClass = 'h-52 sm:h-64',
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const branchPinRef = useRef<L.Marker | null>(null);
  const extraPinsRef = useRef<Map<string, L.Marker>>(new Map());
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);

  onChangeRef.current = onChange;
  disabledRef.current = disabled;

  const hasSelected = isFiniteCoord(latitude, longitude) && typeof longitude === 'number';
  const hasBranchPin =
    Boolean(branchMarker) &&
    isFiniteCoord(branchMarker?.latitude, branchMarker?.longitude) &&
    typeof branchMarker?.longitude === 'number';

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const firstValidExtra = extraMarkers?.find((m) => isFiniteCoord(m.latitude, m.longitude));
    const initialLat = hasSelected
      ? (latitude as number)
      : hasBranchPin
        ? (branchMarker?.latitude as number)
        : firstValidExtra
          ? firstValidExtra.latitude
          : DEFAULT_CENTER.latitude;
    const initialLng = hasSelected
      ? (longitude as number)
      : hasBranchPin
        ? (branchMarker?.longitude as number)
        : firstValidExtra
          ? firstValidExtra.longitude
          : DEFAULT_CENTER.longitude;

    const map = L.map(el, {
      center: [initialLat, initialLng],
      zoom: hasSelected || hasBranchPin ? 14 : 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      if (disabledRef.current || !onChangeRef.current) return;
      onChangeRef.current({
        latitude: roundCoordinate7(event.latlng.lat),
        longitude: roundCoordinate7(event.latlng.lng),
      });
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(el);

    const initTimer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 120);

    return () => {
      window.clearTimeout(initTimer);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      selectedMarkerRef.current = null;
      branchPinRef.current = null;
      extraPinsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync selected user/branch point marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (hasSelected && typeof latitude === 'number' && typeof longitude === 'number') {
      const latLng: L.LatLngExpression = [latitude, longitude];
      if (!selectedMarkerRef.current) {
        const marker = L.marker(latLng, {
          draggable: !disabled && Boolean(onChange),
          icon: createPinIcon('#16a34a', '#16a34a', 28),
          zIndexOffset: 300,
        }).addTo(map);

        marker.on('dragend', () => {
          if (disabledRef.current || !onChangeRef.current) return;
          const pos = marker.getLatLng();
          onChangeRef.current({
            latitude: roundCoordinate7(pos.lat),
            longitude: roundCoordinate7(pos.lng),
          });
        });

        selectedMarkerRef.current = marker;
      } else {
        selectedMarkerRef.current.setLatLng(latLng);
        if (selectedMarkerRef.current.dragging) {
          if (!disabled && Boolean(onChange)) {
            selectedMarkerRef.current.dragging.enable();
          } else {
            selectedMarkerRef.current.dragging.disable();
          }
        }
      }

      map.panTo(latLng, { animate: true });
    } else if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
  }, [hasSelected, latitude, longitude, disabled, onChange]);

  // Sync optional single reference branch pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (
      hasBranchPin &&
      branchMarker &&
      typeof branchMarker.latitude === 'number' &&
      typeof branchMarker.longitude === 'number'
    ) {
      const latLng: L.LatLngExpression = [branchMarker.latitude, branchMarker.longitude];
      if (!branchPinRef.current) {
        const pin = L.marker(latLng, {
          draggable: false,
          icon: createPinIcon('#0f172a', '#64748b', 24),
          zIndexOffset: 100,
        }).addTo(map);
        if (branchMarker.label) {
          pin.bindTooltip(branchMarker.label, { direction: 'top', offset: [0, -10] });
        }
        branchPinRef.current = pin;
      } else {
        branchPinRef.current.setLatLng(latLng);
        if (branchMarker.label) {
          branchPinRef.current.setTooltipContent(branchMarker.label);
        }
      }

      if (!hasSelected) {
        map.setView(latLng, 13, { animate: true });
      }
    } else if (branchPinRef.current) {
      branchPinRef.current.remove();
      branchPinRef.current = null;
    }
  }, [hasBranchPin, branchMarker, hasSelected]);

  // Sync optional multiple branch pins (used on public Branches page)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentPins = extraPinsRef.current;
    const validMarkers = (extraMarkers ?? []).filter((m) => isFiniteCoord(m.latitude, m.longitude));
    const nextIds = new Set(validMarkers.map((m) => m.id));

    for (const [id, pin] of currentPins.entries()) {
      if (!nextIds.has(id)) {
        pin.remove();
        currentPins.delete(id);
      }
    }

    for (const entry of validMarkers) {
      const latLng: L.LatLngExpression = [entry.latitude, entry.longitude];
      const icon = entry.active
        ? createPinIcon('#0284c7', '#0284c7', 26)
        : createPinIcon('#0f172a', '#64748b', 22);
      const existing = currentPins.get(entry.id);
      if (!existing) {
        const pin = L.marker(latLng, {
          draggable: false,
          icon,
          zIndexOffset: entry.active ? 200 : 100,
        }).addTo(map);
        if (entry.label) {
          pin.bindTooltip(entry.label, { direction: 'top', offset: [0, -10] });
        }
        if (entry.onClick) {
          const handler = entry.onClick;
          pin.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);
            handler();
          });
        }
        currentPins.set(entry.id, pin);
      } else {
        existing.setLatLng(latLng);
        existing.setIcon(icon);
        existing.setZIndexOffset(entry.active ? 200 : 100);
        if (entry.label) {
          if (existing.getTooltip()) {
            existing.setTooltipContent(entry.label);
          } else {
            existing.bindTooltip(entry.label, { direction: 'top', offset: [0, -10] });
          }
        }
      }
    }
  }, [extraMarkers]);

  return (
    <div
      className={`relative isolate z-0 w-full ${heightClass} rounded-xl border border-[#e6e4dd] bg-[#f2f0ea] overflow-hidden`}
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
