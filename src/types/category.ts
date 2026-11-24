export interface CategoryTranslation {
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface AdminCategoryData {
  slug: string;
  parentId: string | null;
  imageMediaId: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  active: boolean;
  uz: CategoryTranslation | null;
  ru: CategoryTranslation | null;
}

export interface AdminCategoryItem {
  id: string;
  imageUrl?: string | null;
  data: AdminCategoryData;
}

export interface AdminCategoryPayload {
  slug: string;
  parentId: string | null;
  imageMediaId: string | null;
  sortOrder: number;
  active: boolean;
  uz: CategoryTranslation;
  ru: CategoryTranslation;
}

export interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminCategoryPageResponse {
  content: AdminCategoryItem[];
  page: PageMetadata;
}
