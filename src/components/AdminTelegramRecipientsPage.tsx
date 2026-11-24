import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Empty,
  Form,
  Input,
  Popconfirm,
  Result,
  Skeleton,
  Spin,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Bell, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import { orderApi } from '../services/orderApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import type { TelegramRecipient } from '../types/order';
import { isProfileComplete, isValidTelegramChatId } from '../utils/validation';
import { StoreHeader } from './StoreHeader';

interface AdminTelegramRecipientsPageProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile;
  session: AuthSession;
  onProfileUpdated: (nextProfile: UserProfile) => void;
  onUnauthorized: (message?: string) => void;
  onLogout: () => void;
}

interface BackendForbiddenState {
  endpoint?: string;
  message: string;
}

interface AddRecipientFormValues {
  chatId: string;
  label?: string;
}

export function AdminTelegramRecipientsPage({
  language,
  onLanguageChange,
  profile,
  session,
  onProfileUpdated,
  onUnauthorized,
  onLogout,
}: AdminTelegramRecipientsPageProps) {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const t = translations[language];
  const tr = t.adminTelegramRecipients;

  const isAdmin = profile.role === 'ADMIN';
  const [form] = Form.useForm<AddRecipientFormValues>();

  const [verifyingProfile, setVerifyingProfile] = useState(false);
  const [recipients, setRecipients] = useState<TelegramRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [forbiddenState, setForbiddenState] = useState<BackendForbiddenState | null>(null);

  const hasAccessToken = Boolean(session.accessToken);

  useEffect(() => {
    if (isAdmin) {
      setVerifyingProfile(false);
      return;
    }

    let cancelled = false;
    setVerifyingProfile(true);

    (async () => {
      try {
        const freshProfile = await authApi.getProfile(session.accessToken, language);
        if (cancelled) return;
        if (freshProfile.role !== profile.role || freshProfile.updatedAt !== profile.updatedAt) {
          onProfileUpdated(freshProfile);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          if (error.status === 403) {
            setForbiddenState({
              endpoint: error.endpoint || 'GET /api/profile',
              message: error.message,
            });
          }
        }
      } finally {
        if (!cancelled) {
          setVerifyingProfile(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, hasAccessToken]);

  const loadRecipients = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setPageError(null);
    setForbiddenState(null);

    try {
      const list = await orderApi.listTelegramRecipients(session.accessToken, language);
      setRecipients(Array.isArray(list) ? list : []);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || 'GET /api/admin/orders/telegram-recipients',
            message: error.message,
          });
          return;
        }
        setPageError(error.message);
      } else {
        setPageError(
          language === 'ru'
            ? 'Не удалось загрузить получателей Telegram.'
            : 'Telegram qabul qiluvchilarini yuklab bo‘lmadi.',
        );
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, language, onUnauthorized, hasAccessToken]);

  useEffect(() => {
    if (isAdmin) {
      void loadRecipients();
    }
  }, [isAdmin, loadRecipients]);

  const handleAddRecipient = async (values: AddRecipientFormValues) => {
    const cleanChatId = values.chatId.trim();
    const cleanLabel = values.label?.trim() ? values.label.trim() : null;

    setSubmitting(true);
    setFormError(null);

    try {
      await orderApi.createTelegramRecipient(
        session.accessToken,
        {
          chatId: cleanChatId,
          label: cleanLabel,
        },
        language,
      );
      form.resetFields();
      message.success(tr.notifications.createdSuccess);
      await loadRecipients();
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || 'POST /api/admin/orders/telegram-recipients',
            message: error.message,
          });
          return;
        }
        if (error.status === 409) {
          form.setFields([{ name: 'chatId', errors: [error.message] }]);
          setFormError(error.message);
          return;
        }
        if (error.status === 400) {
          const fieldErrors: Array<{ name: keyof AddRecipientFormValues; errors: string[] }> = [];
          for (const f of error.fields) {
            if (f === 'chatId' || f === 'label') {
              fieldErrors.push({ name: f, errors: [error.message] });
            }
          }
          if (fieldErrors.length > 0) {
            form.setFields(fieldErrors);
          }
          setFormError(error.message);
          return;
        }
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecipient = async (recipientId: string) => {
    setDeletingId(recipientId);
    setPageError(null);

    try {
      await orderApi.deleteTelegramRecipient(session.accessToken, recipientId, language);
      message.success(tr.notifications.deletedSuccess);
      await loadRecipients();
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 403) {
          setForbiddenState({
            endpoint: error.endpoint || `DELETE /api/admin/orders/telegram-recipients/${recipientId}`,
            message: error.message,
          });
          return;
        }
        if (error.status === 404) {
          await loadRecipients();
          return;
        }
        setPageError(error.message);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnsType<TelegramRecipient> = [
    {
      title: tr.columns.chatId,
      dataIndex: 'chatId',
      key: 'chatId',
      render: (chatId: string) => (
        <span className="font-mono font-semibold text-slate-900 tabular-nums select-all">
          {chatId}
        </span>
      ),
    },
    {
      title: tr.columns.label,
      dataIndex: 'label',
      key: 'label',
      render: (label: string | null) =>
        label && label.trim() ? (
          <span className="text-sm text-slate-800">{label}</span>
        ) : (
          <span className="text-xs text-slate-400">{tr.noLabel}</span>
        ),
    },
    {
      title: tr.columns.actions,
      key: 'actions',
      align: 'right',
      width: 140,
      render: (_: unknown, record) => (
        <Popconfirm
          title={tr.deleteConfirmTitle}
          description={tr.deleteConfirmDescription}
          okText={tr.deleteConfirmOk}
          cancelText={tr.deleteConfirmCancel}
          okButtonProps={{ danger: true }}
          onConfirm={() => void handleDeleteRecipient(record.id)}
        >
          <Button
            danger
            type="text"
            size="small"
            loading={deletingId === record.id}
            icon={<Trash2 className="w-4 h-4" />}
            className="!inline-flex !items-center"
          >
            {tr.deleteButton}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const profileComplete = isProfileComplete(profile);

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {verifyingProfile ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-8 flex items-center justify-center gap-3">
            <Spin />
            <span className="text-sm font-medium text-slate-600">{tr.checkingPermissions}</span>
          </div>
        ) : !isAdmin ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tr.userRoleBlockedTitle}
              subTitle={tr.userRoleBlockedSubtitle}
              extra={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => navigate('/')}
                    className="!min-h-[44px]"
                  >
                    {tr.backToStore}
                  </Button>
                  <Button size="large" onClick={onLogout} className="!min-h-[44px]">
                    {tr.switchAccountButton}
                  </Button>
                </div>
              }
            />
          </div>
        ) : forbiddenState ? (
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-6 sm:p-10">
            <Result
              status="403"
              title={tr.backendForbiddenTitle}
              subTitle={
                <div className="space-y-2 max-w-lg mx-auto">
                  <p>{tr.backendForbiddenSubtitle}</p>
                  {forbiddenState.message && (
                    <p className="text-sm font-medium text-slate-700">{forbiddenState.message}</p>
                  )}
                  {forbiddenState.endpoint && (
                    <div className="text-xs font-mono text-slate-500">
                      {tr.backendForbiddenEndpointLabel}: {forbiddenState.endpoint}
                    </div>
                  )}
                </div>
              }
              extra={
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/')}
                  className="!min-h-[44px]"
                >
                  {tr.backToStore}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Header Bar */}
            <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{t.brandName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{tr.menuGroupLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {tr.totalCountLabel}: {recipients.length}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
                  {tr.title}
                </h1>
                <p className="text-sm text-slate-600">{tr.subtitle}</p>
              </div>

              <Button
                size="large"
                icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                onClick={() => void loadRecipients()}
                disabled={loading}
                className="!min-h-[44px] shrink-0"
              >
                {tr.refreshButton}
              </Button>
            </div>

            {/* Bot Delivery & Permissions Note */}
            <Alert
              type="info"
              showIcon
              icon={<Bell className="w-4 h-4 mt-0.5" />}
              title={<span className="font-semibold text-slate-900">{tr.botNoteTitle}</span>}
              description={
                <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-slate-700 mt-1">
                  <li>{tr.botNotePrivateChat}</li>
                  <li>{tr.botNoteGroupChat}</li>
                  <li>{tr.botNoteNoImmediateTest}</li>
                </ul>
              }
            />

            {pageError && (
              <Alert
                type="error"
                showIcon
                title={pageError}
                action={
                  <Button type="primary" size="small" onClick={() => void loadRecipients()}>
                    {t.catalog.retryButton}
                  </Button>
                }
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Add Chat ID Card */}
              <section className="lg:col-span-5 bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#16a34a] shrink-0" />
                  <h2 className="text-lg font-semibold text-slate-900 font-display">
                    {tr.formTitle}
                  </h2>
                </div>

                {formError && (
                  <Alert type="error" showIcon title={formError} className="text-xs rounded-lg" />
                )}

                <Form<AddRecipientFormValues>
                  form={form}
                  layout="vertical"
                  requiredMark={false}
                  onFinish={handleAddRecipient}
                >
                  <Form.Item
                    name="chatId"
                    label={
                      <span className="text-sm font-medium text-slate-700">{tr.chatIdLabel}</span>
                    }
                    extra={<span className="text-xs text-slate-500">{tr.chatIdHelp}</span>}
                    rules={[
                      { required: true, message: tr.validation.chatIdRequired },
                      {
                        validator: (_, value: string) => {
                          const trimmed = (value ?? '').trim();
                          if (!trimmed) return Promise.resolve();
                          return isValidTelegramChatId(trimmed)
                            ? Promise.resolve()
                            : Promise.reject(new Error(tr.validation.chatIdInvalid));
                        },
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      placeholder={tr.chatIdPlaceholder}
                      disabled={submitting}
                      className="font-mono"
                    />
                  </Form.Item>

                  <Form.Item
                    name="label"
                    label={
                      <span className="text-sm font-medium text-slate-700">{tr.labelLabel}</span>
                    }
                    rules={[
                      {
                        validator: (_, value: string) => {
                          const trimmed = (value ?? '').trim();
                          if (trimmed.length > 100) {
                            return Promise.reject(new Error(tr.validation.labelMaxLength));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      maxLength={100}
                      placeholder={tr.labelPlaceholder}
                      disabled={submitting}
                    />
                  </Form.Item>

                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={submitting}
                    icon={<Plus className="w-4 h-4" />}
                    className="!min-h-[44px]"
                  >
                    {tr.addButton}
                  </Button>
                </Form>
              </section>

              {/* Recipients List Table */}
              <section className="lg:col-span-7 bg-white border border-[#e6e4dd] rounded-xl overflow-hidden">
                {loading && recipients.length === 0 ? (
                  <div className="p-6">
                    <Skeleton active paragraph={{ rows: 4 }} />
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="p-8 sm:p-10">
                    <Empty
                      image={<Bell className="w-10 h-10 text-slate-300 mx-auto" />}
                      description={
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">{tr.emptyTitle}</div>
                          <div className="text-sm text-slate-500 max-w-md mx-auto">
                            {tr.emptyDescription}
                          </div>
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <Table<TelegramRecipient>
                    rowKey="id"
                    columns={columns}
                    dataSource={recipients}
                    loading={loading}
                    pagination={false}
                  />
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
