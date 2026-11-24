import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Skeleton,
  Switch,
} from 'antd';
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import { categoryApi } from '../services/categoryApi';
import type { Language } from '../types/auth';
import type { AdminCategoryItem, AdminCategoryPayload } from '../types/category';
import {
  isValidUuid,
  slugifyCategoryText,
  validateCategoryImageFile,
} from '../utils/validation';

export interface ParentCategoryOption {
  value: string;
  label: string;
}

interface CategoryFormDrawerProps {
  open: boolean;
  editingCategoryId: string | null;
  initialItem?: AdminCategoryItem | null;
  language: Language;
  accessToken: string;
  parentOptions: ParentCategoryOption[];
  onClose: () => void;
  onSaved: (item: AdminCategoryItem, mode: 'create' | 'edit') => void;
  onUnauthorized: (message?: string) => void;
  onForbidden: (message?: string, endpoint?: string) => void;
  onNotFound: () => void;
}

interface CategoryFormValues {
  slug: string;
  parentId?: string;
  sortOrder?: number | null;
  active: boolean;
  uz: {
    name: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
  };
  ru: {
    name: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
  };
}

function toNullableTrimmed(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapApiItemToFormValues(item: AdminCategoryItem): CategoryFormValues {
  return {
    slug: item.data.slug ?? '',
    parentId: item.data.parentId ?? undefined,
    sortOrder: typeof item.data.sortOrder === 'number' ? item.data.sortOrder : 0,
    active: Boolean(item.data.active),
    uz: {
      name: item.data.uz?.name ?? '',
      description: item.data.uz?.description ?? '',
      seoTitle: item.data.uz?.seoTitle ?? '',
      seoDescription: item.data.uz?.seoDescription ?? '',
    },
    ru: {
      name: item.data.ru?.name ?? '',
      description: item.data.ru?.description ?? '',
      seoTitle: item.data.ru?.seoTitle ?? '',
      seoDescription: item.data.ru?.seoDescription ?? '',
    },
  };
}

function extractItemImageUrl(item: AdminCategoryItem): string | null {
  return item.imageUrl ?? item.data.imageUrl ?? null;
}

export function CategoryFormDrawer({
  open,
  editingCategoryId,
  initialItem,
  language,
  accessToken,
  parentOptions,
  onClose,
  onSaved,
  onUnauthorized,
  onForbidden,
  onNotFound,
}: CategoryFormDrawerProps) {
  const t = translations[language];
  const tc = t.adminCategories;
  const [form] = Form.useForm<CategoryFormValues>();

  const [loadingRecord, setLoadingRecord] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [existingImageMediaId, setExistingImageMediaId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingPreviewSrc, setExistingPreviewSrc] = useState<string | null>(null);
  const [existingImageFailed, setExistingImageFailed] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

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

  const resetImageSelectionState = (nextMediaId: string | null, nextImageUrl: string | null) => {
    revokeSelectedBlob();
    revokeExistingBlob();
    setSelectedFile(null);
    setSelectedPreviewUrl(null);
    setRemoveImage(false);
    setImageError(null);
    setExistingImageFailed(false);
    setExistingImageMediaId(nextMediaId);
    setExistingImageUrl(nextImageUrl);
    setExistingPreviewSrc(null);
  };

  // Populate form & metadata on drawer open
  useEffect(() => {
    if (!open) {
      revokeSelectedBlob();
      revokeExistingBlob();
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      setExistingPreviewSrc(null);
      setImageError(null);
      return;
    }

    setSubmitError(null);
    setLoadError(null);

    if (!editingCategoryId) {
      setLoadingRecord(false);
      resetImageSelectionState(null, null);
      form.setFieldsValue({
        slug: '',
        parentId: undefined,
        sortOrder: 0,
        active: true,
        uz: { name: '', description: '', seoTitle: '', seoDescription: '' },
        ru: { name: '', description: '', seoTitle: '', seoDescription: '' },
      });
      return;
    }

    if (initialItem && initialItem.id === editingCategoryId) {
      setLoadingRecord(false);
      resetImageSelectionState(
        initialItem.data.imageMediaId ?? null,
        extractItemImageUrl(initialItem),
      );
      form.setFieldsValue(mapApiItemToFormValues(initialItem));
      return;
    }

    let cancelled = false;
    setLoadingRecord(true);
    resetImageSelectionState(null, null);

    (async () => {
      try {
        const fetched = await categoryApi.getById(accessToken, editingCategoryId, language);
        if (cancelled) return;
        setExistingImageMediaId(fetched.data.imageMediaId ?? null);
        setExistingImageUrl(extractItemImageUrl(fetched));
        form.setFieldsValue(mapApiItemToFormValues(fetched));
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
            setLoadError(error.message || tc.notFoundError);
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
  }, [open, editingCategoryId, initialItem]);

  const hasAccessToken = Boolean(accessToken);

  // Load existing category image preview via imageUrl when editing
  useEffect(() => {
    revokeExistingBlob();
    setExistingImageFailed(false);

    if (!open || !existingImageUrl || !hasAccessToken) {
      setExistingPreviewSrc(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const blob = await categoryApi.fetchImageBlob(accessToken, existingImageUrl, language);
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
  }, [open, existingImageUrl, hasAccessToken, language]);

  const handleGenerateSlug = () => {
    const uzName = form.getFieldValue(['uz', 'name']) as string | undefined;
    const ruName = form.getFieldValue(['ru', 'name']) as string | undefined;
    const candidate = slugifyCategoryText(uzName || ruName || '');
    if (candidate) {
      form.setFieldValue('slug', candidate);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImageError(null);
    const check = await validateCategoryImageFile(file);
    if (!check.valid) {
      const msg =
        check.reason === 'invalid_type'
          ? tc.validation.imageInvalidType
          : check.reason === 'too_large'
            ? tc.validation.imageTooLarge
            : check.reason === 'invalid_dimensions'
              ? tc.validation.imageInvalidDimensions
              : tc.validation.imageReadError;
      setImageError(msg);
      return;
    }

    revokeSelectedBlob();
    const previewUrl = URL.createObjectURL(file);
    selectedBlobRef.current = previewUrl;
    setSelectedFile(file);
    setSelectedPreviewUrl(previewUrl);
    setRemoveImage(false);
  };

  const handleRemoveSelectedOrExistingImage = () => {
    revokeSelectedBlob();
    setSelectedFile(null);
    setSelectedPreviewUrl(null);
    setImageError(null);
    setRemoveImage(Boolean(existingImageUrl || existingImageMediaId));
  };

  const handleFinish = async (values: CategoryFormValues) => {
    setSubmitError(null);
    setImageError(null);
    setSubmitting(true);

    const payload: AdminCategoryPayload = {
      slug: values.slug.trim(),
      parentId: toNullableTrimmed(values.parentId),
      imageMediaId: editingCategoryId && !removeImage ? existingImageMediaId : null,
      sortOrder: typeof values.sortOrder === 'number' && values.sortOrder >= 0 ? values.sortOrder : 0,
      active: Boolean(values.active),
      uz: {
        name: values.uz.name.trim(),
        description: toNullableTrimmed(values.uz.description),
        seoTitle: toNullableTrimmed(values.uz.seoTitle),
        seoDescription: toNullableTrimmed(values.uz.seoDescription),
      },
      ru: {
        name: values.ru.name.trim(),
        description: toNullableTrimmed(values.ru.description),
        seoTitle: toNullableTrimmed(values.ru.seoTitle),
        seoDescription: toNullableTrimmed(values.ru.seoDescription),
      },
    };

    try {
      if (editingCategoryId) {
        const updated =
          selectedFile || removeImage
            ? await categoryApi.updateMultipart(
                accessToken,
                editingCategoryId,
                payload,
                language,
                {
                  file: selectedFile,
                  removeImage,
                },
              )
            : await categoryApi.update(accessToken, editingCategoryId, payload, language);
        onSaved(updated, 'edit');
      } else {
        const created = selectedFile
          ? await categoryApi.createMultipart(accessToken, payload, language, {
              file: selectedFile,
            })
          : await categoryApi.create(accessToken, payload, language);
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
          setSubmitError(`${tc.backendForbiddenTitle} (${endpointPrefix}${error.message})`);
          onForbidden(error.message, error.endpoint);
          return;
        }
        if (error.status === 404) {
          setSubmitError(error.message || tc.notFoundError);
          onNotFound();
          return;
        }

        setSubmitError(error.message);

        type CategoryFieldItem = Parameters<typeof form.setFields>[0][number];
        type CategoryFieldName = NonNullable<CategoryFieldItem['name']>;

        const mapBackendFieldName = (rawPath: string): CategoryFieldName | null => {
          const fieldPath = rawPath.replace(/^data\./, '');
          switch (fieldPath) {
            case 'slug':
            case 'parentId':
            case 'sortOrder':
            case 'active':
            case 'uz':
            case 'ru':
              return fieldPath;
            case 'uz.name':
              return ['uz', 'name'];
            case 'uz.description':
              return ['uz', 'description'];
            case 'uz.seoTitle':
              return ['uz', 'seoTitle'];
            case 'uz.seoDescription':
              return ['uz', 'seoDescription'];
            case 'ru.name':
              return ['ru', 'name'];
            case 'ru.description':
              return ['ru', 'description'];
            case 'ru.seoTitle':
              return ['ru', 'seoTitle'];
            case 'ru.seoDescription':
              return ['ru', 'seoDescription'];
            default:
              return null;
          }
        };

        const fieldErrors: CategoryFieldItem[] = [];
        if (error.code === 'catalog.category.cycle') {
          fieldErrors.push({ name: 'parentId', errors: [error.message] });
        }

        for (const fieldPath of error.fields) {
          const cleanPath = fieldPath.replace(/^data\./, '');
          if (cleanPath === 'file' || cleanPath === 'image' || cleanPath === 'imageMediaId') {
            setImageError(error.message);
            continue;
          }
          const mappedName = mapBackendFieldName(fieldPath);
          if (mappedName) {
            fieldErrors.push({ name: mappedName, errors: [error.message] });
          }
        }

        if (fieldErrors.length > 0) {
          form.setFields(fieldErrors);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectableParentOptions = parentOptions.filter((opt) => opt.value !== editingCategoryId);
  const activePreviewUrl =
    selectedPreviewUrl || (!removeImage && !existingImageFailed ? existingPreviewSrc : null);
  const hasVisibleImage = Boolean(activePreviewUrl);

  return (
    <Drawer
      title={
        <span className="font-display font-semibold text-slate-900">
          {editingCategoryId ? tc.form.editTitle : tc.form.createTitle}
        </span>
      }
      open={open}
      onClose={onClose}
      size={720}
      styles={{ body: { paddingBottom: 32 } }}
      destroyOnHidden
    >
      {loadingRecord ? (
        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-500">{tc.form.loadingCategory}</p>
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      ) : loadError ? (
        <div className="space-y-4">
          <Alert type="error" showIcon title={loadError} className="rounded-lg" />
          <Button onClick={onClose}>{tc.form.cancel}</Button>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
          initialValues={{
            slug: '',
            sortOrder: 0,
            active: true,
            uz: { name: '', description: '', seoTitle: '', seoDescription: '' },
            ru: { name: '', description: '', seoTitle: '', seoDescription: '' },
          }}
        >
          {submitError && (
            <Alert
              type="error"
              showIcon
              title={submitError}
              className="text-xs rounded-lg mb-5"
            />
          )}

          {/* General Parameters */}
          <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-4 sm:p-5 space-y-1 mb-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">{tc.form.generalSection}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item
                name="slug"
                label={
                  <div className="w-full flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">{tc.form.slugLabel}</span>
                    <button
                      type="button"
                      onClick={handleGenerateSlug}
                      className="text-xs font-medium text-[#16a34a] hover:text-[#15803d] cursor-pointer"
                    >
                      {tc.form.slugGenerate}
                    </button>
                  </div>
                }
                rules={[
                  {
                    validator: (_, value: string) => {
                      const trimmed = (value || '').trim();
                      if (!trimmed) {
                        return Promise.reject(new Error(tc.validation.requiredSlug));
                      }
                      if (trimmed.length > 160) {
                        return Promise.reject(new Error(tc.validation.slugMaxLength));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder={tc.form.slugPlaceholder}
                  disabled={submitting}
                  className="font-mono-tabular !min-h-[44px]"
                />
              </Form.Item>

              <Form.Item
                name="parentId"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tc.form.parentLabel}
                  </span>
                }
                rules={[
                  {
                    validator: (_, value?: string) => {
                      if (!value || !value.trim()) return Promise.resolve();
                      if (!isValidUuid(value)) {
                        return Promise.reject(new Error(tc.validation.invalidUuid));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Select
                  size="large"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={tc.form.parentPlaceholder}
                  options={selectableParentOptions}
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name="sortOrder"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tc.form.sortOrderLabel}
                  </span>
                }
                rules={[
                  {
                    validator: (_, value?: number | null) => {
                      if (value === undefined || value === null) return Promise.resolve();
                      if (typeof value !== 'number' || value < 0) {
                        return Promise.reject(new Error(tc.validation.sortOrderMin));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber
                  size="large"
                  min={0}
                  precision={0}
                  disabled={submitting}
                  className="!w-full"
                />
              </Form.Item>

              <Form.Item
                name="active"
                valuePropName="checked"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tc.form.activeLabel}
                  </span>
                }
              >
                <div className="h-[44px] flex items-center gap-3">
                  <Form.Item name="active" valuePropName="checked" noStyle>
                    <Switch disabled={submitting} />
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.active !== cur.active}>
                    {({ getFieldValue }) => (
                      <span className="text-xs font-medium text-slate-600">
                        {getFieldValue('active') ? tc.activeLabel : tc.inactiveLabel}
                      </span>
                    )}
                  </Form.Item>
                </div>
              </Form.Item>

              {/* Category Image Picker (replaces manual UUID input) */}
              <div className="md:col-span-2 pt-1 pb-1">
                <div className="text-sm font-medium text-slate-700 mb-2">{tc.form.imageLabel}</div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleFileSelected}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-[#e6e4dd] bg-white p-3.5">
                  {hasVisibleImage && activePreviewUrl && (
                    <div className="w-20 h-20 rounded-lg border border-[#e6e4dd] bg-[#f7f6f2] overflow-hidden shrink-0">
                      <img
                        src={activePreviewUrl}
                        alt={tc.form.imageAlt}
                        referrerPolicy="no-referrer"
                        onError={() => {
                          if (!selectedPreviewUrl) {
                            setExistingImageFailed(true);
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {hasVisibleImage ? (
                        <>
                          <Button
                            size="large"
                            icon={<RefreshCw className="w-4 h-4" />}
                            disabled={submitting}
                            onClick={() => fileInputRef.current?.click()}
                            className="!min-h-[44px] !inline-flex !items-center !justify-center"
                          >
                            {tc.form.replaceImageButton}
                          </Button>
                          <Button
                            danger
                            size="large"
                            icon={<Trash2 className="w-4 h-4" />}
                            disabled={submitting}
                            onClick={handleRemoveSelectedOrExistingImage}
                            className="!min-h-[44px] !inline-flex !items-center !justify-center"
                          >
                            {tc.form.removeImageButton}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="large"
                          icon={<ImagePlus className="w-4 h-4" />}
                          disabled={submitting}
                          onClick={() => fileInputRef.current?.click()}
                          className="!min-h-[44px] !inline-flex !items-center !justify-center"
                        >
                          {tc.form.selectImageButton}
                        </Button>
                      )}
                    </div>

                    {selectedFile && (
                      <div className="text-xs text-slate-600 truncate">{selectedFile.name}</div>
                    )}

                    <div className="text-xs text-slate-500">{tc.form.imageHint}</div>
                  </div>
                </div>

                {imageError && (
                  <p role="alert" className="mt-1.5 text-xs text-red-600">
                    {imageError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Uzbek & Russian Translations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Uzbek */}
            <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{tc.form.uzSection}</h3>

              <Form.Item
                name={['uz', 'name']}
                label={
                  <span className="text-sm font-medium text-slate-700">{tc.form.nameLabel}</span>
                }
                rules={[
                  {
                    validator: (_, value: string) => {
                      const trimmed = (value || '').trim();
                      if (!trimmed) {
                        return Promise.reject(new Error(tc.validation.requiredName));
                      }
                      if (trimmed.length > 200) {
                        return Promise.reject(new Error(tc.validation.nameMaxLength));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder={tc.form.namePlaceholderUz}
                  disabled={submitting}
                  className="!min-h-[44px]"
                />
              </Form.Item>

              <Form.Item
                name={['uz', 'description']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tc.form.descriptionLabel}
                  </span>
                }
              >
                <Input.TextArea
                  rows={2}
                  placeholder={tc.form.descriptionPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name={['uz', 'seoTitle']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tc.form.seoTitleLabel}
                  </span>
                }
                rules={[
                  {
                    validator: (_, value?: string) => {
                      const trimmed = (value || '').trim();
                      if (trimmed.length > 255) {
                        return Promise.reject(new Error(tc.validation.seoTitleMaxLength));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder={tc.form.seoTitlePlaceholder}
                  disabled={submitting}
                  className="!min-h-[44px]"
                />
              </Form.Item>

              <Form.Item
                name={['uz', 'seoDescription']}
                className="!mb-0"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tc.form.seoDescriptionLabel}
                  </span>
                }
              >
                <Input.TextArea
                  rows={2}
                  placeholder={tc.form.seoDescriptionPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>
            </div>

            {/* Russian */}
            <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{tc.form.ruSection}</h3>

              <Form.Item
                name={['ru', 'name']}
                label={
                  <span className="text-sm font-medium text-slate-700">{tc.form.nameLabel}</span>
                }
                rules={[
                  {
                    validator: (_, value: string) => {
                      const trimmed = (value || '').trim();
                      if (!trimmed) {
                        return Promise.reject(new Error(tc.validation.requiredName));
                      }
                      if (trimmed.length > 200) {
                        return Promise.reject(new Error(tc.validation.nameMaxLength));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder={tc.form.namePlaceholderRu}
                  disabled={submitting}
                  className="!min-h-[44px]"
                />
              </Form.Item>

              <Form.Item
                name={['ru', 'description']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tc.form.descriptionLabel}
                  </span>
                }
              >
                <Input.TextArea
                  rows={2}
                  placeholder={tc.form.descriptionPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name={['ru', 'seoTitle']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tc.form.seoTitleLabel}
                  </span>
                }
                rules={[
                  {
                    validator: (_, value?: string) => {
                      const trimmed = (value || '').trim();
                      if (trimmed.length > 255) {
                        return Promise.reject(new Error(tc.validation.seoTitleMaxLength));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder={tc.form.seoTitlePlaceholder}
                  disabled={submitting}
                  className="!min-h-[44px]"
                />
              </Form.Item>

              <Form.Item
                name={['ru', 'seoDescription']}
                className="!mb-0"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tc.form.seoDescriptionLabel}
                  </span>
                }
              >
                <Input.TextArea
                  rows={2}
                  placeholder={tc.form.seoDescriptionPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2 border-t border-[#e6e4dd]">
            <Button
              size="large"
              disabled={submitting}
              onClick={onClose}
              className="!min-h-[44px]"
            >
              {tc.form.cancel}
            </Button>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={submitting}
              className="!min-h-[44px]"
            >
              {editingCategoryId ? tc.form.saveUpdate : tc.form.saveCreate}
            </Button>
          </div>
        </Form>
      )}
    </Drawer>
  );
}
