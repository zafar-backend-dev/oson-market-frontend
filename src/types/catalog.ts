export interface CatalogBrandSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface CatalogProductImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
  primaryImage: boolean;
}

export interface CatalogVariantPrice {
  currency: string;
  regularPrice: number;
  salePrice: number | null;
  amount: number;
}

export interface CatalogVariant {
  id: string;
  sku: string;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  defaultType: boolean;
  price?: CatalogVariantPrice | null;
  images: CatalogProductImage[];
}

export interface CartItem {
  variantId: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  sku: string;
  imageUrl: string | null;
  price: CatalogVariantPrice;
  quantity: number;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  language: string;
  brand: CatalogBrandSummary | null;
  productKind: string | null;
  warrantyMonths: number | null;
  variants: CatalogVariant[];
}

export interface CatalogCategoryNode {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  language: string;
  imageUrl: string | null;
  sortOrder: number;
  children: CatalogCategoryNode[];
  products: CatalogProduct[];
}

export interface CatalogTreeResponse {
  categories: CatalogCategoryNode[];
  uncategorizedProducts: CatalogProduct[];
}

export interface PublicCategoryRecord {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  language: string;
  imageUrl: string | null;
  sortOrder: number;
}

export interface ProductSocialSummary {
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
}

export interface ProductLikeResponse {
  likeCount: number;
  likedByMe: boolean;
}

export interface ProductComment {
  id: string;
  parentId: string | null;
  authorUsername: string;
  authorAvatarUrl?: string | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
  ownedByMe: boolean;
}

export interface CatalogPageMetadata {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProductCommentPageResponse {
  content: ProductComment[];
  page: CatalogPageMetadata;
}
