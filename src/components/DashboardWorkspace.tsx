import { AVATAR_MAX_SOURCE_BYTES, prepareAvatarFile } from '../utils/avatarUpload';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Descriptions,
  Form,
  Input,
  Select,
} from 'antd';
import {
  AtSign,
  Camera,
  CheckCircle2,
  Globe,
  Phone,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import {
  formatCountdown,
  isProfileComplete,
  isValidUsername,
  validateOptionalPersonName,
  validatePhone,
} from '../utils/validation';
import { ProfileCompletionView } from './ProfileCompletionView';
import { SecuritySettingsSection } from './SecuritySettingsSection';
import { StoreHeader } from './StoreHeader';

type WorkspaceSection = 'profile' | 'security';

interface DashboardWorkspaceProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile;
  session: AuthSession;
  refreshing: boolean;
  onRefreshProfile: () => Promise<void>;
  onProfileUpdated: (nextProfile: UserProfile) => void;
  onProfileCompleted: (nextProfile: UserProfile) => void;
  onRequireRelogin: (message: string) => void;
  onUnauthorized: (message?: string) => void;
  onLogout: () => void;
}

interface PersonalFormValues {
  firstName: string;
  lastName: string;
  phone: string;
}

interface UsernameFormValues {
  username: string;
}

interface LanguageFormValues {
  language: Language;
}

function formatDateTime(value: string | null | undefined, lang: Language): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function DashboardWorkspace({
  language,
  onLanguageChange,
  profile,
  session,
  refreshing,
  onRefreshProfile,
  onProfileUpdated,
  onProfileCompleted,
  onRequireRelogin,
  onUnauthorized,
  onLogout,
}: DashboardWorkspaceProps) {
  const { message } = AntApp.useApp();
  const t = translations[language];
  const location = useLocation();

  const section: WorkspaceSection =
    location.pathname.replace(/\/+$/, '') === '/security' ? 'security' : 'profile';

  const profileComplete = isProfileComplete(profile);

  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
  );

  const [personalForm] = Form.useForm<PersonalFormValues>();
  const [usernameForm] = Form.useForm<UsernameFormValues>();
  const [languageForm] = Form.useForm<LanguageFormValues>();

  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);

  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [languageSaving, setLanguageSaving] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);

  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const avatarUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const replaceAvatarObjectUrl = (nextUrl: string | null) => {
    if (avatarUrlRef.current) {
      URL.revokeObjectURL(avatarUrlRef.current);
    }
    avatarUrlRef.current = nextUrl;
    setAvatarObjectUrl(nextUrl);
  };

  useEffect(() => {
    return () => {
      if (avatarUrlRef.current) {
        URL.revokeObjectURL(avatarUrlRef.current);
        avatarUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!profileComplete || !profile.avatarUrl) {
      replaceAvatarObjectUrl(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const blob = await authApi.fetchAvatarBlob(session.accessToken, language);
        if (cancelled) return;
        if (!blob) {
          replaceAvatarObjectUrl(null);
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        replaceAvatarObjectUrl(objectUrl);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthApiError && error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        replaceAvatarObjectUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileComplete, profile.avatarUrl, avatarVersion, Boolean(session.accessToken)]);

  useEffect(() => {
    personalForm.setFieldsValue({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      phone: profile.phone ?? '',
    });
  }, [profile.firstName, profile.lastName, profile.phone, personalForm]);

  useEffect(() => {
    usernameForm.setFieldsValue({
      username: profile.username,
    });
  }, [profile.username, usernameForm]);

  useEffect(() => {
    const resolvedLang: Language = profile.language === 'ru' ? 'ru' : 'uz';
    languageForm.setFieldsValue({
      language: resolvedLang,
    });
  }, [profile.language, languageForm]);

  useEffect(() => {
    const computeRemaining = () =>
      Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));

    setSecondsRemaining(computeRemaining());
    const timer = window.setInterval(() => {
      setSecondsRemaining(computeRemaining());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session.expiresAt]);

  const handleSavePersonal = async (values: PersonalFormValues) => {
    setPersonalError(null);
    setPersonalSaving(true);
    try {
      const updated = await authApi.updateProfile(
        session.accessToken,
        {
          firstName: values.firstName.trim() || null,
          lastName: values.lastName.trim() || null,
          phone: values.phone.trim() || null,
        },
        language,
      );
      onProfileUpdated(updated);
      message.success(t.workspace.personalForm.savedSuccess);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        setPersonalError(error.message);
        const mapped = error.fields
          .filter((f) => f === 'firstName' || f === 'lastName' || f === 'phone')
          .map((name) => ({ name: name as keyof PersonalFormValues, errors: [error.message] }));
        if (mapped.length > 0) personalForm.setFields(mapped);
      }
    } finally {
      setPersonalSaving(false);
    }
  };

  const handleSaveUsername = async (values: UsernameFormValues) => {
    setUsernameError(null);
    setUsernameSaving(true);
    try {
      const updated = await authApi.updateUsername(
        session.accessToken,
        { username: values.username },
        language,
      );
      onProfileUpdated(updated);
      message.success(t.workspace.usernameForm.savedSuccess);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        setUsernameError(error.message);
        if (error.code === 'profile.username.taken' || error.fields.includes('username')) {
          usernameForm.setFields([{ name: 'username', errors: [error.message] }]);
        }
      }
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleSaveLanguage = async (values: LanguageFormValues) => {
    setLanguageError(null);
    setLanguageSaving(true);
    try {
      const updated = await authApi.updateLanguage(
        session.accessToken,
        { language: values.language },
        values.language,
      );
      onProfileUpdated(updated);
      const nextLang: Language = updated.language === 'ru' ? 'ru' : 'uz';
      message.success(translations[nextLang].workspace.languageForm.savedSuccess);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        setLanguageError(error.message);
      }
    } finally {
      setLanguageSaving(false);
    }
  };

  const handleAvatarFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setAvatarBusy(true);
    try {
      if (file.size > AVATAR_MAX_SOURCE_BYTES) {
        setAvatarError(language === 'ru'
          ? '\u0420\u0430\u0437\u043c\u0435\u0440 \u0444\u0430\u0439\u043b\u0430 \u043d\u0435 \u0434\u043e\u043b\u0436\u0435\u043d \u043f\u0440\u0435\u0432\u044b\u0448\u0430\u0442\u044c 25 \u041c\u0411.'
          : 'Rasm hajmi 25 MB dan oshmasligi kerak.');
        return;
      }
      const prepared = await prepareAvatarFile(file);
      const updated = await authApi.uploadAvatar(session.accessToken, prepared, language);
      onProfileUpdated(updated);
      setAvatarVersion((v) => v + 1);
      message.success(t.workspace.avatar.uploadedSuccess);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        setAvatarError(error.message);
      } else {
        setAvatarError(t.validation.avatarReadError);
      }
    } finally {
      input.value = '';
      setAvatarBusy(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      await authApi.deleteAvatar(session.accessToken, language);
      replaceAvatarObjectUrl(null);
      onProfileUpdated({
        ...profile,
        avatarUrl: null,
      });
      message.success(t.workspace.avatar.deletedSuccess);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        setAvatarError(error.message);
      }
    } finally {
      setAvatarBusy(false);
    }
  };

  const displayName =
    profile.firstName || profile.lastName
      ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
      : `@${profile.username}`;

  const initials = (
    (profile.firstName?.[0] || '') + (profile.lastName?.[0] || '') ||
    profile.username.slice(0, 2)
  ).toUpperCase();

  const formattedLanguage =
    profile.language === 'ru'
      ? t.workspace.languageNames.ru
      : profile.language === 'uz'
        ? t.workspace.languageNames.uz
        : profile.language;

  const createdAtLabel = formatDateTime(profile.createdAt, language);
  const updatedAtLabel = formatDateTime(profile.updatedAt, language);
  const emailVerifiedLabel = formatDateTime(profile.emailVerifiedAt, language);

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete={profileComplete}
        onLogout={onLogout}
      />

      {section === 'profile' && !profileComplete ? (
        <ProfileCompletionView
          language={language}
          profile={profile}
          session={session}
          onCompleted={onProfileCompleted}
          onUnauthorized={onUnauthorized}
        />
      ) : (
        <main className="flex-1 w-full max-w-[1040px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {section === 'profile' && (
            <div className="space-y-6">
              {/* Profile Header & Avatar Management */}
              <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-[#14532d] text-white font-display font-bold text-xl flex items-center justify-center shrink-0 overflow-hidden border border-[#e6e4dd]">
                      {avatarObjectUrl ? (
                        <img
                          src={avatarObjectUrl}
                          alt={t.workspace.avatar.alt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>

                    <div className="min-w-0">
                      <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">
                        {displayName}
                      </h1>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>@{profile.username}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t.workspace.roleNames[profile.role]}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formattedLanguage}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleAvatarFileSelected}
                          className="hidden"
                        />
                        <Button
                          size="small"
                          icon={<Camera className="w-3.5 h-3.5" />}
                          loading={avatarBusy}
                          onClick={() => fileInputRef.current?.click()}
                          className="!min-h-[36px]"
                        >
                          {profile.avatarUrl || avatarObjectUrl
                            ? t.workspace.avatar.replaceButton
                            : t.workspace.avatar.uploadButton}
                        </Button>

                        {(profile.avatarUrl || avatarObjectUrl) && (
                          <Button
                            size="small"
                            danger
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            loading={avatarBusy}
                            onClick={handleDeleteAvatar}
                            className="!min-h-[36px]"
                          >
                            {t.workspace.avatar.deleteButton}
                          </Button>
                        )}

                        <span className="text-[11px] text-slate-400">
                          {language === 'ru'
                            ? 'JPEG, PNG, WebP, AVIF, HEIC, GIF, BMP, TIFF \u00b7 \u0434\u043e 25 \u041c\u0411'
                            : 'JPEG, PNG, WebP, AVIF, HEIC, GIF, BMP, TIFF · 25 MB gacha'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="sm:text-right sm:pr-3 sm:border-r border-[#e6e4dd]">
                      <div className="text-xs text-slate-500">{t.workspace.sessionExpiresIn}</div>
                      <div
                        className={`text-base font-semibold font-mono-tabular ${
                          secondsRemaining <= 60 ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {formatCountdown(secondsRemaining)}
                      </div>
                    </div>

                    <Button
                      type="primary"
                      icon={
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                      }
                      loading={refreshing}
                      onClick={onRefreshProfile}
                      className="!min-h-[44px]"
                    >
                      {t.workspace.refreshProfile}
                    </Button>
                  </div>
                </div>

                {avatarError && (
                  <Alert type="error" showIcon title={avatarError} className="text-xs rounded-lg" />
                )}
              </div>

              {/* Personal Info Edit Form (firstName, lastName, phone) */}
              <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {t.workspace.personalForm.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.workspace.personalForm.subtitle}
                  </p>
                </div>

                {personalError && (
                  <Alert
                    type="error"
                    showIcon
                    title={personalError}
                    className="text-xs rounded-lg"
                  />
                )}

                <Form
                  form={personalForm}
                  layout="vertical"
                  onFinish={handleSavePersonal}
                  requiredMark={false}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <Form.Item
                      name="firstName"
                      label={
                        <span className="text-sm font-medium text-slate-700">
                          {t.workspace.fields.firstName}
                        </span>
                      }
                      rules={[
                        {
                          validator: (_, value: string) => {
                            const check = validateOptionalPersonName(value || '');
                            if (!check.valid) {
                              return Promise.reject(new Error(t.validation.firstNameMaxLength));
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input
                        size="large"
                        placeholder={t.workspace.personalForm.firstNamePlaceholder}
                        autoComplete="given-name"
                        disabled={personalSaving}
                        className="!min-h-[44px]"
                      />
                    </Form.Item>

                    <Form.Item
                      name="lastName"
                      label={
                        <span className="text-sm font-medium text-slate-700">
                          {t.workspace.fields.lastName}
                        </span>
                      }
                      rules={[
                        {
                          validator: (_, value: string) => {
                            const check = validateOptionalPersonName(value || '');
                            if (!check.valid) {
                              return Promise.reject(new Error(t.validation.lastNameMaxLength));
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input
                        size="large"
                        placeholder={t.workspace.personalForm.lastNamePlaceholder}
                        autoComplete="family-name"
                        disabled={personalSaving}
                        className="!min-h-[44px]"
                      />
                    </Form.Item>

                    <Form.Item
                      name="phone"
                      className="md:col-span-2"
                      label={
                        <span className="text-sm font-medium text-slate-700">
                          {t.workspace.personalForm.phoneLabel}
                        </span>
                      }
                      extra={
                        <span className="text-xs text-slate-500">
                          {t.workspace.personalForm.phoneHelp}
                        </span>
                      }
                      rules={[
                        {
                          validator: (_, value: string) => {
                            const check = validatePhone(value || '');
                            if (!check.valid) {
                              if (check.reason === 'max_length') {
                                return Promise.reject(new Error(t.validation.phoneMaxLength));
                              }
                              return Promise.reject(new Error(t.validation.invalidPhone));
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input
                        type="tel"
                        inputMode="tel"
                        size="large"
                        prefix={<Phone className="w-4 h-4 text-slate-400 mr-1" />}
                        placeholder={t.workspace.personalForm.phonePlaceholder}
                        autoComplete="tel"
                        disabled={personalSaving}
                        className="!min-h-[44px]"
                      />
                    </Form.Item>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <span className="text-xs text-slate-500">
                      {t.workspace.personalForm.clearNote}
                    </span>

                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
                      <Button
                        size="large"
                        disabled={personalSaving}
                        onClick={() => {
                          setPersonalError(null);
                          personalForm.setFieldsValue({
                            firstName: profile.firstName ?? '',
                            lastName: profile.lastName ?? '',
                            phone: profile.phone ?? '',
                          });
                        }}
                        className="!min-h-[44px]"
                      >
                        {t.workspace.personalForm.resetButton}
                      </Button>
                      <Button
                        type="primary"
                        size="large"
                        htmlType="submit"
                        loading={personalSaving}
                        className="!min-h-[44px]"
                      >
                        {t.workspace.personalForm.saveButton}
                      </Button>
                    </div>
                  </div>
                </Form>
              </div>

              {/* Username & Language Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {t.workspace.usernameForm.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.workspace.usernameForm.subtitle}
                    </p>
                  </div>

                  {usernameError && (
                    <Alert
                      type="error"
                      showIcon
                      title={usernameError}
                      className="text-xs rounded-lg"
                    />
                  )}

                  <Form
                    form={usernameForm}
                    layout="vertical"
                    onFinish={handleSaveUsername}
                    requiredMark={false}
                  >
                    <Form.Item
                      name="username"
                      label={
                        <span className="text-sm font-medium text-slate-700">
                          {t.workspace.usernameForm.label}
                        </span>
                      }
                      extra={
                        <div className="space-y-1 mt-1 text-xs text-slate-500">
                          <div>{t.workspace.usernameForm.help}</div>
                          <div>{t.workspace.usernameForm.nextLoginNote}</div>
                        </div>
                      }
                      rules={[
                        { required: true, message: t.validation.requiredUsername },
                        {
                          validator: (_, value: string) => {
                            if (!value || isValidUsername(value)) return Promise.resolve();
                            return Promise.reject(new Error(t.validation.invalidUsername));
                          },
                        },
                      ]}
                    >
                      <Input
                        size="large"
                        prefix={<AtSign className="w-4 h-4 text-slate-400 mr-1" />}
                        placeholder={t.workspace.usernameForm.placeholder}
                        autoComplete="username"
                        disabled={usernameSaving}
                        className="!min-h-[44px]"
                      />
                    </Form.Item>

                    <Button
                      type="primary"
                      size="large"
                      htmlType="submit"
                      loading={usernameSaving}
                      className="!w-full sm:!w-auto !min-h-[44px]"
                    >
                      {t.workspace.usernameForm.saveButton}
                    </Button>
                  </Form>
                </div>

                <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {t.workspace.languageForm.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.workspace.languageForm.subtitle}
                    </p>
                  </div>

                  {languageError && (
                    <Alert
                      type="error"
                      showIcon
                      title={languageError}
                      className="text-xs rounded-lg"
                    />
                  )}

                  <Form
                    form={languageForm}
                    layout="vertical"
                    onFinish={handleSaveLanguage}
                    requiredMark={false}
                  >
                    <Form.Item
                      name="language"
                      label={
                        <span className="text-sm font-medium text-slate-700">
                          {t.workspace.languageForm.label}
                        </span>
                      }
                      rules={[{ required: true }]}
                    >
                      <Select
                        size="large"
                        disabled={languageSaving}
                        suffix={<Globe className="w-4 h-4 text-slate-400" />}
                        options={[
                          { value: 'uz', label: t.workspace.languageNames.uz },
                          { value: 'ru', label: t.workspace.languageNames.ru },
                        ]}
                      />
                    </Form.Item>

                    <Button
                      type="primary"
                      size="large"
                      htmlType="submit"
                      loading={languageSaving}
                      className="!w-full sm:!w-auto !min-h-[44px]"
                    >
                      {t.workspace.languageForm.saveButton}
                    </Button>
                  </Form>
                </div>
              </div>

              {/* Account Read-only Details */}
              <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {t.workspace.profileTitle}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t.workspace.profileSubtitle}</p>
                </div>

                <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle">
                  <Descriptions.Item label={t.workspace.fields.email}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-900 break-all">{profile.email}</span>
                      {profile.emailVerifiedAt && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#15803d]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.workspace.verifiedStatus}</span>
                        </span>
                      )}
                    </div>
                  </Descriptions.Item>

                  <Descriptions.Item label={t.workspace.fields.username}>
                    <span className="font-mono-tabular text-slate-900">@{profile.username}</span>
                  </Descriptions.Item>

                  <Descriptions.Item label={t.workspace.fields.firstName}>
                    {profile.firstName ? (
                      <span className="text-slate-900">{profile.firstName}</span>
                    ) : (
                      <span className="text-slate-400 italic">{t.workspace.notProvided}</span>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label={t.workspace.fields.lastName}>
                    {profile.lastName ? (
                      <span className="text-slate-900">{profile.lastName}</span>
                    ) : (
                      <span className="text-slate-400 italic">{t.workspace.notProvided}</span>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label={t.workspace.fields.phone}>
                    {profile.phone ? (
                      <span className="font-mono-tabular text-slate-900">{profile.phone}</span>
                    ) : (
                      <span className="text-slate-400 italic">{t.workspace.notProvided}</span>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label={t.workspace.fields.role}>
                    <span className="font-medium text-slate-900">
                      {t.workspace.roleNames[profile.role]}
                    </span>
                  </Descriptions.Item>

                  <Descriptions.Item label={t.workspace.fields.language}>
                    <span className="text-slate-900">{formattedLanguage}</span>
                  </Descriptions.Item>

                  <Descriptions.Item label={t.workspace.fields.emailVerified}>
                    {emailVerifiedLabel ? (
                      <span className="text-slate-900 font-mono-tabular text-xs">
                        {emailVerifiedLabel}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">{t.workspace.unverifiedStatus}</span>
                    )}
                  </Descriptions.Item>

                  {createdAtLabel && (
                    <Descriptions.Item label={t.workspace.fields.createdAt}>
                      <span className="text-slate-700 font-mono-tabular text-xs">
                        {createdAtLabel}
                      </span>
                    </Descriptions.Item>
                  )}

                  {updatedAtLabel && (
                    <Descriptions.Item label={t.workspace.fields.updatedAt}>
                      <span className="text-slate-700 font-mono-tabular text-xs">
                        {updatedAtLabel}
                      </span>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </div>
            </div>
          )}

          {section === 'security' && (
            <SecuritySettingsSection
              language={language}
              profile={profile}
              session={session}
              secondsRemaining={secondsRemaining}
              formattedLanguage={formattedLanguage}
              refreshing={refreshing}
              onRefreshProfile={onRefreshProfile}
              onLogout={onLogout}
              onRequireRelogin={onRequireRelogin}
              onUnauthorized={onUnauthorized}
            />
          )}
        </main>
      )}
    </div>
  );
}
