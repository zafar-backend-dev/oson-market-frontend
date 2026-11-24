import { useEffect, useRef, useState } from 'react';
import { Alert, Skeleton } from 'antd';
import { Film, Image as ImageIcon } from 'lucide-react';
import { translations } from '../i18n/translations';
import { adminAdvertisementApi } from '../services/adminAdvertisementApi';
import { AuthApiError } from '../services/authApi';
import { sessionManager } from '../services/sessionManager';
import type { AdvertisementMedia } from '../types/adminAdvertisement';
import type { Language } from '../types/auth';
import {
  formatAdvertisementFileSize,
  inferAdvertisementMediaKind,
} from '../utils/advertisement';

interface AuthorizedAdMediaPreviewProps {
  media: AdvertisementMedia | null | undefined;
  accessToken: string;
  language: Language;
  alt: string;
  compact?: boolean;
  emptyText?: string;
}

export function AuthorizedAdMediaPreview({
  media,
  accessToken,
  language,
  alt,
  compact = false,
  emptyText,
}: AuthorizedAdMediaPreviewProps) {
  const ta = translations[language].adminAdvertisements;
  const mediaUrl = media?.url ?? null;
  const mediaKind = inferAdvertisementMediaKind(media);

  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!mediaUrl) {
      setObjectUrl(null);
      setLoading(false);
      setErrorMessage(null);
      setNotFound(false);
      return;
    }

    let cancelled = false;
    let activeBlobUrl: string | null = null;

    setLoading(true);
    setErrorMessage(null);
    setNotFound(false);
    setObjectUrl(null);

    (async () => {
      try {
        const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
        const blob = await adminAdvertisementApi.fetchMediaBlob(token, mediaUrl, language);
        if (cancelled) return;

        if (!blob) {
          setNotFound(true);
          return;
        }

        const createdUrl = URL.createObjectURL(blob);
        activeBlobUrl = createdUrl;
        setObjectUrl(createdUrl);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(ta.drawer.mediaLoadError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [language, mediaUrl, ta.drawer.mediaLoadError]);

  if (!media || !mediaUrl) {
    return (
      <div className="rounded-lg border border-dashed border-[#d6d3cb] bg-[#faf9f5] p-4 flex items-center justify-center gap-2 text-xs text-slate-500 text-center">
        <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
        <span>{emptyText || ta.drawer.noMediaNotice}</span>
      </div>
    );
  }

  const sizeLabel = formatAdvertisementFileSize(media.fileSizeBytes);
  const dimsLabel =
    typeof media.width === 'number' &&
    typeof media.height === 'number' &&
    media.width > 0 &&
    media.height > 0
      ? `${media.width}×${media.height} px`
      : null;

  return (
    <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-3 space-y-2.5">
      <div
        className={`w-full rounded-lg border border-[#e6e4dd] bg-white overflow-hidden flex items-center justify-center ${
          compact ? 'min-h-[140px] max-h-[220px]' : 'min-h-[190px] max-h-[300px]'
        }`}
      >
        {loading ? (
          <div className="w-full p-4">
            <Skeleton.Node active className="!w-full !h-36">
              {mediaKind === 'VIDEO' ? (
                <Film className="w-7 h-7 text-slate-300" />
              ) : (
                <ImageIcon className="w-7 h-7 text-slate-300" />
              )}
            </Skeleton.Node>
          </div>
        ) : notFound ? (
          <div className="p-4 text-xs text-slate-500 text-center">
            {ta.drawer.mediaNotFound}
          </div>
        ) : errorMessage ? (
          <div className="p-3 w-full">
            <Alert type="error" showIcon title={errorMessage} className="text-xs" />
          </div>
        ) : objectUrl ? (
          mediaKind === 'VIDEO' ? (
            <video
              src={objectUrl}
              controls
              playsInline
              preload="metadata"
              className={`w-full bg-black ${compact ? 'max-h-[210px]' : 'max-h-[290px]'}`}
            />
          ) : (
            <img
              src={objectUrl}
              alt={alt}
              className={`max-w-full w-auto object-contain ${
                compact ? 'max-h-[200px]' : 'max-h-[280px]'
              }`}
            />
          )
        ) : null}
      </div>

      {(media.fileName || dimsLabel || sizeLabel) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-0.5">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 truncate max-w-[260px]">
            {mediaKind === 'VIDEO' ? (
              <Film className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className="truncate">
              {media.fileName || (mediaKind === 'VIDEO' ? ta.mediaKinds.VIDEO : ta.mediaKinds.IMAGE)}
            </span>
          </span>

          <span className="font-mono tabular-nums text-slate-500">
            {[dimsLabel, sizeLabel].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
}
