import type { Language } from '../types/auth';
import type { CatalogVariantPrice } from '../types/catalog';

export function isValidVariantPrice(
  price?: { amount?: number | null; regularPrice?: number | null } | null,
): price is CatalogVariantPrice {
  if (!price) return false;
  return (
    typeof price.amount === 'number' &&
    Number.isFinite(price.amount) &&
    price.amount > 0
  );
}

export function hasVariantDiscount(
  price?: { regularPrice?: number | null; salePrice?: number | null; amount?: number | null } | null,
): boolean {
  if (!price) return false;
  if (typeof price.salePrice !== 'number' || !Number.isFinite(price.salePrice) || price.salePrice <= 0) {
    return false;
  }
  if (typeof price.regularPrice !== 'number' || !Number.isFinite(price.regularPrice)) {
    return false;
  }
  return price.salePrice < price.regularPrice;
}

export function getVariantDiscountPercent(
  price?: { regularPrice?: number | null; salePrice?: number | null; amount?: number | null } | null,
): number | null {
  if (!hasVariantDiscount(price) || !price?.regularPrice || !price.salePrice) {
    return null;
  }
  const pct = Math.round(((price.regularPrice - price.salePrice) / price.regularPrice) * 100);
  return pct >= 1 ? pct : null;
}

export function formatMoneyNumber(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const hasDecimals = Math.abs(rounded % 1) > 1e-6;
  const fixed = hasDecimals ? rounded.toFixed(2) : Math.round(rounded).toString();
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart ? `${formattedInt}.${decPart}` : formattedInt;
}

export function formatPriceLabel(
  amount: number,
  language: Language,
  currency?: string | null,
): string {
  const formatted = formatMoneyNumber(amount);
  const code = (currency || 'UZS').toUpperCase();
  if (code === 'UZS') {
    return language === 'ru' ? `${formatted} сум` : `${formatted} so‘m`;
  }
  return `${formatted} ${code}`;
}

export function hasAtMostTwoDecimals(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) <= 1e-6;
}
