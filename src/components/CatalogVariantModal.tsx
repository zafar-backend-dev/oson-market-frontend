import { Modal } from 'antd';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { translations } from '../i18n/translations';
import type { Language } from '../types/auth';
import type { CatalogProduct } from '../types/catalog';
import { pickPrimaryImage } from '../utils/catalog';
import { CartQuantityControl } from './CartQuantityControl';
import { PublicCatalogImage } from './PublicCatalogImage';
import { VariantPriceDisplay } from './VariantPriceDisplay';

interface CatalogVariantModalProps {
  product: CatalogProduct | null;
  language: Language;
  onClose: () => void;
}

export function CatalogVariantModal({
  product,
  language,
  onClose,
}: CatalogVariantModalProps) {
  const tc = translations[language].catalog;

  if (!product) return null;

  const displayTitle = product.title?.trim() || product.slug;
  const productUrl = `/products/${encodeURIComponent(product.slug || product.id)}`;

  return (
    <Modal
      open={Boolean(product)}
      onCancel={onClose}
      footer={null}
      mask={{ closable: true }}
      width={560}
      title={
        <div className="pr-6">
          <div className="text-xs font-medium text-slate-500">{tc.selectVariantModalTitle}</div>
          <div className="font-display font-semibold text-slate-900 line-clamp-1">
            {displayTitle}
          </div>
        </div>
      }
    >
      <div className="space-y-3 pt-2 max-h-[65vh] overflow-y-auto pr-1">
        {product.variants.map((variant) => {
          const primaryImage = pickPrimaryImage(variant.images);
          const hasWeight =
            variant.weightGrams !== null && variant.weightGrams !== undefined;
          const dims = [
            variant.lengthMm !== null && variant.lengthMm !== undefined ? variant.lengthMm : null,
            variant.widthMm !== null && variant.widthMm !== undefined ? variant.widthMm : null,
            variant.heightMm !== null && variant.heightMm !== undefined ? variant.heightMm : null,
          ].filter((v): v is number => v !== null);

          return (
            <div
              key={variant.id}
              className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <PublicCatalogImage
                  url={primaryImage?.imageUrl}
                  alt={displayTitle}
                  fallbackVariant="product"
                  className="w-16 h-16 rounded-lg bg-white border border-[#e6e4dd] shrink-0 overflow-hidden"
                  imgClassName="w-full h-full object-contain p-1"
                />

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {variant.title || variant.sku}
                    </span>
                    {variant.defaultType && (
                      <span className="text-[11px] font-medium text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0] px-1.5 py-0.5 rounded">
                        {tc.defaultVariantLabel}
                      </span>
                    )}
                  </div>

                  {(hasWeight || dims.length > 0) && (
                    <div className="text-xs text-slate-500 tabular-nums">
                      {hasWeight && (
                        <span>
                          {variant.weightGrams} {tc.weightUnit}
                        </span>
                      )}
                      {hasWeight && dims.length > 0 && <span className="mx-1.5">·</span>}
                      {dims.length > 0 && (
                        <span>
                          {dims.join(' × ')} {tc.mmUnit}
                        </span>
                      )}
                    </div>
                  )}

                  <VariantPriceDisplay
                    price={variant.price}
                    language={language}
                    size="compact"
                  />
                </div>
              </div>

              <div className="w-full sm:w-44 shrink-0">
                <CartQuantityControl
                  product={product}
                  variant={variant}
                  language={language}
                  size="card"
                />
              </div>
            </div>
          );
        })}

        <div className="pt-2 border-t border-[#f2f0ea] flex justify-end">
          <Link
            to={productUrl}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#16a34a] hover:text-[#15803d]"
          >
            <span>{tc.viewProduct}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </Modal>
  );
}
