import { useEffect, useState } from 'react';
import { Image as ImageIcon, Tag } from 'lucide-react';
import { resolveCatalogMediaUrl } from '../services/catalogApi';

interface PublicCatalogImageProps {
  url?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallbackVariant?: 'product' | 'category' | 'brand';
  emptyLabel?: string;
}

export function PublicCatalogImage({
  url,
  alt,
  className = '',
  imgClassName = 'w-full h-full object-cover',
  fallbackVariant = 'product',
  emptyLabel,
}: PublicCatalogImageProps) {
  const resolvedUrl = resolveCatalogMediaUrl(url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedUrl]);

  if (resolvedUrl && !failed) {
    return (
      <div className={className}>
        <img
          src={resolvedUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
          className={imgClassName}
        />
      </div>
    );
  }

  return (
    <div
      className={`${className} flex flex-col items-center justify-center gap-1.5 text-slate-400 select-none`}
    >
      {fallbackVariant === 'brand' ? (
        <Tag className="w-4 h-4 text-slate-400" aria-hidden="true" />
      ) : (
        <ImageIcon
          className={fallbackVariant === 'category' ? 'w-4 h-4 text-slate-400' : 'w-8 h-8 text-slate-300'}
          aria-hidden="true"
        />
      )}
      {emptyLabel && (
        <span className="text-xs text-slate-400 text-center px-3 leading-tight">{emptyLabel}</span>
      )}
    </div>
  );
}
