import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AuthApiError } from '../services/apiError';
import { catalogSocialApi } from '../services/catalogSocialApi';
import { sessionManager } from '../services/sessionManager';
import type { Language } from '../types/auth';
import type { ProductSocialSummary } from '../types/catalog';

interface CachedSocialEntry {
  summary: ProductSocialSummary;
  authScope: string;
  fetchedAt: number;
}

interface ProductSocialCacheContextValue {
  authScope: string;
  getCachedSocial: (productId: string) => ProductSocialSummary | null;
  hasFreshSocialForCurrentScope: (productId: string) => boolean;
  isProductLikePending: (productId: string) => boolean;
  setProductSocialSummary: (productId: string, summary: ProductSocialSummary) => void;
  ensureProductSocial: (productId: string, force?: boolean) => Promise<ProductSocialSummary | null>;
  toggleProductLike: (
    productId: string,
    options?: {
      onRequireAuth?: (productId: string) => void;
      onError?: (message: string, status?: number) => void;
    },
  ) => Promise<boolean>;
}

const ProductSocialCacheContext = createContext<ProductSocialCacheContextValue | null>(null);

const MAX_CONCURRENT_SOCIAL_FETCHES = 6;
const CACHE_TTL_MS = 60_000;

interface ProductSocialCacheProviderProps {
  children: ReactNode;
  language: Language;
  accessToken: string | null;
  isAuthenticated: boolean;
  onUnauthorizedInPlace?: () => void;
}

export function ProductSocialCacheProvider({
  children,
  language,
  accessToken,
  isAuthenticated,
  onUnauthorizedInPlace,
}: ProductSocialCacheProviderProps) {
  const [entries, setEntries] = useState<Record<string, CachedSocialEntry>>({});
  const [pendingLikeIds, setPendingLikeIds] = useState<string[]>([]);

  const authScope = isAuthenticated && Boolean(accessToken) ? 'auth' : 'guest';

  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const authScopeRef = useRef(authScope);
  authScopeRef.current = authScope;

  const languageRef = useRef(language);
  languageRef.current = language;

  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const inFlightPromisesRef = useRef<Map<string, Promise<ProductSocialSummary | null>>>(new Map());
  const pendingLikeRef = useRef<Set<string>>(new Set());

  // Concurrency queue so visible cards load smoothly without flooding network
  const activeFetchCountRef = useRef(0);
  const queuedTasksRef = useRef<Array<() => void>>([]);

  const runWithConcurrency = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const execute = () => {
        activeFetchCountRef.current += 1;
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            activeFetchCountRef.current = Math.max(0, activeFetchCountRef.current - 1);
            const next = queuedTasksRef.current.shift();
            if (next) next();
          });
      };

      if (activeFetchCountRef.current < MAX_CONCURRENT_SOCIAL_FETCHES) {
        execute();
      } else {
        queuedTasksRef.current.push(execute);
      }
    });
  }, []);

  // When switching between guest <-> signed-in, drop cached authScope freshness so personal likedByMe refreshes
  useEffect(() => {
    inFlightPromisesRef.current.clear();
  }, [authScope]);

  const getEffectiveAccessToken = useCallback((): string | null => {
    if (!isAuthenticatedRef.current) return null;
    const live = sessionManager.getCurrentAccessToken();
    return (accessTokenRef.current?.trim() || live?.trim() || null) ?? null;
  }, []);

  const setProductSocialSummary = useCallback(
    (productId: string, summary: ProductSocialSummary) => {
      if (!productId) return;
      const scope = authScopeRef.current;
      setEntries((prev) => ({
        ...prev,
        [productId]: {
          summary,
          authScope: scope,
          fetchedAt: Date.now(),
        },
      }));
    },
    [],
  );

  const getCachedSocial = useCallback(
    (productId: string): ProductSocialSummary | null => {
      return entries[productId]?.summary ?? null;
    },
    [entries],
  );

  const hasFreshSocialForCurrentScope = useCallback(
    (productId: string): boolean => {
      const entry = entries[productId];
      if (!entry) return false;
      if (entry.authScope !== authScope) return false;
      return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
    },
    [entries, authScope],
  );

  const ensureProductSocial = useCallback(
    async (productId: string, force = false): Promise<ProductSocialSummary | null> => {
      if (!productId) return null;

      const currentScope = authScopeRef.current;
      const existing = entriesRef.current[productId];
      if (
        !force &&
        existing &&
        existing.authScope === currentScope &&
        Date.now() - existing.fetchedAt < CACHE_TTL_MS
      ) {
        return existing.summary;
      }

      const requestKey = `${currentScope}:${productId}`;
      const existingPromise = inFlightPromisesRef.current.get(requestKey);
      if (existingPromise && !force) {
        return existingPromise;
      }

      const promise = runWithConcurrency(async () => {
        const token = getEffectiveAccessToken();
        try {
          const summary = await catalogSocialApi.getProductSocial(
            productId,
            languageRef.current,
            token,
          );
          if (authScopeRef.current === currentScope) {
            setProductSocialSummary(productId, summary);
          }
          return summary;
        } catch (error) {
          if (error instanceof AuthApiError && error.status === 401 && token) {
            onUnauthorizedInPlace?.();
          }
          return null;
        } finally {
          inFlightPromisesRef.current.delete(requestKey);
        }
      });

      inFlightPromisesRef.current.set(requestKey, promise);
      return promise;
    },
    [getEffectiveAccessToken, onUnauthorizedInPlace, runWithConcurrency, setProductSocialSummary],
  );

  const isProductLikePending = useCallback(
    (productId: string): boolean => pendingLikeIds.includes(productId),
    [pendingLikeIds],
  );

  const toggleProductLike = useCallback(
    async (
      productId: string,
      options?: {
        onRequireAuth?: (productId: string) => void;
        onError?: (message: string, status?: number) => void;
      },
    ): Promise<boolean> => {
      if (!productId || pendingLikeRef.current.has(productId)) {
        return false;
      }

      const token = getEffectiveAccessToken();
      if (!isAuthenticatedRef.current || !token) {
        options?.onRequireAuth?.(productId);
        return false;
      }

      const currentEntry = entriesRef.current[productId];
      const currentlyLiked = Boolean(currentEntry?.summary.likedByMe);

      pendingLikeRef.current.add(productId);
      setPendingLikeIds(Array.from(pendingLikeRef.current));

      try {
        const response = currentlyLiked
          ? await catalogSocialApi.unlikeProduct(token, productId, languageRef.current)
          : await catalogSocialApi.likeProduct(token, productId, languageRef.current);

        setProductSocialSummary(productId, {
          likeCount: response.likeCount,
          likedByMe: response.likedByMe,
          commentCount: currentEntry?.summary.commentCount ?? 0,
        });
        return true;
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorizedInPlace?.();
            options?.onRequireAuth?.(productId);
            return false;
          }
          options?.onError?.(error.message, error.status);
          return false;
        }

        options?.onError?.(
          languageRef.current === 'ru'
            ? 'Не удалось обновить лайк. Попробуйте ещё раз.'
            : 'Layk holatini yangilab bo‘lmadi. Qaytadan urinib ko‘ring.',
        );
        return false;
      } finally {
        pendingLikeRef.current.delete(productId);
        setPendingLikeIds(Array.from(pendingLikeRef.current));
      }
    },
    [getEffectiveAccessToken, onUnauthorizedInPlace, setProductSocialSummary],
  );

  const value = useMemo<ProductSocialCacheContextValue>(
    () => ({
      authScope,
      getCachedSocial,
      hasFreshSocialForCurrentScope,
      isProductLikePending,
      setProductSocialSummary,
      ensureProductSocial,
      toggleProductLike,
    }),
    [
      authScope,
      getCachedSocial,
      hasFreshSocialForCurrentScope,
      isProductLikePending,
      setProductSocialSummary,
      ensureProductSocial,
      toggleProductLike,
    ],
  );

  return (
    <ProductSocialCacheContext.Provider value={value}>
      {children}
    </ProductSocialCacheContext.Provider>
  );
}

export function useProductSocialCache() {
  const ctx = useContext(ProductSocialCacheContext);
  if (!ctx) {
    throw new Error('useProductSocialCache must be used within ProductSocialCacheProvider');
  }
  return ctx;
}
