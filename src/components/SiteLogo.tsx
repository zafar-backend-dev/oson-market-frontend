import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useSiteLogo } from '../contexts/SiteLogoContext';
import { translations } from '../i18n/translations';
import type { Language } from '../types/auth';

export type SiteLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SiteLogoProps {
  language: Language;
  size?: SiteLogoSize;
  alt?: string;
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  showIconInFallback?: boolean;
}

const IMG_SIZE_CLASSES: Record<SiteLogoSize, string> = {
  xs: 'h-6 max-w-[110px]',
  sm: 'h-7 max-w-[130px]',
  md: 'h-8 sm:h-9 max-w-[160px]',
  lg: 'h-12 max-w-[220px]',
  xl: 'max-h-24 max-w-[260px]',
};

const FALLBACK_TEXT_CLASSES: Record<SiteLogoSize, string> = {
  xs: 'text-xs font-bold text-slate-900 font-display whitespace-nowrap',
  sm: 'text-sm sm:text-base font-bold text-slate-900 font-display whitespace-nowrap',
  md: 'text-sm sm:text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap',
  lg: 'text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-display whitespace-nowrap',
  xl: 'text-lg sm:text-2xl font-bold tracking-tight text-slate-900 font-display whitespace-nowrap',
};

const FALLBACK_BADGE_CLASSES: Record<SiteLogoSize, string> = {
  xs: 'w-6 h-6 rounded-md',
  sm: 'w-7 h-7 rounded-md',
  md: 'w-8 h-8 sm:w-9 sm:h-9 rounded-lg',
  lg: 'w-10 h-10 rounded-lg',
  xl: 'w-11 h-11 rounded-xl',
};

const FALLBACK_ICON_CLASSES: Record<SiteLogoSize, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-5 h-5',
};

export function SiteLogo({
  language,
  size = 'md',
  alt,
  className = '',
  imgClassName = '',
  textClassName = '',
  showIconInFallback = true,
}: SiteLogoProps) {
  const { logoUrl } = useSiteLogo();
  const [hasError, setHasError] = useState(false);

  const brandName = translations[language].brandName;
  const resolvedAlt = alt || brandName;

  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  if (hasError) {
    return (
      <span className={`inline-flex items-center gap-2 shrink-0 ${className}`.trim()}>
        {showIconInFallback && (
          <span
            className={`${FALLBACK_BADGE_CLASSES[size]} bg-[#16a34a] text-white flex items-center justify-center shrink-0 transition-colors`}
          >
            <ShoppingBag className={FALLBACK_ICON_CLASSES[size]} />
          </span>
        )}
        <span className={textClassName || FALLBACK_TEXT_CLASSES[size]}>{brandName}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center shrink-0 ${className}`.trim()}>
      <img
        src={logoUrl}
        alt={resolvedAlt}
        onError={() => setHasError(true)}
        className={`w-auto object-contain select-none ${IMG_SIZE_CLASSES[size]} ${imgClassName}`.trim()}
      />
    </span>
  );
}
