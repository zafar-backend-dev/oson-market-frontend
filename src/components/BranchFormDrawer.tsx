import { getCurrentLocation, locationErrorMessage, supportsLocation } from '../services/deviceLocation';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Alert, App as AntApp, Button, Drawer, Form, Input, InputNumber, Popconfirm, Skeleton, Switch } from 'antd';
import { Crosshair, Image as ImageIcon, Loader2, MapPin, Trash2, Upload } from 'lucide-react';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import { branchApi } from '../services/branchApi';
import {
  reverseGeocodeCoordinates,
  type ReverseGeocodeResult,
} from '../services/geocodingApi';
import type { Language } from '../types/auth';
import {
  extractBranchCoordinates,
  isAdminBranchActive,
  type AdminBranchPayload,
  type AdminBranchRecord,
  type BranchLocation,
} from '../types/branch';
import { isFiniteCoordinatePair } from '../utils/geo';
import { roundCoordinate7 } from '../utils/orderStatus';
import {
  isValidEmail,
  isValidLatitude,
  isValidLongitude,
  slugifyCategoryText,
  validateBranchImageFile,
  validatePhone,
} from '../utils/validation';
import { LocationPickerMap } from './LocationPickerMap';

interface BranchFormDrawerProps {
  open: boolean;
  branchId: string | null;
  accessToken: string;
  language: Language;
  onClose: () => void;
  onSaved: (record: AdminBranchRecord, isEdit: boolean) => void;
  onUnauthorized: (message?: string) => void;
  onForbidden?: (endpoint?: string, message?: string) => void;
}

interface BranchFormValues {
  code: string;
  nameUz: string;
  nameRu: string;
  city: string;
  addressLine: string;
  phone: string;
  email: string;
  workingHours: string;
  pricePerKm: number;
  latitude: number;
  longitude: number;
  active: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
}

const DEFAULT_COORDS: BranchLocation = {
  latitude: 41.311081,
  longitude: 69.240562,
};

export function BranchFormDrawer({
  open,
  branchId,
  accessToken,
  language,
  onClose,
  onSaved,
  onUnauthorized,
  onForbidden,
}: BranchFormDrawerProps) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<BranchFormValues>();
  const t = translations[language];
  const tab = t.adminBranches;

  const isEdit = Boolean(branchId);
  const hasAccessToken = Boolean(accessToken);

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [existingRecord, setExistingRecord] = useState<AdminBranchRecord | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingImageSrc, setExistingImageSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewSrc, setPendingPreviewSrc] = useState<string | null>(null);

  const [mapCoords, setMapCoords] = useState<BranchLocation>(DEFAULT_COORDS);
  const [loadedFormValues, setLoadedFormValues] = useState<BranchFormValues | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoNotice, setGeoNotice] = useState<{
    type: 'warning' | 'success';
    text: string;
  } | null>(null);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<ReverseGeocodeResult | null>(null);
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const existingBlobRef = useRef<string | null>(null);
  const pendingBlobRef = useRef<string | null>(null);
  const geocodeSeqRef = useRef(0);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  const revokeExistingBlob = () => {
    if (existingBlobRef.current) {
      URL.revokeObjectURL(existingBlobRef.current);
      existingBlobRef.current = null;
    }
  };

  const revokePendingBlob = () => {
    if (pendingBlobRef.current) {
      URL.revokeObjectURL(pendingBlobRef.current);
      pendingBlobRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      geocodeAbortRef.current?.abort();
      revokeExistingBlob();
      revokePendingBlob();
    };
  }, []);

  const loadExistingImage = async (targetBranchId: string, imageUrl?: string | null) => {
    revokeExistingBlob();
    setExistingImageSrc(null);
    if (!imageUrl || !hasAccessToken) return;

    try {
      const blob = await branchApi.fetchAdminBranchImageBlob(
        accessToken,
        imageUrl || targetBranchId,
        language,
      );
      if (!blob) return;
      const objectUrl = URL.createObjectURL(blob);
      existingBlobRef.current = objectUrl;
      setExistingImageSrc(objectUrl);
    } catch {
      // Non-fatal preview error
    }
  };

  useEffect(() => {
    if (!open) {
      geocodeAbortRef.current?.abort();
      geocodeSeqRef.current += 1;
      setFormError(null);
      setImageError(null);
      setPendingFile(null);
      setLoadedFormValues(null);
      setGeoLoading(false);
      setGeoNotice(null);
      setGeocodeLoading(false);
      setGeocodeResult(null);
      setGeocodeFailed(false);
      revokePendingBlob();
      setPendingPreviewSrc(null);
      return;
    }

    geocodeAbortRef.current?.abort();
    geocodeSeqRef.current += 1;
    setFormError(null);
    setImageError(null);
    setPendingFile(null);
    setGeoNotice(null);
    setGeocodeLoading(false);
    setGeocodeResult(null);
    setGeocodeFailed(false);
    revokePendingBlob();
    setPendingPreviewSrc(null);

    if (!branchId) {
      setExistingRecord(null);
      setExistingImageUrl(null);
      revokeExistingBlob();
      setExistingImageSrc(null);
      setMapCoords(DEFAULT_COORDS);
      setLoadedFormValues({
        code: '',
        nameUz: '',
        nameRu: '',
        city: '',
        addressLine: '',
        phone: '',
        email: '',
        workingHours: '09:00–20:00',
        pricePerKm: 3000,
        latitude: DEFAULT_COORDS.latitude,
        longitude: DEFAULT_COORDS.longitude,
        active: true,
        pickupEnabled: true,
        deliveryEnabled: true,
      });
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);
    setLoadedFormValues(null);
    (async () => {
      try {
        const record = await branchApi.getAdminBranchById(accessToken, branchId, language);
        if (cancelled) return;
        const coords = extractBranchCoordinates(record) ?? DEFAULT_COORDS;
        const rounded: BranchLocation = {
          latitude: roundCoordinate7(coords.latitude),
          longitude: roundCoordinate7(coords.longitude),
        };
        setExistingRecord(record);
        setExistingImageUrl(record.imageUrl ?? null);
        setMapCoords(rounded);
        setLoadedFormValues({
          code: record.code ?? '',
          nameUz: record.nameUz ?? record.name ?? '',
          nameRu: record.nameRu ?? record.name ?? '',
          city: record.city ?? '',
          addressLine: record.addressLine ?? '',
          phone: record.phone ?? '',
          email: record.email ?? '',
          workingHours: record.workingHours ?? '',
          pricePerKm: typeof record.pricePerKm === 'number' ? record.pricePerKm : 0,
          latitude: rounded.latitude,
          longitude: rounded.longitude,
          active: isAdminBranchActive(record),
          pickupEnabled: Boolean(record.pickupEnabled),
          deliveryEnabled: Boolean(record.deliveryEnabled),
        });
        if (record.imageUrl) {
          void loadExistingImage(record.id, record.imageUrl);
        } else {
          revokeExistingBlob();
          setExistingImageSrc(null);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403 && onForbidden) {
            onForbidden(error.endpoint, error.message);
            return;
          }
          setFormError(error.message);
        } else {
          setFormError(t.adminBrands.notFoundError);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, branchId, hasAccessToken, language]);

  useEffect(() => {
    if (open && !loadingDetail && loadedFormValues) {
      form.setFieldsValue(loadedFormValues);
    }
  }, [open, loadingDetail, loadedFormValues, form]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImageError(null);
    const check = await validateBranchImageFile(file);
    if (!check.valid) {
      if (check.reason === 'invalid_type') {
        setImageError(tab.validation.imageInvalidType);
      } else if (check.reason === 'too_large') {
        setImageError(tab.validation.imageTooLarge);
      } else {
        setImageError(tab.validation.imageUnreadable);
      }
      return;
    }

    revokePendingBlob();
    const previewUrl = URL.createObjectURL(file);
    pendingBlobRef.current = previewUrl;
    setPendingFile(file);
    setPendingPreviewSrc(previewUrl);
  };

  const handleClearPendingFile = () => {
    revokePendingBlob();
    setPendingFile(null);
    setPendingPreviewSrc(null);
    setImageError(null);
  };

  const handleRemoveExistingImage = async () => {
    if (!branchId) return;
    setDeletingImage(true);
    setImageError(null);
    try {
      await branchApi.deleteAdminBranchImage(accessToken, branchId, language);
      revokeExistingBlob();
      setExistingImageSrc(null);
      setExistingImageUrl(null);
      message.success(tab.notifications.imageDeletedSuccess);
      if (existingRecord) {
        const updated = { ...existingRecord, imageUrl: null };
        setExistingRecord(updated);
        onSaved(updated, true);
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403 && onForbidden) {
          onForbidden(error.endpoint, error.message);
          return;
        }
        setImageError(error.message);
      }
    } finally {
      setDeletingImage(false);
    }
  };

  const applyCoordinatesAndGeocode = useCallback(
    async (rawLocation: BranchLocation) => {
      if (!isFiniteCoordinatePair(rawLocation.latitude, rawLocation.longitude)) {
        return;
      }

      const next: BranchLocation = {
        latitude: roundCoordinate7(rawLocation.latitude),
        longitude: roundCoordinate7(rawLocation.longitude),
      };

      // Update marker + coordinates and clear previous point's stale address immediately
      setMapCoords(next);
      setGeocodeResult(null);
      setGeocodeFailed(false);
      form.setFieldsValue({
        latitude: next.latitude,
        longitude: next.longitude,
        city: '',
        addressLine: '',
      });
      form.setFields([
        { name: 'city', errors: [] },
        { name: 'addressLine', errors: [] },
      ]);

      geocodeAbortRef.current?.abort();
      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      const seq = ++geocodeSeqRef.current;

      setGeocodeLoading(true);
      try {
        const resolved = await reverseGeocodeCoordinates({
          latitude: next.latitude,
          longitude: next.longitude,
          language,
          signal: controller.signal,
        });
        if (seq !== geocodeSeqRef.current || controller.signal.aborted) {
          return;
        }
        setGeocodeResult(resolved);
        setGeocodeFailed(false);
        form.setFieldsValue({
          addressLine: resolved.addressLine ?? resolved.fullAddress ?? '',
          city: resolved.city ?? resolved.region ?? '',
        });
      } catch (error) {
        if (
          seq !== geocodeSeqRef.current ||
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }
        setGeocodeResult(null);
        setGeocodeFailed(true);
      } finally {
        if (seq === geocodeSeqRef.current && !controller.signal.aborted) {
          setGeocodeLoading(false);
        }
      }
    },
    [form, language],
  );

  const handleMapSelect = useCallback(
    (loc: BranchLocation) => {
      setGeoNotice(null);
      void applyCoordinatesAndGeocode(loc);
    },
    [applyCoordinatesAndGeocode],
  );

  const handleGetBrowserLocation = () => {
    if (!supportsLocation()) {
      setGeoNotice({ type: 'warning', text: t.orders.locationUnsupportedHint });
      return;
    }

    setGeoLoading(true);
    setGeoNotice(null);
    void getCurrentLocation().then(
      (pos) => {
        setGeoLoading(false);
        const next: BranchLocation = {
          latitude: roundCoordinate7(pos.coords.latitude),
          longitude: roundCoordinate7(pos.coords.longitude),
        };
        setGeoNotice({ type: 'success', text: t.orders.locationFoundHint });
        void applyCoordinatesAndGeocode(next);
      },
      (error: unknown) => {
        setGeoLoading(false);
        setGeoNotice({ type: 'warning', text: locationErrorMessage(error, language, t.orders.locationPermissionDeniedHint) });
      },
    );
  };

  const handleSubmit = async (values: BranchFormValues) => {
    setSubmitting(true);
    setFormError(null);

    const payload: AdminBranchPayload = {
      code: values.code.trim(),
      nameUz: values.nameUz.trim(),
      nameRu: values.nameRu.trim(),
      addressLine: values.addressLine.trim(),
      city: values.city.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      workingHours: values.workingHours.trim(),
      location: {
        latitude: roundCoordinate7(Number(values.latitude)),
        longitude: roundCoordinate7(Number(values.longitude)),
      },
      active: Boolean(values.active),
      pickupEnabled: Boolean(values.pickupEnabled),
      deliveryEnabled: Boolean(values.deliveryEnabled),
      pricePerKm: Number(values.pricePerKm ?? 0),
    };

    try {
      let saved: AdminBranchRecord;
      if (isEdit && branchId) {
        saved = await branchApi.updateAdminBranch(accessToken, branchId, payload, language);
        if (pendingFile) {
          saved = await branchApi.uploadAdminBranchImage(
            accessToken,
            branchId,
            pendingFile,
            language,
          );
          message.success(tab.notifications.imageUpdatedSuccess);
        }
        message.success(tab.notifications.updatedSuccess);
      } else {
        if (pendingFile) {
          saved = await branchApi.createAdminBranchMultipart(
            accessToken,
            payload,
            pendingFile,
            language,
          );
        } else {
          saved = await branchApi.createAdminBranchJson(accessToken, payload, language);
        }
        message.success(tab.notifications.createdSuccess);
      }

      onSaved(saved, isEdit);
      onClose();
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403 && onForbidden) {
          onForbidden(error.endpoint, error.message);
          return;
        }
        if (error.status === 400 && error.fields.length > 0) {
          const mapped = error.fields
            .filter((f): f is keyof BranchFormValues => f in values)
            .map((f) => ({ name: f, errors: [error.message] }));
          if (mapped.length > 0) {
            form.setFields(mapped);
          }
        }
        setFormError(error.message);
      } else {
        setFormError(
          language === 'ru' ? 'Не удалось сохранить филиал.' : 'Filialni saqlab bo‘lmadi.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const activePreview = pendingPreviewSrc || existingImageSrc;

  return (
    <Drawer
      open={open}
      onClose={() => {
        if (!submitting && !deletingImage) onClose();
      }}
      mask={{ closable: !submitting && !deletingImage }}
      size={600}
      title={
        <span className="font-display font-bold text-slate-900">
          {isEdit ? tab.drawerEditTitle : tab.drawerCreateTitle}
        </span>
      }
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
      }}
    >
      {loadingDetail ? (
        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-500">{tab.detailLoading}</div>
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : (
        <Form<BranchFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
          className="flex flex-col h-full"
        >
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {formError && <Alert type="error" showIcon title={formError} className="text-xs sm:text-sm" />}

            {/* Branch Image Section */}
            <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{tab.imageSectionTitle}</div>
                  <div className="text-xs text-slate-500">{tab.imageUploadHint}</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    icon={<Upload className="w-3.5 h-3.5" />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting || deletingImage}
                  >
                    {activePreview ? tab.replaceImageButton : tab.selectImageButton}
                  </Button>
                  {pendingFile && (
                    <Button
                      danger
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={handleClearPendingFile}
                      disabled={submitting || deletingImage}
                    >
                      {tab.removeImageButton}
                    </Button>
                  )}
                  {isEdit && existingImageUrl && !pendingFile && (
                    <Popconfirm
                      title={tab.removeImageConfirm}
                      okText={tab.archiveConfirmOk}
                      cancelText={tab.cancelButton}
                      okButtonProps={{ danger: true, loading: deletingImage }}
                      onConfirm={handleRemoveExistingImage}
                    >
                      <Button
                        danger
                        loading={deletingImage}
                        disabled={submitting}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        {tab.removeImageButton}
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </div>

              {imageError && <Alert type="error" showIcon title={imageError} className="text-xs" />}

              <div className="w-full h-36 rounded-lg border border-dashed border-[#d6d3c9] bg-white flex items-center justify-center overflow-hidden">
                {activePreview ? (
                  <img
                    src={activePreview}
                    alt={tab.imageSectionTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400 text-xs">
                    <ImageIcon className="w-6 h-6" />
                    <span>{tab.imageUploadHint}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Code + Price Per Km */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item
                name="code"
                label={<span className="text-sm font-medium text-slate-700">{tab.codeLabel}</span>}
                rules={[{ required: true, whitespace: true, message: tab.validation.codeRequired }]}
              >
                <Input
                  size="large"
                  placeholder={tab.codePlaceholder}
                  disabled={submitting}
                  addonAfter={
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        const source = form.getFieldValue('nameUz') || form.getFieldValue('nameRu') || '';
                        const generated = slugifyCategoryText(source);
                        if (generated) {
                          form.setFieldValue('code', generated);
                        }
                      }}
                      className="text-xs font-medium text-[#16a34a] hover:text-[#15803d] cursor-pointer"
                    >
                      Slug
                    </button>
                  }
                />
              </Form.Item>

              <Form.Item
                name="pricePerKm"
                label={
                  <span className="text-sm font-medium text-slate-700">{tab.pricePerKmLabel}</span>
                }
                rules={[
                  {
                    required: true,
                    type: 'number',
                    min: 0,
                    message: tab.validation.pricePerKmRequired,
                  },
                ]}
              >
                <InputNumber
                  size="large"
                  min={0}
                  step={500}
                  className="!w-full"
                  disabled={submitting}
                />
              </Form.Item>
            </div>

            {/* Bilingual Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item
                name="nameUz"
                label={
                  <span className="text-sm font-medium text-slate-700">{tab.nameUzLabel}</span>
                }
                rules={[
                  { required: true, whitespace: true, message: tab.validation.nameUzRequired },
                ]}
              >
                <Input size="large" placeholder={tab.nameUzPlaceholder} disabled={submitting} />
              </Form.Item>

              <Form.Item
                name="nameRu"
                label={
                  <span className="text-sm font-medium text-slate-700">{tab.nameRuLabel}</span>
                }
                rules={[
                  { required: true, whitespace: true, message: tab.validation.nameRuRequired },
                ]}
              >
                <Input size="large" placeholder={tab.nameRuPlaceholder} disabled={submitting} />
              </Form.Item>
            </div>

            {/* Location Picker Map + Reverse Geocoding + Coordinates (Auto-fills City & Address) */}
            <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <MapPin className="w-4 h-4 text-[#16a34a]" />
                  <span>{tab.locationTitle}</span>
                </div>
                <Button
                  size="small"
                  icon={<Crosshair className="w-3.5 h-3.5" />}
                  loading={geoLoading}
                  disabled={submitting}
                  onClick={handleGetBrowserLocation}
                  className="!min-h-[34px]"
                >
                  {geoLoading ? tab.gettingLocationLabel : tab.getLocationButton}
                </Button>
              </div>

              {geoNotice && (
                <Alert type={geoNotice.type} showIcon title={geoNotice.text} className="text-xs" />
              )}

              <p className="text-xs text-slate-500">{tab.mapPickHint}</p>

              <LocationPickerMap
                latitude={mapCoords.latitude}
                longitude={mapCoords.longitude}
                onChange={handleMapSelect}
                disabled={submitting}
              />

              {/* Reverse Geocode Context Readout */}
              {geocodeLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-600 rounded-lg border border-[#e6e4dd] bg-white px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16a34a] shrink-0" />
                  <span>{tab.resolvingAddressLabel}</span>
                </div>
              )}

              {!geocodeLoading && geocodeResult && (
                <div className="rounded-lg border border-[#e6e4dd] bg-white px-3 py-2.5 space-y-1 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700">{tab.detectedAreaLabel}</span>
                    {geocodeResult.isApproximate && (
                      <span className="font-semibold text-amber-700">
                        {tab.approximateAddressBadge}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-800">
                    {[
                      geocodeResult.district,
                      geocodeResult.city,
                      geocodeResult.region,
                      geocodeResult.country,
                    ]
                      .filter(Boolean)
                      .join(', ') ||
                      geocodeResult.fullAddress ||
                      '—'}
                  </div>
                  {geocodeResult.isApproximate && (
                    <div className="text-[11px] text-amber-700">{tab.approximateAddressHint}</div>
                  )}
                </div>
              )}

              {!geocodeLoading && geocodeFailed && (
                <Alert type="warning" showIcon title={tab.geocodeFallbackHint} className="text-xs" />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Form.Item
                  name="latitude"
                  label={
                    <span className="text-xs font-medium text-slate-600">
                      {t.orders.latitudeLabel}
                    </span>
                  }
                  rules={[
                    {
                      required: true,
                      validator: (_, val: number) =>
                        isValidLatitude(Number(val))
                          ? Promise.resolve()
                          : Promise.reject(new Error(t.orders.validation.invalidLatitude)),
                    },
                  ]}
                  className="!mb-0"
                >
                  <InputNumber
                    size="large"
                    step={0.0001}
                    precision={7}
                    className="!w-full font-mono"
                    disabled={submitting}
                    onChange={(val) => {
                      if (typeof val === 'number' && isValidLatitude(val)) {
                        void applyCoordinatesAndGeocode({
                          latitude: roundCoordinate7(val),
                          longitude: mapCoords.longitude,
                        });
                      }
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="longitude"
                  label={
                    <span className="text-xs font-medium text-slate-600">
                      {t.orders.longitudeLabel}
                    </span>
                  }
                  rules={[
                    {
                      required: true,
                      validator: (_, val: number) =>
                        isValidLongitude(Number(val))
                          ? Promise.resolve()
                          : Promise.reject(new Error(t.orders.validation.invalidLongitude)),
                    },
                  ]}
                  className="!mb-0"
                >
                  <InputNumber
                    size="large"
                    step={0.0001}
                    precision={7}
                    className="!w-full font-mono"
                    disabled={submitting}
                    onChange={(val) => {
                      if (typeof val === 'number' && isValidLongitude(val)) {
                        void applyCoordinatesAndGeocode({
                          latitude: mapCoords.latitude,
                          longitude: roundCoordinate7(val),
                        });
                      }
                    }}
                  />
                </Form.Item>
              </div>
            </div>

            {/* City & Address (Auto-filled from Map + Editable) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item
                name="city"
                label={<span className="text-sm font-medium text-slate-700">{tab.cityLabel}</span>}
                rules={[{ required: true, whitespace: true, message: tab.validation.cityRequired }]}
              >
                <Input size="large" placeholder={tab.cityPlaceholder} disabled={submitting} />
              </Form.Item>

              <Form.Item
                name="workingHours"
                label={
                  <span className="text-sm font-medium text-slate-700">{tab.workingHoursLabel}</span>
                }
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: tab.validation.workingHoursRequired,
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder={tab.workingHoursPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="addressLine"
              label={
                <span className="text-sm font-medium text-slate-700">{tab.addressLineLabel}</span>
              }
              rules={[
                { required: true, whitespace: true, message: tab.validation.addressRequired },
              ]}
            >
              <Input size="large" placeholder={tab.addressLinePlaceholder} disabled={submitting} />
            </Form.Item>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item
                name="phone"
                label={<span className="text-sm font-medium text-slate-700">{tab.phoneLabel}</span>}
                rules={[
                  { required: true, whitespace: true, message: tab.validation.phoneRequired },
                  {
                    validator: (_, val: string) => {
                      const trimmed = (val ?? '').trim();
                      if (!trimmed) return Promise.resolve();
                      return validatePhone(trimmed).valid
                        ? Promise.resolve()
                        : Promise.reject(new Error(tab.validation.invalidPhone));
                    },
                  },
                ]}
              >
                <Input size="large" placeholder={tab.phonePlaceholder} disabled={submitting} />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span className="text-sm font-medium text-slate-700">{tab.emailLabel}</span>}
                rules={[
                  {
                    validator: (_, val: string) => {
                      const trimmed = (val ?? '').trim();
                      if (!trimmed) return Promise.resolve();
                      return isValidEmail(trimmed)
                        ? Promise.resolve()
                        : Promise.reject(new Error(tab.validation.emailInvalid));
                    },
                  },
                ]}
              >
                <Input size="large" placeholder={tab.emailPlaceholder} disabled={submitting} />
              </Form.Item>
            </div>

            {/* Service & Active Switches */}
            <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Form.Item
                name="active"
                valuePropName="checked"
                label={<span className="text-xs font-medium text-slate-700">{tab.activeLabel}</span>}
                className="!mb-0"
              >
                <Switch disabled={submitting} />
              </Form.Item>

              <Form.Item
                name="pickupEnabled"
                valuePropName="checked"
                label={
                  <span className="text-xs font-medium text-slate-700">
                    {tab.pickupEnabledLabel}
                  </span>
                }
                className="!mb-0"
              >
                <Switch disabled={submitting} />
              </Form.Item>

              <Form.Item
                name="deliveryEnabled"
                valuePropName="checked"
                label={
                  <span className="text-xs font-medium text-slate-700">
                    {tab.deliveryEnabledLabel}
                  </span>
                }
                className="!mb-0"
              >
                <Switch disabled={submitting} />
              </Form.Item>
            </div>
          </div>

          <div className="border-t border-[#e6e4dd] bg-[#faf9f5] px-5 py-4 flex items-center justify-end gap-2.5">
            <Button size="large" onClick={onClose} disabled={submitting} className="!min-h-[44px]">
              {tab.cancelButton}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={submitting}
              disabled={submitting || deletingImage}
              className="!min-h-[44px]"
            >
              {tab.saveButton}
            </Button>
          </div>
        </Form>
      )}
    </Drawer>
  );
}
