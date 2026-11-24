import { useEffect, useMemo, useRef, useState } from 'react';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { Alert, Button, Input, Modal, Skeleton } from 'antd';
import {
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Heart,
  LogIn,
  MessageSquare,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { API_BASE_URL } from '../constants';
import {
  MAX_COMMENT_LENGTH,
  type CommentThreadState,
  type UseProductSocialReturn,
} from '../hooks/useProductSocial';
import { translations } from '../i18n/translations';
import { authApi } from '../services/authApi';
import { sessionManager } from '../services/sessionManager';
import type { Language, UserProfile } from '../types/auth';
import type { ProductComment } from '../types/catalog';
import { formatOrderDateTime } from '../utils/orderStatus';

interface ProductLikeButtonProps {
  language: Language;
  likeCount: number;
  likedByMe: boolean;
  loading?: boolean;
  pending?: boolean;
  onToggle: () => void;
}

export function ProductLikeButton({
  language,
  likeCount,
  likedByMe,
  loading = false,
  pending = false,
  onToggle,
}: ProductLikeButtonProps) {
  const ts = translations[language].productSocial;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading || pending}
      aria-pressed={likedByMe}
      aria-label={likedByMe ? ts.unlikeProductLabel : ts.likeProductLabel}
      title={likedByMe ? ts.unlikeProductLabel : ts.likeProductLabel}
      className={`inline-flex items-center justify-center gap-2 px-3.5 min-h-[44px] rounded-lg border text-sm font-medium transition-colors shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
        likedByMe
          ? 'bg-[#fff1f2] border-[#fecdd3] text-[#be123c] hover:bg-[#ffe4e6]'
          : 'bg-white border-[#e6e4dd] text-slate-700 hover:border-slate-300 hover:bg-[#faf9f5]'
      }`}
    >
      <Heart
        className={`w-4 h-4 shrink-0 transition-transform ${
          likedByMe ? 'fill-[#e11d48] text-[#e11d48]' : 'fill-none text-slate-500'
        }`}
      />
      <span className="tabular-nums font-semibold">{loading ? '—' : likeCount}</span>
    </button>
  );
}

function resolveCommentAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^blob:/i.test(trimmed) ||
    /^data:image\//i.test(trimmed)
  ) {
    return trimmed;
  }
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  return `${cleanBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function isProtectedProfileAvatarPath(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /^\/api\/profile\/avatar(?:$|[?#])/i.test(trimmed) || /\/api\/profile\/avatar(?:$|[?#])/i.test(trimmed);
}

interface CommentAuthorAvatarProps {
  authorUsername: string;
  authorAvatarUrl?: string | null;
  depth: number;
  deleted: boolean;
  isOwnComment: boolean;
  currentUserAvatarObjectUrl: string | null;
  altPrefix: string;
}

function CommentAuthorAvatar({
  authorUsername,
  authorAvatarUrl,
  depth,
  deleted,
  isOwnComment,
  currentUserAvatarObjectUrl,
  altPrefix,
}: CommentAuthorAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const directUrl = useMemo(() => {
    if (deleted || isProtectedProfileAvatarPath(authorAvatarUrl)) {
      return null;
    }
    return resolveCommentAvatarUrl(authorAvatarUrl);
  }, [authorAvatarUrl, deleted]);

  const activeSrc = useMemo(() => {
    if (deleted) return null;
    if (directUrl && failedSrc !== directUrl) {
      return directUrl;
    }
    if (isOwnComment && currentUserAvatarObjectUrl && failedSrc !== currentUserAvatarObjectUrl) {
      return currentUserAvatarObjectUrl;
    }
    return null;
  }, [deleted, directUrl, failedSrc, isOwnComment, currentUserAvatarObjectUrl]);

  const sizeClass = depth === 0 ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs';
  const frameToneClass = deleted
    ? 'bg-[#f2f0ea] border-[#e6e4dd] text-slate-400'
    : isOwnComment
      ? 'bg-[#dcfce7] border-[#86efac] text-[#15803d]'
      : 'bg-[#f7f6f2] border-[#e6e4dd] text-slate-700';

  const authorInitial = (authorUsername?.trim()[0] || '?').toUpperCase();

  if (activeSrc) {
    return (
      <div
        className={`rounded-lg overflow-hidden shrink-0 border ${frameToneClass} ${sizeClass}`}
      >
        <img
          src={activeSrc}
          alt={`${altPrefix}: ${authorUsername || 'user'}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailedSrc(activeSrc)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`rounded-lg flex items-center justify-center font-semibold shrink-0 border ${frameToneClass} ${sizeClass}`}
    >
      {authorInitial}
    </div>
  );
}

interface CommentNodeProps {
  comment: ProductComment;
  depth: number;
  language: Language;
  isAuthenticated: boolean;
  currentUsername: string | null;
  currentUserAvatarObjectUrl: string | null;
  socialState: UseProductSocialReturn;
  replyTextAreaRef: React.RefObject<TextAreaRef | null>;
}

function CommentNode({
  comment,
  depth,
  language,
  isAuthenticated,
  currentUsername,
  currentUserAvatarObjectUrl,
  socialState,
  replyTextAreaRef,
}: CommentNodeProps) {
  const ts = translations[language].productSocial;
  const {
    threadsByParentId,
    commentLikePendingIds,
    replyTarget,
    replyDraft,
    setReplyDraft,
    replyDraftError,
    creatingReply,
    editingComment,
    setEditingBody,
    editError,
    savingEdit,
    toggleCommentLike,
    startReply,
    cancelReply,
    submitReply,
    startEditComment,
    cancelEditComment,
    submitEditComment,
    requestDeleteComment,
    toggleRepliesVisibility,
    loadMoreReplies,
    reloadRepliesForComment,
  } = socialState;

  const isLikePending = commentLikePendingIds.includes(comment.id);
  const isReplyingHere = replyTarget?.commentId === comment.id && !comment.deleted;
  const isEditingHere = editingComment?.commentId === comment.id && !comment.deleted;
  const isOwnComment =
    !comment.deleted &&
    (Boolean(comment.ownedByMe) ||
      Boolean(
        isAuthenticated &&
          currentUsername &&
          comment.authorUsername &&
          comment.authorUsername.trim().toLowerCase() === currentUsername.trim().toLowerCase(),
      ));

  const childThread: CommentThreadState | undefined = threadsByParentId[comment.id];
  const isExpanded = Boolean(childThread?.expanded);
  const hasVisibleRepliesControl =
    comment.replyCount > 0 || (isExpanded && (childThread?.items.length ?? 0) > 0);
  const hasMoreChildReplies = Boolean(
    childThread?.page && childThread.page.number + 1 < childThread.page.totalPages,
  );

  const indentClasses =
    depth === 0
      ? 'mt-3 ml-3 sm:ml-6 pl-3.5 sm:pl-5 border-l border-[#e6e4dd] space-y-3'
      : depth < 3
        ? 'mt-3 ml-2.5 sm:ml-5 pl-3 sm:pl-4 border-l border-[#e6e4dd] space-y-3'
        : 'mt-3 ml-2 pl-2.5 border-l border-[#e6e4dd] space-y-3';

  return (
    <article
      id={`comment-${comment.id}`}
      data-own-comment={isOwnComment ? 'true' : undefined}
      aria-label={isOwnComment ? ts.ownCommentAriaLabel : undefined}
      className={
        depth === 0
          ? 'py-4 border-b border-[#f2f0ea] last:border-b-0'
          : 'pt-2.5 pb-1'
      }
    >
      <div
        className={
          isOwnComment
            ? 'flex items-start gap-3 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4]/75 px-3.5 py-3 shadow-[inset_3px_0_0_#16a34a]'
            : 'flex items-start gap-3'
        }
      >
        <CommentAuthorAvatar
          authorUsername={comment.authorUsername}
          authorAvatarUrl={comment.authorAvatarUrl}
          depth={depth}
          deleted={comment.deleted}
          isOwnComment={isOwnComment}
          currentUserAvatarObjectUrl={currentUserAvatarObjectUrl}
          altPrefix={ts.authorAvatarAltPrefix}
        />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Author + Timestamp Metadata */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={`font-semibold ${isOwnComment ? 'text-[#14532d]' : 'text-slate-900'}`}>
              {comment.authorUsername || 'user'}
            </span>
            {isOwnComment && (
              <span className="inline-flex items-center rounded-md border border-[#86efac] bg-[#dcfce7] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#15803d]">
                {ts.ownCommentBadge}
              </span>
            )}
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <time
              dateTime={comment.createdAt}
              className="text-slate-500 tabular-nums"
            >
              {formatOrderDateTime(comment.createdAt, language)}
            </time>
            {comment.editedAt && !comment.deleted && (
              <>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span
                  className="text-slate-400"
                  title={formatOrderDateTime(comment.editedAt, language)}
                >
                  {ts.editedLabel}
                </span>
              </>
            )}
          </div>

          {/* Comment Body / Deleted Placeholder / Inline Edit Form */}
          {comment.deleted ? (
            <p className="text-sm italic text-slate-400">{ts.deletedPlaceholder}</p>
          ) : isEditingHere && editingComment ? (
            <div className="space-y-2 pt-0.5">
              <Input.TextArea
                value={editingComment.body}
                onChange={(e) => setEditingBody(e.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
                showCount
                autoSize={{ minRows: 2, maxRows: 6 }}
                disabled={savingEdit}
                aria-label={ts.editButton}
              />
              {editError && (
                <p className="text-xs text-red-600">{editError}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="primary"
                  size="middle"
                  loading={savingEdit}
                  onClick={() => void submitEditComment()}
                  className="!min-h-[40px]"
                >
                  {ts.saveEditButton}
                </Button>
                <Button
                  size="middle"
                  disabled={savingEdit}
                  onClick={cancelEditComment}
                  className="!min-h-[40px]"
                >
                  {ts.cancelButton}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
              {comment.body}
            </p>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {!comment.deleted && (
              <>
                <button
                  type="button"
                  onClick={() => void toggleCommentLike(comment)}
                  disabled={isLikePending}
                  aria-pressed={comment.likedByMe}
                  aria-label={comment.likedByMe ? ts.unlikeCommentLabel : ts.likeCommentLabel}
                  className={`inline-flex items-center gap-1.5 px-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    comment.likedByMe
                      ? 'text-[#be123c] bg-[#fff1f2]'
                      : isOwnComment
                        ? 'text-slate-700 hover:bg-[#dcfce7]/70 hover:text-[#14532d]'
                        : 'text-slate-600 hover:bg-[#f2f0ea] hover:text-slate-900'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      comment.likedByMe ? 'fill-[#e11d48] text-[#e11d48]' : 'fill-none'
                    }`}
                  />
                  <span className="tabular-nums">{comment.likeCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => startReply(comment)}
                  className={`inline-flex items-center gap-1.5 px-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isOwnComment
                      ? 'text-slate-700 hover:bg-[#dcfce7]/70 hover:text-[#14532d]'
                      : 'text-slate-600 hover:bg-[#f2f0ea] hover:text-slate-900'
                  }`}
                >
                  <CornerDownRight className="w-3.5 h-3.5" />
                  <span>{ts.replyButton}</span>
                </button>

                {comment.ownedByMe && (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditComment(comment)}
                      className={`inline-flex items-center gap-1.5 px-2.5 min-h-[40px] rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isOwnComment
                          ? 'text-slate-700 hover:bg-[#dcfce7]/70 hover:text-[#14532d]'
                          : 'text-slate-600 hover:bg-[#f2f0ea] hover:text-slate-900'
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{ts.editButton}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => requestDeleteComment(comment)}
                      className="inline-flex items-center gap-1.5 px-2.5 min-h-[40px] rounded-lg text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{ts.deleteButton}</span>
                    </button>
                  </>
                )}
              </>
            )}

            {hasVisibleRepliesControl && (
              <button
                type="button"
                onClick={() => toggleRepliesVisibility(comment.id)}
                className="inline-flex items-center gap-1.5 px-2.5 min-h-[40px] rounded-lg text-xs font-semibold text-[#15803d] hover:bg-[#f0fdf4] transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>{ts.hideRepliesButton}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>
                      {ts.viewRepliesButton} ({comment.replyCount})
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Inline Reply Composer */}
          {isReplyingHere && (
            <div
              id={`reply-form-${comment.id}`}
              className="mt-2 rounded-lg border border-[#e6e4dd] bg-[#faf9f5] p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  {ts.replyingToLabel}{' '}
                  <strong className="font-semibold text-slate-900">
                    @{replyTarget.authorUsername}
                  </strong>
                </span>
              </div>

              <Input.TextArea
                ref={replyTextAreaRef}
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder={ts.replyPlaceholder}
                maxLength={MAX_COMMENT_LENGTH}
                showCount
                autoSize={{ minRows: 2, maxRows: 6 }}
                disabled={creatingReply}
                aria-label={ts.replyPlaceholder}
              />

              {replyDraftError && (
                <p className="text-xs text-red-600">{replyDraftError}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="primary"
                  size="middle"
                  loading={creatingReply}
                  onClick={() => void submitReply()}
                  className="!min-h-[40px]"
                >
                  {ts.replySubmitButton}
                </Button>
                <Button
                  size="middle"
                  disabled={creatingReply}
                  onClick={cancelReply}
                  className="!min-h-[40px]"
                >
                  {ts.cancelButton}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies Tree (kept outside own-comment card tint so replies by others stay neutral) */}
      {isExpanded && childThread && (
        <div className={indentClasses}>
          {childThread.loading && childThread.items.length === 0 ? (
            <div className="py-2 space-y-2">
              <Skeleton active paragraph={{ rows: 2 }} title={false} />
              <p className="text-xs text-slate-500">{ts.loadingReplies}</p>
            </div>
          ) : childThread.error && childThread.items.length === 0 ? (
            <Alert
              type="error"
              showIcon
              title={childThread.error}
              action={
                <Button
                  size="small"
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => void reloadRepliesForComment(comment.id)}
                >
                  {translations[language].catalog.retryButton}
                </Button>
              }
            />
          ) : (
            <>
              {childThread.items.map((reply) => (
                <CommentNode
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  language={language}
                  isAuthenticated={isAuthenticated}
                  currentUsername={currentUsername}
                  currentUserAvatarObjectUrl={currentUserAvatarObjectUrl}
                  socialState={socialState}
                  replyTextAreaRef={replyTextAreaRef}
                />
              ))}

              {childThread.error && childThread.items.length > 0 && (
                <p className="text-xs text-red-600">{childThread.error}</p>
              )}

              {hasMoreChildReplies && (
                <div className="pt-1">
                  <Button
                    size="middle"
                    loading={childThread.loadingMore}
                    onClick={() => loadMoreReplies(comment.id)}
                    className="!min-h-[40px]"
                  >
                    {ts.loadMoreReplies}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

interface ProductCommentsSectionProps {
  language: Language;
  isAuthenticated: boolean;
  currentUserProfile?: UserProfile | null;
  accessToken?: string | null;
  socialState: UseProductSocialReturn;
}

export function ProductCommentsSection({
  language,
  isAuthenticated,
  currentUserProfile = null,
  accessToken = null,
  socialState,
}: ProductCommentsSectionProps) {
  const ts = translations[language].productSocial;
  const tc = translations[language].catalog;
  const [currentUserAvatarObjectUrl, setCurrentUserAvatarObjectUrl] = useState<string | null>(null);
  const avatarBlobUrlRef = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(accessToken);
  accessTokenRef.current = accessToken;

  const replaceAvatarBlobUrl = (nextUrl: string | null) => {
    if (avatarBlobUrlRef.current) {
      URL.revokeObjectURL(avatarBlobUrlRef.current);
    }
    avatarBlobUrlRef.current = nextUrl;
    setCurrentUserAvatarObjectUrl(nextUrl);
  };

  useEffect(() => {
    return () => {
      if (avatarBlobUrlRef.current) {
        URL.revokeObjectURL(avatarBlobUrlRef.current);
        avatarBlobUrlRef.current = null;
      }
    };
  }, []);

  const hasAccessToken = Boolean(accessToken);
  const profileAvatarPath = currentUserProfile?.avatarUrl ?? null;

  useEffect(() => {
    const token = (sessionManager.getCurrentAccessToken() || accessTokenRef.current)?.trim() || null;
    if (!isAuthenticated || !profileAvatarPath || !token) {
      replaceAvatarBlobUrl(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const blob = await authApi.fetchAvatarBlob(token, language);
        if (cancelled) return;
        if (!blob) {
          replaceAvatarBlobUrl(null);
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        replaceAvatarBlobUrl(objectUrl);
      } catch {
        if (!cancelled) {
          replaceAvatarBlobUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profileAvatarPath, hasAccessToken, language]);

  const {
    social,
    rootThread,
    threadsByParentId,
    rootDraft,
    setRootDraft,
    rootDraftError,
    creatingRoot,
    replyTarget,
    replyDraft,
    setReplyDraft,
    replyDraftError,
    creatingReply,
    deleteTarget,
    deletingComment,
    actionError,
    clearActionError,
    restoredNotice,
    clearRestoredNotice,
    focusRequest,
    clearFocusRequest,
    submitRootComment,
    cancelReply,
    submitReply,
    cancelDeleteComment,
    confirmDeleteComment,
    loadMoreRootComments,
    reloadRootComments,
    openAuthPromptFromHint,
  } = socialState;

  const rootTextAreaRef = useRef<TextAreaRef | null>(null);
  const replyTextAreaRef = useRef<TextAreaRef | null>(null);

  const isReplyTargetVisibleInTree = useMemo(() => {
    if (!replyTarget) return false;
    return Object.values(threadsByParentId).some(
      (thread) =>
        thread.expanded && thread.items.some((item) => item.id === replyTarget.commentId && !item.deleted),
    );
  }, [replyTarget, threadsByParentId]);

  useEffect(() => {
    if (!focusRequest) return;

    const timer = window.setTimeout(() => {
      if (focusRequest.type === 'reply' && focusRequest.commentId) {
        const el =
          document.getElementById(`reply-form-${focusRequest.commentId}`) ??
          document.getElementById('fallback-reply-form') ??
          document.getElementById('comments');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        replyTextAreaRef.current?.focus();
      } else {
        const el = document.getElementById('comment-form') ?? document.getElementById('comments');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        rootTextAreaRef.current?.focus();
      }
      clearFocusRequest();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [focusRequest, clearFocusRequest]);

  const totalCommentsCount =
    social?.commentCount ?? rootThread.page?.totalElements ?? rootThread.items.length;

  const hasMoreRootComments = Boolean(
    rootThread.page && rootThread.page.number + 1 < rootThread.page.totalPages,
  );

  return (
    <section
      id="comments"
      tabIndex={-1}
      className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-8 space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a]"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[#f2f0ea]">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
            {ts.sectionTitle}
          </h2>
          <span className="text-sm text-slate-500 tabular-nums">
            {totalCommentsCount} {ts.commentsCountSuffix}
          </span>
        </div>
      </div>

      {/* Notices & Errors */}
      {restoredNotice && (
        <Alert
          type="info"
          showIcon
          closable
          title={restoredNotice}
          onClose={clearRestoredNotice}
        />
      )}

      {actionError && (
        <Alert
          type="error"
          showIcon
          closable
          title={actionError}
          onClose={clearActionError}
        />
      )}

      {/* Fallback Reply Box if user returned from OAuth for a collapsed reply node */}
      {replyTarget && !isReplyTargetVisibleInTree && (
        <div
          id="fallback-reply-form"
          className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-4 space-y-2.5"
        >
          <div className="text-xs font-medium text-[#15803d]">
            {ts.replyingToLabel} <strong>@{replyTarget.authorUsername}</strong>
          </div>
          <Input.TextArea
            ref={replyTextAreaRef}
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            placeholder={ts.replyPlaceholder}
            maxLength={MAX_COMMENT_LENGTH}
            showCount
            autoSize={{ minRows: 2, maxRows: 6 }}
            disabled={creatingReply}
          />
          {replyDraftError && <p className="text-xs text-red-600">{replyDraftError}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="primary"
              loading={creatingReply}
              onClick={() => void submitReply()}
              className="!min-h-[40px]"
            >
              {ts.replySubmitButton}
            </Button>
            <Button
              disabled={creatingReply}
              onClick={cancelReply}
              className="!min-h-[40px]"
            >
              {ts.cancelButton}
            </Button>
          </div>
        </div>
      )}

      {/* Root Comment Composer */}
      <div id="comment-form" className="space-y-3">
        {!isAuthenticated && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-[#e6e4dd] bg-[#faf9f5] px-4 py-2.5">
            <span className="text-xs sm:text-sm text-slate-600">{ts.guestCommentHint}</span>
            <Button
              size="middle"
              icon={<LogIn className="w-3.5 h-3.5" />}
              onClick={openAuthPromptFromHint}
              className="!min-h-[40px] shrink-0"
            >
              {ts.guestLoginPromptButton}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Input.TextArea
            ref={rootTextAreaRef}
            value={rootDraft}
            onChange={(e) => setRootDraft(e.target.value)}
            placeholder={ts.commentPlaceholder}
            maxLength={MAX_COMMENT_LENGTH}
            showCount
            autoSize={{ minRows: 3, maxRows: 7 }}
            disabled={creatingRoot}
            aria-label={ts.commentPlaceholder}
          />
          {rootDraftError && <p className="text-xs text-red-600">{rootDraftError}</p>}
        </div>

        <div className="flex justify-end">
          <Button
            type="primary"
            size="large"
            loading={creatingRoot}
            onClick={() => void submitRootComment()}
            className="!min-h-[44px]"
          >
            {ts.commentSubmitButton}
          </Button>
        </div>
      </div>

      {/* Comments Thread List */}
      <div className="pt-2 border-t border-[#f2f0ea]">
        {rootThread.loading && rootThread.items.length === 0 ? (
          <div className="py-6 space-y-4">
            <Skeleton active paragraph={{ rows: 3 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ) : rootThread.error && rootThread.items.length === 0 ? (
          <Alert
            type="error"
            showIcon
            title={rootThread.error}
            action={
              <Button
                type="primary"
                size="small"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => void reloadRootComments()}
              >
                {tc.retryButton}
              </Button>
            }
          />
        ) : rootThread.items.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">{ts.emptyTitle}</div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {ts.emptyDescription}
            </p>
          </div>
        ) : (
          <div>
            {rootThread.items.map((comment) => (
              <CommentNode
                key={comment.id}
                comment={comment}
                depth={0}
                language={language}
                isAuthenticated={isAuthenticated}
                currentUsername={currentUserProfile?.username ?? null}
                currentUserAvatarObjectUrl={currentUserAvatarObjectUrl}
                socialState={socialState}
                replyTextAreaRef={replyTextAreaRef}
              />
            ))}

            {rootThread.error && rootThread.items.length > 0 && (
              <div className="pt-3">
                <Alert type="error" showIcon title={rootThread.error} />
              </div>
            )}

            {hasMoreRootComments && (
              <div className="pt-5 flex justify-center">
                <Button
                  size="large"
                  loading={rootThread.loadingMore}
                  onClick={loadMoreRootComments}
                  className="!min-h-[44px]"
                >
                  {ts.loadMoreComments}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onCancel={cancelDeleteComment}
        mask={{ closable: !deletingComment }}
        title={<span className="font-semibold text-slate-900">{ts.deleteConfirmTitle}</span>}
        footer={[
          <Button
            key="cancel"
            onClick={cancelDeleteComment}
            disabled={deletingComment}
            className="!min-h-[40px]"
          >
            {ts.deleteConfirmCancel}
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            loading={deletingComment}
            onClick={() => void confirmDeleteComment()}
            className="!min-h-[40px]"
          >
            {ts.deleteConfirmOk}
          </Button>,
        ]}
      >
        <div className="space-y-3 pt-1">
          <p className="text-sm text-slate-600">{ts.deleteConfirmDescription}</p>
          {deleteTarget?.bodyPreview && (
            <div className="rounded-lg border border-[#e6e4dd] bg-[#f7f6f2] px-3 py-2 text-xs text-slate-700 whitespace-pre-wrap break-words line-clamp-3">
              {deleteTarget.bodyPreview}
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}
