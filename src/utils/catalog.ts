import type {
  CatalogCategoryNode,
  CatalogProduct,
  CatalogProductImage,
  CatalogTreeResponse,
  CatalogVariant,
} from '../types/catalog';

export interface IndexedCatalogProduct {
  product: CatalogProduct;
  categoryIds: string[];
  categoryNames: string[];
  primaryCategory: { id: string; name: string; slug: string } | null;
  isUncategorized: boolean;
}

export interface FlattenedCatalogIndex {
  rootCategories: CatalogCategoryNode[];
  categoryById: Record<string, CatalogCategoryNode>;
  descendantIdsByCategoryId: Record<string, string[]>;
  products: IndexedCatalogProduct[];
  uncategorizedProductIds: string[];
}

function sortCategories(nodes: CatalogCategoryNode[]): CatalogCategoryNode[] {
  return [...nodes]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((node) => ({
      ...node,
      children: Array.isArray(node.children) ? sortCategories(node.children) : [],
      products: Array.isArray(node.products) ? node.products : [],
    }));
}

export function flattenCatalogTree(tree: CatalogTreeResponse): FlattenedCatalogIndex {
  const rootCategories = sortCategories(Array.isArray(tree.categories) ? tree.categories : []);
  const categoryById: Record<string, CatalogCategoryNode> = {};
  const descendantIdsByCategoryId: Record<string, string[]> = {};
  const productMap = new Map<string, IndexedCatalogProduct>();

  const registerProduct = (
    product: CatalogProduct,
    category: CatalogCategoryNode | null,
    isUncategorized: boolean,
  ) => {
    if (!product?.id) return;
    const existing = productMap.get(product.id);
    if (existing) {
      if (category && !existing.categoryIds.includes(category.id)) {
        existing.categoryIds.push(category.id);
        existing.categoryNames.push(category.name || category.slug);
        if (!existing.primaryCategory) {
          existing.primaryCategory = {
            id: category.id,
            name: category.name || category.slug,
            slug: category.slug,
          };
        }
      }
      return;
    }

    productMap.set(product.id, {
      product: {
        ...product,
        variants: Array.isArray(product.variants) ? product.variants : [],
      },
      categoryIds: category ? [category.id] : [],
      categoryNames: category ? [category.name || category.slug] : [],
      primaryCategory: category
        ? {
            id: category.id,
            name: category.name || category.slug,
            slug: category.slug,
          }
        : null,
      isUncategorized,
    });
  };

  const walk = (node: CatalogCategoryNode): string[] => {
    categoryById[node.id] = node;
    const descendants = [node.id];

    for (const prod of node.products) {
      registerProduct(prod, node, false);
    }

    for (const child of node.children) {
      descendants.push(...walk(child));
    }

    descendantIdsByCategoryId[node.id] = descendants;
    return descendants;
  };

  for (const root of rootCategories) {
    walk(root);
  }

  const uncategorizedList = Array.isArray(tree.uncategorizedProducts)
    ? tree.uncategorizedProducts
    : [];
  const uncategorizedProductIds: string[] = [];

  for (const prod of uncategorizedList) {
    registerProduct(prod, null, true);
    if (prod?.id && !uncategorizedProductIds.includes(prod.id)) {
      uncategorizedProductIds.push(prod.id);
    }
  }

  return {
    rootCategories,
    categoryById,
    descendantIdsByCategoryId,
    products: Array.from(productMap.values()),
    uncategorizedProductIds,
  };
}

export function getCategoryPath(
  categoryById: Record<string, CatalogCategoryNode>,
  categoryId: string | null | undefined,
): CatalogCategoryNode[] {
  const path: CatalogCategoryNode[] = [];
  const visited = new Set<string>();
  let cursorId = categoryId ?? null;

  while (cursorId && categoryById[cursorId] && !visited.has(cursorId)) {
    visited.add(cursorId);
    const node = categoryById[cursorId];
    path.unshift(node);
    cursorId = node.parentId;
  }

  return path;
}

export function buildCategoryProductCountMap(
  index: FlattenedCatalogIndex,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [categoryId, descendantIds] of Object.entries(index.descendantIdsByCategoryId)) {
    const allowed = new Set(descendantIds);
    let total = 0;
    for (const entry of index.products) {
      if (entry.categoryIds.some((id) => allowed.has(id))) {
        total += 1;
      }
    }
    counts[categoryId] = total;
  }
  return counts;
}

export function pruneEmptyCategoryTree(
  nodes: CatalogCategoryNode[],
  index: FlattenedCatalogIndex,
): CatalogCategoryNode[] {
  const productSetsByCategory = new Map<string, Set<string>>();
  for (const entry of index.products) {
    for (const catId of entry.categoryIds) {
      let set = productSetsByCategory.get(catId);
      if (!set) {
        set = new Set<string>();
        productSetsByCategory.set(catId, set);
      }
      set.add(entry.product.id);
    }
  }

  const pruneNode = (node: CatalogCategoryNode): CatalogCategoryNode | null => {
    const prunedChildren = node.children
      .map(pruneNode)
      .filter((child): child is CatalogCategoryNode => child !== null);
    const hasDirectProducts = (productSetsByCategory.get(node.id)?.size ?? 0) > 0;

    if (!hasDirectProducts && prunedChildren.length === 0) {
      return null;
    }

    return {
      ...node,
      children: prunedChildren,
    };
  };

  return nodes
    .map(pruneNode)
    .filter((node): node is CatalogCategoryNode => node !== null);
}

export function findProductInCatalog(
  index: FlattenedCatalogIndex,
  idOrSlug: string,
): IndexedCatalogProduct | null {
  const normalized = decodeURIComponent(idOrSlug).trim();
  if (!normalized) return null;

  const byId = index.products.find((entry) => entry.product.id === normalized);
  if (byId) return byId;

  const bySlugExact = index.products.find((entry) => entry.product.slug === normalized);
  if (bySlugExact) return bySlugExact;

  const lower = normalized.toLowerCase();
  return (
    index.products.find(
      (entry) =>
        entry.product.id.toLowerCase() === lower || entry.product.slug.toLowerCase() === lower,
    ) ?? null
  );
}

export function pickDefaultVariant(variants: CatalogVariant[]): CatalogVariant | null {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  return variants.find((v) => Boolean(v.defaultType)) ?? variants[0];
}

export function sortVariantImages(images: CatalogProductImage[]): CatalogProductImage[] {
  if (!Array.isArray(images)) return [];
  return [...images].sort((a, b) => {
    if (a.primaryImage !== b.primaryImage) {
      return a.primaryImage ? -1 : 1;
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

export function pickPrimaryImage(images: CatalogProductImage[]): CatalogProductImage | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  return images.find((img) => Boolean(img.primaryImage)) ?? sortVariantImages(images)[0] ?? null;
}

const PENDING_ORDER_STORAGE_KEY = 'oson_market_pending_product_order';
const PENDING_SOCIAL_STORAGE_KEY = 'oson_market_pending_product_social';

export interface PendingProductOrderSelection {
  productPath: string;
  productId: string;
  variantId: string | null;
  intent?: 'checkout' | 'social';
  savedAt: number;
}

export interface PendingProductSocialDraft {
  productId: string;
  action: 'comment' | 'reply' | 'product-like' | 'comment-like';
  rootDraftBody?: string;
  replyTargetCommentId?: string | null;
  replyTargetAuthor?: string | null;
  replyBody?: string;
  targetCommentId?: string | null;
  savedAt: number;
}

export function savePendingProductOrder(selection: PendingProductOrderSelection): void {
  try {
    window.sessionStorage.setItem(PENDING_ORDER_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Ignore storage errors
  }
}

export function readPendingProductOrder(): PendingProductOrderSelection | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingProductOrderSelection;
    if (!parsed?.productPath) return null;
    // Expire stale pending selections after 30 minutes
    if (Date.now() - (parsed.savedAt ?? 0) > 30 * 60 * 1000) {
      window.sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingProductOrder(): void {
  try {
    window.sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function savePendingProductSocialDraft(draft: PendingProductSocialDraft): void {
  try {
    window.sessionStorage.setItem(PENDING_SOCIAL_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage errors
  }
}

export function readPendingProductSocialDraft(): PendingProductSocialDraft | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_SOCIAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingProductSocialDraft;
    if (!parsed?.productId) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > 30 * 60 * 1000) {
      window.sessionStorage.removeItem(PENDING_SOCIAL_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingProductSocialDraft(): void {
  try {
    window.sessionStorage.removeItem(PENDING_SOCIAL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
