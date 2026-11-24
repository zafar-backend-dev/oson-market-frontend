import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Alert, Button, Drawer, Form, Input, Skeleton, Switch } from 'antd';
import { ImagePlus, RefreshCw, Tag, Trash2 } from 'lucide-react';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import { brandApi } from '../services/brandApi';
import type { Language } from '../types/auth';
import type {
  AdminBrandJsonPayload,
  AdminBrandMultipartPayload,
  AdminBrandRecord,
} from '../types/brand';
import { slugifyCategoryText, validateCategoryImageFile } from '../utils/validation';

interface BrandFormDrawerProps {
  open: boolean;
  editingBrandId: string | null;
  language: Language;
  accessToken: string;
  onClose: () => void;
  onSaved: (record: AdminBrandRecord, mode: 'create' | 'edit') => void;
  onUnauthorized: (message?: string) => void;
  onForbidden: (message?: string, endpoint?: string) => void;
  onNotFound: () => void;
}

interface BrandFormValues {
  name: string;
  slug: string;
  active: boolean;
}

export function BrandFormDrawer({
  open,
  editingBrandId,
  language,
  accessToken,
  onClose,
  onSaved,
  onUnauthorized,
  onForbidden,
  onNotFound,
}: BrandFormDrawerProps) {
  const t = translations[language];
  const tb = t.adminBrands;
  const [form] = Form.useForm<BrandFormValues>();

  const [loadingRecord, setLoadingRecord] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [existingLogoMediaId, setExistingLogoMediaId] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [existingPreviewSrc, setExistingPreviewSrc] = useState<string | null>(null);
  const [existingLogoFailed, setExistingLogoFailed] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedBlobRef = useRef<string | null>(null);
  const existingBlobRef = useRef<string | null>(null);

  const revokeSelectedBlob = () => {
    if (selectedBlobRef.current) {
      URL.revokeObjectURL(selectedBlobRef.current);
      selectedBlobRef.current = null;
    }
  };

  const revokeExistingBlob = () => {
    if (existingBlobRef.current) {
      URL.revokeObjectURL(existingBlobRef.current);
      existingBlobRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeSelectedBlob();
      revokeExistingBlob();
    };
  }, []);

  const resetLogoState = (nextMediaId: string | null, nextLogoUrl: string | null) => {
    revokeSelectedBlob();
    revokeExistingBlob();
    setSelectedFile(null);
    setSelectedPreviewUrl(null);
    setRemoveLogo(false);
    setLogoError(null);
    setExistingLogoFailed(false);
    setExistingLogoMediaId(nextMediaId);
    setExistingLogoUrl(nextLogoUrl);
    setExistingPreviewSrc(null);
  };

  useEffect(() => {
    if (!open) {
      revokeSelectedBlob();
      revokeExistingBlob();
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      setExistingPreviewSrc(null);
      setLogoError(null);
      return;
    }

    setSubmitError(null);
    setLoadError(null);

    if (!editingBrandId) {
      setLoadingRecord(false);
      resetLogoState(null, null);
      form.setFieldsValue({
        name: '',
        slug: '',
        active: true,
      });
      return;
    }

    let cancelled = false;
    setLoadingRecord(true);
    resetLogoState(null, null);

    (async () => {
      try {
        const fetched = await brandApi.getById(accessToken, editingBrandId, language);
        if (cancelled) return;
        setExistingLogoMediaId(fetched.data.logoMediaId ?? null);
        setExistingLogoUrl(fetched.logoUrl ?? null);
        form.setFieldsValue({
          name: fetched.data.name ?? '',
          slug: fetched.data.slug ?? '',
          active: Boolean(fetched.data.active),
        });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            onForbidden(error.message, error.endpoint);
            onClose();
            return;
          }
          if (error.status === 404) {
            setLoadError(error.message || tb.notFoundError);
            onNotFound();
            return;
          }
          setLoadError(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingRecord(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingBrandId]);

  const hasAccessToken = Boolean(accessToken);

  useEffect(() => {
    revokeExistingBlob();
    setExistingLogoFailed(false);

    if (!open || !existingLogoUrl || !hasAccessToken) {
      setExistingPreviewSrc(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const blob = await brandApi.fetchLogoBlob(accessToken, existingLogoUrl, language);
        if (cancelled) return;
        if (!blob) {
          setExistingPreviewSrc(null);
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        existingBlobRef.current = objectUrl;
        setExistingPreviewSrc(objectUrl);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthApiError && error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        setExistingPreviewSrc(null);
      }
    })();

    return () => {
      cancelled = true;
      revokeExistingBlob();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingLogoUrl, hasAccessToken, language]);

  const handleGenerateSlug = () => {
    const brandName = form.getFieldValue('name') as string | undefined;
    const candidate = slugifyCategoryText(brandName || '');
    if (candidate) {
      form.setFieldValue('slug', candidate);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setLogoError(null);
    const check = await validateCategoryImageFile(file);
    if (!check.valid) {
      const msg =
        check.reason === 'invalid_type'
          ? tb.validation.logoInvalidType
          : check.reason === 'too_large'
            ? tb.validation.logoTooLarge
            : check.reason === 'invalid_dimensions'
              ? tb.validation.logoInvalidDimensions
              : tb.validation.logoReadError;
      setLogoError(msg);
      return;
    }

    revokeSelectedBlob();
    const previewUrl = URL.createObjectURL(file);
    selectedBlobRef.current = previewUrl;
    setSelectedFile(file);
    setSelectedPreviewUrl(previewUrl);
    setRemoveLogo(false);
  };

  const handleRemoveLogo = () => {
    revokeSelectedBlob();
    setSelectedFile(null);
    setSelectedPreviewUrl(null);
    setLogoError(null);
    setRemoveLogo(Boolean(existingLogoUrl || existingLogoMediaId));
  };

  const handleFinish = async (values: BrandFormValues) => {
    setSubmitError(null);
    setLogoError(null);
    setSubmitting(true);

    const name = values.name.trim();
    const slug = values.slug.trim();
    const active = Boolean(values.active);

    try {
      if (editingBrandId) {
        if (selectedFile || removeLogo) {
          const multipartPayload: AdminBrandMultipartPayload = {
            name,
            slug,
            active,
          };
          const updated = await brandApi.updateMultipart(
            accessToken,
            editingBrandId,
            multipartPayload,
            language,
            {
              file: selectedFile,
              removeLogo: !selectedFile && removeLogo,
            },
          );
          onSaved(updated, 'edit');
        } else {
          const jsonPayload: AdminBrandJsonPayload = {
            name,
            slug,
            active,
            logoMediaId: existingLogoMediaId ?? null,
          };
          const updated = await brandApi.updateJson(
            accessToken,
            editingBrandId,
            jsonPayload,
            language,
          );
          onSaved(updated, 'edit');
        }
      } else if (selectedFile) {
        const multipartPayload: AdminBrandMultipartPayload = {
          name,
          slug,
          active,
        };
        const created = await brandApi.createMultipart(
          accessToken,
          multipartPayload,
          language,
          { file: selectedFile },
        );
        onSaved(created, 'create');
      } else {
        const jsonPayload: AdminBrandJsonPayload = {
          name,
          slug,
          active,
          logoMediaId: null,
        };
        const created = await brandApi.createJson(accessToken, jsonPayload, language);
        onSaved(created, 'create');
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          const endpointPrefix = error.endpoint ? `${error.endpoint}: ` : '';
          setSubmitError(`${tb.backendForbiddenTitle} (${endpointPrefix}${error.message})`);
          onForbidden(error.message, error.endpoint);
          return;
        }
        if (error.status === 404) {
          setSubmitError(error.message || tb.notFoundError);
          onNotFound();
          return;
        }

        setSubmitError(error.message);

        if (error.status === 413) {
          setLogoError(error.message);
        }

        type BrandFieldItem = Parameters<typeof form.setFields>[0][number];
        const fieldErrors: BrandFieldItem[] = [];

        for (const rawField of error.fields) {
          const cleanField = rawField.replace(/^(data|brand)\./, '');
          if (cleanField === 'file' || cleanField === 'logo' || cleanField === 'logoMediaId') {
            setLogoError(error.message);
            continue;
          }
          if (cleanField === 'name' || cleanField === 'slug' || cleanField === 'active') {
            fieldErrors.push({ name: cleanField, errors: [error.message] });
          }
        }

        if (
          error.status === 409 &&
          fieldErrors.length === 0 &&
          error.code.toLowerCase().includes('slug')
        ) {
          fieldErrors.push({ name: 'slug', errors: [error.message] });
        }

        if (fieldErrors.length > 0) {
          form.setFields(fieldErrors);
        }
      } else {
        setSubmitError(
          language === 'ru'
            ? 'Произошла ошибка. Попробуйте ещё раз.'
            : 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const activePreviewUrl =
    selectedPreviewUrl ??
    (!removeLogo && !existingLogoFailed ? existingPreviewSrc : null);
  const hasLogoDisplayed = Boolean(activePreviewUrl);

  return (
    <Drawer
      title={
        <span className="font-display font-bold text-slate-900">
          {editingBrandId ? tb.form.editTitle : tb.form.createTitle}
        </span>
      }
      open={open}
      onClose={onClose}
      size={540}
      destroyOnHidden
      mask={{ closable: !submitting }}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 py-1">
          <Button
            size="large"
            onClick={onClose}
            disabled={submitting}
            className="!min-h-[44px]"
          >
            {tb.form.cancelButton}
          </Button>
          <Button
            type="primary"
            size="large"
            loading={submitting}
            disabled={loadingRecord || Boolean(loadError)}
            onClick={() => form.submit()}
            className="!min-h-[44px]"
          >
            {tb.form.saveButton}
          </Button>
        </div>
      }
    >
      {loadingRecord ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : loadError ? (
        <Alert type="error" showIcon title={loadError} />
      ) : (
        <Form<BrandFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ active: true }}
          onFinish={handleFinish}
          className="space-y-4"
        >
          {submitError && (
            <Alert type="error" showIcon title={submitError} className="!mb-2" />
          )}

          <Form.Item
            name="name"
            label={<span className="font-medium text-slate-700">{tb.form.nameLabel}</span>}
            rules={[
              {
                required: true,
                whitespace: true,
                message: tb.validation.nameRequired,
              },
              {
                validator: async (_, value: string | undefined) => {
                  if (value && value.trim().length > 180) {
                    throw new Error(tb.validation.nameTooLong);
                  }
                },
              },
            ]}
          >
            <Input
              size="large"
              maxLength={180}
              placeholder={tb.form.namePlaceholder}
            />
          </Form.Item>

          <Form.Item
            label={
              <div className="w-full flex items-center justify-between gap-2">
                <span className="font-medium text-slate-700">{tb.form.slugLabel}</span>
                <button
                  type="button"
                  onClick={handleGenerateSlug}
                  className="text-xs font-medium text-[#16a34a] hover:text-[#15803d] cursor-pointer"
                >
                  {tb.form.generateSlugButton}
                </button>
              </div>
            }
            name="slug"
            extra={<span className="text-xs text-slate-500">{tb.form.slugHelp}</span>}
            rules={[
              {
                required: true,
                whitespace: true,
                message: tb.validation.slugRequired,
              },
              {
                validator: async (_, value: string | undefined) => {
                  if (value && value.trim().length > 120) {
                    throw new Error(tb.validation.slugTooLong);
                  }
                },
              },
            ]}
          >
            <Input
              size="large"
              maxLength={120}
              placeholder={tb.form.slugPlaceholder}
            />
          </Form.Item>

          {/* Optional Logo Picker */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">{tb.form.logoLabel}</div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileSelected}
              className="hidden"
            />

            <div className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5] p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-20 h-20 rounded-lg border border-[#e6e4dd] bg-white flex items-center justify-center overflow-hidden shrink-0">
                {activePreviewUrl ? (
                  <img
                    src={activePreviewUrl}
                    alt={tb.form.logoPreviewAlt}
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (!selectedPreviewUrl) {
                        setExistingLogoFailed(true);
                      }
                    }}
                    className="w-full h-full object-contain p-1.5"
                  />
                ) : (
                  <Tag className="w-6 h-6 text-slate-400" aria-hidden="true" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {!hasLogoDisplayed && (
                  <div className="text-xs text-slate-500">{tb.form.logoEmptyText}</div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {hasLogoDisplayed ? (
                    <>
                      <Button
                        type="default"
                        size="middle"
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={() => fileInputRef.current?.click()}
                        className="!min-h-[40px]"
                      >
                        {tb.form.logoReplaceButton}
                      </Button>
                      <Button
                        danger
                        type="default"
                        size="middle"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={handleRemoveLogo}
                        className="!min-h-[40px]"
                      >
                        {tb.form.logoRemoveButton}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="default"
                      size="middle"
                      icon={<ImagePlus className="w-4 h-4" />}
                      onClick={() => fileInputRef.current?.click()}
                      className="!min-h-[40px]"
                    >
                      {tb.form.logoPickButton}
                    </Button>
                  )}
                </div>

                <div className="text-xs text-slate-500">{tb.form.logoHint}</div>
              </div>
            </div>

            {logoError && (
              <div className="text-xs font-medium text-red-600" role="alert">
                {logoError}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5] px-4 py-3 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-slate-800">{tb.form.activeLabel}</div>
              <div className="text-xs text-slate-500">{tb.form.activeHint}</div>
            </div>
            <Form.Item name="active" valuePropName="checked" className="!mb-0">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      )}
    </Drawer>
  );
}
