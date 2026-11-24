import { useCallback, useEffect, useRef, useState } from 'react';
import { App as AntApp } from 'antd';
import { useProductSocialCache } from '../contexts/ProductSocialCacheContext';
import { translations } from '../i18n/translations';
import { AuthApiError } from '../services/apiError';
import { catalogSocialApi } from '../services/catalogSocialApi';
import { sessionManager } from '../services/sessionManager';
import type { Language } from '../types/auth';
import type {
  CatalogPageMetadata,
  ProductComment,
  ProductSocialSummary,
} from '../types/catalog';
import {
  clearPendingProductSocialDraft,
  readPendingProductSocialDraft,
  savePendingProductSocialDraft,
} from '../utils/catalog';

export const ROOT_THREAD_KEY = '__root__';
export const SOCIAL_PAGE_SIZE = 20;
export const MAX_COMMENT_LENGTH = 2000;

export interface CommentThreadState {
  items: ProductComment[];
  page: CatalogPageMetadata | null;
  loaded: boolean;
  loading: boolean;
  loadingMore: boolean;
  expanded: boolean;
  error: string | null;
}

export interface ReplyTargetState {
  commentId: string;
  parentId: string | null;
  authorUsername: string;
  bodyPreview: string;
}

export interface EditingCommentState {
  commentId: string;
  parentId: string | null;
  body: string;
}

export interface DeleteTargetState {
  commentId: string;
  parentId: string | null;
  bodyPreview: string;
}

export interface UseProductSocialOptions {
  productId: string | null;
  language: Language;
  accessToken?: string | null;
  isAuthenticated: boolean;
  onUnauthorizedInPlace?: () => void;
  onRequestAuth: (reason: 'social') => void;
  onReloadProduct?: () => void;
}

function createEmptyThreadState(expanded = false): CommentThreadState {
  return {
    items: [],
    page: null,
    loaded: false,
    loading: false,
    loadingMore: false,
    expanded,
    error: null,
  };
}

function mergeUniqueComments(
  existing: ProductComment[],
  incoming: ProductComment[],
  append: boolean,
): ProductComment[] {
  if (!append) return incoming;
  const map = new Map<string, ProductComment>();
  for (const item of existing) {
    map.set(item.id, item);
  }
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function findCommentInThreads(
  threads: Record<string, CommentThreadState>,
  commentId: string,
): ProductComment | null {
  for (const thread of Object.values(threads)) {
    const found = thread.items.find((item) => item.id === commentId);
    if (found) return found;
  }
  return null;
}

function mapCommentInThreads(
  threads: Record<string, CommentThreadState>,
  commentId: string,
  updater: (comment: ProductComment) => ProductComment,
): Record<string, CommentThreadState> {
  let changed = false;
  const next: Record<string, CommentThreadState> = {};

  for (const [key, thread] of Object.entries(threads)) {
    let threadChanged = false;
    const updatedItems = thread.items.map((item) => {
      if (item.id === commentId) {
        threadChanged = true;
        return updater(item);
      }
      return item;
    });
    if (threadChanged) {
      changed = true;
      next[key] = { ...thread, items: updatedItems };
    } else {
      next[key] = thread;
    }
  }

  return changed ? next : threads;
}

export function validateCommentBody(raw: string, language: Language): string | null {
  const ts = translations[language].productSocial;
  const trimmed = raw.trim();
  if (!trimmed) return ts.validationRequired;
  if (trimmed.length > MAX_COMMENT_LENGTH) return ts.validationMaxLength;
  return null;
}

export function useProductSocial({
  productId,
  language,
  accessToken,
  isAuthenticated,
  onUnauthorizedInPlace,
  onRequestAuth,
  onReloadProduct,
}: UseProductSocialOptions) {
  const { message } = AppAntHook();
  const ts = translations[language].productSocial;
  const { getCachedSocial, setProductSocialSummary } = useProductSocialCache();
  const getCachedSocialRef = useRef(getCachedSocial);
  getCachedSocialRef.current = getCachedSocial;

  const [social, setSocial] = useState<ProductSocialSummary | null>(() =>
    productId ? getCachedSocial(productId) : null,
  );
  const [socialLoading, setSocialLoading] = useState(false);
  const [threadsByParentId, setThreadsByParentId] = useState<Record<string, CommentThreadState>>({
    [ROOT_THREAD_KEY]: createEmptyThreadState(true),
  });

  const [productLikePending, setProductLikePending] = useState(false);
  const [commentLikePendingIds, setCommentLikePendingIds] = useState<string[]>([]);

  const [rootDraft, setRootDraft] = useState('');
  const [rootDraftError, setRootDraftError] = useState<string | null>(null);
  const [creatingRoot, setCreatingRoot] = useState(false);

  const [replyTarget, setReplyTarget] = useState<ReplyTargetState | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyDraftError, setReplyDraftError] = useState<string | null>(null);
  const [creatingReply, setCreatingReply] = useState(false);

  const [editingComment, setEditingComment] = useState<EditingCommentState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTargetState | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    type: 'comment' | 'reply';
    commentId?: string;
    nonce: number;
  } | null>(null);

  const activeProductIdRef = useRef<string | null>(productId);
  const requestGenerationRef = useRef(0);
  const threadsRef = useRef(threadsByParentId);
  threadsRef.current = threadsByParentId;

  const rootDraftRef = useRef(rootDraft);
  rootDraftRef.current = rootDraft;
  const replyTargetRef = useRef(replyTarget);
  replyTargetRef.current = replyTarget;
  const replyDraftRef = useRef(replyDraft);
  replyDraftRef.current = replyDraft;

  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const getEffectiveAccessToken = useCallback((): string | null => {
    const live = sessionManager.getCurrentAccessToken();
    return (live?.trim() || accessTokenRef.current?.trim() || null) ?? null;
  }, []);

  const persistCurrentDraftForAuth = useCallback(
    (
      action: 'comment' | 'reply' | 'product-like' | 'comment-like',
      extra?: {
        targetCommentId?: string | null;
        replyTargetOverride?: ReplyTargetState | null;
      },
    ) => {
      if (!productId) return;
      const targetReply = extra?.replyTargetOverride ?? replyTargetRef.current;
      savePendingProductSocialDraft({
        productId,
        action,
        rootDraftBody: rootDraftRef.current || undefined,
        replyTargetCommentId: targetReply?.commentId ?? null,
        replyTargetAuthor: targetReply?.authorUsername ?? null,
        replyBody: replyDraftRef.current || undefined,
        targetCommentId: extra?.targetCommentId ?? null,
        savedAt: Date.now(),
      });
    },
    [productId],
  );

  const refreshSocialSummary = useCallback(
    async (pid: string, token: string | null, generation: number) => {
      try {
        const nextSocial = await catalogSocialApi.getProductSocial(pid, language, token);
        if (activeProductIdRef.current !== pid || requestGenerationRef.current !== generation) {
          return null;
        }
        setSocial(nextSocial);
        setProductSocialSummary(pid, nextSocial);
        return nextSocial;
      } catch (error) {
        if (activeProductIdRef.current !== pid || requestGenerationRef.current !== generation) {
          return null;
        }
        if (error instanceof AuthApiError) {
          if (error.status === 404) {
            setActionError(error.message);
            onReloadProduct?.();
          } else if (error.status === 401 && token) {
            onUnauthorizedInPlace?.();
          }
        }
        return null;
      }
    },
    [language, onReloadProduct, onUnauthorizedInPlace, setProductSocialSummary],
  );

  const loadRootComments = useCallback(
    async (page = 0, append = false) => {
      const pid = activeProductIdRef.current;
      if (!pid) return;
      const generation = requestGenerationRef.current;
      const token = getEffectiveAccessToken();

      setThreadsByParentId((prev) => {
        const current = prev[ROOT_THREAD_KEY] ?? createEmptyThreadState(true);
        return {
          ...prev,
          [ROOT_THREAD_KEY]: {
            ...current,
            expanded: true,
            loading: !append,
            loadingMore: append,
            error: null,
          },
        };
      });

      try {
        const response = await catalogSocialApi.listComments(
          pid,
          { page, size: SOCIAL_PAGE_SIZE },
          language,
          token,
        );
        if (activeProductIdRef.current !== pid || requestGenerationRef.current !== generation) {
          return;
        }
        setThreadsByParentId((prev) => {
          const current = prev[ROOT_THREAD_KEY] ?? createEmptyThreadState(true);
          return {
            ...prev,
            [ROOT_THREAD_KEY]: {
              ...current,
              items: mergeUniqueComments(
                current.items,
                Array.isArray(response.content) ? response.content : [],
                append,
              ),
              page: response.page ?? null,
              loaded: true,
              loading: false,
              loadingMore: false,
              expanded: true,
              error: null,
            },
          };
        });
      } catch (error) {
        if (activeProductIdRef.current !== pid || requestGenerationRef.current !== generation) {
          return;
        }
        const errMsg =
          error instanceof AuthApiError
            ? error.message
            : ts.loadingComments;
        setThreadsByParentId((prev) => {
          const current = prev[ROOT_THREAD_KEY] ?? createEmptyThreadState(true);
          return {
            ...prev,
            [ROOT_THREAD_KEY]: {
              ...current,
              loading: false,
              loadingMore: false,
              error: errMsg,
            },
          };
        });
      }
    },
    [getEffectiveAccessToken, language, ts.loadingComments],
  );

  const loadRepliesForComment = useCallback(
    async (commentId: string, page = 0, append = false, forceExpand = true) => {
      const pid = activeProductIdRef.current;
      if (!pid) return;
      const generation = requestGenerationRef.current;
      const token = getEffectiveAccessToken();

      setThreadsByParentId((prev) => {
        const current = prev[commentId] ?? createEmptyThreadState(forceExpand);
        return {
          ...prev,
          [commentId]: {
            ...current,
            expanded: forceExpand ? true : current.expanded,
            loading: !append,
            loadingMore: append,
            error: null,
          },
        };
      });

      try {
        const response = await catalogSocialApi.listReplies(
          pid,
          commentId,
          { page, size: SOCIAL_PAGE_SIZE },
          language,
          token,
        );
        if (activeProductIdRef.current !== pid || requestGenerationRef.current !== generation) {
          return;
        }
        const incoming = Array.isArray(response.content) ? response.content : [];
        const total = response.page?.totalElements ?? incoming.length;

        setThreadsByParentId((prev) => {
          const current = prev[commentId] ?? createEmptyThreadState(forceExpand);
          const nextWithReplies: Record<string, CommentThreadState> = {
            ...prev,
            [commentId]: {
              ...current,
              items: mergeUniqueComments(current.items, incoming, append),
              page: response.page ?? null,
              loaded: true,
              loading: false,
              loadingMore: false,
              expanded: forceExpand ? true : current.expanded,
              error: null,
            },
          };
          return mapCommentInThreads(nextWithReplies, commentId, (item) => ({
            ...item,
            replyCount: Math.max(item.replyCount, total),
          }));
        });
      } catch (error) {
        if (activeProductIdRef.current !== pid || requestGenerationRef.current !== generation) {
          return;
        }
        if (error instanceof AuthApiError && error.status === 404) {
          setActionError(error.message);
          void refreshSocialSummary(pid, token, generation);
          void loadRootComments(0, false);
          return;
        }
        const errMsg =
          error instanceof AuthApiError ? error.message : ts.loadingReplies;
        setThreadsByParentId((prev) => {
          const current = prev[commentId] ?? createEmptyThreadState(forceExpand);
          return {
            ...prev,
            [commentId]: {
              ...current,
              loading: false,
              loadingMore: false,
              error: errMsg,
            },
          };
        });
      }
    },
    [getEffectiveAccessToken, language, loadRootComments, refreshSocialSummary, ts.loadingReplies],
  );

  const hasAccessToken = Boolean(accessToken);

  // Immediately clear all social state on product switch
  useEffect(() => {
    const productChanged = activeProductIdRef.current !== productId;
    activeProductIdRef.current = productId;
    requestGenerationRef.current += 1;
    const generation = requestGenerationRef.current;

    if (productChanged) {
      setSocial(productId ? getCachedSocialRef.current(productId) : null);
      setThreadsByParentId({
        [ROOT_THREAD_KEY]: createEmptyThreadState(true),
      });
      setRootDraft('');
      setRootDraftError(null);
      setReplyTarget(null);
      setReplyDraft('');
      setReplyDraftError(null);
      setEditingComment(null);
      setEditError(null);
      setDeleteTarget(null);
      setActionError(null);
      setRestoredNotice(null);
      setFocusRequest(null);
      setProductLikePending(false);
      setCommentLikePendingIds([]);
    }

    if (!productId) {
      setSocialLoading(false);
      return;
    }

    const token = isAuthenticated ? getEffectiveAccessToken() : null;
    const previouslyExpandedIds = productChanged
      ? []
      : Object.entries(threadsRef.current)
          .filter(([key, val]) => key !== ROOT_THREAD_KEY && val.expanded)
          .map(([key]) => key);

    setSocialLoading(true);
    void (async () => {
      await Promise.all([
        refreshSocialSummary(productId, token, generation),
        loadRootComments(0, false),
        ...previouslyExpandedIds.map((id) => loadRepliesForComment(id, 0, false, true)),
      ]);
      if (activeProductIdRef.current === productId && requestGenerationRef.current === generation) {
        setSocialLoading(false);
      }
    })();
  }, [
    productId,
    language,
    hasAccessToken,
    isAuthenticated,
    getEffectiveAccessToken,
    refreshSocialSummary,
    loadRootComments,
    loadRepliesForComment,
  ]);

  // Restore drafted comment / reply after Google OAuth redirect authentication
  useEffect(() => {
    if (!productId || !isAuthenticated) return;
    const pendingDraft = readPendingProductSocialDraft();
    if (!pendingDraft || pendingDraft.productId !== productId) return;

    if (pendingDraft.rootDraftBody) {
      setRootDraft(pendingDraft.rootDraftBody);
    }

    if (pendingDraft.action === 'reply' && pendingDraft.replyTargetCommentId) {
      const targetId = pendingDraft.replyTargetCommentId;
      const existing = findCommentInThreads(threadsRef.current, targetId);
      setReplyTarget({
        commentId: targetId,
        parentId: existing?.parentId ?? null,
        authorUsername:
          existing?.authorUsername ?? pendingDraft.replyTargetAuthor ?? '...',
        bodyPreview: existing?.body ?? '',
      });
      if (pendingDraft.replyBody) {
        setReplyDraft(pendingDraft.replyBody);
      }
      setFocusRequest({ type: 'reply', commentId: targetId, nonce: Date.now() });
      setRestoredNotice(ts.sessionRestoredNotice);
    } else if (pendingDraft.action === 'comment') {
      setFocusRequest({ type: 'comment', nonce: Date.now() });
      setRestoredNotice(ts.sessionRestoredNotice);
    }

    clearPendingProductSocialDraft();
  }, [productId, isAuthenticated, ts.sessionRestoredNotice]);

  // Called by CatalogProductDetailPage immediately after in-place login modal closes
  const handleAuthenticatedInPlaceComplete = useCallback(() => {
    const pid = activeProductIdRef.current;
    if (!pid) return;
    const token = getEffectiveAccessToken();
    const generation = requestGenerationRef.current;

    const expandedIds = Object.entries(threadsRef.current)
      .filter(([key, val]) => key !== ROOT_THREAD_KEY && val.expanded)
      .map(([key]) => key);

    void Promise.all([
      refreshSocialSummary(pid, token, generation),
      loadRootComments(0, false),
      ...expandedIds.map((id) => loadRepliesForComment(id, 0, false, true)),
    ]);

    const pendingDraft = readPendingProductSocialDraft();
    if (pendingDraft && pendingDraft.productId === pid) {
      if (pendingDraft.action === 'reply' && pendingDraft.replyTargetCommentId) {
        setFocusRequest({
          type: 'reply',
          commentId: pendingDraft.replyTargetCommentId,
          nonce: Date.now(),
        });
        setRestoredNotice(ts.sessionRestoredNotice);
      } else if (pendingDraft.action === 'comment') {
        setFocusRequest({ type: 'comment', nonce: Date.now() });
        setRestoredNotice(ts.sessionRestoredNotice);
      }
      clearPendingProductSocialDraft();
    } else if (replyTargetRef.current) {
      setFocusRequest({
        type: 'reply',
        commentId: replyTargetRef.current.commentId,
        nonce: Date.now(),
      });
      setRestoredNotice(ts.sessionRestoredNotice);
    }
  }, [
    getEffectiveAccessToken,
    loadRepliesForComment,
    loadRootComments,
    refreshSocialSummary,
    ts.sessionRestoredNotice,
  ]);

  const handleMutationError = useCallback(
    async (
      error: unknown,
      context: {
        authAction: 'comment' | 'reply' | 'product-like' | 'comment-like';
        targetCommentId?: string | null;
        parentIdForRefresh?: string | null;
        isProduct404?: boolean;
      },
    ) => {
      const pid = activeProductIdRef.current;
      if (!(error instanceof AuthApiError)) {
        setActionError(
          language === 'ru'
            ? 'Не удалось выполнить запрос. Попробуйте ещё раз.'
            : 'So‘rovni bajarib bo‘lmadi. Qaytadan urinib ko‘ring.',
        );
        return;
      }

      if (error.status === 401) {
        onUnauthorizedInPlace?.();
        persistCurrentDraftForAuth(context.authAction, {
          targetCommentId: context.targetCommentId,
        });
        onRequestAuth('social');
        return;
      }

      if (error.status === 403) {
        setActionError(error.message);
        return;
      }

      if (error.status === 404) {
        setActionError(error.message);
        if (context.isProduct404) {
          onReloadProduct?.();
          return;
        }
        if (pid) {
          const token = getEffectiveAccessToken();
          const generation = requestGenerationRef.current;
          await refreshSocialSummary(pid, token, generation);
          if (context.parentIdForRefresh) {
            await loadRepliesForComment(context.parentIdForRefresh, 0, false, true);
          } else {
            await loadRootComments(0, false);
          }
        }
        return;
      }

      setActionError(error.message);
    },
    [
      getEffectiveAccessToken,
      language,
      loadRepliesForComment,
      loadRootComments,
      onReloadProduct,
      onRequestAuth,
      onUnauthorizedInPlace,
      persistCurrentDraftForAuth,
      refreshSocialSummary,
    ],
  );

  const toggleProductLike = useCallback(async () => {
    const pid = activeProductIdRef.current;
    if (!pid || productLikePending) return;
    setActionError(null);

    const token = getEffectiveAccessToken();
    if (!isAuthenticated || !token) {
      persistCurrentDraftForAuth('product-like');
      onRequestAuth('social');
      return;
    }

    const currentlyLiked = Boolean(social?.likedByMe);
    setProductLikePending(true);
    try {
      const response = currentlyLiked
        ? await catalogSocialApi.unlikeProduct(token, pid, language)
        : await catalogSocialApi.likeProduct(token, pid, language);

      if (activeProductIdRef.current !== pid) return;
      setSocial((prev) => {
        const nextSummary: ProductSocialSummary = {
          likeCount: response.likeCount,
          likedByMe: response.likedByMe,
          commentCount: prev?.commentCount ?? 0,
        };
        setProductSocialSummary(pid, nextSummary);
        return nextSummary;
      });
    } catch (error) {
      await handleMutationError(error, {
        authAction: 'product-like',
        isProduct404: true,
      });
    } finally {
      if (activeProductIdRef.current === pid) {
        setProductLikePending(false);
      }
    }
  }, [
    getEffectiveAccessToken,
    handleMutationError,
    isAuthenticated,
    language,
    onRequestAuth,
    persistCurrentDraftForAuth,
    productLikePending,
    setProductSocialSummary,
    social?.likedByMe,
  ]);

  const toggleCommentLike = useCallback(
    async (comment: ProductComment) => {
      const pid = activeProductIdRef.current;
      if (!pid || comment.deleted || commentLikePendingIds.includes(comment.id)) return;
      setActionError(null);

      const token = getEffectiveAccessToken();
      if (!isAuthenticated || !token) {
        persistCurrentDraftForAuth('comment-like', { targetCommentId: comment.id });
        onRequestAuth('social');
        return;
      }

      setCommentLikePendingIds((prev) => [...prev, comment.id]);
      try {
        const response = comment.likedByMe
          ? await catalogSocialApi.unlikeComment(token, pid, comment.id, language)
          : await catalogSocialApi.likeComment(token, pid, comment.id, language);

        if (activeProductIdRef.current !== pid) return;
        setThreadsByParentId((prev) =>
          mapCommentInThreads(prev, comment.id, (item) => ({
            ...item,
            likeCount: response.likeCount,
            likedByMe: response.likedByMe,
          })),
        );
      } catch (error) {
        await handleMutationError(error, {
          authAction: 'comment-like',
          targetCommentId: comment.id,
          parentIdForRefresh: comment.parentId,
        });
      } finally {
        setCommentLikePendingIds((prev) => prev.filter((id) => id !== comment.id));
      }
    },
    [
      commentLikePendingIds,
      getEffectiveAccessToken,
      handleMutationError,
      isAuthenticated,
      language,
      onRequestAuth,
      persistCurrentDraftForAuth,
    ],
  );

  const submitRootComment = useCallback(async () => {
    const pid = activeProductIdRef.current;
    if (!pid || creatingRoot) return;
    setActionError(null);

    const validationError = validateCommentBody(rootDraft, language);
    if (validationError) {
      setRootDraftError(validationError);
      return;
    }
    setRootDraftError(null);

    const token = getEffectiveAccessToken();
    if (!isAuthenticated || !token) {
      persistCurrentDraftForAuth('comment');
      onRequestAuth('social');
      return;
    }

    setCreatingRoot(true);
    try {
      const created = await catalogSocialApi.createComment(token, pid, rootDraft, language);
      if (activeProductIdRef.current !== pid) return;

      setRootDraft('');
      setRestoredNotice(null);
      message.success(ts.commentCreatedSuccess);

      const generation = requestGenerationRef.current;
      await Promise.all([
        refreshSocialSummary(pid, token, generation),
        loadRootComments(0, false),
      ]);
      // Make sure created comment appears if backend orders oldest-first on later pages
      setThreadsByParentId((prev) => {
        const root = prev[ROOT_THREAD_KEY];
        if (!root || root.items.some((i) => i.id === created.id)) return prev;
        if ((root.page?.totalPages ?? 1) <= 1) {
          return {
            ...prev,
            [ROOT_THREAD_KEY]: {
              ...root,
              items: [...root.items, created],
            },
          };
        }
        return prev;
      });
    } catch (error) {
      await handleMutationError(error, {
        authAction: 'comment',
        isProduct404: true,
      });
    } finally {
      if (activeProductIdRef.current === pid) {
        setCreatingRoot(false);
      }
    }
  }, [
    creatingRoot,
    getEffectiveAccessToken,
    handleMutationError,
    isAuthenticated,
    language,
    loadRootComments,
    message,
    onRequestAuth,
    persistCurrentDraftForAuth,
    refreshSocialSummary,
    rootDraft,
    ts.commentCreatedSuccess,
  ]);

  const startReply = useCallback(
    (comment: ProductComment) => {
      if (comment.deleted) return;
      setActionError(null);
      setReplyDraftError(null);

      const targetState: ReplyTargetState = {
        commentId: comment.id,
        parentId: comment.parentId,
        authorUsername: comment.authorUsername,
        bodyPreview: comment.body,
      };

      const token = getEffectiveAccessToken();
      if (!isAuthenticated || !token) {
        persistCurrentDraftForAuth('reply', { replyTargetOverride: targetState });
        onRequestAuth('social');
        return;
      }

      setEditingComment(null);
      setReplyTarget(targetState);
      setReplyDraft('');
      setFocusRequest({ type: 'reply', commentId: comment.id, nonce: Date.now() });
    },
    [getEffectiveAccessToken, isAuthenticated, onRequestAuth, persistCurrentDraftForAuth],
  );

  const cancelReply = useCallback(() => {
    setReplyTarget(null);
    setReplyDraft('');
    setReplyDraftError(null);
  }, []);

  const submitReply = useCallback(async () => {
    const pid = activeProductIdRef.current;
    const target = replyTargetRef.current;
    if (!pid || !target || creatingReply) return;
    setActionError(null);

    const validationError = validateCommentBody(replyDraft, language);
    if (validationError) {
      setReplyDraftError(validationError);
      return;
    }
    setReplyDraftError(null);

    const token = getEffectiveAccessToken();
    if (!isAuthenticated || !token) {
      persistCurrentDraftForAuth('reply', { replyTargetOverride: target });
      onRequestAuth('social');
      return;
    }

    setCreatingReply(true);
    try {
      const created = await catalogSocialApi.createReply(
        token,
        pid,
        target.commentId,
        replyDraft,
        language,
      );
      if (activeProductIdRef.current !== pid) return;

      setReplyDraft('');
      setReplyTarget(null);
      setRestoredNotice(null);
      message.success(ts.replyCreatedSuccess);

      const generation = requestGenerationRef.current;
      await Promise.all([
        refreshSocialSummary(pid, token, generation),
        loadRepliesForComment(target.commentId, 0, false, true),
      ]);

      setThreadsByParentId((prev) => {
        const next = mapCommentInThreads(prev, target.commentId, (item) => ({
          ...item,
          replyCount: Math.max(item.replyCount + 1, prev[target.commentId]?.items.length ?? 1),
        }));
        const thread = next[target.commentId];
        if (thread && !thread.items.some((r) => r.id === created.id) && (thread.page?.totalPages ?? 1) <= 1) {
          return {
            ...next,
            [target.commentId]: {
              ...thread,
              expanded: true,
              items: [...thread.items, created],
            },
          };
        }
        return next;
      });
    } catch (error) {
      await handleMutationError(error, {
        authAction: 'reply',
        targetCommentId: target.commentId,
        parentIdForRefresh: target.parentId,
      });
    } finally {
      if (activeProductIdRef.current === pid) {
        setCreatingReply(false);
      }
    }
  }, [
    creatingReply,
    getEffectiveAccessToken,
    handleMutationError,
    isAuthenticated,
    language,
    loadRepliesForComment,
    message,
    onRequestAuth,
    persistCurrentDraftForAuth,
    refreshSocialSummary,
    replyDraft,
    ts.replyCreatedSuccess,
  ]);

  const startEditComment = useCallback((comment: ProductComment) => {
    if (!comment.ownedByMe || comment.deleted) return;
    setActionError(null);
    setEditError(null);
    setReplyTarget(null);
    setEditingComment({
      commentId: comment.id,
      parentId: comment.parentId,
      body: comment.body,
    });
  }, []);

  const cancelEditComment = useCallback(() => {
    setEditingComment(null);
    setEditError(null);
  }, []);

  const submitEditComment = useCallback(async () => {
    const pid = activeProductIdRef.current;
    if (!pid || !editingComment || savingEdit) return;
    setActionError(null);

    const validationError = validateCommentBody(editingComment.body, language);
    if (validationError) {
      setEditError(validationError);
      return;
    }
    setEditError(null);

    const token = getEffectiveAccessToken();
    if (!isAuthenticated || !token) {
      onUnauthorizedInPlace?.();
      onRequestAuth('social');
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await catalogSocialApi.updateComment(
        token,
        pid,
        editingComment.commentId,
        editingComment.body,
        language,
      );
      if (activeProductIdRef.current !== pid) return;

      setThreadsByParentId((prev) =>
        mapCommentInThreads(prev, editingComment.commentId, () => updated),
      );
      setEditingComment(null);
      message.success(ts.commentUpdatedSuccess);
    } catch (error) {
      await handleMutationError(error, {
        authAction: 'comment',
        targetCommentId: editingComment.commentId,
        parentIdForRefresh: editingComment.parentId,
      });
    } finally {
      if (activeProductIdRef.current === pid) {
        setSavingEdit(false);
      }
    }
  }, [
    editingComment,
    getEffectiveAccessToken,
    handleMutationError,
    isAuthenticated,
    language,
    message,
    onRequestAuth,
    onUnauthorizedInPlace,
    savingEdit,
    ts.commentUpdatedSuccess,
  ]);

  const requestDeleteComment = useCallback((comment: ProductComment) => {
    if (!comment.ownedByMe || comment.deleted) return;
    setActionError(null);
    setDeleteTarget({
      commentId: comment.id,
      parentId: comment.parentId,
      bodyPreview: comment.body,
    });
  }, []);

  const cancelDeleteComment = useCallback(() => {
    if (deletingComment) return;
    setDeleteTarget(null);
  }, [deletingComment]);

  const confirmDeleteComment = useCallback(async () => {
    const pid = activeProductIdRef.current;
    if (!pid || !deleteTarget || deletingComment) return;
    setActionError(null);

    const token = getEffectiveAccessToken();
    if (!isAuthenticated || !token) {
      setDeleteTarget(null);
      onUnauthorizedInPlace?.();
      onRequestAuth('social');
      return;
    }

    const target = deleteTarget;
    setDeletingComment(true);
    try {
      await catalogSocialApi.deleteComment(token, pid, target.commentId, language);
      if (activeProductIdRef.current !== pid) return;

      setDeleteTarget(null);
      if (editingComment?.commentId === target.commentId) {
        setEditingComment(null);
      }
      if (replyTargetRef.current?.commentId === target.commentId) {
        setReplyTarget(null);
        setReplyDraft('');
      }

      message.success(ts.commentDeletedSuccess);
      const generation = requestGenerationRef.current;

      await refreshSocialSummary(pid, token, generation);
      if (target.parentId) {
        await loadRepliesForComment(target.parentId, 0, false, true);
        // Update parent replyCount accurately when thread has items or becomes empty
        setThreadsByParentId((prev) => {
          const parentThread = prev[target.parentId!];
          const updatedCount = parentThread?.page?.totalElements ?? parentThread?.items.length ?? 0;
          return mapCommentInThreads(prev, target.parentId!, (item) => ({
            ...item,
            replyCount: updatedCount,
          }));
        });
      } else {
        await loadRootComments(0, false);
      }
    } catch (error) {
      setDeleteTarget(null);
      await handleMutationError(error, {
        authAction: 'comment',
        targetCommentId: target.commentId,
        parentIdForRefresh: target.parentId,
      });
    } finally {
      if (activeProductIdRef.current === pid) {
        setDeletingComment(false);
      }
    }
  }, [
    deleteTarget,
    deletingComment,
    editingComment?.commentId,
    getEffectiveAccessToken,
    handleMutationError,
    isAuthenticated,
    language,
    loadRepliesForComment,
    loadRootComments,
    message,
    onRequestAuth,
    onUnauthorizedInPlace,
    refreshSocialSummary,
    ts.commentDeletedSuccess,
  ]);

  const toggleRepliesVisibility = useCallback(
    (commentId: string) => {
      const existing = threadsRef.current[commentId];
      if (existing?.expanded) {
        setThreadsByParentId((prev) => ({
          ...prev,
          [commentId]: {
            ...(prev[commentId] ?? createEmptyThreadState(false)),
            expanded: false,
          },
        }));
        return;
      }

      if (existing?.loaded) {
        setThreadsByParentId((prev) => ({
          ...prev,
          [commentId]: {
            ...prev[commentId],
            expanded: true,
          },
        }));
        return;
      }

      void loadRepliesForComment(commentId, 0, false, true);
    },
    [loadRepliesForComment],
  );

  const loadMoreRootComments = useCallback(() => {
    const rootThread = threadsRef.current[ROOT_THREAD_KEY];
    if (!rootThread || rootThread.loading || rootThread.loadingMore) return;
    const currentNumber = rootThread.page?.number ?? 0;
    const totalPages = rootThread.page?.totalPages ?? 1;
    if (currentNumber + 1 >= totalPages) return;
    void loadRootComments(currentNumber + 1, true);
  }, [loadRootComments]);

  const loadMoreReplies = useCallback(
    (commentId: string) => {
      const thread = threadsRef.current[commentId];
      if (!thread || thread.loading || thread.loadingMore) return;
      const currentNumber = thread.page?.number ?? 0;
      const totalPages = thread.page?.totalPages ?? 1;
      if (currentNumber + 1 >= totalPages) return;
      void loadRepliesForComment(commentId, currentNumber + 1, true, true);
    },
    [loadRepliesForComment],
  );

  const openAuthPromptFromHint = useCallback(() => {
    persistCurrentDraftForAuth(replyTargetRef.current ? 'reply' : 'comment');
    onRequestAuth('social');
  }, [onRequestAuth, persistCurrentDraftForAuth]);

  const clearFocusRequest = useCallback(() => setFocusRequest(null), []);

  return {
    social,
    socialLoading,
    rootThread: threadsByParentId[ROOT_THREAD_KEY] ?? createEmptyThreadState(true),
    threadsByParentId,
    productLikePending,
    commentLikePendingIds,
    rootDraft,
    setRootDraft: (val: string) => {
      setRootDraft(val);
      if (rootDraftError) setRootDraftError(null);
    },
    rootDraftError,
    creatingRoot,
    replyTarget,
    replyDraft,
    setReplyDraft: (val: string) => {
      setReplyDraft(val);
      if (replyDraftError) setReplyDraftError(null);
    },
    replyDraftError,
    creatingReply,
    editingComment,
    setEditingBody: (val: string) => {
      setEditingComment((prev) => (prev ? { ...prev, body: val } : null));
      if (editError) setEditError(null);
    },
    editError,
    savingEdit,
    deleteTarget,
    deletingComment,
    actionError,
    clearActionError: () => setActionError(null),
    restoredNotice,
    clearRestoredNotice: () => setRestoredNotice(null),
    focusRequest,
    clearFocusRequest,
    toggleProductLike,
    toggleCommentLike,
    submitRootComment,
    startReply,
    cancelReply,
    submitReply,
    startEditComment,
    cancelEditComment,
    submitEditComment,
    requestDeleteComment,
    cancelDeleteComment,
    confirmDeleteComment,
    toggleRepliesVisibility,
    loadMoreRootComments,
    loadMoreReplies,
    reloadRootComments: () => loadRootComments(0, false),
    reloadRepliesForComment: (commentId: string) => loadRepliesForComment(commentId, 0, false, true),
    openAuthPromptFromHint,
    handleAuthenticatedInPlaceComplete,
  };
}

function AppAntHook() {
  return AntApp.useApp();
}

export type UseProductSocialReturn = ReturnType<typeof useProductSocial>;
