import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Empty, Modal, Pagination, Skeleton } from 'antd';
import { Clock, Eye, Film, History, Image as ImageIcon, RefreshCw, User } from 'lucide-react';
import { translations } from '../i18n/translations';
import { adminAdvertisementApi } from '../services/adminAdvertisementApi';
import { AuthApiError } from '../services/authApi';
import { sessionManager } from '../services/sessionManager';
import type { AdminAdvertisementHistoryEntry } from '../types/adminAdvertisement';
import type { Language } from '../types/auth';
import {
  formatAdvertisementDateTime,
  getStatusBadgeStyle,
  inferAdvertisementMediaKind,
} from '../utils/advertisement';
import { AuthorizedAdMediaPreview } from './AuthorizedAdMediaPreview';

const DEFAULT_HISTORY_PAGE_SIZE = 20;

interface AdminAdvertisementHistoryDrawerProps {
  open: boolean;
  advertisementId: string | null;
  advertisementTitle: string;
  language: Language;
  accessToken: string;
  onClose: () => void;
  onUnauthorized: (message?: string) => void;
  onForbidden: (endpoint: string, message: string) => void;
}

export function AdminAdvertisementHistoryDrawer({
  open,
  advertisementId,
  advertisementTitle,
  language,
  accessToken,
  onClose,
  onUnauthorized,
  onForbidden,
}: AdminAdvertisementHistoryDrawerProps) {
  const ta = translations[language].adminAdvertisements;
  const th = ta.history;

  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const seqRef = useRef(0);

  const [entries, setEntries] = useState<AdminAdvertisementHistoryEntry[]>([]);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_HISTORY_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedSnapshotEntry, setSelectedSnapshotEntry] =
    useState<AdminAdvertisementHistoryEntry | null>(null);

  const loadHistory = useCallback(
    async (adId: string, targetPage: number, targetSize: number) => {
      const token = sessionManager.getCurrentAccessToken() ?? accessTokenRef.current;
      if (!token) return;

      const seq = ++seqRef.current;
      setLoading(true);
      setPushStatus(null);
      setErrorMessage(null);

      try {
        void adminAdvertisementApi.latestPushStatus(token, adId, language).then(status => {
          if (seq === seqRef.current) setPushStatus(status);
        }).catch(() => {});
        const res = await adminAdvertisementApi.getHistory(
          token,
          adId,
          { page: targetPage, size: targetSize },
          language,
        );
        if (seq !== seqRef.current) return;

        setEntries(res.content);
        setTotalElements(res.page.totalElements);
        if (res.page.number !== targetPage) {
          setPage(res.page.number);
        }
      } catch (error) {
        if (seq !== seqRef.current) return;
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            onClose();
            onForbidden(error.endpoint || `GET /api/admin/advertisements/${adId}/history`, error.message);
            return;
          }
          setErrorMessage(error.message);
        } else {
          setErrorMessage(ta.notifications.loadDetailError);
        }
      } finally {
        if (seq === seqRef.current) {
          setLoading(false);
        }
      }
    },
    [language, onClose, onForbidden, onUnauthorized, ta.notifications.loadDetailError],
  );

  useEffect(() => {
    if (!open || !advertisementId) {
      setEntries([]);
      setPage(0);
      setTotalElements(0);
      setErrorMessage(null);
      setSelectedSnapshotEntry(null);
      return;
    }

    setPage(0);
    void loadHistory(advertisementId, 0, size);
  }, [open, advertisementId, size, loadHistory]);

  const getActionLabel = (action: string) => {
    const normalized = action.trim().toUpperCase();
    return th.actions[normalized] || action;
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        size="large"
        destroyOnHidden
        title={
          <div className="pr-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803d]">
              <History className="w-3.5 h-3.5" />
              <span>{th.title}</span>
            </div>
            <div className="font-display font-semibold text-slate-900 line-clamp-1">
              {advertisementTitle}
            </div>
          </div>
        }
        extra={
          advertisementId && (
            <Button
              size="small"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              loading={loading}
              onClick={() => void loadHistory(advertisementId, page, size)}
            >
              {ta.refreshButton}
            </Button>
          )
        }
      >
        <div className="space-y-4">
          {pushStatus && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
            {({
              QUEUED: language === 'ru' ? 'Push в очереди' : 'Bildirishnoma navbatda',
              ACCEPTED: language === 'ru' ? 'Firebase принял уведомление' : 'Firebase bildirishnomani qabul qildi',
              FAILED: language === 'ru' ? 'Ошибка отправки' : 'Yuborishda xato',
              CANCELLED: language === 'ru' ? 'Отправка отменена' : 'Yuborish bekor qilindi',
            } as Record<string, string>)[pushStatus] ?? pushStatus}
          </p>}
          <p className="text-xs sm:text-sm text-slate-600">{th.subtitle}</p>

          {errorMessage && (
            <Alert
              type="error"
              showIcon
              title={errorMessage}
              action={
                advertisementId ? (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => void loadHistory(advertisementId, page, size)}
                  >
                    {ta.retryButton}
                  </Button>
                ) : null
              }
            />
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#e6e4dd] bg-white p-4"
                >
                  <Skeleton active paragraph={{ rows: 2 }} title={{ width: '50%' }} />
                </div>
              ))}
            </div>
          ) : entries.length === 0 && !errorMessage ? (
            <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-8">
              <Empty
                description={
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900">{th.emptyTitle}</div>
                    <div className="text-xs text-slate-500">{th.emptyDescription}</div>
                  </div>
                }
              />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {entries.map((entry) => {
                  const mediaKind = inferAdvertisementMediaKind(entry.snapshot.media);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedSnapshotEntry(entry)}
                      className="w-full text-left rounded-xl border border-[#e6e4dd] hover:border-[#86efac] bg-white hover:bg-[#faf9f5]/70 p-4 space-y-2.5 transition-colors cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] text-xs font-mono font-semibold tabular-nums">
                            v{entry.revision}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {getActionLabel(entry.action)}
                          </span>
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16a34a]">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{th.viewVersionButton}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatAdvertisementDateTime(entry.changedAt, language)}
                        </span>

                        <span className="inline-flex items-center gap-1 font-mono">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {th.actorLabel}: {entry.actorId || th.systemActor}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          {mediaKind === 'VIDEO' ? (
                            <Film className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {mediaKind === 'VIDEO'
                            ? ta.mediaKinds.VIDEO
                            : mediaKind === 'IMAGE'
                              ? ta.mediaKinds.IMAGE
                              : ta.mediaKinds.NONE}
                        </span>
                      </div>

                      {entry.reason && (
                        <div className="rounded-lg bg-[#faf9f5] border border-[#f2f0ea] px-3 py-2 text-xs text-slate-700">
                          <span className="font-semibold text-slate-800">{th.reasonLabel}:</span>{' '}
                          {entry.reason}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {totalElements > size && (
                <div className="flex justify-end pt-2">
                  <Pagination
                    current={page + 1}
                    pageSize={size}
                    total={totalElements}
                    showSizeChanger
                    pageSizeOptions={['10', '20', '50']}
                    onChange={(nextPage, nextSize) => {
                      if (!advertisementId) return;
                      const nextZeroPage = nextSize !== size ? 0 : Math.max(0, nextPage - 1);
                      setSize(nextSize);
                      setPage(nextZeroPage);
                      void loadHistory(advertisementId, nextZeroPage, nextSize);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Drawer>

      {/* Historical Snapshot Detail Modal (automatically revokes Blob object URL when closed) */}
      <Modal
        open={Boolean(selectedSnapshotEntry)}
        onCancel={() => setSelectedSnapshotEntry(null)}
        destroyOnHidden
        width={680}
        mask={{ closable: true }}
        title={
          selectedSnapshotEntry ? (
            <div className="flex flex-wrap items-center gap-2 pr-6">
              <span className="font-display font-semibold text-slate-900">
                {th.snapshotModalTitle}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] text-xs font-mono font-semibold tabular-nums">
                v{selectedSnapshotEntry.revision}
              </span>
            </div>
          ) : null
        }
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setSelectedSnapshotEntry(null)}
            className="!min-h-[40px]"
          >
            {ta.drawer.closeButton}
          </Button>,
        ]}
      >
        {selectedSnapshotEntry && (
          <div className="space-y-4 pt-2 max-h-[72vh] overflow-y-auto pr-1">
            {/* Action Metadata */}
            <div className="rounded-xl border border-[#e6e4dd] bg-[#faf9f5] p-3.5 space-y-2 text-xs text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 text-sm">
                  {getActionLabel(selectedSnapshotEntry.action)}
                </span>
                <span className="tabular-nums">
                  {formatAdvertisementDateTime(selectedSnapshotEntry.changedAt, language)}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-700">{th.actorLabel}:</span>{' '}
                <code className="font-mono">{selectedSnapshotEntry.actorId || th.systemActor}</code>
              </div>
              {selectedSnapshotEntry.reason && (
                <div className="text-slate-800 whitespace-pre-line">
                  <span className="font-medium text-slate-700">{th.reasonLabel}:</span>{' '}
                  {selectedSnapshotEntry.reason}
                </div>
              )}
            </div>

            {/* Historical Authorized Media Preview */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-700">{th.mediaLabel}</div>
              <AuthorizedAdMediaPreview
                media={selectedSnapshotEntry.snapshot.media}
                accessToken={accessToken}
                language={language}
                alt={
                  selectedSnapshotEntry.snapshot.uz.title ||
                  selectedSnapshotEntry.snapshot.ru.title ||
                  advertisementTitle
                }
                emptyText={th.noMediaInVersion}
              />
            </div>

            {/* Bilingual Texts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#e6e4dd] bg-white p-3.5 space-y-1.5">
                <div className="text-xs font-semibold text-[#15803d]">
                  {ta.drawer.uzSectionTitle}
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {selectedSnapshotEntry.snapshot.uz.title || '—'}
                </div>
                {selectedSnapshotEntry.snapshot.uz.description && (
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {selectedSnapshotEntry.snapshot.uz.description}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[#e6e4dd] bg-white p-3.5 space-y-1.5">
                <div className="text-xs font-semibold text-[#15803d]">
                  {ta.drawer.ruSectionTitle}
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {selectedSnapshotEntry.snapshot.ru.title || '—'}
                </div>
                {selectedSnapshotEntry.snapshot.ru.description && (
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {selectedSnapshotEntry.snapshot.ru.description}
                  </p>
                )}
              </div>
            </div>

            {/* Channels, Dates, Target URL, Status, Sort Order */}
            <div className="rounded-xl border border-[#e6e4dd] bg-white p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500">{th.channelsLabel}</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedSnapshotEntry.snapshot.channels.length > 0 ? (
                    selectedSnapshotEntry.snapshot.channels.map((ch) => (
                      <span
                        key={ch}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-[#faf9f5] border border-[#e6e4dd] font-medium text-slate-800"
                      >
                        {ta.channels[ch]}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-slate-500">{th.statusLabel}</div>
                <div className="mt-1">
                  {selectedSnapshotEntry.snapshot.status ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded border font-medium ${getStatusBadgeStyle(
                        selectedSnapshotEntry.snapshot.status,
                      )}`}
                    >
                      {ta.statuses[selectedSnapshotEntry.snapshot.status]}
                    </span>
                  ) : (
                    '—'
                  )}
                </div>
              </div>

              <div>
                <div className="text-slate-500">{th.scheduleLabel}</div>
                <div className="font-medium text-slate-800 mt-1 tabular-nums">
                  {!selectedSnapshotEntry.snapshot.startsAt &&
                  !selectedSnapshotEntry.snapshot.endsAt ? (
                    ta.scheduleUnlimited
                  ) : (
                    <div className="space-y-0.5">
                      <div>
                        {ta.scheduleFromPrefix}:{' '}
                        {formatAdvertisementDateTime(
                          selectedSnapshotEntry.snapshot.startsAt,
                          language,
                        )}
                      </div>
                      <div>
                        {ta.scheduleToPrefix}:{' '}
                        {formatAdvertisementDateTime(
                          selectedSnapshotEntry.snapshot.endsAt,
                          language,
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-slate-500">{th.sortOrderLabel}</div>
                <div className="font-mono font-semibold text-slate-800 mt-1 tabular-nums">
                  {selectedSnapshotEntry.snapshot.sortOrder ?? 0}
                </div>
              </div>

              {selectedSnapshotEntry.snapshot.targetUrl && (
                <div className="sm:col-span-2">
                  <div className="text-slate-500">{th.targetUrlLabel}</div>
                  <div className="font-mono text-slate-800 mt-1 break-all">
                    {selectedSnapshotEntry.snapshot.targetUrl}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
