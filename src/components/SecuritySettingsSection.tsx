import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Descriptions, Form, Input } from 'antd';
import { ArrowLeft, Clock, KeyRound, Lock, Mail, RefreshCw, ShieldAlert } from 'lucide-react';
import { translations } from '../i18n/translations';
import {
  authApi,
  AuthApiError,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_VALIDITY_SECONDS,
} from '../services/authApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import {
  formatCountdown,
  getUtf8ByteLength,
  isValidEmail,
  normalizeOtpDigits,
  validatePasswordRules,
} from '../utils/validation';

interface SecuritySettingsSectionProps {
  language: Language;
  profile: UserProfile;
  session: AuthSession;
  secondsRemaining: number;
  formattedLanguage: string;
  refreshing: boolean;
  onRefreshProfile: () => Promise<void>;
  onLogout: () => void;
  onRequireRelogin: (message: string) => void;
  onUnauthorized: (message?: string) => void;
}

interface EmailStep1Values {
  email: string;
  currentPassword: string;
}

interface EmailVerifyValues {
  code: string;
}

interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface PendingEmailChallenge {
  challengeId: string;
  newEmail: string;
  currentPassword: string;
  serverMessage: string;
}

export function SecuritySettingsSection({
  language,
  profile,
  session,
  secondsRemaining,
  formattedLanguage,
  refreshing,
  onRefreshProfile,
  onLogout,
  onRequireRelogin,
  onUnauthorized,
}: SecuritySettingsSectionProps) {
  const t = translations[language];

  const [emailForm] = Form.useForm<EmailStep1Values>();
  const [emailVerifyForm] = Form.useForm<EmailVerifyValues>();
  const [passwordForm] = Form.useForm<ChangePasswordValues>();

  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailResending, setEmailResending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailChallenge, setEmailChallenge] = useState<PendingEmailChallenge | null>(null);
  const [emailValidityLeft, setEmailValidityLeft] = useState(0);
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);
  const [emailFailedAttempts, setEmailFailedAttempts] = useState(0);

  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const validityIntervalRef = useRef<number | null>(null);
  const cooldownIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!emailChallenge || emailValidityLeft <= 0) {
      if (validityIntervalRef.current !== null) {
        window.clearInterval(validityIntervalRef.current);
        validityIntervalRef.current = null;
      }
      return;
    }

    validityIntervalRef.current = window.setInterval(() => {
      setEmailValidityLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (validityIntervalRef.current !== null) {
        window.clearInterval(validityIntervalRef.current);
        validityIntervalRef.current = null;
      }
    };
  }, [emailChallenge, emailValidityLeft > 0]);

  useEffect(() => {
    if (emailResendCooldown <= 0) {
      if (cooldownIntervalRef.current !== null) {
        window.clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      return;
    }

    cooldownIntervalRef.current = window.setInterval(() => {
      setEmailResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (cooldownIntervalRef.current !== null) {
        window.clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [emailResendCooldown > 0]);

  const handleRequestEmailChange = async (values: EmailStep1Values) => {
    setEmailError(null);
    setEmailSubmitting(true);
    try {
      const normalizedEmail = values.email.trim().toLowerCase();
      const res = await authApi.requestEmailChange(
        session.accessToken,
        {
          email: normalizedEmail,
          currentPassword: values.currentPassword,
        },
        language,
      );
      setEmailChallenge({
        challengeId: res.challengeId,
        newEmail: normalizedEmail,
        currentPassword: values.currentPassword,
        serverMessage: res.message,
      });
      setEmailValidityLeft(OTP_VALIDITY_SECONDS);
      setEmailResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      setEmailFailedAttempts(0);
      emailVerifyForm.resetFields();
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 429) {
          setEmailResendCooldown(error.retryAfterSeconds ?? OTP_RESEND_COOLDOWN_SECONDS);
        }
        setEmailError(error.message);
        const mappedFields: Array<{ name: keyof EmailStep1Values; errors: string[] }> = [];
        if (error.code === 'profile.email.taken' || error.fields.includes('email')) {
          mappedFields.push({ name: 'email', errors: [error.message] });
        }
        if (error.code === 'profile.password.invalid' || error.fields.includes('currentPassword')) {
          mappedFields.push({ name: 'currentPassword', errors: [error.message] });
        }
        if (mappedFields.length > 0) {
          emailForm.setFields(mappedFields);
        }
      }
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleVerifyEmailChange = async (values: EmailVerifyValues) => {
    if (!emailChallenge) return;
    setEmailError(null);
    setEmailSubmitting(true);
    try {
      const cleanCode = normalizeOtpDigits(values.code || '');
      const res = await authApi.verifyEmailChange(
        session.accessToken,
        {
          challengeId: emailChallenge.challengeId,
          code: cleanCode,
        },
        language,
      );
      onRequireRelogin(res.message);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 400) {
          setEmailFailedAttempts((prev) => prev + 1);
        }
        setEmailError(error.message);
        if (error.code === 'auth.code.invalid' || error.fields.includes('code')) {
          emailVerifyForm.setFields([{ name: 'code', errors: [error.message] }]);
        }
      }
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleResendEmailCode = async () => {
    if (!emailChallenge || emailResendCooldown > 0) return;
    setEmailError(null);
    setEmailResending(true);
    try {
      const res = await authApi.requestEmailChange(
        session.accessToken,
        {
          email: emailChallenge.newEmail,
          currentPassword: emailChallenge.currentPassword,
        },
        language,
      );
      setEmailChallenge({
        ...emailChallenge,
        challengeId: res.challengeId,
        serverMessage: res.message,
      });
      setEmailValidityLeft(OTP_VALIDITY_SECONDS);
      setEmailResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      setEmailFailedAttempts(0);
      emailVerifyForm.resetFields();
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        if (error.status === 429) {
          setEmailResendCooldown(error.retryAfterSeconds ?? OTP_RESEND_COOLDOWN_SECONDS);
        }
        setEmailError(error.message);
      }
    } finally {
      setEmailResending(false);
    }
  };

  const handleChangePassword = async (values: ChangePasswordValues) => {
    setPasswordError(null);
    setPasswordSubmitting(true);
    try {
      const res = await authApi.changePassword(
        session.accessToken,
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        language,
      );
      onRequireRelogin(res.message);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        setPasswordError(error.message);
        const mappedFields: Array<{ name: keyof ChangePasswordValues; errors: string[] }> = [];
        if (error.code === 'profile.password.invalid' || error.fields.includes('currentPassword')) {
          mappedFields.push({ name: 'currentPassword', errors: [error.message] });
        }
        if (error.fields.includes('newPassword')) {
          mappedFields.push({ name: 'newPassword', errors: [error.message] });
        }
        if (mappedFields.length > 0) {
          passwordForm.setFields(mappedFields);
        }
      }
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const newPasswordBytes = getUtf8ByteLength(newPasswordInput);
  const remainingEmailAttempts = Math.max(0, OTP_MAX_ATTEMPTS - emailFailedAttempts);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Email Change Card */}
        <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t.workspace.emailChange.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{t.workspace.emailChange.subtitle}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{t.workspace.emailChange.currentEmailLabel}</span>
            <span className="text-xs font-medium text-slate-900 truncate">{profile.email}</span>
          </div>

          {emailError && (
            <Alert type="error" showIcon title={emailError} className="text-xs rounded-lg" />
          )}

          {!emailChallenge ? (
            <Form
              form={emailForm}
              layout="vertical"
              onFinish={handleRequestEmailChange}
              requiredMark={false}
            >
              <Form.Item
                name="email"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {t.workspace.emailChange.newEmailLabel}
                  </span>
                }
                rules={[
                  { required: true, message: t.validation.requiredEmail },
                  {
                    validator: (_, value: string) => {
                      if (!value || isValidEmail(value)) return Promise.resolve();
                      return Promise.reject(new Error(t.validation.invalidEmail));
                    },
                  },
                ]}
              >
                <Input
                  size="large"
                  prefix={<Mail className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder={t.workspace.emailChange.newEmailPlaceholder}
                  autoComplete="email"
                  disabled={emailSubmitting}
                />
              </Form.Item>

              <Form.Item
                name="currentPassword"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {t.workspace.emailChange.currentPasswordLabel}
                  </span>
                }
                rules={[{ required: true, message: t.validation.requiredPassword }]}
              >
                <Input.Password
                  size="large"
                  prefix={<Lock className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder={t.workspace.emailChange.currentPasswordPlaceholder}
                  autoComplete="current-password"
                  disabled={emailSubmitting}
                />
              </Form.Item>

              <p className="text-xs text-slate-500 mb-4">{t.workspace.emailChange.reloginNote}</p>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={emailSubmitting}
                disabled={emailResendCooldown > 0}
              >
                {emailResendCooldown > 0 ? (
                  <span className="tabular-nums">
                    {t.otp.resendCooldown} ({emailResendCooldown}s)
                  </span>
                ) : (
                  t.workspace.emailChange.sendCodeButton
                )}
              </Button>
            </Form>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setEmailChallenge(null);
                  setEmailError(null);
                }}
                disabled={emailSubmitting || emailResending}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.workspace.emailChange.cancelButton}</span>
              </button>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  {t.workspace.emailChange.verifyHeading}
                </h3>
                <p className="text-xs text-slate-500">
                  {t.workspace.emailChange.verifySubtitle}:{' '}
                  <strong className="text-slate-800 font-medium">{emailChallenge.newEmail}</strong>
                </p>
              </div>

              <Alert
                type="info"
                showIcon
                title={emailChallenge.serverMessage || t.workspace.emailChange.codeSentNotice}
                className="text-xs rounded-lg"
              />

              <div className="flex items-center justify-between gap-4 py-2.5 px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{t.otp.validityLabel}:</span>
                  <span
                    className={`font-mono-tabular font-semibold ${
                      emailValidityLeft <= 30 ? 'text-amber-700' : 'text-slate-900'
                    }`}
                  >
                    {formatCountdown(emailValidityLeft)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    {t.otp.attemptsRemaining}:{' '}
                    <strong className="font-mono-tabular text-slate-900">
                      {remainingEmailAttempts}/{OTP_MAX_ATTEMPTS}
                    </strong>
                  </span>
                </div>
              </div>

              <Form
                form={emailVerifyForm}
                layout="vertical"
                onFinish={handleVerifyEmailChange}
                requiredMark={false}
                autoComplete="off"
              >
                <Form.Item
                  name="code"
                  label={<span className="text-sm font-medium text-slate-700">{t.otp.codeLabel}</span>}
                  extra={<span className="text-xs text-slate-500">{t.otp.codeHelp}</span>}
                  rules={[
                    { required: true, message: t.validation.requiredOtp },
                    {
                      validator: (_, val: string) => {
                        const digits = normalizeOtpDigits(val || '');
                        if (digits.length !== 6) {
                          return Promise.reject(new Error(t.validation.invalidOtp));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input.OTP
                    length={6}
                    size="large"
                    inputMode="numeric"
                    formatter={(str) => str.replace(/\D/g, '')}
                    disabled={emailSubmitting || emailResending}
                  />
                </Form.Item>

                <div className="space-y-2.5">
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={emailSubmitting}
                    disabled={emailResending}
                  >
                    {t.workspace.emailChange.verifyButton}
                  </Button>

                  <Button
                    type="default"
                    size="large"
                    block
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    loading={emailResending}
                    disabled={emailSubmitting || emailResendCooldown > 0}
                    onClick={handleResendEmailCode}
                  >
                    {emailResendCooldown > 0 ? (
                      <span className="tabular-nums">
                        {t.otp.resendCooldown} ({emailResendCooldown}s)
                      </span>
                    ) : (
                      t.otp.resendButton
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t.workspace.passwordChange.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{t.workspace.passwordChange.subtitle}</p>
          </div>

          {passwordError && (
            <Alert type="error" showIcon title={passwordError} className="text-xs rounded-lg" />
          )}

          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
            requiredMark={false}
          >
            <Form.Item
              name="currentPassword"
              label={
                <span className="text-sm font-medium text-slate-700">
                  {t.workspace.passwordChange.currentPasswordLabel}
                </span>
              }
              rules={[{ required: true, message: t.validation.requiredPassword }]}
            >
              <Input.Password
                size="large"
                prefix={<Lock className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder={t.workspace.passwordChange.currentPasswordPlaceholder}
                autoComplete="current-password"
                disabled={passwordSubmitting}
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              dependencies={['currentPassword']}
              label={
                <span className="text-sm font-medium text-slate-700">
                  {t.workspace.passwordChange.newPasswordLabel}
                </span>
              }
              extra={
                <div className="flex items-center justify-between gap-2 text-xs mt-1">
                  <span className="text-slate-500">{t.signUp.passwordHelp}</span>
                  <span
                    className={`font-mono-tabular shrink-0 ${
                      newPasswordBytes > 72 ? 'text-red-600 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {newPasswordBytes}/72 B
                  </span>
                </div>
              }
              rules={[
                { required: true, message: t.validation.requiredPassword },
                ({ getFieldValue }) => ({
                  validator(_, value: string) {
                    if (!value) return Promise.resolve();
                    const result = validatePasswordRules(value);
                    if (!result.valid) {
                      if (result.reason === 'min_length') {
                        return Promise.reject(new Error(t.validation.passwordMinLength));
                      }
                      if (result.reason === 'max_length') {
                        return Promise.reject(new Error(t.validation.passwordMaxLength));
                      }
                      return Promise.reject(new Error(t.validation.passwordMaxBytes));
                    }
                    if (getFieldValue('currentPassword') && getFieldValue('currentPassword') === value) {
                      return Promise.reject(new Error(t.validation.newPasswordSameAsCurrent));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input.Password
                size="large"
                prefix={<KeyRound className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder={t.workspace.passwordChange.newPasswordPlaceholder}
                autoComplete="new-password"
                disabled={passwordSubmitting}
                onChange={(e) => setNewPasswordInput(e.target.value)}
              />
            </Form.Item>

            <Form.Item
              name="confirmNewPassword"
              dependencies={['newPassword']}
              label={
                <span className="text-sm font-medium text-slate-700">
                  {t.workspace.passwordChange.confirmNewPasswordLabel}
                </span>
              }
              rules={[
                { required: true, message: t.validation.requiredConfirmPassword },
                ({ getFieldValue }) => ({
                  validator(_, value: string) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t.validation.passwordsDoNotMatch));
                  },
                }),
              ]}
            >
              <Input.Password
                size="large"
                prefix={<KeyRound className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder={t.workspace.passwordChange.confirmNewPasswordPlaceholder}
                autoComplete="new-password"
                disabled={passwordSubmitting}
              />
            </Form.Item>

            <Alert
              type="info"
              showIcon
              title={t.workspace.passwordChange.googleAccountNote}
              className="text-xs rounded-lg mb-4"
            />

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={passwordSubmitting}
            >
              {t.workspace.passwordChange.saveButton}
            </Button>
          </Form>
        </div>
      </div>

      {/* Active Session & Google Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t.workspace.sessionCardTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{t.workspace.sessionPolicyNote}</p>
          </div>

          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label={t.workspace.sessionExpiresIn}>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {formatCountdown(secondsRemaining)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label={t.workspace.fields.language}>
              <span className="text-slate-900">{formattedLanguage}</span>
            </Descriptions.Item>
          </Descriptions>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="primary"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              loading={refreshing}
              onClick={onRefreshProfile}
            >
              {t.workspace.refreshProfile}
            </Button>
            <Button danger onClick={onLogout}>
              {t.workspace.logoutButton}
            </Button>
          </div>
        </div>

        <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-900">
              {t.workspace.googleInfoTitle}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t.workspace.googleInfoBody}
            </p>
          </div>
          <div className="pt-2">
            <Button onClick={() => void authApi.startGoogleLogin(language)}>{t.signIn.googleButton}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
