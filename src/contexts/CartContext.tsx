import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem, CatalogProduct, CatalogVariant } from '../types/catalog';
import { pickPrimaryImage, type FlattenedCatalogIndex } from '../utils/catalog';
import { isValidVariantPrice } from '../utils/price';

const CART_STORAGE_KEY = 'oson_market_cart_v1';
const PENDING_CHECKOUT_STORAGE_KEY = 'oson_market_pending_checkout_v1';

export const MAX_CART_VARIANTS = 50;
export const MAX_CART_ITEM_QUANTITY = 99;

export interface PendingCheckoutDraft {
  phone?: string;
  telegramAddress?: string;
  fulfillmentMethod?: 'PICKUP' | 'DELIVERY';
  branchId?: string;
  deliveryAddress?: string;
  deliveryAddressNote?: string;
  latitude?: number | null;
  longitude?: number | null;
  checkoutRequested?: boolean;
  savedAt: number;
}

export function savePendingCheckoutDraft(draft: Omit<PendingCheckoutDraft, 'savedAt'>): void {
  try {
    const payload: PendingCheckoutDraft = {
      ...draft,
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

export function readPendingCheckoutDraft(): PendingCheckoutDraft | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckoutDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    if (Date.now() - (parsed.savedAt ?? 0) > 30 * 60 * 1000) {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingCheckoutDraft(): void {
  try {
    window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

interface CartContextValue {
  items: CartItem[];
  totalQuantity: number;
  totalAmount: number;
  drawerOpen: boolean;
  checkoutMode: boolean;
  openDrawer: (options?: { checkout?: boolean }) => void;
  closeDrawer: () => void;
  setCheckoutMode: (open: boolean) => void;
  getQuantity: (variantId?: string | null) => number;
  addVariant: (payload: { product: CatalogProduct; variant: CatalogVariant }) => boolean;
  increment: (variantId: string) => void;
  decrement: (variantId: string) => void;
  removeItem: (variantId: string) => void;
  removeItems: (variantIds: string[]) => void;
  clearCart: () => void;
  syncWithCatalogIndex: (index: FlattenedCatalogIndex) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function clampQuantity(qty: number): number {
  return Math.min(MAX_CART_ITEM_QUANTITY, Math.max(1, Math.floor(qty)));
}

function isStoredCartItemValid(raw: unknown): raw is CartItem {
  if (!raw || typeof raw !== 'object') return false;
  const item = raw as Partial<CartItem>;
  return (
    typeof item.variantId === 'string' &&
    item.variantId.trim().length > 0 &&
    typeof item.productId === 'string' &&
    typeof item.productSlug === 'string' &&
    typeof item.productTitle === 'string' &&
    typeof item.sku === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isFinite(item.quantity) &&
    item.quantity >= 1 &&
    isValidVariantPrice(item.price)
  );
}

function readStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Deduplicate by variantId and cap at limits
    const byVariant = new Map<string, CartItem>();
    for (const entry of parsed) {
      if (!isStoredCartItemValid(entry)) continue;
      const existing = byVariant.get(entry.variantId);
      if (existing) {
        existing.quantity = clampQuantity(existing.quantity + entry.quantity);
      } else if (byVariant.size < MAX_CART_VARIANTS) {
        byVariant.set(entry.variantId, {
          ...entry,
          quantity: clampQuantity(entry.quantity),
        });
      }
    }
    return Array.from(byVariant.values());
  } catch {
    return [];
  }
}

function writeStoredCart(items: CartItem[]): void {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } else {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // Ignore storage errors
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);

  useEffect(() => {
    writeStoredCart(items);
  }, [items]);

  // Keep tabs synchronized when localStorage changes
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) {
        setItems(readStoredCart());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const openDrawer = useCallback((options?: { checkout?: boolean }) => {
    setDrawerOpen(true);
    if (typeof options?.checkout === 'boolean') {
      setCheckoutMode(options.checkout);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setCheckoutMode(false);
  }, []);

  const getQuantity = useCallback(
    (variantId?: string | null): number => {
      if (!variantId) return 0;
      return items.find((item) => item.variantId === variantId)?.quantity ?? 0;
    },
    [items],
  );

  const addVariant = useCallback(
    ({ product, variant }: { product: CatalogProduct; variant: CatalogVariant }): boolean => {
      if (!variant?.id || !isValidVariantPrice(variant.price)) {
        return false;
      }

      const alreadyInCart = items.some((item) => item.variantId === variant.id);
      if (!alreadyInCart && items.length >= MAX_CART_VARIANTS) {
        return false;
      }

      const validPrice = variant.price;
      const primaryImage = pickPrimaryImage(variant.images);
      const displayTitle = product.title?.trim() || product.slug;

      setItems((prev) => {
        const existingIdx = prev.findIndex((item) => item.variantId === variant.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            productId: product.id,
            productSlug: product.slug || product.id,
            productTitle: displayTitle,
            sku: variant.sku,
            imageUrl: primaryImage?.imageUrl ?? next[existingIdx].imageUrl,
            price: validPrice,
            quantity: clampQuantity(next[existingIdx].quantity + 1),
          };
          return next;
        }
        if (prev.length >= MAX_CART_VARIANTS) {
          return prev;
        }
        return [
          ...prev,
          {
            variantId: variant.id,
            productId: product.id,
            productSlug: product.slug || product.id,
            productTitle: displayTitle,
            sku: variant.sku,
            imageUrl: primaryImage?.imageUrl ?? null,
            price: validPrice,
            quantity: 1,
          },
        ];
      });

      return true;
    },
    [items],
  );

  const increment = useCallback((variantId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: clampQuantity(item.quantity + 1) }
          : item,
      ),
    );
  }, []);

  const decrement = useCallback((variantId: string) => {
    setItems((prev) =>
      prev.flatMap((item) => {
        if (item.variantId !== variantId) return [item];
        const nextQty = item.quantity - 1;
        if (nextQty <= 0) return [];
        return [{ ...item, quantity: nextQty }];
      }),
    );
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((item) => item.variantId !== variantId));
  }, []);

  const removeItems = useCallback((variantIds: string[]) => {
    if (variantIds.length === 0) return;
    const removeSet = new Set(variantIds);
    setItems((prev) => prev.filter((item) => !removeSet.has(item.variantId)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const syncWithCatalogIndex = useCallback((index: FlattenedCatalogIndex) => {
    if (!index || index.products.length === 0) return;

    const variantLookup = new Map<
      string,
      { product: CatalogProduct; variant: CatalogVariant }
    >();
    for (const entry of index.products) {
      for (const variant of entry.product.variants) {
        if (variant?.id) {
          variantLookup.set(variant.id, { product: entry.product, variant });
        }
      }
    }

    setItems((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next: CartItem[] = [];

      for (const item of prev) {
        const matched = variantLookup.get(item.variantId);
        if (!matched) {
          next.push(item);
          continue;
        }
        const { product, variant } = matched;
        if (!isValidVariantPrice(variant.price)) {
          changed = true;
          continue;
        }
        const primaryImage = pickPrimaryImage(variant.images);
        const nextTitle = product.title?.trim() || product.slug;
        const nextSlug = product.slug || product.id;
        const nextImage = primaryImage?.imageUrl ?? null;

        if (
          item.productTitle !== nextTitle ||
          item.productSlug !== nextSlug ||
          item.sku !== variant.sku ||
          item.imageUrl !== nextImage ||
          item.price.amount !== variant.price.amount ||
          item.price.regularPrice !== variant.price.regularPrice ||
          item.price.salePrice !== variant.price.salePrice ||
          item.price.currency !== variant.price.currency
        ) {
          changed = true;
          next.push({
            ...item,
            productId: product.id,
            productSlug: nextSlug,
            productTitle: nextTitle,
            sku: variant.sku,
            imageUrl: nextImage,
            price: variant.price,
          });
        } else {
          next.push(item);
        }
      }

      return changed ? next : prev;
    });
  }, []);

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.price.amount * item.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalQuantity,
      totalAmount,
      drawerOpen,
      checkoutMode,
      openDrawer,
      closeDrawer,
      setCheckoutMode,
      getQuantity,
      addVariant,
      increment,
      decrement,
      removeItem,
      removeItems,
      clearCart,
      syncWithCatalogIndex,
    }),
    [
      items,
      totalQuantity,
      totalAmount,
      drawerOpen,
      checkoutMode,
      openDrawer,
      closeDrawer,
      getQuantity,
      addVariant,
      increment,
      decrement,
      removeItem,
      removeItems,
      clearCart,
      syncWithCatalogIndex,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
