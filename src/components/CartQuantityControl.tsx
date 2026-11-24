import type { MouseEvent } from 'react';
import { App as AntApp } from 'antd';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import {
  MAX_CART_ITEM_QUANTITY,
  MAX_CART_VARIANTS,
  useCart,
} from '../contexts/CartContext';
import { translations } from '../i18n/translations';
import type { Language } from '../types/auth';
import type { CatalogProduct, CatalogVariant } from '../types/catalog';
import { isValidVariantPrice } from '../utils/price';

interface CartQuantityControlProps {
  product: CatalogProduct;
  variant: CatalogVariant | null;
  language: Language;
  size?: 'card' | 'detail';
  stopPropagation?: boolean;
}

export function CartQuantityControl({
  product,
  variant,
  language,
  size = 'card',
  stopPropagation = false,
}: CartQuantityControlProps) {
  const { message } = AntApp.useApp();
  const { items, getQuantity, addVariant, increment, decrement } = useCart();
  const t = translations[language];
  const tc = t.catalog;

  const hasPrice = Boolean(variant && isValidVariantPrice(variant.price));
  const quantity = variant ? getQuantity(variant.id) : 0;
  const maxQuantityReached = quantity >= MAX_CART_ITEM_QUANTITY;
  const maxVariantsReached =
    Boolean(variant) && quantity === 0 && items.length >= MAX_CART_VARIANTS;

  const blockEvent = (e: MouseEvent) => {
    if (!stopPropagation) return;
    e.preventDefault();
    e.stopPropagation();
  };

  if (quantity > 0 && variant) {
    return (
      <div
        onClick={blockEvent}
        className={`inline-flex items-center justify-between rounded-lg border border-[#16a34a] bg-[#f0fdf4] overflow-hidden select-none ${
          size === 'detail' ? 'h-11 sm:h-12 min-w-[148px] sm:min-w-[164px]' : 'h-10 sm:h-11 w-full'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            blockEvent(e);
            decrement(variant.id);
          }}
          aria-label={tc.decreaseQuantityLabel}
          className="h-full min-w-[38px] sm:min-w-[44px] px-2 sm:px-3 inline-flex items-center justify-center text-[#15803d] hover:bg-[#dcfce7] transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span className="px-2 sm:px-3 text-sm sm:text-base font-bold text-[#15803d] tabular-nums">
          {quantity}
        </span>

        <button
          type="button"
          disabled={maxQuantityReached}
          onClick={(e) => {
            blockEvent(e);
            if (maxQuantityReached) {
              message.warning(t.orders.itemQuantityLimitError);
              return;
            }
            increment(variant.id);
          }}
          aria-label={tc.increaseQuantityLabel}
          className={`h-full min-w-[38px] sm:min-w-[44px] px-2 sm:px-3 inline-flex items-center justify-center transition-colors ${
            maxQuantityReached
              ? 'text-slate-400 cursor-not-allowed'
              : 'text-[#15803d] hover:bg-[#dcfce7] cursor-pointer'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!hasPrice || !variant || maxVariantsReached}
      onClick={(e) => {
        blockEvent(e);
        if (!variant || !hasPrice) return;
        const added = addVariant({ product, variant });
        if (!added) {
          message.warning(t.orders.itemsLimitError);
        }
      }}
      className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
        size === 'detail'
          ? 'h-11 sm:h-12 px-4 sm:px-5 min-w-[148px] sm:min-w-[164px] text-sm'
          : 'h-10 sm:h-11 px-2.5 sm:px-4 w-full text-xs sm:text-sm'
      } ${
        hasPrice && variant && !maxVariantsReached
          ? 'bg-[#16a34a] hover:bg-[#15803d] text-white cursor-pointer'
          : 'bg-[#f2f0ea] text-slate-400 border border-[#e6e4dd] cursor-not-allowed'
      }`}
    >
      <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
      <span className="truncate">{tc.addToCart}</span>
    </button>
  );
}
