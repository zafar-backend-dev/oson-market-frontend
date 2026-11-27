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
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Image as ImageIcon,
  ImagePlus,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/authApi';
import { productApi } from '../services/productApi';
import type { Language } from '../types/auth';
import type {
  AdminProductDetailResponse,
  AdminProductPayload,
  AdminProductVariantPayload,
  ProductStatus,
} from '../types/product';
import { hasAtMostTwoDecimals } from '../utils/price';
import { slugifyCategoryText, validateCategoryImageFile } from '../utils/validation';

const MAX_VARIANTS = 100;
const MAX_IMAGES_PER_VARIANT = 20;
const MAX_UPLOAD_FILES_PER_REQUEST = 12;

export interface SelectOptionItem {
  value: string;
  label: string;
}

interface VariantImageDraft {
  clientKey: string;
  id?: string;
  imageUrl?: string | null;
  file?: File | null;
  localPreviewUrl?: string | null;
  sortOrder: number;
  primaryImage: boolean;
}

interface VariantDraft {
  clientKey: string;
  id?: string;
  sku: string;
  titleUz: string;
  titleRu: string;
  barcode: string;
  status: string;
  regularPrice: number | null;
  salePrice: number | null;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  defaultType: boolean;
  images: VariantImageDraft[];
}

interface VariantValidationErrors {
  sku?: string;
  barcode?: string;
  status?: string;
  regularPrice?: string;
  salePrice?: string;
  weightGrams?: string;
  lengthMm?: string;
  widthMm?: string;
  heightMm?: string;
  images?: string;
  general?: string;
}

interface ProductTranslationFormValues {
  title?: string;
  shortDescription?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface ProductFormValues {
  slug: string;
  brandId?: string | null;
  categoryIds: string[];
  status: ProductStatus;
  productKind?: string;
  warrantyMonths?: number | null;
  uz?: ProductTranslationFormValues;
  ru?: ProductTranslationFormValues;
}

interface ProductFormDrawerProps {
  open: boolean;
  editingProductId: string | null;
  focusVariantId?: string | null;
  defaultCategoryId?: string | null;
  language: Language;
  accessToken: string;
  categoryOptions: SelectOptionItem[];
  brandOptions: SelectOptionItem[];
  onClose: () => void;
  onSaved: (item: AdminProductDetailResponse, mode: 'create' | 'edit') => void;
  onUnauthorized: (message?: string) => void;
  onForbidden: (message?: string, endpoint?: string) => void;
  onNotFound: () => void;
}

let clientSequence = 0;
function nextClientKey(prefix: string): string {
  clientSequence += 1;
  return `${prefix}_${Date.now()}_${clientSequence}`;
}

function createEmptyVariant(isDefault = false): VariantDraft {
  return {
    clientKey: nextClientKey('var'),
    sku: '',
    titleUz: '',
    titleRu: '',
    barcode: '',
    status: 'ACTIVE',
    regularPrice: null,
    salePrice: null,
    weightGrams: null,
    lengthMm: null,
    widthMm: null,
    heightMm: null,
    defaultType: isDefault,
    images: [],
  };
}

function toNullableTrimmed(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalNonNegativeInt(val: number | null | undefined): number | null {
  if (val === null || val === undefined || Number.isNaN(val)) return null;
  return Math.max(0, Math.floor(val));
}

function toOptionalMoney(val: number | null | undefined): number | null {
  if (val === null || val === undefined || typeof val !== 'number' || !Number.isFinite(val)) {
    return null;
  }
  return Math.round(val * 100) / 100;
}

function buildTranslationPayload(tr?: ProductTranslationFormValues) {
  if (!tr) return null;
  const obj = {
    title: toNullableTrimmed(tr.title),
    shortDescription: toNullableTrimmed(tr.shortDescription),
    description: toNullableTrimmed(tr.description),
    seoTitle: toNullableTrimmed(tr.seoTitle),
    seoDescription: toNullableTrimmed(tr.seoDescription),
  };
  return Object.values(obj).some((v) => v !== null) ? obj : null;
}

function mapDetailToVariantsDraft(detail: AdminProductDetailResponse): VariantDraft[] {
  if (!Array.isArray(detail.variants) || detail.variants.length === 0) {
    return [createEmptyVariant(true)];
  }
  return detail.variants.map((v, idx) => {
    const rawRegular = v.price?.regularPrice ?? v.regularPrice ?? null;
    const rawSale = v.price?.salePrice ?? v.salePrice ?? null;
    return {
      clientKey: nextClientKey('var'),
      id: v.id,
      sku: v.sku ?? '',
      titleUz: v.titleUz ?? '',
      titleRu: v.titleRu ?? '',
      barcode: v.barcode ?? '',
      status: v.status ?? 'ACTIVE',
      regularPrice: typeof rawRegular === 'number' && Number.isFinite(rawRegular) ? rawRegular : null,
      salePrice: typeof rawSale === 'number' && Number.isFinite(rawSale) ? rawSale : null,
      weightGrams: v.weightGrams ?? null,
      lengthMm: v.lengthMm ?? null,
      widthMm: v.widthMm ?? null,
      heightMm: v.heightMm ?? null,
      defaultType: Boolean(v.defaultType ?? idx === 0),
      images: Array.isArray(v.images)
        ? [...v.images]
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((img, iIdx) => ({
              clientKey: nextClientKey('img'),
              id: img.id,
              imageUrl: img.imageUrl ?? null,
              file: null,
              localPreviewUrl: null,
              sortOrder: typeof img.sortOrder === 'number' ? img.sortOrder : iIdx,
              primaryImage: Boolean(img.primaryImage),
            }))
        : [],
    };
  });
}

function VariantImagePreview({
  localPreviewUrl,
  imageUrl,
  accessToken,
  language,
  alt,
}: {
  localPreviewUrl?: string | null;
  imageUrl?: string | null;
  accessToken: string;
  language: Language;
  alt: string;
}) {
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const hasAccessToken = Boolean(accessToken);

  useEffect(() => {
    if (localPreviewUrl || !imageUrl || !hasAccessToken) {
      setBlobSrc(null);
      return;
    }

    let cancelled = false;
    let activeObjectUrl: string | null = null;
    setFailed(false);

    (async () => {
      try {
        const blob = await productApi.fetchImageBlob(accessToken, imageUrl, language);
        if (cancelled) return;
        if (!blob) {
          setBlobSrc(null);
          return;
        }
        activeObjectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(activeObjectUrl);
          return;
        }
        setBlobSrc(activeObjectUrl);
      } catch {
        if (!cancelled) {
          setBlobSrc(null);
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPreviewUrl, imageUrl, hasAccessToken, language]);

  const src = localPreviewUrl || blobSrc;

  if (!src || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f7f6f2] text-slate-400">
        <ImageIcon className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover"
    />
  );
}

export function ProductFormDrawer({
  open,
  editingProductId,
  focusVariantId,
  defaultCategoryId,
  language,
  accessToken,
  categoryOptions,
  brandOptions,
  onClose,
  onSaved,
  onUnauthorized,
  onForbidden,
  onNotFound,
}: ProductFormDrawerProps) {
  const t = translations[language];
  const tp = t.adminProducts;
  const [form] = Form.useForm<ProductFormValues>();

  const [loadingRecord, setLoadingRecord] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [variants, setVariants] = useState<VariantDraft[]>(() => [createEmptyVariant(true)]);
  const [variantsGlobalError, setVariantsGlobalError] = useState<string | null>(null);
  const [variantErrors, setVariantErrors] = useState<Record<string, VariantValidationErrors>>({});
  const [expandedDimensions, setExpandedDimensions] = useState<Record<string, boolean>>({});

  const multiFileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const replaceFileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const variantCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const createdObjectUrlsRef = useRef<Set<string>>(new Set());

  const revokeAllTrackedObjectUrls = () => {
    for (const url of createdObjectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    createdObjectUrlsRef.current.clear();
  };

  const trackObjectUrl = (file: File): string => {
    const url = URL.createObjectURL(file);
    createdObjectUrlsRef.current.add(url);
    return url;
  };

  const revokeTrackedObjectUrl = (url?: string | null) => {
    if (!url) return;
    if (createdObjectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      createdObjectUrlsRef.current.delete(url);
    }
  };

  useEffect(() => {
    return () => {
      revokeAllTrackedObjectUrls();
    };
  }, []);

  const syncStateFromDetailResponse = (detail: AdminProductDetailResponse) => {
    form.setFieldsValue({
      slug: detail.data.slug ?? '',
      brandId: detail.data.brandId ?? undefined,
      categoryIds: Array.isArray(detail.data.categoryIds) ? detail.data.categoryIds : [],
      status:
        detail.data.status === 'ACTIVE' ||
        detail.data.status === 'ARCHIVED' ||
        detail.data.status === 'DRAFT'
          ? detail.data.status
          : 'DRAFT',
      productKind: detail.data.productKind ?? '',
      warrantyMonths:
        typeof detail.data.warrantyMonths === 'number' ? detail.data.warrantyMonths : null,
      uz: {
        title: detail.data.uz?.title ?? detail.data.uz?.name ?? '',
        shortDescription: detail.data.uz?.shortDescription ?? '',
        description: detail.data.uz?.description ?? '',
        seoTitle: detail.data.uz?.seoTitle ?? '',
        seoDescription: detail.data.uz?.seoDescription ?? '',
      },
      ru: {
        title: detail.data.ru?.title ?? detail.data.ru?.name ?? '',
        shortDescription: detail.data.ru?.shortDescription ?? '',
        description: detail.data.ru?.description ?? '',
        seoTitle: detail.data.ru?.seoTitle ?? '',
        seoDescription: detail.data.ru?.seoDescription ?? '',
      },
    });
    setVariants(mapDetailToVariantsDraft(detail));
  };

  // Load detail on edit or initialize defaults on create
  useEffect(() => {
    if (!open) {
      revokeAllTrackedObjectUrls();
      return;
    }

    revokeAllTrackedObjectUrls();
    setSubmitError(null);
    setLoadError(null);
    setVariantsGlobalError(null);
    setVariantErrors({});
    setExpandedDimensions({});

    if (!editingProductId) {
      setLoadingRecord(false);
      setVariants([createEmptyVariant(true)]);
      form.setFieldsValue({
        slug: '',
        brandId: undefined,
        categoryIds: defaultCategoryId ? [defaultCategoryId] : [],
        status: 'DRAFT',
        productKind: '',
        warrantyMonths: null,
        uz: {
          title: '',
          shortDescription: '',
          description: '',
          seoTitle: '',
          seoDescription: '',
        },
        ru: {
          title: '',
          shortDescription: '',
          description: '',
          seoTitle: '',
          seoDescription: '',
        },
      });
      return;
    }

    let cancelled = false;
    setLoadingRecord(true);

    (async () => {
      try {
        const detail = await productApi.getProductById(accessToken, editingProductId, language);
        if (cancelled) return;

        syncStateFromDetailResponse(detail);

        if (focusVariantId) {
          window.setTimeout(() => {
            if (cancelled) return;
            variantCardRefs.current[focusVariantId]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }, 120);
        }
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
            setLoadError(error.message || tp.notFoundError);
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
  }, [open, editingProductId, defaultCategoryId]);

  const countTotalNewUploadFiles = (list: VariantDraft[]): number => {
    let total = 0;
    for (const variant of list) {
      for (const img of variant.images) {
        if (img.file) {
          total += 1;
        }
      }
    }
    return total;
  };

  const setVariantFieldError = (
    variantKey: string,
    field: keyof VariantValidationErrors,
    msg?: string,
  ) => {
    setVariantErrors((prev) => {
      const current = prev[variantKey] ?? {};
      const next = { ...current };
      if (msg) {
        next[field] = msg;
      } else {
        delete next[field];
      }
      return { ...prev, [variantKey]: next };
    });
  };

  const handleUpdateVariantField = <K extends keyof VariantDraft>(
    variantKey: string,
    field: K,
    value: VariantDraft[K],
  ) => {
    setVariantsGlobalError(null);
    if (field === 'sku') setVariantFieldError(variantKey, 'sku', undefined);
    if (field === 'regularPrice') {
      setVariantFieldError(variantKey, 'regularPrice', undefined);
      setVariantFieldError(variantKey, 'salePrice', undefined);
    }
    if (field === 'salePrice') {
      setVariantFieldError(variantKey, 'salePrice', undefined);
      setVariantFieldError(variantKey, 'regularPrice', undefined);
    }
    if (field === 'weightGrams') setVariantFieldError(variantKey, 'weightGrams', undefined);
    if (field === 'lengthMm') setVariantFieldError(variantKey, 'lengthMm', undefined);
    if (field === 'widthMm') setVariantFieldError(variantKey, 'widthMm', undefined);
    if (field === 'heightMm') setVariantFieldError(variantKey, 'heightMm', undefined);

    setVariants((prev) =>
      prev.map((item) => (item.clientKey === variantKey ? { ...item, [field]: value } : item)),
    );
  };

  const handleSetDefaultVariant = (variantKey: string, checked: boolean) => {
    setVariants((prev) =>
      prev.map((item) => {
        if (item.clientKey === variantKey) {
          return { ...item, defaultType: checked };
        }
        return checked ? { ...item, defaultType: false } : item;
      }),
    );
  };

  const handleAddVariant = () => {
    setVariantsGlobalError(null);
    if (variants.length >= MAX_VARIANTS) {
      setVariantsGlobalError(tp.validation.variantsMaxLimit);
      return;
    }
    setVariants((prev) => [...prev, createEmptyVariant(prev.length === 0)]);
  };

  const handleRemoveVariant = (variantKey: string) => {
    setVariantsGlobalError(null);
    if (variants.length <= 1) {
      setVariantsGlobalError(tp.validation.variantsRequired);
      return;
    }

    const target = variants.find((v) => v.clientKey === variantKey);
    if (target) {
      for (const img of target.images) {
        revokeTrackedObjectUrl(img.localPreviewUrl);
      }
    }

    setVariants((prev) => {
      const remaining = prev.filter((v) => v.clientKey !== variantKey);
      if (remaining.length > 0 && !remaining.some((v) => v.defaultType)) {
        remaining[0] = { ...remaining[0], defaultType: true };
      }
      return remaining;
    });

    setVariantErrors((prev) => {
      const next = { ...prev };
      delete next[variantKey];
      return next;
    });
  };

  const resolveImageCheckMessage = (
    reason?: 'invalid_type' | 'too_large' | 'invalid_dimensions' | 'unreadable',
  ): string => {
    if (reason === 'invalid_type') return tp.validation.imageInvalidType;
    if (reason === 'too_large') return tp.validation.imageTooLarge;
    if (reason === 'invalid_dimensions') return tp.validation.imageInvalidDimensions;
    return tp.validation.imageReadError;
  };

  const handleAddVariantImages = async (
    variantKey: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const fileList = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (fileList.length === 0) return;

    setVariantFieldError(variantKey, 'images', undefined);
    setVariantsGlobalError(null);

    const targetVariant = variants.find((v) => v.clientKey === variantKey);
    if (!targetVariant) return;

    let currentVariantImageCount = targetVariant.images.length;
    let currentTotalUploadCount = countTotalNewUploadFiles(variants);
    const errors: string[] = [];
    const acceptedImages: VariantImageDraft[] = [];

    for (const file of fileList) {
      if (currentVariantImageCount >= MAX_IMAGES_PER_VARIANT) {
        errors.push(tp.validation.imagesPerVariantLimit);
        break;
      }
      if (currentTotalUploadCount >= MAX_UPLOAD_FILES_PER_REQUEST) {
        errors.push(tp.validation.uploadFilesTotalLimit);
        break;
      }

      const check = await validateCategoryImageFile(file);
      if (!check.valid) {
        errors.push(`${file.name}: ${resolveImageCheckMessage(check.reason)}`);
        continue;
      }

      const previewUrl = trackObjectUrl(file);
      const willBePrimary =
        targetVariant.images.length === 0 && acceptedImages.length === 0;

      acceptedImages.push({
        clientKey: nextClientKey('img'),
        file,
        localPreviewUrl: previewUrl,
        imageUrl: null,
        sortOrder: currentVariantImageCount,
        primaryImage: willBePrimary,
      });

      currentVariantImageCount += 1;
      currentTotalUploadCount += 1;
    }

    if (acceptedImages.length > 0) {
      setVariants((prev) =>
        prev.map((v) => {
          if (v.clientKey !== variantKey) return v;
          const combined = [...v.images, ...acceptedImages].map((img, idx) => ({
            ...img,
            sortOrder: idx,
          }));
          return { ...v, images: combined };
        }),
      );
    }

    if (errors.length > 0) {
      setVariantFieldError(variantKey, 'images', errors[0]);
    }
  };

  const handleReplaceVariantImage = async (
    variantKey: string,
    imageKey: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setVariantFieldError(variantKey, 'images', undefined);

    const targetVariant = variants.find((v) => v.clientKey === variantKey);
    const targetImage = targetVariant?.images.find((img) => img.clientKey === imageKey);
    if (!targetVariant || !targetImage) return;

    const existingUploadCount = countTotalNewUploadFiles(variants);
    const additionalUploads = targetImage.file ? 0 : 1;
    if (existingUploadCount + additionalUploads > MAX_UPLOAD_FILES_PER_REQUEST) {
      setVariantFieldError(variantKey, 'images', tp.validation.uploadFilesTotalLimit);
      return;
    }

    const check = await validateCategoryImageFile(file);
    if (!check.valid) {
      setVariantFieldError(variantKey, 'images', resolveImageCheckMessage(check.reason));
      return;
    }

    const nextPreviewUrl = trackObjectUrl(file);
    revokeTrackedObjectUrl(targetImage.localPreviewUrl);

    setVariants((prev) =>
      prev.map((v) => {
        if (v.clientKey !== variantKey) return v;
        return {
          ...v,
          images: v.images.map((img) =>
            img.clientKey === imageKey
              ? {
                  ...img,
                  file,
                  localPreviewUrl: nextPreviewUrl,
                }
              : img,
          ),
        };
      }),
    );
  };

  const handleRemoveVariantImage = (variantKey: string, imageKey: string) => {
    setVariantFieldError(variantKey, 'images', undefined);

    const targetVariant = variants.find((v) => v.clientKey === variantKey);
    const targetImage = targetVariant?.images.find((img) => img.clientKey === imageKey);
    if (targetImage) {
      revokeTrackedObjectUrl(targetImage.localPreviewUrl);
    }

    setVariants((prev) =>
      prev.map((v) => {
        if (v.clientKey !== variantKey) return v;
        const nextImages = v.images
          .filter((img) => img.clientKey !== imageKey)
          .map((img, idx) => ({ ...img, sortOrder: idx }));
        if (nextImages.length > 0 && !nextImages.some((img) => img.primaryImage)) {
          nextImages[0] = { ...nextImages[0], primaryImage: true };
        }
        return { ...v, images: nextImages };
      }),
    );
  };

  const handleMoveVariantImage = (
    variantKey: string,
    imageIndex: number,
    direction: -1 | 1,
  ) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.clientKey !== variantKey) return v;
        const targetIndex = imageIndex + direction;
        if (targetIndex < 0 || targetIndex >= v.images.length) return v;
        const nextImages = [...v.images];
        const [moved] = nextImages.splice(imageIndex, 1);
        nextImages.splice(targetIndex, 0, moved);
        return {
          ...v,
          images: nextImages.map((img, idx) => ({ ...img, sortOrder: idx })),
        };
      }),
    );
  };

  const handleSetPrimaryImage = (variantKey: string, imageKey: string) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.clientKey !== variantKey) return v;
        return {
          ...v,
          images: v.images.map((img) => ({
            ...img,
            primaryImage: img.clientKey === imageKey,
          })),
        };
      }),
    );
  };

  const validateVariantsBeforeSubmit = (): boolean => {
    setVariantsGlobalError(null);
    const nextErrors: Record<string, VariantValidationErrors> = {};
    let hasError = false;

    if (variants.length === 0) {
      setVariantsGlobalError(tp.validation.variantsRequired);
      return false;
    }
    if (variants.length > MAX_VARIANTS) {
      setVariantsGlobalError(tp.validation.variantsMaxLimit);
      return false;
    }

    if (countTotalNewUploadFiles(variants) > MAX_UPLOAD_FILES_PER_REQUEST) {
      setVariantsGlobalError(tp.validation.uploadFilesTotalLimit);
      return false;
    }

    for (const v of variants) {
      const err: VariantValidationErrors = {};
      const skuTrimmed = v.sku.trim();
      if (!skuTrimmed) {
        err.sku = tp.validation.requiredSku;
      } else if (skuTrimmed.length > 120) {
        err.sku = tp.validation.skuMaxLength;
      }

      if (v.regularPrice !== null) {
        if (typeof v.regularPrice !== 'number' || !Number.isFinite(v.regularPrice) || v.regularPrice <= 0) {
          err.regularPrice = tp.validation.pricePositive;
        } else if (!hasAtMostTwoDecimals(v.regularPrice)) {
          err.regularPrice = tp.validation.priceDecimals;
        }
      }

      if (v.salePrice !== null) {
        if (typeof v.salePrice !== 'number' || !Number.isFinite(v.salePrice) || v.salePrice <= 0) {
          err.salePrice = tp.validation.pricePositive;
        } else if (!hasAtMostTwoDecimals(v.salePrice)) {
          err.salePrice = tp.validation.priceDecimals;
        } else if (v.regularPrice === null) {
          err.regularPrice = tp.validation.regularRequiredForSale;
        } else if (v.salePrice >= v.regularPrice) {
          err.salePrice = tp.validation.saleLessThanRegular;
        }
      }

      if (v.weightGrams !== null && v.weightGrams < 0) {
        err.weightGrams = tp.validation.nonNegativeInteger;
      }
      if (v.lengthMm !== null && v.lengthMm < 0) {
        err.lengthMm = tp.validation.nonNegativeInteger;
      }
      if (v.widthMm !== null && v.widthMm < 0) {
        err.widthMm = tp.validation.nonNegativeInteger;
      }
      if (v.heightMm !== null && v.heightMm < 0) {
        err.heightMm = tp.validation.nonNegativeInteger;
      }
      if (v.images.length > MAX_IMAGES_PER_VARIANT) {
        err.images = tp.validation.imagesPerVariantLimit;
      }

      if (Object.keys(err).length > 0) {
        hasError = true;
        nextErrors[v.clientKey] = err;
      }
    }

    setVariantErrors(nextErrors);
    return !hasError;
  };

  const applyBackendFieldErrors = (fields: string[], message: string) => {
    type ProductFormFieldItem = Parameters<typeof form.setFields>[0][number];
    type ProductFormFieldName = NonNullable<ProductFormFieldItem['name']>;

    const topLevelFieldErrors: ProductFormFieldItem[] = [];
    const nextVariantErrors: Record<string, VariantValidationErrors> = {};
    let nextGlobalVariantError: string | null = null;

    const mapProductFieldName = (rawPath: string): ProductFormFieldName | null => {
      const normalized = rawPath.replace(/^product\./, '').replace(/^data\./, '');
      switch (normalized) {
        case 'slug':
        case 'brandId':
        case 'categoryIds':
        case 'status':
        case 'productKind':
        case 'warrantyMonths':
          return normalized;
        case 'uz.title':
          return ['uz', 'title'];
        case 'uz.shortDescription':
          return ['uz', 'shortDescription'];
        case 'uz.description':
          return ['uz', 'description'];
        case 'uz.seoTitle':
          return ['uz', 'seoTitle'];
        case 'uz.seoDescription':
          return ['uz', 'seoDescription'];
        case 'ru.title':
          return ['ru', 'title'];
        case 'ru.shortDescription':
          return ['ru', 'shortDescription'];
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

    for (const rawPath of fields) {
      const variantMatch = /^variants\[(\d+)\](?:\.(.+))?$/.exec(rawPath);
      if (variantMatch) {
        const idx = Number(variantMatch[1]);
        const subPath = variantMatch[2] || '';
        const targetVariant = variants[idx];
        if (!targetVariant) continue;

        const current = nextVariantErrors[targetVariant.clientKey] ?? {};
        if (subPath.startsWith('images')) {
          current.images = message;
        } else if (subPath === 'sku') {
          current.sku = message;
        } else if (subPath === 'barcode') {
          current.barcode = message;
        } else if (subPath === 'status') {
          current.status = message;
        } else if (subPath === 'regularPrice' || subPath === 'price.regularPrice') {
          current.regularPrice = message;
        } else if (subPath === 'salePrice' || subPath === 'price.salePrice') {
          current.salePrice = message;
        } else if (subPath === 'price') {
          current.regularPrice = message;
        } else if (subPath === 'weightGrams') {
          current.weightGrams = message;
        } else if (subPath === 'lengthMm') {
          current.lengthMm = message;
        } else if (subPath === 'widthMm') {
          current.widthMm = message;
        } else if (subPath === 'heightMm') {
          current.heightMm = message;
        } else {
          current.general = message;
        }
        nextVariantErrors[targetVariant.clientKey] = current;
        continue;
      }

      if (rawPath === 'variants') {
        nextGlobalVariantError = message;
        continue;
      }

      const mapped = mapProductFieldName(rawPath);
      if (mapped) {
        topLevelFieldErrors.push({ name: mapped, errors: [message] });
      }
    }

    if (topLevelFieldErrors.length > 0) {
      form.setFields(topLevelFieldErrors);
    }
    if (Object.keys(nextVariantErrors).length > 0) {
      setVariantErrors((prev) => ({ ...prev, ...nextVariantErrors }));
      setExpandedDimensions((prev) => {
        const next = { ...prev };
        for (const [key, err] of Object.entries(nextVariantErrors)) {
          if (err.weightGrams || err.lengthMm || err.widthMm || err.heightMm) {
            next[key] = true;
          }
        }
        return next;
      });
    }
    if (nextGlobalVariantError) {
      setVariantsGlobalError(nextGlobalVariantError);
    }
  };

  const handleFinish = async (values: ProductFormValues) => {
    setSubmitError(null);
    if (!validateVariantsBeforeSubmit()) {
      return;
    }

    setSubmitting(true);
    const fileMap = new Map<string, File>();
    let fileCounter = 0;

    const variantPayloads: AdminProductVariantPayload[] = variants.map((v, vIdx) => {
      const imagesPayload = v.images.map((img, iIdx) => {
        if (img.file) {
          fileCounter += 1;
          const filePart = `file_v${vIdx}_i${iIdx}_${fileCounter}`;
          fileMap.set(filePart, img.file);
          return {
            ...(img.id ? { id: img.id } : {}),
            filePart,
            sortOrder: iIdx,
            primaryImage: Boolean(img.primaryImage),
          };
        }

        return {
          ...(img.id ? { id: img.id } : {}),
          sortOrder: iIdx,
          primaryImage: Boolean(img.primaryImage),
        };
      });

      return {
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku.trim(),
        titleUz: v.titleUz.trim(),
        titleRu: v.titleRu.trim(),
        barcode: toNullableTrimmed(v.barcode),
        status: toNullableTrimmed(v.status),
        regularPrice: toOptionalMoney(v.regularPrice),
        salePrice: toOptionalMoney(v.salePrice),
        weightGrams: toOptionalNonNegativeInt(v.weightGrams),
        lengthMm: toOptionalNonNegativeInt(v.lengthMm),
        widthMm: toOptionalNonNegativeInt(v.widthMm),
        heightMm: toOptionalNonNegativeInt(v.heightMm),
        defaultType: Boolean(v.defaultType),
        images: imagesPayload,
      };
    });

    const payload: AdminProductPayload = {
      product: {
        slug: values.slug.trim(),
        brandId: toNullableTrimmed(values.brandId),
        categoryIds: Array.isArray(values.categoryIds) ? values.categoryIds : [],
        status: values.status || 'DRAFT',
        productKind: toNullableTrimmed(values.productKind),
        warrantyMonths: toOptionalNonNegativeInt(values.warrantyMonths),
        uz: buildTranslationPayload(values.uz),
        ru: buildTranslationPayload(values.ru),
      },
      variants: variantPayloads,
    };

    try {
      if (editingProductId) {
        const updated = await productApi.updateProduct(
          accessToken,
          editingProductId,
          payload,
          fileMap,
          language,
        );
        revokeAllTrackedObjectUrls();
        syncStateFromDetailResponse(updated);
        onSaved(updated, 'edit');
      } else {
        const created = await productApi.createProduct(
          accessToken,
          payload,
          fileMap,
          language,
        );
        revokeAllTrackedObjectUrls();
        syncStateFromDetailResponse(created);
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
          setSubmitError(`${tp.backendForbiddenTitle} (${endpointPrefix}${error.message})`);
          onForbidden(error.message, error.endpoint);
          return;
        }
        if (error.status === 404) {
          setSubmitError(error.message || tp.notFoundError);
          onNotFound();
          return;
        }

        if (error.status === 409) {
          setSubmitError(error.message || tp.validation.conflictError);
        } else if (error.status === 413) {
          setSubmitError(error.message || tp.validation.payloadTooLargeError);
        } else if (error.status === 415) {
          setSubmitError(error.message || tp.validation.unsupportedMediaError);
        } else {
          setSubmitError(error.message);
        }

        if (error.fields.length > 0) {
          applyBackendFieldErrors(error.fields, error.message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const productStatusOptions = [
    { value: 'DRAFT', label: tp.statusNames.DRAFT },
    { value: 'ACTIVE', label: tp.statusNames.ACTIVE },
    { value: 'ARCHIVED', label: tp.statusNames.ARCHIVED },
  ];

  const variantStatusOptions = [
    { value: 'ACTIVE', label: tp.variantStatusNames.ACTIVE },
    { value: 'INACTIVE', label: tp.variantStatusNames.INACTIVE },
    { value: 'DRAFT', label: tp.variantStatusNames.DRAFT },
  ];

  const totalUploadCount = countTotalNewUploadFiles(variants);

  return (
    <Drawer
      title={
        <span className="font-display font-semibold text-slate-900">
          {editingProductId ? tp.form.editTitle : tp.form.createTitle}
        </span>
      }
      open={open}
      onClose={onClose}
      size={880}
      styles={{ body: { paddingBottom: 32 } }}
      destroyOnHidden
    >
      {loadingRecord ? (
        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-500">{tp.form.loadingProduct}</p>
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      ) : loadError ? (
        <div className="space-y-4">
          <Alert type="error" showIcon title={loadError} className="rounded-lg" />
          <Button onClick={onClose}>{tp.form.cancel}</Button>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onFinishFailed={() => {
            validateVariantsBeforeSubmit();
          }}
          requiredMark={false}
          initialValues={{
            slug: '',
            categoryIds: defaultCategoryId ? [defaultCategoryId] : [],
            status: 'DRAFT',
            productKind: '',
            warrantyMonths: null,
            uz: {
              title: '',
              shortDescription: '',
              description: '',
              seoTitle: '',
              seoDescription: '',
            },
            ru: {
              title: '',
              shortDescription: '',
              description: '',
              seoTitle: '',
              seoDescription: '',
            },
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

          {/* Product Metadata Section */}
          <section className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-4 sm:p-5 mb-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3.5">
              {tp.form.productSection}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Form.Item
                name="slug"
                label={
                  <div className="w-full flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">{tp.form.slugLabel}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const uzTitle = form.getFieldValue(['uz', 'title']) as string | undefined;
                        const ruTitle = form.getFieldValue(['ru', 'title']) as string | undefined;
                        const candidate = slugifyCategoryText(uzTitle || ruTitle || '');
                        if (candidate) {
                          form.setFieldValue('slug', candidate);
                        }
                      }}
                      className="text-xs font-medium text-[#16a34a] hover:text-[#15803d] cursor-pointer"
                    >
                      {tp.form.slugGenerate}
                    </button>
                  </div>
                }
                rules={[
                  {
                    validator: (_, value: string) => {
                      const trimmed = (value || '').trim();
                      if (!trimmed) {
                        return Promise.reject(new Error(tp.validation.requiredSlug));
                      }
                      if (trimmed.length > 160) {
                        return Promise.reject(new Error(tp.validation.slugMaxLength));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder={tp.form.slugPlaceholder}
                  disabled={submitting}
                  onBlur={(e) => {
                    const current = e.target.value;
                    if (current && !current.includes('-')) {
                      const normalized = slugifyCategoryText(current);
                      if (normalized) {
                        form.setFieldValue('slug', normalized);
                      }
                    }
                  }}
                  className="font-mono-tabular !min-h-[44px]"
                />
              </Form.Item>

              <Form.Item
                name="status"
                label={
                  <span className="text-sm font-medium text-slate-700">{tp.form.statusLabel}</span>
                }
              >
                <Select
                  size="large"
                  options={productStatusOptions}
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name="categoryIds"
                className="md:col-span-2"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.categoriesLabel}
                  </span>
                }
                rules={[
                  {
                    validator: (_, value?: string[]) => {
                      if (!Array.isArray(value) || value.length === 0) {
                        return Promise.reject(new Error(tp.validation.requiredCategories));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  size="large"
                  showSearch
                  optionFilterProp="label"
                  placeholder={tp.form.categoriesPlaceholder}
                  options={categoryOptions}
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name="brandId"
                label={
                  <span className="text-sm font-medium text-slate-700">{tp.form.brandLabel}</span>
                }
              >
                <Select
                  size="large"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={tp.form.brandPlaceholder}
                  options={brandOptions}
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name="warrantyMonths"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.warrantyMonthsLabel}
                  </span>
                }
                rules={[
                  {
                    validator: (_, value?: number | null) => {
                      if (value === undefined || value === null) return Promise.resolve();
                      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
                        return Promise.reject(new Error(tp.validation.warrantyInvalid));
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
                  placeholder={tp.form.warrantyMonthsPlaceholder}
                  disabled={submitting}
                  className="!w-full"
                />
              </Form.Item>

              <Form.Item
                name="productKind"
                className="md:col-span-2 !mb-0"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.productKindLabel}
                  </span>
                }
              >
                <Input
                  size="large"
                  placeholder={tp.form.productKindPlaceholder}
                  disabled={submitting}
                  className="!min-h-[44px]"
                />
              </Form.Item>
            </div>
          </section>

          {/* Uzbek & Russian Content Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* Uzbek */}
            <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{tp.form.uzSection}</h3>

              <Form.Item
                name={['uz', 'title']}
                dependencies={[['ru', 'title']]}
                label={
                  <span className="text-sm font-medium text-slate-700">{tp.form.titleLabel}</span>
                }
                rules={[
                  {
                    validator: (_, value: string) => {
                      const uzHas = Boolean(toNullableTrimmed(value));
                      const ruHas = Boolean(toNullableTrimmed(form.getFieldValue(['ru', 'title'])));
                      if (uzHas || ruHas) return Promise.resolve();
                      return Promise.reject(new Error(tp.validation.titleRequiredAnyLang));
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder={tp.form.titlePlaceholderUz}
                  disabled={submitting}
                  className="!min-h-[44px]"
                />
              </Form.Item>

              <Form.Item
                name={['uz', 'shortDescription']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.shortDescriptionLabel}
                  </span>
                }
              >
                <Input.TextArea
                  rows={2}
                  placeholder={tp.form.shortDescriptionPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name={['uz', 'description']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.descriptionLabel}
                  </span>
                }
              >
                <Input.TextArea
                  rows={3}
                  placeholder={tp.form.descriptionPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name={['uz', 'seoTitle']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.seoTitleLabel}
                  </span>
                }
              >
                <Input
                  size="large"
                  placeholder={tp.form.seoTitlePlaceholder}
                  disabled={submitting}
                  className="!min-h-[44px]"
                />
              </Form.Item>

              <Form.Item
                name={['uz', 'seoDescription']}
                className="!mb-0"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.seoDescriptionLabel}
                  </span>
                }
              >
                <Input.TextArea
                  rows={2}
                  placeholder={tp.form.seoDescriptionPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>
            </div>

            {/* Russian */}
            <div className="rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">{tp.form.ruSection}</h3>

              <Form.Item
                name={['ru', 'title']}
                dependencies={[['uz', 'title']]}
                label={
                  <span className="text-sm font-medium text-slate-700">{tp.form.titleLabel}</span>
                }
                rules={[
                  {
                    validator: (_, value: string) => {
                      const ruHas = Boolean(toNullableTrimmed(value));
                      const uzHas = Boolean(toNullableTrimmed(form.getFieldValue(['uz', 'title'])));
                      if (uzHas || ruHas) return Promise.resolve();
                      return Promise.reject(new Error(tp.validation.titleRequiredAnyLang));
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  placeholder={tp.form.titlePlaceholderRu}
                  disabled={submitting}
                  className="!min-h-[44px]"
                />
              </Form.Item>

              <Form.Item
                name={['ru', 'shortDescription']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.shortDescriptionLabel}
                  </span>
                }
              >
                <Input.TextArea
                  rows={2}
                  placeholder={tp.form.shortDescriptionPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name={['ru', 'description']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.descriptionLabel}
                  </span>
                }
              >
                <Input.TextArea
                  rows={3}
                  placeholder={tp.form.descriptionPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name={['ru', 'seoTitle']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.seoTitleLabel}
                  </span>
                }
              >
                <Input
                  size="large"
                  placeholder={tp.form.seoTitlePlaceholder}
                  disabled={submitting}
                  className="!min-h-[44px]"
                />
              </Form.Item>

              <Form.Item
                name={['ru', 'seoDescription']}
                className="!mb-0"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {tp.form.seoDescriptionLabel}
                  </span>
                }
              >
                <Input.TextArea
                  rows={2}
                  placeholder={tp.form.seoDescriptionPlaceholder}
                  disabled={submitting}
                />
              </Form.Item>
            </div>
          </div>

          {/* Variants & Images Section */}
          <section className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {tp.form.variantsSection}
                  </h3>
                  <span className="text-xs font-mono-tabular text-slate-500">
                    {variants.length} / {MAX_VARIANTS}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tp.form.variantsLimitHint} · {totalUploadCount}/{MAX_UPLOAD_FILES_PER_REQUEST}
                </p>
              </div>

              <Button
                type="default"
                size="large"
                icon={<Plus className="w-4 h-4" />}
                disabled={submitting || variants.length >= MAX_VARIANTS}
                onClick={handleAddVariant}
                className="!min-h-[44px] !inline-flex !items-center !justify-center whitespace-nowrap"
              >
                {tp.form.addVariantButton}
              </Button>
            </div>

            {variantsGlobalError && (
              <Alert
                type="error"
                showIcon
                title={variantsGlobalError}
                className="text-xs rounded-lg"
              />
            )}

            <div className="space-y-4">
              {variants.map((variant, vIdx) => {
                const vErr = variantErrors[variant.clientKey] ?? {};
                const isFocused = Boolean(focusVariantId && variant.id === focusVariantId);

                return (
                  <div
                    key={variant.clientKey}
                    ref={(el) => {
                      if (variant.id) {
                        variantCardRefs.current[variant.id] = el;
                      }
                    }}
                    className={`rounded-xl border bg-white p-4 sm:p-5 space-y-4 ${
                      isFocused
                        ? 'border-[#16a34a] ring-2 ring-[#bbf7d0]'
                        : variant.defaultType
                          ? 'border-[#86efac]'
                          : 'border-[#e6e4dd]'
                    }`}
                  >
                    {/* Variant Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f2f0ea]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-semibold text-slate-900">
                          {tp.form.variantCardTitle} #{vIdx + 1}
                        </span>
                        {variant.sku.trim() && (
                          <span className="text-xs font-mono-tabular text-slate-500 truncate max-w-[200px]">
                            {variant.sku.trim()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <Switch
                            checked={variant.defaultType}
                            disabled={submitting}
                            onChange={(checked) =>
                              handleSetDefaultVariant(variant.clientKey, checked)
                            }
                          />
                          <span
                            className={`text-xs font-medium whitespace-nowrap ${
                              variant.defaultType ? 'text-[#15803d]' : 'text-slate-600'
                            }`}
                          >
                            {variant.defaultType
                              ? tp.form.defaultTypeActive
                              : tp.form.defaultTypeMakeDefault}
                          </span>
                        </label>

                        <Button
                          danger
                          size="middle"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          disabled={submitting || variants.length <= 1}
                          onClick={() => handleRemoveVariant(variant.clientKey)}
                          className="!inline-flex !items-center !min-h-[38px]"
                        >
                          {tp.form.removeVariantButton}
                        </Button>
                      </div>
                    </div>

                    {vErr.general && (
                      <Alert
                        type="error"
                        showIcon
                        title={vErr.general}
                        className="text-xs rounded-lg"
                      />
                    )}

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-slate-700">
                        {language === 'ru' ? 'Название варианта (UZ)' : 'Variant nomi (UZ)'}
                        <Input className="mt-1" size="large" maxLength={150} value={variant.titleUz}
                          disabled={submitting} placeholder="Qora titan · 128 GB"
                          onChange={event => handleUpdateVariantField(variant.clientKey, 'titleUz', event.target.value)} />
                      </label>
                      <label className="block text-xs font-medium text-slate-700">
                        {language === 'ru' ? 'Название варианта (RU)' : 'Variant nomi (RU)'}
                        <Input className="mt-1" size="large" maxLength={150} value={variant.titleRu}
                          disabled={submitting} placeholder="Чёрный титан · 128 ГБ"
                          onChange={event => handleUpdateVariantField(variant.clientKey, 'titleRu', event.target.value)} />
                      </label>
                    </div>

                    {/* Variant Core Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          {tp.form.skuLabel}
                        </label>
                        <Input
                          size="large"
                          value={variant.sku}
                          status={vErr.sku ? 'error' : undefined}
                          placeholder={tp.form.skuPlaceholder}
                          disabled={submitting}
                          onChange={(e) =>
                            handleUpdateVariantField(variant.clientKey, 'sku', e.target.value)
                          }
                          className="font-mono-tabular !min-h-[44px]"
                        />
                        {vErr.sku && (
                          <p role="alert" className="mt-1 text-xs text-red-600">
                            {vErr.sku}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          {tp.form.barcodeLabel}
                        </label>
                        <Input
                          size="large"
                          value={variant.barcode}
                          status={vErr.barcode ? 'error' : undefined}
                          placeholder={tp.form.barcodePlaceholder}
                          disabled={submitting}
                          onChange={(e) =>
                            handleUpdateVariantField(
                              variant.clientKey,
                              'barcode',
                              e.target.value,
                            )
                          }
                          className="font-mono-tabular !min-h-[44px]"
                        />
                        {vErr.barcode && (
                          <p role="alert" className="mt-1 text-xs text-red-600">
                            {vErr.barcode}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          {tp.form.variantStatusLabel}
                        </label>
                        <Select
                          size="large"
                          allowClear
                          value={variant.status || undefined}
                          status={vErr.status ? 'error' : undefined}
                          placeholder={tp.form.variantStatusPlaceholder}
                          options={variantStatusOptions}
                          disabled={submitting}
                          onChange={(val) =>
                            handleUpdateVariantField(variant.clientKey, 'status', val ?? '')
                          }
                          className="!w-full"
                        />
                        {vErr.status && (
                          <p role="alert" className="mt-1 text-xs text-red-600">
                            {vErr.status}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Variant Pricing Fields */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">
                            {tp.form.regularPriceLabel}
                          </label>
                          <InputNumber
                            size="large"
                            step={1000}
                            placeholder={tp.form.regularPricePlaceholder}
                            value={variant.regularPrice}
                            status={vErr.regularPrice ? 'error' : undefined}
                            disabled={submitting}
                            onChange={(val) =>
                              handleUpdateVariantField(
                                variant.clientKey,
                                'regularPrice',
                                typeof val === 'number' && !Number.isNaN(val) ? val : null,
                              )
                            }
                            className="!w-full font-mono-tabular"
                          />
                          {vErr.regularPrice && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                              {vErr.regularPrice}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">
                            {tp.form.salePriceLabel}
                          </label>
                          <InputNumber
                            size="large"
                            step={1000}
                            placeholder={tp.form.salePricePlaceholder}
                            value={variant.salePrice}
                            status={vErr.salePrice ? 'error' : undefined}
                            disabled={submitting}
                            onChange={(val) =>
                              handleUpdateVariantField(
                                variant.clientKey,
                                'salePrice',
                                typeof val === 'number' && !Number.isNaN(val) ? val : null,
                              )
                            }
                            className="!w-full font-mono-tabular"
                          />
                          {vErr.salePrice && (
                            <p role="alert" className="mt-1 text-xs text-red-600">
                              {vErr.salePrice}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">{tp.form.priceSectionHint}</p>
                    </div>

                    {/* Collapsible Variant Dimensions & Weight (collapsed by default) */}
                    {(() => {
                      const hasDimensionError = Boolean(
                        vErr.weightGrams || vErr.lengthMm || vErr.widthMm || vErr.heightMm,
                      );
                      const isDimensionsOpen =
                        Boolean(expandedDimensions[variant.clientKey]) || hasDimensionError;

                      const dimParts: string[] = [];
                      if (typeof variant.weightGrams === 'number') {
                        dimParts.push(`${variant.weightGrams} g`);
                      }
                      const sizeDims = [variant.lengthMm, variant.widthMm, variant.heightMm].filter(
                        (n): n is number => typeof n === 'number',
                      );
                      if (sizeDims.length > 0) {
                        const l = variant.lengthMm ?? '—';
                        const w = variant.widthMm ?? '—';
                        const h = variant.heightMm ?? '—';
                        dimParts.push(`${l} × ${w} × ${h} mm`);
                      }

                      return (
                        <div className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5]">
                          <button
                            type="button"
                            aria-expanded={isDimensionsOpen}
                            onClick={() =>
                              setExpandedDimensions((prev) => ({
                                ...prev,
                                [variant.clientKey]: !isDimensionsOpen,
                              }))
                            }
                            className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[#f2f0ea]/60 transition-colors rounded-lg"
                          >
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 min-w-0">
                              <span className="text-xs font-medium text-slate-700">
                                {tp.form.dimensionsOptionalTitle}
                              </span>
                              {dimParts.length > 0 && (
                                <span className="text-xs font-mono-tabular text-slate-500">
                                  {dimParts.join(' · ')}
                                </span>
                              )}
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                                isDimensionsOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {isDimensionsOpen && (
                            <div className="px-3.5 pb-3.5 pt-2 border-t border-[#e6e4dd] grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                  {tp.form.weightGramsLabel}
                                </label>
                                <InputNumber
                                  size="large"
                                  min={0}
                                  precision={0}
                                  placeholder="—"
                                  value={variant.weightGrams}
                                  status={vErr.weightGrams ? 'error' : undefined}
                                  disabled={submitting}
                                  onChange={(val) =>
                                    handleUpdateVariantField(
                                      variant.clientKey,
                                      'weightGrams',
                                      typeof val === 'number' && !Number.isNaN(val) ? val : null,
                                    )
                                  }
                                  className="!w-full"
                                />
                                {vErr.weightGrams && (
                                  <p role="alert" className="mt-1 text-xs text-red-600">
                                    {vErr.weightGrams}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                  {tp.form.lengthMmLabel}
                                </label>
                                <InputNumber
                                  size="large"
                                  min={0}
                                  precision={0}
                                  placeholder="—"
                                  value={variant.lengthMm}
                                  status={vErr.lengthMm ? 'error' : undefined}
                                  disabled={submitting}
                                  onChange={(val) =>
                                    handleUpdateVariantField(
                                      variant.clientKey,
                                      'lengthMm',
                                      typeof val === 'number' && !Number.isNaN(val) ? val : null,
                                    )
                                  }
                                  className="!w-full"
                                />
                                {vErr.lengthMm && (
                                  <p role="alert" className="mt-1 text-xs text-red-600">
                                    {vErr.lengthMm}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                  {tp.form.widthMmLabel}
                                </label>
                                <InputNumber
                                  size="large"
                                  min={0}
                                  precision={0}
                                  placeholder="—"
                                  value={variant.widthMm}
                                  status={vErr.widthMm ? 'error' : undefined}
                                  disabled={submitting}
                                  onChange={(val) =>
                                    handleUpdateVariantField(
                                      variant.clientKey,
                                      'widthMm',
                                      typeof val === 'number' && !Number.isNaN(val) ? val : null,
                                    )
                                  }
                                  className="!w-full"
                                />
                                {vErr.widthMm && (
                                  <p role="alert" className="mt-1 text-xs text-red-600">
                                    {vErr.widthMm}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                  {tp.form.heightMmLabel}
                                </label>
                                <InputNumber
                                  size="large"
                                  min={0}
                                  precision={0}
                                  placeholder="—"
                                  value={variant.heightMm}
                                  status={vErr.heightMm ? 'error' : undefined}
                                  disabled={submitting}
                                  onChange={(val) =>
                                    handleUpdateVariantField(
                                      variant.clientKey,
                                      'heightMm',
                                      typeof val === 'number' && !Number.isNaN(val) ? val : null,
                                    )
                                  }
                                  className="!w-full"
                                />
                                {vErr.heightMm && (
                                  <p role="alert" className="mt-1 text-xs text-red-600">
                                    {vErr.heightMm}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Variant Multi-Image Manager */}
                    <div className="pt-2 border-t border-[#f2f0ea] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800">
                              {tp.form.imagesSectionLabel}
                            </span>
                            <span className="text-xs font-mono-tabular text-slate-500">
                              {variant.images.length} / {MAX_IMAGES_PER_VARIANT}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{tp.form.imagesHint}</p>
                        </div>

                        <div>
                          <input
                            ref={(el) => {
                              multiFileInputsRef.current[variant.clientKey] = el;
                            }}
                            type="file"
                            accept="image/png,image/jpeg"
                            multiple
                            onChange={(e) => void handleAddVariantImages(variant.clientKey, e)}
                            className="hidden"
                          />
                          <Button
                            size="middle"
                            icon={<ImagePlus className="w-4 h-4" />}
                            disabled={
                              submitting ||
                              variant.images.length >= MAX_IMAGES_PER_VARIANT ||
                              totalUploadCount >= MAX_UPLOAD_FILES_PER_REQUEST
                            }
                            onClick={() => multiFileInputsRef.current[variant.clientKey]?.click()}
                            className="!min-h-[40px] !inline-flex !items-center !justify-center whitespace-nowrap"
                          >
                            {tp.form.selectImagesButton}
                          </Button>
                        </div>
                      </div>

                      {vErr.images && (
                        <p role="alert" className="text-xs text-red-600">
                          {vErr.images}
                        </p>
                      )}

                      {variant.images.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#e6e4dd] bg-[#faf9f5] px-4 py-3 text-xs text-slate-500">
                          {tp.form.noImagesYet}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {variant.images.map((img, iIdx) => (
                            <div
                              key={img.clientKey}
                              className={`rounded-lg border p-2.5 flex flex-col gap-2.5 ${
                                img.primaryImage
                                  ? 'border-[#16a34a] bg-[#f0fdf4]/40'
                                  : 'border-[#e6e4dd] bg-[#faf9f5]'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="w-16 h-16 rounded-md border border-[#e6e4dd] bg-white overflow-hidden shrink-0">
                                  <VariantImagePreview
                                    localPreviewUrl={img.localPreviewUrl}
                                    imageUrl={img.imageUrl}
                                    accessToken={accessToken}
                                    language={language}
                                    alt={`${tp.form.imageAlt} ${iIdx + 1}`}
                                  />
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center justify-between gap-1 text-xs">
                                    <span className="font-mono-tabular text-slate-600">
                                      {tp.form.sortOrderLabel}: {iIdx + 1}
                                    </span>
                                    {img.primaryImage && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803d]">
                                        <Star className="w-3 h-3 fill-[#15803d]" />
                                        {tp.form.primaryImageLabel}
                                      </span>
                                    )}
                                  </div>

                                  {img.file && (
                                    <div className="text-[11px] text-slate-500 truncate">
                                      {img.file.name}
                                    </div>
                                  )}

                                  {!img.primaryImage && (
                                    <button
                                      type="button"
                                      disabled={submitting}
                                      onClick={() =>
                                        handleSetPrimaryImage(variant.clientKey, img.clientKey)
                                      }
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16a34a] hover:text-[#15803d] cursor-pointer"
                                    >
                                      <Star className="w-3 h-3" />
                                      <span>{tp.form.setPrimaryImageButton}</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <input
                                ref={(el) => {
                                  replaceFileInputsRef.current[img.clientKey] = el;
                                }}
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={(e) =>
                                  void handleReplaceVariantImage(
                                    variant.clientKey,
                                    img.clientKey,
                                    e,
                                  )
                                }
                                className="hidden"
                              />

                              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#e6e4dd]/70">
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="small"
                                    icon={<ArrowLeft className="w-3.5 h-3.5" />}
                                    disabled={submitting || iIdx === 0}
                                    onClick={() =>
                                      handleMoveVariantImage(variant.clientKey, iIdx, -1)
                                    }
                                    title={tp.form.moveImageUp}
                                    aria-label={tp.form.moveImageUp}
                                  />
                                  <Button
                                    size="small"
                                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                                    disabled={submitting || iIdx === variant.images.length - 1}
                                    onClick={() =>
                                      handleMoveVariantImage(variant.clientKey, iIdx, 1)
                                    }
                                    title={tp.form.moveImageDown}
                                    aria-label={tp.form.moveImageDown}
                                  />
                                </div>

                                <div className="flex items-center gap-1">
                                  <Button
                                    size="small"
                                    icon={<RefreshCw className="w-3 h-3" />}
                                    disabled={
                                      submitting ||
                                      (!img.file &&
                                        totalUploadCount >= MAX_UPLOAD_FILES_PER_REQUEST)
                                    }
                                    onClick={() =>
                                      replaceFileInputsRef.current[img.clientKey]?.click()
                                    }
                                    title={tp.form.replaceImageButton}
                                    aria-label={tp.form.replaceImageButton}
                                  />
                                  <Button
                                    danger
                                    size="small"
                                    icon={<Trash2 className="w-3 h-3" />}
                                    disabled={submitting}
                                    onClick={() =>
                                      handleRemoveVariantImage(variant.clientKey, img.clientKey)
                                    }
                                    title={tp.form.removeImageButton}
                                    aria-label={tp.form.removeImageButton}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-[#e6e4dd]">
            <Button
              size="large"
              disabled={submitting}
              onClick={onClose}
              className="!min-h-[44px]"
            >
              {tp.form.cancel}
            </Button>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={submitting}
              className="!min-h-[44px]"
            >
              {editingProductId ? tp.form.saveUpdate : tp.form.saveCreate}
            </Button>
          </div>
        </Form>
      )}
    </Drawer>
  );
}
