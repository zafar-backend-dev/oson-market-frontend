import { useEffect, useRef, useState } from 'react';
import { Tag } from 'lucide-react';
import { brandApi } from '../services/brandApi';
import type { Language } from '../types/auth';

interface BrandLogoThumbProps {
  logoUrl?: string | null;
  accessToken: string;
  language: Language;
  alt: string;
  sizeClass?: string;
}

export function BrandLogoThumb({
  logoUrl,
  accessToken,
  language,
  alt,
  sizeClass = 'w-10 h-10',
}: BrandLogoThumbProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  const hasAccessToken = Boolean(accessToken);

  useEffect(() => {
    const clearBlob = () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };

    clearBlob();
    setFailed(false);

    if (!logoUrl || !logoUrl.trim() || !hasAccessToken) {
      setSrc(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const blob = await brandApi.fetchLogoBlob(accessToken, logoUrl, language);
        if (cancelled) return;
        if (!blob) {
          setSrc(null);
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        blobUrlRef.current = objectUrl;
        setSrc(objectUrl);
      } catch {
        if (cancelled) return;
        setSrc(null);
      }
    })();

    return () => {
      cancelled = true;
      clearBlob();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccessToken, logoUrl, language]);

  return (
    <div
      className={`${sizeClass} rounded-lg border border-[#e6e4dd] bg-white flex items-center justify-center overflow-hidden shrink-0`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-contain p-1"
        />
      ) : (
        <Tag className="w-4 h-4 text-slate-400" aria-hidden="true" />
      )}
    </div>
  );
}
