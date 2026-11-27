import type { PageMetadata } from './category';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type VariantStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';

export interface AdminBrandTranslation {
  name?: string | null;
}

export interface AdminBrandData {
  name?: string | null;
  slug?: string | null;
  active?: boolean;
  uz?: AdminBrandTranslation | null;
  ru?: AdminBrandTranslation | null;
}

export interface AdminBrandItem {
  id: string;
  data: AdminBrandData;
}

export interface AdminBrandPageResponse {
  content: AdminBrandItem[];
  page: PageMetadata;
}

export interface AdminProductTranslation {
  title?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  name?: string | null;
}

export interface AdminProductData {
  slug: string;
  brandId: string | null;
  categoryIds: string[];
  status: ProductStatus | string;
  productKind: string | null;
  warrantyMonths: number | null;
  name?: string | null;
  title?: string | null;
  uz?: AdminProductTranslation | null;
  ru?: AdminProductTranslation | null;
}

export interface AdminProductListItem {
  id: string;
  data: AdminProductData;
}

export interface AdminProductPageResponse {
  content: AdminProductListItem[];
  page: PageMetadata;
}

export interface AdminProductVariantImageResponse {
  id: string;
  imageUrl: string | null;
  sortOrder: number;
  primaryImage: boolean;
}

export interface AdminProductVariantPrice {
  currency?: string | null;
  regularPrice?: number | null;
  salePrice?: number | null;
  amount?: number | null;
}

export interface AdminProductVariantResponse {
  id: string;
  sku: string;
  titleUz?: string | null;
  titleRu?: string | null;
  barcode: string | null;
  status: VariantStatus | string | null;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  defaultType: boolean;
  regularPrice?: number | null;
  salePrice?: number | null;
  price?: AdminProductVariantPrice | null;
  images: AdminProductVariantImageResponse[];
}

export interface AdminProductDetailResponse {
  id: string;
  data: AdminProductData;
  variants: AdminProductVariantResponse[];
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
}

export interface AdminProductVariantImagePayload {
  id?: string;
  filePart?: string;
  sortOrder: number;
  primaryImage: boolean;
}

export interface AdminProductVariantPayload {
  id?: string;
  sku: string;
  titleUz?: string | null;
  titleRu?: string | null;
  barcode?: string | null;
  status?: string | null;
  weightGrams?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  regularPrice: number | null;
  salePrice: number | null;
  defaultType?: boolean;
  images: AdminProductVariantImagePayload[];
}

export interface AdminProductPayload {
  product: {
    slug: string;
    brandId: string | null;
    categoryIds: string[];
    status: ProductStatus | string;
    productKind: string | null;
    warrantyMonths: number | null;
    uz?: Omit<AdminProductTranslation, 'name'> | null;
    ru?: Omit<AdminProductTranslation, 'name'> | null;
  };
  variants: AdminProductVariantPayload[];
}
