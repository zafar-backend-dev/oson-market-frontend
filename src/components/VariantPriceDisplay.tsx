import { translations } from '../i18n/translations';
import type { Language } from '../types/auth';
import type { CatalogVariantPrice } from '../types/catalog';
import {
  formatPriceLabel,
  getVariantDiscountPercent,
  hasVariantDiscount,
  isValidVariantPrice,
} from '../utils/price';

interface VariantPriceDisplayProps {
  price?: CatalogVariantPrice | null;
  language: Language;
  size?: 'card' | 'detail' | 'compact';
  showDiscountBadge?: boolean;
}

export function VariantPriceDisplay({
  price,
  language,
  size = 'card',
  showDiscountBadge = true,
}: VariantPriceDisplayProps) {
  const noPriceLabel = translations[language].catalog.noPriceLabel;

  if (!isValidVariantPrice(price)) {
    return (
      <span
        className={`text-slate-500 font-medium ${
          size === 'detail' ? 'text-base' : 'text-xs sm:text-sm'
        }`}
      >
        {noPriceLabel}
      </span>
    );
  }

  const discounted = hasVariantDiscount(price);
  const discountPercent = discounted ? getVariantDiscountPercent(price) : null;
  const currentLabel = formatPriceLabel(price.amount, language, price.currency);
  const regularLabel = formatPriceLabel(price.regularPrice, language, price.currency);

  if (size === 'detail') {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
          {currentLabel}
        </span>
        {discounted && (
          <div className="inline-flex items-baseline gap-2">
            <span className="text-base sm:text-lg text-slate-400 line-through tabular-nums">
              {regularLabel}
            </span>
            {showDiscountBadge && discountPercent !== null && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] text-xs font-bold tabular-nums">
                -{discountPercent}%
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (size === 'compact') {
    return (
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className="text-sm font-bold text-slate-900 tabular-nums">{currentLabel}</span>
        {discounted && (
          <span className="text-[11px] text-slate-400 line-through tabular-nums">
            {regularLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[15px] sm:text-lg font-bold text-slate-900 tabular-nums leading-tight truncate">
        {currentLabel}
      </span>
      {discounted && (
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-[11px] sm:text-xs text-slate-400 line-through tabular-nums truncate">
            {regularLabel}
          </span>
          {showDiscountBadge && discountPercent !== null && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#fef2f2] text-[#dc2626] text-[10px] sm:text-[11px] font-bold tabular-nums leading-none">
              -{discountPercent}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
