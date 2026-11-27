import { AVATAR_MAX_SOURCE_BYTES, prepareAvatarFile } from '../utils/avatarUpload';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Alert, App as AntApp, Button, Result, Spin } from 'antd';
import { Image as ImageIcon, RefreshCw, RotateCcw, Save, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSiteLogo } from '../contexts/SiteLogoContext';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { siteLogoApi } from '../services/siteLogoApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import {
  isProfileComplete,
  readImageDimensions,
} from '../utils/validation';
import { SiteFooter } from './SiteFooter';
import { SiteLogo } from './SiteLogo';
import { StoreHeader } from './StoreHeader';

interface AdminSiteLogoPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile;
  session: AuthSession;
  onProfileUpdated: (nextProfile: UserProfile) => void;
  onUnauthorized: (message?: string) => void;
  onLogout: () => void;
}

interface BackendForbiddenState {
  endpoint?: string;
  message: string;
}

interface SelectedFileMeta {
  name: string;
  sizeBytes: number;
  width: number;
  height: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminSiteLogoPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminSiteLogoPageProps) {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const { notifyLogoUpdated } = useSiteLogo();

  const t = translations[language];
  const tl = t.adminSiteLogo;
  const isAdmin = profile.role === 'ADMIN';
  const hasAccessToken = Boolean(session.accessToken);
  const profileComplete = isProfileComplete(profile);

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<SelectedFileMeta | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewBlobRef = useRef<string | null>(null);

  const revokePreviewBlob = () => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokePreviewBlob();
    };
  }, []);

  // Re-verify profile if cached role is not ADMIN
  useEffect(() => {
    if (isAdmin) {
      setVerifyingProfile(false);
      return;
    }

    let cancelled = false;
    setVerifyingProfile(true);

    (async () => {
      try {
        const freshProfile = await authApi.getProfile(session.accessToken, language);
        if (cancelled) return;
        if (freshProfile.role !== profile.role || freshProfile.updatedAt !== profile.updatedAt) {
          onProfileUpdated(freshProfile);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint: error.endpoint || 'GET /api/profile',
              message: error.message,
            });
          }
        }
      } finally {
        if (!cancelled) {
          setVerifyingProfile(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, hasAccessToken]);

  const clearSelection = () => {
    revokePreviewBlob();
    setSelectedFile(null);
    setSelectedPreviewUrl(null);
    setSelectedMeta(null);
    setFileError(null);
    setSubmitError(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const source = input.files?.[0];
    if (!source) return;

    setFileError(null);
    setSubmitError(null);
    if (source.size > AVATAR_MAX_SOURCE_BYTES) {
      setFileError(language === 'ru' ? 'Размер файла не должен превышать 25 МБ.' : 'Rasm hajmi 25 MB dan oshmasligi kerak.');
      input.value = '';
      return;
    }

    let file: File;
    let width = 0;
    let height = 0;
    try {
      file = await prepareAvatarFile(source, true);
      const dimensions = await readImageDimensions(file).catch(() => null);
      width = dimensions?.width ?? 0;
      height = dimensions?.height ?? 0;
    } catch {
      setFileError(tl.validation.unreadable);
      return;
    } finally {
      input.value = '';
    }

    const nextBlobUrl = URL.createObjectURL(file);
    revokePreviewBlob();
    previewBlobRef.current = nextBlobUrl;

    setSelectedFile(file);
    setSelectedPreviewUrl(nextBlobUrl);
    setSelectedMeta({
      name: file.name,
      sizeBytes: file.size,
      width,
      height,
    });
  };

  const handleSave = async () => {
    if (!selectedFile || !isAdmin || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setFileError(null);

    try {
      const res = await siteLogoApi.uploadLogo(session.accessToken, selectedFile, language);
      notifyLogoUpdated(res.updatedAt);
      clearSelection();
      message.success(tl.savedSuccess);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || 'PUT /api/admin/site/logo',
            message: error.message,
          });
          return;
        }
        setSubmitError(error.message);
      } else {
        setSubmitError(tl.validation.unreadable);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {verifyingProfile ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center">
            <Spin size="large" />
            <p className="text-sm font-medium text-slate-600">{tl.checkingPermissions}</p>
          </div>
        ) : !isAdmin ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tl.userRoleBlockedTitle}
              subTitle={tl.userRoleBlockedSubtitle}
              extra={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="primary"
                    size="large"
                    onClick={onLogout}
                    className="!min-h-[44px]"
                  >
                    {tl.switchAccountButton}
                  </Button>
                  <Button
                    size="large"
                    onClick={() => navigate('/')}
                    className="!min-h-[44px]"
                  >
                    {tl.backToStore}
                  </Button>
                </div>
              }
            />
          </div>
        ) : forbiddenState ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tl.backendForbiddenTitle}
              subTitle={
                <div className="space-y-2 max-w-lg mx-auto">
                  <p>{tl.backendForbiddenSubtitle}</p>
                  {forbiddenState.message && (
                    <p className="text-sm font-medium text-slate-700">{forbiddenState.message}</p>
                  )}
                  {forbiddenState.endpoint && (
                    <div className="text-xs font-mono text-slate-500">
                      {tl.backendForbiddenEndpointLabel}: {forbiddenState.endpoint}
                    </div>
                  )}
                </div>
              }
              extra={
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/')}
                  className="!min-h-[44px]"
                >
                  {tl.backToStore}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Header Bar */}
            <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#15803d]">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>{t.brandName}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {tl.title}
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">{tl.subtitle}</p>
              </div>

              <Button
                size="large"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => notifyLogoUpdated(String(Date.now()))}
                disabled={submitting}
                className="!min-h-[44px] shrink-0"
              >
                {tl.refreshButton}
              </Button>
            </section>

            {/* Logo Management Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Current Live Site Logo */}
              <section className="lg:col-span-5 bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{tl.currentLogoTitle}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{tl.currentLogoSubtitle}</p>
                </div>

                <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] min-h-[180px] p-6 flex items-center justify-center">
                  <SiteLogo language={language} size="xl" />
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">{tl.fallbackNote}</p>
              </section>

              {/* Upload & Preview Panel */}
              <section className="lg:col-span-7 bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{tl.uploadSectionTitle}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{language === 'ru' ? 'SVG, PNG, WebP, JPEG, HEIC и другие изображения · до 25 МБ' : 'SVG, PNG, WebP, JPEG, HEIC va boshqa rasmlar · 25 MB gacha'}</p>
                </div>

                {submitError && (
                  <Alert
                    type="error"
                    showIcon
                    title={submitError}
                    className="rounded-lg text-xs sm:text-sm"
                  />
                )}

                {fileError && (
                  <Alert
                    type="error"
                    showIcon
                    title={fileError}
                    className="rounded-lg text-xs sm:text-sm"
                  />
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => void handleFileChange(e)}
                  className="hidden"
                />

                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-600">{tl.previewTitle}</div>
                  {selectedPreviewUrl && selectedMeta ? (
                    <div className="rounded-xl border border-[#86efac] bg-[#f0fdf4]/40 p-5 space-y-3">
                      <div className="min-h-[160px] flex items-center justify-center bg-white rounded-lg border border-[#e6e4dd] p-4">
                        <img
                          src={selectedPreviewUrl}
                          alt={tl.previewAlt}
                          className="max-h-28 max-w-full w-auto object-contain"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <span className="font-medium text-slate-800 truncate max-w-[260px]">
                          {selectedMeta.name}
                        </span>
                        <span className="font-mono tabular-nums text-slate-500">
                          {selectedMeta.width}×{selectedMeta.height} px ·{' '}
                          {formatFileSize(selectedMeta.sizeBytes)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#d6d3cb] bg-[#faf9f5] min-h-[160px] p-6 flex flex-col items-center justify-center text-center gap-2">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{tl.previewEmpty}</span>
                      <span className="text-xs text-slate-500">{language === 'ru' ? 'SVG, PNG, WebP, JPEG, HEIC и другие изображения · до 25 МБ' : 'SVG, PNG, WebP, JPEG, HEIC va boshqa rasmlar · 25 MB gacha'}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    size="large"
                    icon={<Upload className="w-4 h-4" />}
                    disabled={submitting}
                    onClick={() => fileInputRef.current?.click()}
                    className="!min-h-[44px]"
                  >
                    {selectedFile ? tl.changeFileButton : tl.selectFileButton}
                  </Button>

                  {selectedFile && (
                    <Button
                      size="large"
                      icon={<RotateCcw className="w-4 h-4" />}
                      disabled={submitting}
                      onClick={clearSelection}
                      className="!min-h-[44px]"
                    >
                      {tl.resetSelectionButton}
                    </Button>
                  )}

                  <Button
                    type="primary"
                    size="large"
                    icon={<Save className="w-4 h-4" />}
                    loading={submitting}
                    disabled={!selectedFile || submitting}
                    onClick={() => void handleSave()}
                    className="!min-h-[44px] sm:ml-auto"
                  >
                    {tl.saveButton}
                  </Button>
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      <SiteFooter language={language} />
    </div>
  );
}
