import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { branchApi } from '../services/branchApi';
import type { Language } from '../types/auth';

interface BranchImageThumbProps {
  imageUrl?: string | null;
  branchId: string;
  accessToken: string;
  language: Language;
  alt: string;
  sizeClass?: string;
}

export function BranchImageThumb({
  imageUrl,
  branchId,
  accessToken,
  language,
  alt,
  sizeClass = 'w-11 h-11',
}: BranchImageThumbProps) {
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

    if (!imageUrl || !imageUrl.trim() || !hasAccessToken) {
      setSrc(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const blob = await branchApi.fetchAdminBranchImageBlob(
          accessToken,
          imageUrl || branchId,
          language,
        );
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
  }, [hasAccessToken, imageUrl, branchId, language]);

  return (
    <div
      className={`${sizeClass} rounded-lg border border-[#e6e4dd] bg-[#faf9f5] flex items-center justify-center overflow-hidden shrink-0`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <MapPin className="w-4 h-4 text-slate-400" aria-hidden="true" />
      )}
    </div>
  );
}
