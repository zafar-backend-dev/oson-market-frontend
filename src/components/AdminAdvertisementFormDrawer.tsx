import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Alert, App as AntApp, Button, Drawer, Input, Skeleton } from 'antd';
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Film,
  History,
  Image as ImageIcon,
  PauseCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Upload,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { adminAdvertisementApi } from '../services/adminAdvertisementApi';
import { AuthApiError } from '../services/authApi';
import { sessionManager } from '../services/sessionManager';
import type {
  AdminAdvertisementItem,
  AdminAdvertisementPayload,
  AdvertisementMediaKind,
  AdvertisementStatus,
} from '../types/adminAdvertisement';
import type { Language } from '../types/auth';
import {
  AD_DESCRIPTION_MAX_LENGTH,
  AD_TITLE_MAX_LENGTH,
  formatAdvertisementFileSize,
  formatAdvertisementUtcPreview,
  fromLocalDateTimeInputValue,
  getAllowedAdvertisementStatusTransitions,
  getLocalTimeZoneDisplay,
  getStatusBadgeStyle,
  getVisibilityBadgeStyle,
  isValidAdvertisementTargetUrl,
  toLocalDateTimeInputValue,
  validateAdvertisementMediaFile,
} from '../utils/advertisement';
import { AuthorizedAdMediaPreview } from './AuthorizedAdMediaPreview';

type FormFieldKey =
  | 'uzTitle'
  | 'uzDescription'
  | 'ruTitle'
  | 'ruDescription'
  | 'channels'
  | 'targetUrl'
  | 'startsAt'
  | 'endsAt'
  | 'sortOrder'
  | 'file';

interface LocalMediaMeta {
  name: string;
  sizeBytes: number;
  kind: AdvertisementMediaKind;
  width?: number;
  height?: number;
}

interface AdminAdvertisementFormDrawerProps {
  open: boolean;
  advertisementId: string | null;
  language: Language;
  accessToken: string;
  statusBusy: boolean;
  onClose: () => void;
  onSaved: (item: AdminAdvertisementItem, mode: 'create' | 'update') => void;
  onRequestPublish: (item: AdminAdvertisementItem) => Promise<AdminAdvertisementItem | null>;
  onRequestPause: (item: AdminAdvertisementItem) => Promise<AdminAdvertisementItem | null>;
  onRequestArchive: (item: AdminAdvertisementItem) => void;
  onOpenHistory: (item: AdminAdvertisementItem) => void;
  onUnauthorized: (message?: string) => void;
  onForbidden: (endpoint: string, message: string) => void;
  externalUpdatedItem: AdminAdvertisementItem | null;
}

export function AdminAdvertisementFormDrawer({
  open,
  advertisementId,
  language,
  accessToken,
  statusBusy,
  onClose,
  onSaved,
  onRequestPublish,
  onRequestPause,
  onRequestArchive,
  onOpenHistory,
  onUnauthorized,
  onForbidden,
  externalUpdatedItem,
}: AdminAdvertisementFormDrawerProps) {
  const { message } = AntApp.useApp();
  const ta = translations[language].adminAdvertisements;
  const td = ta.drawer;
  const tv = ta.validation;

  const isEditMode = Boolean(advertisementId);
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const detailSeqRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const localBlobUrlRef = useRef<string | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadedItem, setLoadedItem] = useState<AdminAdvertisementItem | null>(null);

  // Form fields
  const [uzTitle, setUzTitle] = useState('');
  const [uzDescription, setUzDescription] = useState('');
  const [ruTitle, setRuTitle] = useState('');
  const [ruDescription, setRuDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');
  const [sortOrderInput, setSortOrderInput] = useState('0');

  // Selected local media file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [localMediaMeta, setLocalMediaMeta] = useState<LocalMediaMeta | null>(null);

  // Submission & conflict state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormFieldKey, string>>>({});
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [serverReloadedNotice, setServerReloadedNotice] = useState(false);

  const timezoneDisplay = getLocalTimeZoneDisplay();

  const revokeLocalBlobUrl = useCallback(() => {
    if (localBlobUrlRef.current) {
      URL.revokeObjectURL(localBlobUrlRef.current);
      localBlobUrlRef.current = null;
    }
  }, []);

  const clearLocalFileSelection = useCallback(() => {
    revokeLocalBlobUrl();
    setSelectedFile(null);
    setLocalPreviewUrl(null);
    setLocalMediaMeta(null);
  }, [revokeLocalBlobUrl]);

  const populateFieldsFromItem = useCallback((item: AdminAdvertisementItem) => {
    const ad = item.advertisement;
    setUzTitle(ad.uz.title ?? '');
    setUzDescription(ad.uz.description ?? '');
    setRuTitle(ad.ru.title ?? '');
    setRuDescription(ad.ru.description ?? '');
    setTargetUrl(ad.targetUrl ?? '');
    setStartsAtLocal(toLocalDateTimeInputValue(ad.startsAt));
    setEndsAtLocal(toLocalDateTimeInputValue(ad.endsAt));
    setSortOrderInput(String(ad.sortOrder ?? 0));
  }, []);

  const resetForm = useCallback(() => {
    clearLocalFileSelection();
    setLoadedItem(null);
    setDetailError(null);
    setUzTitle('');
    setUzDescription('');
    setRuTitle('');
    setRuDescription('');
    setTargetUrl('');
    setStartsAtLocal('');
    setEndsAtLocal('');
    setSortOrderInput('0');
    setSubmitError(null);
    setFieldErrors({});
    setConflictMessage(null);
    setServerReloadedNotice(false);
  }, [clearLocalFileSelection]);

  useEffect(() => {
    return () => {
      revokeLocalBlobUrl();
    };
  }, [revokeLocalBlobUrl]);

  const fetchDetail = useCallback(
    async (id: string, applyFields: boolean) => {
      const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
      if (!token) return;

      const seq = ++detailSeqRef.current;
      if (applyFields) {
        setDetailLoading(true);
      } else {
        setLoadingLatest(true);
      }
      setDetailError(null);

      try {
        const item = await adminAdvertisementApi.getAdvertisementById(token, id, language);
        if (seq !== detailSeqRef.current) return;

        setLoadedItem(item);
        if (applyFields) {
          populateFieldsFromItem(item);
        } else {
          setConflictMessage(null);
          setSubmitError(null);
          setServerReloadedNotice(true);
          onSaved(item, 'update');
        }
      } catch (error) {
        if (seq !== detailSeqRef.current) return;
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            onClose();
            onForbidden(error.endpoint || `GET /api/admin/advertisements/${id}`, error.message);
            return;
          }
          const msg =
            error.status === 404
              ? error.message || ta.notifications.notFoundError
              : error.message;
          if (applyFields) {
            setDetailError(msg);
          } else {
            setSubmitError(msg);
          }
        } else if (applyFields) {
          setDetailError(ta.notifications.loadDetailError);
        }
      } finally {
        if (seq === detailSeqRef.current) {
          setDetailLoading(false);
          setLoadingLatest(false);
        }
      }
    },
    [
      language,
      onClose,
      onForbidden,
      onSaved,
      onUnauthorized,
      populateFieldsFromItem,
      ta.notifications.loadDetailError,
      ta.notifications.notFoundError,
    ],
  );

  // Sync external status updates (e.g. from archive confirmation modal) into open drawer
  useEffect(() => {
    if (
      open &&
      externalUpdatedItem &&
      loadedItem &&
      externalUpdatedItem.advertisement.id === loadedItem.advertisement.id &&
      externalUpdatedItem.advertisement.revision >= loadedItem.advertisement.revision
    ) {
      setLoadedItem(externalUpdatedItem);
      setConflictMessage(null);
    }
  }, [externalUpdatedItem, loadedItem, open]);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    if (!advertisementId) {
      resetForm();
      return;
    }

    clearLocalFileSelection();
    setSubmitError(null);
    setFieldErrors({});
    setConflictMessage(null);
    setServerReloadedNotice(false);
    void fetchDetail(advertisementId, true);
  }, [open, advertisementId, resetForm, clearLocalFileSelection, fetchDetail]);

  const isArchived = loadedItem?.advertisement.status === 'ARCHIVED';
  const busy = submitting || statusBusy || loadingLatest;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isArchived) return;

    setFieldErrors((prev) => ({ ...prev, file: undefined }));
    setSubmitError(null);

    const validation = await validateAdvertisementMediaFile(file);
    if (!validation.valid || !validation.kind) {
      let errMsg = tv.mediaUnreadable;
      if (validation.reason === 'invalid_type') errMsg = tv.mediaInvalidType;
      else if (validation.reason === 'image_too_large') errMsg = tv.mediaImageTooLarge;
      else if (validation.reason === 'video_too_large') errMsg = tv.mediaVideoTooLarge;
      else if (validation.reason === 'invalid_dimensions') errMsg = tv.mediaInvalidDimensions;
      setFieldErrors((prev) => ({ ...prev, file: errMsg }));
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    revokeLocalBlobUrl();
    localBlobUrlRef.current = nextUrl;

    setSelectedFile(file);
    setLocalPreviewUrl(nextUrl);
    setLocalMediaMeta({
      name: file.name,
      sizeBytes: file.size,
      kind: validation.kind,
      width: validation.width,
      height: validation.height,
    });
  };

  const mapServerFieldErrors = (fields: string[], serverMsg: string) => {
    const next: Partial<Record<FormFieldKey, string>> = {};
    for (const rawField of fields) {
      const f = rawField.toLowerCase();
      if (f.includes('uz.title') || f === 'uztitle') next.uzTitle = serverMsg;
      else if (f.includes('uz.description')) next.uzDescription = serverMsg;
      else if (f.includes('ru.title') || f === 'rutitle') next.ruTitle = serverMsg;
      else if (f.includes('ru.description')) next.ruDescription = serverMsg;
      else if (f.includes('channel')) next.channels = serverMsg;
      else if (f.includes('targeturl') || f.includes('target_url')) next.targetUrl = serverMsg;
      else if (f.includes('starts')) next.startsAt = serverMsg;
      else if (f.includes('ends')) next.endsAt = serverMsg;
      else if (f.includes('sortorder') || f.includes('sort_order')) next.sortOrder = serverMsg;
      else if (f.includes('file') || f.includes('media')) next.file = serverMsg;
    }
    if (Object.keys(next).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...next }));
    }
  };

  const validateAndBuildPayload = (): AdminAdvertisementPayload | null => {
    const errors: Partial<Record<FormFieldKey, string>> = {};

    const cleanUzTitle = uzTitle.trim();
    if (!cleanUzTitle) errors.uzTitle = tv.uzTitleRequired;
    else if (cleanUzTitle.length > AD_TITLE_MAX_LENGTH) errors.uzTitle = tv.uzTitleMax;

    const cleanUzDesc = uzDescription.trim();
    if (cleanUzDesc.length > AD_DESCRIPTION_MAX_LENGTH) {
      errors.uzDescription = tv.uzDescriptionMax;
    }

    const cleanRuTitle = ruTitle.trim();
    if (!cleanRuTitle) errors.ruTitle = tv.ruTitleRequired;
    else if (cleanRuTitle.length > AD_TITLE_MAX_LENGTH) errors.ruTitle = tv.ruTitleMax;

    const cleanRuDesc = ruDescription.trim();
    if (cleanRuDesc.length > AD_DESCRIPTION_MAX_LENGTH) {
      errors.ruDescription = tv.ruDescriptionMax;
    }


    const cleanTargetUrl = targetUrl.trim();
    if (!isValidAdvertisementTargetUrl(cleanTargetUrl)) {
      errors.targetUrl = language === 'ru' ? 'Укажите путь /products/идентификатор.' : '/products/mahsulot-id ko‘rinishida kiriting.';
    }

    const startsIso = fromLocalDateTimeInputValue(startsAtLocal);
    const endsIso = fromLocalDateTimeInputValue(endsAtLocal);
    if (startsIso && endsIso) {
      if (new Date(endsIso).getTime() <= new Date(startsIso).getTime()) {
        errors.endsAt = tv.endsAfterStarts;
      }
    }

    const parsedSort = Number(sortOrderInput.trim());
    if (
      sortOrderInput.trim() === '' ||
      !Number.isFinite(parsedSort) ||
      !Number.isInteger(parsedSort) ||
      parsedSort < 0
    ) {
      errors.sortOrder = tv.sortOrderInvalid;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return null;
    }

    return {
      uz: {
        title: cleanUzTitle,
        description: cleanUzDesc ? cleanUzDesc : null,
      },
      ru: {
        title: cleanRuTitle,
        description: cleanRuDesc ? cleanRuDesc : null,
      },
      channels: ['APP'],
      targetUrl: cleanTargetUrl ? cleanTargetUrl : null,
      startsAt: startsIso,
      endsAt: endsIso,
      sortOrder: parsedSort,
    };
  };

  const handleSave = async () => {
    if (busy || isArchived) return;
    setSubmitError(null);
    setConflictMessage(null);
    setServerReloadedNotice(false);

    const payload = validateAndBuildPayload();
    if (!payload) return;

    const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
    if (!token) return;

    setSubmitting(true);
    try {
      if (isEditMode && loadedItem) {
        const updated = await adminAdvertisementApi.updateAdvertisement(
          token,
          loadedItem.advertisement.id,
          loadedItem.advertisement.revision,
          payload,
          selectedFile,
          language,
        );
        setLoadedItem(updated);
        clearLocalFileSelection();
        populateFieldsFromItem(updated);
        onSaved(updated, 'update');
        message.success(ta.notifications.updatedSuccess);
        onClose();
      } else {
        const created = await adminAdvertisementApi.createAdvertisement(
          token,
          payload,
          selectedFile,
          language,
        );
        clearLocalFileSelection();
        onSaved(created, 'create');
        message.success(ta.notifications.createdSuccess);
        onClose();
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          onClose();
          onForbidden(
            error.endpoint ||
              (isEditMode && loadedItem
                ? `PUT /api/admin/advertisements/${loadedItem.advertisement.id}`
                : 'POST /api/admin/advertisements'),
            error.message,
          );
          return;
        }
        if (error.status === 409) {
          // Keep user's form inputs and selectedFile untouched; show server message + reload button
          setConflictMessage(error.message);
          return;
        }
        if (error.status === 413) {
          setFieldErrors((prev) => ({ ...prev, file: error.message }));
          setSubmitError(error.message);
          return;
        }
        if (error.fields.length > 0) {
          mapServerFieldErrors(error.fields, error.message);
        }
        setSubmitError(error.message);
      } else {
        setSubmitError(ta.notifications.loadDetailError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusButtonClick = async (targetStatus: AdvertisementStatus) => {
    if (!loadedItem || busy || isArchived) return;
    setSubmitError(null);
    setConflictMessage(null);

    if (targetStatus === 'ARCHIVED') {
      onRequestArchive(loadedItem);
      return;
    }

    if (targetStatus === 'PUBLISHED') {
      const result = await onRequestPublish(loadedItem);
      if (result) {
        setLoadedItem(result);
        setConflictMessage(null);
      }
      return;
    }

    if (targetStatus === 'PAUSED') {
      const result = await onRequestPause(loadedItem);
      if (result) {
        setLoadedItem(result);
        setConflictMessage(null);
      }
    }
  };

  const allowedTransitions = loadedItem
    ? getAllowedAdvertisementStatusTransitions(loadedItem.advertisement.status)
    : [];

  const startsUtcPreview = formatAdvertisementUtcPreview(startsAtLocal);
  const endsUtcPreview = formatAdvertisementUtcPreview(endsAtLocal);

  return (
    <Drawer
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      mask={{ closable: !busy }}
      size="large"
      title={
        <div className="pr-4 space-y-1">
          <div className="font-display font-semibold text-slate-900">
            {!isEditMode
              ? td.createTitle
              : isArchived
                ? td.viewArchivedTitle
                : td.editTitle}
          </div>
          {loadedItem && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded border font-semibold ${getVisibilityBadgeStyle(
                  loadedItem.visibility,
                )}`}
              >
                {ta.visibilities[loadedItem.visibility]}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded border font-medium ${getStatusBadgeStyle(
                  loadedItem.advertisement.status,
                )}`}
              >
                {ta.editStatusPrefix}: {ta.statuses[loadedItem.advertisement.status]}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#faf9f5] border border-[#e6e4dd] font-mono text-slate-600 tabular-nums">
                {ta.revisionPrefix}: v{loadedItem.advertisement.revision}
              </span>
            </div>
          )}
        </div>
      }
      extra={
        loadedItem ? (
          <Button
            size="small"
            icon={<History className="w-3.5 h-3.5" />}
            onClick={() => onOpenHistory(loadedItem)}
          >
            {ta.actions.history}
          </Button>
        ) : null
      }
      footer={
        detailLoading || detailError ? null : (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {isEditMode && loadedItem && !isArchived ? (
              <div className="flex flex-wrap items-center gap-2">
                {allowedTransitions.includes('PUBLISHED') && (
                  <Button
                    icon={<Send className="w-3.5 h-3.5" />}
                    disabled={busy}
                    loading={statusBusy}
                    onClick={() => void handleStatusButtonClick('PUBLISHED')}
                    className="!min-h-[40px]"
                  >
                    {language === 'ru' ? 'Отправить push' : 'Bildirishnoma yuborish'}
                  </Button>
                )}
                {allowedTransitions.includes('PAUSED') && (
                  <Button
                    icon={<PauseCircle className="w-3.5 h-3.5" />}
                    disabled={busy}
                    loading={statusBusy}
                    onClick={() => void handleStatusButtonClick('PAUSED')}
                    className="!min-h-[40px]"
                  >
                    {ta.actions.pause}
                  </Button>
                )}
                {allowedTransitions.includes('ARCHIVED') && (
                  <Button
                    danger
                    icon={<Archive className="w-3.5 h-3.5" />}
                    disabled={busy}
                    onClick={() => void handleStatusButtonClick('ARCHIVED')}
                    className="!min-h-[40px]"
                  >
                    {ta.actions.archive}
                  </Button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Button
                disabled={busy}
                onClick={onClose}
                className="!min-h-[40px]"
              >
                {isArchived ? td.closeButton : td.cancelButton}
              </Button>

              {!isArchived && (
                <Button
                  type="primary"
                  icon={<Save className="w-4 h-4" />}
                  loading={submitting}
                  disabled={busy}
                  onClick={() => void handleSave()}
                  className="!min-h-[40px]"
                >
                  {isEditMode ? td.saveButton : td.saveDraftButton}
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      {detailLoading ? (
        <div className="space-y-4">
          <Skeleton active paragraph={{ rows: 4 }} />
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : detailError && advertisementId ? (
        <Alert
          type="error"
          showIcon
          title={detailError}
          action={
            <Button
              type="primary"
              size="small"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => void fetchDetail(advertisementId, true)}
            >
              {ta.retryButton}
            </Button>
          }
        />
      ) : (
        <div className="space-y-5 pb-4">
          {isArchived && (
            <Alert type="info" showIcon title={td.archivedReadOnlyNotice} className="rounded-lg" />
          )}

          {/* 409 Conflict Banner preserving user edits & file */}
          {conflictMessage && loadedItem && (
            <Alert
              type="warning"
              showIcon
              title={td.conflictBannerTitle}
              description={
                <div className="space-y-2.5">
                  <p className="text-xs sm:text-sm text-slate-800">{conflictMessage}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="primary"
                      size="small"
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      loading={loadingLatest}
                      onClick={() => void fetchDetail(loadedItem.advertisement.id, false)}
                    >
                      {td.loadLatestVersionButton}
                    </Button>
                  </div>
                </div>
              }
            />
          )}

          {serverReloadedNotice && loadedItem && (
            <Alert
              type="success"
              showIcon
              title={td.latestVersionLoadedNotice}
              action={
                <Button
                  size="small"
                  onClick={() => {
                    populateFieldsFromItem(loadedItem);
                    clearLocalFileSelection();
                    setServerReloadedNotice(false);
                  }}
                >
                  {td.applyServerValuesButton}
                </Button>
              }
            />
          )}

          {submitError && (
            <Alert type="error" showIcon title={submitError} className="rounded-lg" />
          )}

          {/* Uzbek Locale Fields */}
          <section className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3.5">
            <h3 className="text-sm font-semibold text-[#15803d]">{td.uzSectionTitle}</h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                {td.titleLabel} <span className="text-red-500">*</span>
              </label>
              <Input
                size="large"
                disabled={isArchived || busy}
                maxLength={AD_TITLE_MAX_LENGTH}
                showCount
                value={uzTitle}
                onChange={(e) => {
                  setUzTitle(e.target.value);
                  if (fieldErrors.uzTitle) {
                    setFieldErrors((prev) => ({ ...prev, uzTitle: undefined }));
                  }
                }}
                placeholder={td.titlePlaceholderUz}
                status={fieldErrors.uzTitle ? 'error' : undefined}
              />
              {fieldErrors.uzTitle && (
                <div className="text-xs text-red-600">{fieldErrors.uzTitle}</div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                {td.descriptionLabel}
              </label>
              <Input.TextArea
                disabled={isArchived || busy}
                maxLength={AD_DESCRIPTION_MAX_LENGTH}
                showCount
                rows={3}
                value={uzDescription}
                onChange={(e) => {
                  setUzDescription(e.target.value);
                  if (fieldErrors.uzDescription) {
                    setFieldErrors((prev) => ({ ...prev, uzDescription: undefined }));
                  }
                }}
                placeholder={td.descriptionPlaceholderUz}
                status={fieldErrors.uzDescription ? 'error' : undefined}
              />
              {fieldErrors.uzDescription && (
                <div className="text-xs text-red-600">{fieldErrors.uzDescription}</div>
              )}
            </div>
          </section>

          {/* Russian Locale Fields */}
          <section className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3.5">
            <h3 className="text-sm font-semibold text-[#15803d]">{td.ruSectionTitle}</h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                {td.titleLabel} <span className="text-red-500">*</span>
              </label>
              <Input
                size="large"
                disabled={isArchived || busy}
                maxLength={AD_TITLE_MAX_LENGTH}
                showCount
                value={ruTitle}
                onChange={(e) => {
                  setRuTitle(e.target.value);
                  if (fieldErrors.ruTitle) {
                    setFieldErrors((prev) => ({ ...prev, ruTitle: undefined }));
                  }
                }}
                placeholder={td.titlePlaceholderRu}
                status={fieldErrors.ruTitle ? 'error' : undefined}
              />
              {fieldErrors.ruTitle && (
                <div className="text-xs text-red-600">{fieldErrors.ruTitle}</div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                {td.descriptionLabel}
              </label>
              <Input.TextArea
                disabled={isArchived || busy}
                maxLength={AD_DESCRIPTION_MAX_LENGTH}
                showCount
                rows={3}
                value={ruDescription}
                onChange={(e) => {
                  setRuDescription(e.target.value);
                  if (fieldErrors.ruDescription) {
                    setFieldErrors((prev) => ({ ...prev, ruDescription: undefined }));
                  }
                }}
                placeholder={td.descriptionPlaceholderRu}
                status={fieldErrors.ruDescription ? 'error' : undefined}
              />
              {fieldErrors.ruDescription && (
                <div className="text-xs text-red-600">{fieldErrors.ruDescription}</div>
              )}
            </div>
          </section>

          {/* Channels, Target URL & Sort Order */}
          <section className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-4">
            <p className="text-sm font-medium text-green-800">Android push</p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-8 space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  {language === 'ru' ? 'Путь к товару' : 'Mahsulot havolasi'} *
                </label>
                <Input
                  size="large"
                  disabled={isArchived || busy}
                  maxLength={2048}
                  value={targetUrl}
                  onChange={(e) => {
                    setTargetUrl(e.target.value);
                    if (fieldErrors.targetUrl) {
                      setFieldErrors((prev) => ({ ...prev, targetUrl: undefined }));
                    }
                  }}
                  placeholder="/products/choyan-qozon"
                  status={fieldErrors.targetUrl ? 'error' : undefined}
                />
                <div className="text-xs text-slate-500">/products/{'{productId}'}</div>
                {fieldErrors.targetUrl && (
                  <div className="text-xs text-red-600">{fieldErrors.targetUrl}</div>
                )}
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  {td.sortOrderLabel} <span className="text-red-500">*</span>
                </label>
                <Input
                  size="large"
                  type="number"
                  min={0}
                  step={1}
                  disabled={isArchived || busy}
                  value={sortOrderInput}
                  onChange={(e) => {
                    setSortOrderInput(e.target.value);
                    if (fieldErrors.sortOrder) {
                      setFieldErrors((prev) => ({ ...prev, sortOrder: undefined }));
                    }
                  }}
                  status={fieldErrors.sortOrder ? 'error' : undefined}
                />
                <div className="text-xs text-slate-500">{td.sortOrderHint}</div>
                {fieldErrors.sortOrder && (
                  <div className="text-xs text-red-600">{fieldErrors.sortOrder}</div>
                )}
              </div>
            </div>
          </section>

          {/* Schedule with explicit local timezone + UTC preview */}
          <section className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-[#16a34a]" />
                <span>{td.scheduleSectionTitle}</span>
              </h3>
              <span className="text-xs font-mono text-slate-500 bg-[#faf9f5] border border-[#e6e4dd] px-2 py-0.5 rounded">
                {td.timezoneNoticePrefix}: {timezoneDisplay}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-700">
                    {td.startsAtLabel}
                  </label>
                  {startsAtLocal && !isArchived && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setStartsAtLocal('');
                        setFieldErrors((prev) => ({
                          ...prev,
                          startsAt: undefined,
                          endsAt: undefined,
                        }));
                      }}
                      className="text-xs text-[#16a34a] hover:text-[#15803d] cursor-pointer"
                    >
                      {td.clearDateButton}
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  disabled={isArchived || busy}
                  value={startsAtLocal}
                  onChange={(e) => {
                    setStartsAtLocal(e.target.value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      startsAt: undefined,
                      endsAt: undefined,
                    }));
                  }}
                  className={`w-full h-11 px-3 rounded-lg border text-sm bg-white text-slate-900 ${
                    fieldErrors.startsAt ? 'border-red-500' : 'border-[#d9d7d0]'
                  } disabled:bg-slate-100 disabled:text-slate-500`}
                />
                {startsUtcPreview && (
                  <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {td.utcPreviewPrefix}: {startsUtcPreview}
                  </div>
                )}
                {fieldErrors.startsAt && (
                  <div className="text-xs text-red-600">{fieldErrors.startsAt}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-700">
                    {td.endsAtLabel}
                  </label>
                  {endsAtLocal && !isArchived && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEndsAtLocal('');
                        setFieldErrors((prev) => ({ ...prev, endsAt: undefined }));
                      }}
                      className="text-xs text-[#16a34a] hover:text-[#15803d] cursor-pointer"
                    >
                      {td.clearDateButton}
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  disabled={isArchived || busy}
                  value={endsAtLocal}
                  onChange={(e) => {
                    setEndsAtLocal(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, endsAt: undefined }));
                  }}
                  className={`w-full h-11 px-3 rounded-lg border text-sm bg-white text-slate-900 ${
                    fieldErrors.endsAt ? 'border-red-500' : 'border-[#d9d7d0]'
                  } disabled:bg-slate-100 disabled:text-slate-500`}
                />
                {endsUtcPreview && (
                  <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {td.utcPreviewPrefix}: {endsUtcPreview}
                  </div>
                )}
                {fieldErrors.endsAt && (
                  <div className="text-xs text-red-600">{fieldErrors.endsAt}</div>
                )}
              </div>
            </div>
          </section>

          {/* Media Picker & Preview (Never displays Media ID) */}
          <section className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{td.mediaSectionTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{td.mediaHint}</p>
            </div>

            {fieldErrors.file && (
              <Alert type="error" showIcon title={fieldErrors.file} className="rounded-lg text-xs" />
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,video/mp4"
              onChange={(e) => void handleFileChange(e)}
              className="hidden"
            />

            {localPreviewUrl && localMediaMeta ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803d]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{td.newSelectedMediaLabel}</span>
                </div>

                <div className="rounded-xl border border-[#86efac] bg-[#f0fdf4]/40 p-3 space-y-2.5">
                  <div className="w-full min-h-[180px] max-h-[300px] rounded-lg border border-[#e6e4dd] bg-white overflow-hidden flex items-center justify-center">
                    {localMediaMeta.kind === 'VIDEO' ? (
                      <video
                        src={localPreviewUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-[290px] bg-black"
                      />
                    ) : (
                      <img
                        src={localPreviewUrl}
                        alt={localMediaMeta.name}
                        className="max-w-full max-h-[280px] w-auto object-contain"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 truncate max-w-[260px]">
                      {localMediaMeta.kind === 'VIDEO' ? (
                        <Film className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      )}
                      <span className="truncate">{localMediaMeta.name}</span>
                    </span>

                    <span className="font-mono tabular-nums text-slate-500">
                      {localMediaMeta.width && localMediaMeta.height
                        ? `${localMediaMeta.width}×${localMediaMeta.height} px · `
                        : ''}
                      {formatAdvertisementFileSize(localMediaMeta.sizeBytes)}
                    </span>
                  </div>
                </div>
              </div>
            ) : isEditMode && loadedItem ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-600">
                  {td.currentSavedMediaLabel}
                </div>
                <AuthorizedAdMediaPreview
                  media={loadedItem.advertisement.media}
                  accessToken={accessToken}
                  language={language}
                  alt={
                    loadedItem.advertisement.uz.title ||
                    loadedItem.advertisement.ru.title ||
                    ta.title
                  }
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d6d3cb] bg-[#faf9f5] min-h-[140px] p-5 flex flex-col items-center justify-center text-center gap-2">
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  {td.noMediaNotice}
                </span>
              </div>
            )}

            {!isArchived && (
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  icon={<Upload className="w-4 h-4" />}
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="!min-h-[40px]"
                >
                  {selectedFile || loadedItem?.advertisement.media?.url
                    ? td.changeMediaButton
                    : td.selectMediaButton}
                </Button>

                {selectedFile && (
                  <Button
                    icon={<RotateCcw className="w-4 h-4" />}
                    disabled={busy}
                    onClick={clearLocalFileSelection}
                    className="!min-h-[40px]"
                  >
                    {td.resetSelectedMediaButton}
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
