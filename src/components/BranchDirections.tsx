import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Navigation } from 'lucide-react';
import { useState } from 'react';
import type { Language } from '../types/auth';
import { extractBranchCoordinates, type PublicBranchItem } from '../types/branch';

const BranchMaps = registerPlugin<{ open(options: { url: string }): Promise<void> }>('BranchMaps');

export function BranchDirections({ branch, language }: { branch: PublicBranchItem; language: Language }) {
  const [open, setOpen] = useState(false);
  const ru = language === 'ru';
  const coordinates = extractBranchCoordinates(branch);
  const destination = coordinates && Math.abs(coordinates.latitude) <= 90 && Math.abs(coordinates.longitude) <= 180
    ? `${coordinates.latitude},${coordinates.longitude}`
    : [branch.addressLine, branch.city].map((part) => part?.trim()).filter(Boolean).join(', ') || branch.name;
  if (!destination) return null;

  const query = encodeURIComponent(destination);
  const google = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  const yandex = `https://yandex.com/maps/?text=${query}`;
  const android = Capacitor.getPlatform() === 'android';

  const openNative = async (url: string, fallback: string) => {
    try {
      await BranchMaps.open({ url });
    } catch {
      await Browser.open({ url: fallback });
    }
  };

  const optionStyle = 'inline-flex min-h-10 items-center rounded-lg border border-green-200 bg-white px-3 text-xs font-semibold text-green-900 hover:bg-green-50';

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-green-50 px-3 text-sm font-semibold text-green-900 hover:bg-green-100"
      >
        <Navigation className="size-4" aria-hidden="true" />
        {ru ? 'Открыть на карте' : 'Xaritada ochish'}
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          {[['Google Maps', google], ['Yandex Maps', yandex]].map(([label, url]) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={optionStyle}
              onClick={(event) => {
                if (!android) return;
                event.preventDefault();
                void openNative(url, url);
              }}
            >
              {label}
            </a>
          ))}
          {android && (
            <button
              type="button"
              className={optionStyle}
              onClick={() => void openNative(`geo:0,0?q=${query}`, google)}
            >
              {ru ? 'Другие карты' : 'Boshqa xaritalar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
