import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Divider, Form, Input, Modal, Segmented } from 'antd';
import { KeyRound, Lock, Mail, User } from 'lucide-react';
import { translations } from '../i18n/translations';
import {
  authApi,
  AuthApiError,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_VALIDITY_SECONDS,
} from '../services/authApi';
import { buildAuthSession } from '../services/sessionManager';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import { savePendingProductOrder } from '../utils/catalog';
import {
  getUtf8ByteLength,
  isValidEmail,
  isValidUsername,
  validatePasswordRules,
  validatePersonName,
} from '../utils/validation';
import { HumanVerificationField } from './HumanVerificationField';
import { OtpVerificationPanel } from './OtpVerificationPanel';

interface GuestAuthModalProps {
  open: boolean;
  language: Language;
  productTitle?: string;
  productId?: string;
  productPath: string;
  selectedVariantId?: string | null;
  selectedVariantSku?: string | null;
  cartSummary?: {
    itemCount: number;
    totalAmountLabel: string;
  };
  onCancel: () => void;
  onAuthenticated: (session: AuthSession, profile: UserProfile) => void;
  oauthIntent?: 'checkout' | 'social';
  customSubtitle?: string;
}

type ModalTab = 'sign-in' | 'sign-up';

interface SignInFormValues {
  login: string;
  password: string;
  humanVerified?: boolean;
}

interface SignUpFormValues {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  humanVerified?: boolean;
}

interface ModalChallengeState {
  flowType: 'sign-in' | 'sign-up';
  challengeId: string;
  targetLabel: string;
  serverInfoMessage: string;
  signInPayload?: { login: string; password: string };
  signUpPayload?: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
  };
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export function GuestAuthModal({
  open,
  language,
  productTitle,
  productId,
  productPath,
  selectedVariantId = null,
  selectedVariantSku = null,
  cartSummary,
  onCancel,
  onAuthenticated,
  oauthIntent = 'checkout',
  customSubtitle,
}: GuestAuthModalProps) {
  const t = translations[language];
  const tg = t.guestAuth;

  const [tab, setTab] = useState<ModalTab>('sign-in');
  const [challenge, setChallenge] = useState<ModalChallengeState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [apiError, setApiError] = useState<{ message: string; fields: string[] } | null>(null);

  const [validitySecondsLeft, setValiditySecondsLeft] = useState(0);
  const [resendCooldownSecondsLeft, setResendCooldownSecondsLeft] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [signUpPassword, setSignUpPassword] = useState('');
  const [humanResetSignal, setHumanResetSignal] = useState(0);

  const [signInForm] = Form.useForm<SignInFormValues>();
  const [signUpForm] = Form.useForm<SignUpFormValues>();

  const cooldownIntervalRef = useRef<number | null>(null);
  const validityIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setChallenge(null);
      setApiError(null);
      setSubmitting(false);
      setResending(false);
      setFailedAttempts(0);
      setValiditySecondsLeft(0);
      setResendCooldownSecondsLeft(0);
    }
  }, [open]);

  useEffect(() => {
    if (resendCooldownSecondsLeft <= 0) {
      if (cooldownIntervalRef.current !== null) {
        window.clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      return;
    }
    cooldownIntervalRef.current = window.setInterval(() => {
      setResendCooldownSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (cooldownIntervalRef.current !== null) {
        window.clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [resendCooldownSecondsLeft > 0]);

  useEffect(() => {
    if (!challenge || validitySecondsLeft <= 0) {
      if (validityIntervalRef.current !== null) {
        window.clearInterval(validityIntervalRef.current);
        validityIntervalRef.current = null;
      }
      return;
    }
    validityIntervalRef.current = window.setInterval(() => {
      setValiditySecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (validityIntervalRef.current !== null) {
        window.clearInterval(validityIntervalRef.current);
        validityIntervalRef.current = null;
      }
    };
  }, [challenge, validitySecondsLeft > 0]);

  const handleTabChange = (nextTab: ModalTab) => {
    setTab(nextTab);
    setChallenge(null);
    setApiError(null);
    setFailedAttempts(0);
    setHumanResetSignal((prev) => prev + 1);
    signInForm.setFieldValue('humanVerified', false);
    signUpForm.setFieldValue('humanVerified', false);
  };

  const applyServerErrorToForm = (err: AuthApiError, target: ModalTab) => {
    setApiError({ message: err.message, fields: err.fields });
    if (err.status === 429 && err.retryAfterSeconds) {
      setResendCooldownSecondsLeft(err.retryAfterSeconds);
    }
    if (err.fields.length === 0) return;

    if (target === 'sign-in') {
      const mapped = err.fields
        .filter((f) => f === 'login' || f === 'password')
        .map((name) => ({ name: name as keyof SignInFormValues, errors: [err.message] }));
      if (mapped.length > 0) signInForm.setFields(mapped);
    } else {
      const mapped = err.fields
        .filter(
          (f) =>
            f === 'firstName' ||
            f === 'lastName' ||
            f === 'email' ||
            f === 'username' ||
            f === 'password',
        )
        .map((name) => ({ name: name as keyof SignUpFormValues, errors: [err.message] }));
      if (mapped.length > 0) signUpForm.setFields(mapped);
    }
  };

  const handleSignInStep1 = async (values: SignInFormValues) => {
    setApiError(null);
    setSubmitting(true);
    try {
      const payload = { login: values.login, password: values.password };
      const res = await authApi.signIn(payload, language);
      setChallenge({
        flowType: 'sign-in',
        challengeId: res.challengeId,
        targetLabel: values.login.trim().toLowerCase(),
        serverInfoMessage: res.message,
        signInPayload: payload,
      });
      setValiditySecondsLeft(OTP_VALIDITY_SECONDS);
      setResendCooldownSecondsLeft(OTP_RESEND_COOLDOWN_SECONDS);
      setFailedAttempts(0);
      signInForm.setFieldValue('humanVerified', false);
    } catch (error) {
      if (error instanceof AuthApiError) {
        applyServerErrorToForm(error, 'sign-in');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUpStep1 = async (values: SignUpFormValues) => {
    setApiError(null);
    setSubmitting(true);
    try {
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email,
        username: values.username,
        password: values.password,
      };
      const res = await authApi.signUp(payload, language);
      setChallenge({
        flowType: 'sign-up',
        challengeId: res.challengeId,
        targetLabel: values.email.trim().toLowerCase(),
        serverInfoMessage: res.message,
        signUpPayload: payload,
      });
      setValiditySecondsLeft(OTP_VALIDITY_SECONDS);
      setResendCooldownSecondsLeft(OTP_RESEND_COOLDOWN_SECONDS);
      setFailedAttempts(0);
    } catch (error) {
      if (error instanceof AuthApiError) {
        applyServerErrorToForm(error, 'sign-up');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpVerify = async ({ code }: { code: string }) => {
    if (!challenge) return;
    setApiError(null);
    setSubmitting(true);

    try {
      const tokenRes =
        challenge.flowType === 'sign-in'
          ? await authApi.verifySignIn({ challengeId: challenge.challengeId, code }, language)
          : await authApi.verifySignUp({ challengeId: challenge.challengeId, code }, language);

      const nextSession = buildAuthSession(tokenRes);

      const freshProfile = await authApi.getProfile(nextSession.accessToken, language);
      onAuthenticated(nextSession, freshProfile);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.code === 'auth.signup.restart' && challenge.flowType === 'sign-up') {
          setChallenge(null);
          setFailedAttempts(0);
          setHumanResetSignal((prev) => prev + 1);
          setApiError({ message: error.message, fields: error.fields });
          return;
        }
        if (error.status === 400) {
          setFailedAttempts((prev) => prev + 1);
        }
        setApiError({ message: error.message, fields: error.fields });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!challenge || resendCooldownSecondsLeft > 0) return;
    setApiError(null);
    setResending(true);

    try {
      if (challenge.flowType === 'sign-in' && challenge.signInPayload) {
        const res = await authApi.signIn(challenge.signInPayload, language);
        setChallenge({
          ...challenge,
          challengeId: res.challengeId,
          serverInfoMessage: res.message,
        });
      } else if (challenge.flowType === 'sign-up' && challenge.signUpPayload) {
        const res = await authApi.signUp(challenge.signUpPayload, language);
        setChallenge({
          ...challenge,
          challengeId: res.challengeId,
          serverInfoMessage: res.message,
        });
      }
      setValiditySecondsLeft(OTP_VALIDITY_SECONDS);
      setResendCooldownSecondsLeft(OTP_RESEND_COOLDOWN_SECONDS);
      setFailedAttempts(0);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.code === 'auth.signup.restart' && challenge.flowType === 'sign-up') {
          setChallenge(null);
          setFailedAttempts(0);
          setHumanResetSignal((prev) => prev + 1);
          setApiError({ message: error.message, fields: error.fields });
          return;
        }
        if (error.status === 429) {
          setResendCooldownSecondsLeft(error.retryAfterSeconds ?? OTP_RESEND_COOLDOWN_SECONDS);
        }
        setApiError({ message: error.message, fields: error.fields });
      }
    } finally {
      setResending(false);
    }
  };

  const handleGoogleRedirect = () => {
    savePendingProductOrder({
      productPath,
      productId: productId ?? '__cart__',
      variantId: selectedVariantId ?? null,
      intent: oauthIntent,
      savedAt: Date.now(),
    });
    void authApi.startGoogleLogin(language);
  };

  const signUpPasswordBytes = getUtf8ByteLength(signUpPassword);
  const resolvedSubtitle =
    customSubtitle ??
    (oauthIntent === 'social'
      ? language === 'ru'
        ? 'Войдите или создайте аккаунт, чтобы ставить лайки, оставлять комментарии и отвечать покупателям.'
        : 'Layk bosish, izoh yozish va javob qoldirish uchun tizimga kiring yoki ro‘yxatdan o‘ting.'
      : tg.modalSubtitle);

  const resolvedTitle =
    oauthIntent === 'social'
      ? language === 'ru'
        ? 'Войдите в аккаунт'
        : 'Tizimga kiring'
      : tg.modalTitle;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={500}
      destroyOnHidden
      mask={{ closable: !submitting }}
      title={<span className="font-display font-bold text-slate-900">{resolvedTitle}</span>}
    >
      <div className="space-y-4 pt-1">
        <p className="text-sm text-slate-600 leading-relaxed">{resolvedSubtitle}</p>

        {/* Saved Product / Cart Context */}
        {cartSummary ? (
          <div className="rounded-lg border border-[#e6e4dd] bg-[#f7f6f2] px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">{tg.cartSummaryLabel}</div>
              <div className="text-sm font-semibold text-slate-900 tabular-nums">
                {cartSummary.itemCount} {tg.cartItemsUnit}
              </div>
            </div>
            <div className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
              {cartSummary.totalAmountLabel}
            </div>
          </div>
        ) : productTitle ? (
          <div className="rounded-lg border border-[#e6e4dd] bg-[#f7f6f2] px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">{tg.selectedItemLabel}</div>
              <div className="text-sm font-semibold text-slate-900 truncate">{productTitle}</div>
            </div>
            {selectedVariantSku && (
              <code className="text-xs font-mono text-slate-700 bg-white border border-[#e6e4dd] rounded px-2 py-0.5 shrink-0">
                {selectedVariantSku}
              </code>
            )}
          </div>
        ) : null}

        {!challenge && (
          <Segmented
            block
            size="large"
            value={tab}
            onChange={(val) => handleTabChange(val as ModalTab)}
            options={[
              { label: tg.signInTab, value: 'sign-in' },
              { label: tg.signUpTab, value: 'sign-up' },
            ]}
          />
        )}

        {challenge ? (
          <OtpVerificationPanel
            language={language}
            flowType={challenge.flowType}
            targetLabel={challenge.targetLabel}
            challengeId={challenge.challengeId}
            serverInfoMessage={challenge.serverInfoMessage}
            validitySecondsLeft={validitySecondsLeft}
            resendCooldownSecondsLeft={resendCooldownSecondsLeft}
            failedAttempts={failedAttempts}
            errorMessage={apiError?.message ?? null}
            errorFields={apiError?.fields ?? []}
            submitting={submitting}
            resending={resending}
            onVerify={handleOtpVerify}
            onResend={handleResendCode}
            onBack={() => {
              setApiError(null);
              setChallenge(null);
            }}
          />
        ) : tab === 'sign-in' ? (
          <div className="space-y-4">
            {apiError && (
              <Alert type="error" showIcon title={apiError.message} className="text-xs rounded-lg" />
            )}

            <Form<SignInFormValues>
              form={signInForm}
              layout="vertical"
              onFinish={handleSignInStep1}
              requiredMark={false}
            >
              <Form.Item
                name="login"
                label={<span className="text-sm font-medium text-slate-700">{t.signIn.loginLabel}</span>}
                rules={[{ required: true, message: t.validation.requiredLogin }]}
              >
                <Input
                  size="large"
                  prefix={<User className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder={t.signIn.loginPlaceholder}
                  autoComplete="username"
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {t.signIn.passwordLabel}
                  </span>
                }
                rules={[{ required: true, message: t.validation.requiredPassword }]}
              >
                <Input.Password
                  size="large"
                  prefix={<Lock className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder={t.signIn.passwordPlaceholder}
                  autoComplete="current-password"
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name="humanVerified"
                rules={[
                  {
                    validator: (_, checked: boolean) =>
                      checked
                        ? Promise.resolve()
                        : Promise.reject(new Error(t.validation.humanCheckRequired)),
                  },
                ]}
              >
                <HumanVerificationField
                  language={language}
                  disabled={submitting}
                  resetSignal={humanResetSignal}
                />
              </Form.Item>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5">
                <Button
                  size="large"
                  onClick={onCancel}
                  disabled={submitting}
                  className="!min-h-[44px] sm:w-32"
                >
                  {tg.cancelButton}
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={submitting}
                  disabled={resendCooldownSecondsLeft > 0}
                  className="!min-h-[44px]"
                >
                  {resendCooldownSecondsLeft > 0 ? (
                    <span className="tabular-nums">
                      {t.otp.resendCooldown} ({resendCooldownSecondsLeft}s)
                    </span>
                  ) : (
                    t.signIn.submit
                  )}
                </Button>
              </div>
            </Form>

            <Divider plain className="!my-3 !text-xs !text-slate-400">
              {t.signIn.orDivider}
            </Divider>

            <Button
              size="large"
              block
              icon={<GoogleMark />}
              onClick={handleGoogleRedirect}
              disabled={submitting}
              className="!flex !items-center !justify-center !gap-2.5 !min-h-[44px]"
            >
              <span>{t.signIn.googleButton}</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {apiError && (
              <Alert type="error" showIcon title={apiError.message} className="text-xs rounded-lg" />
            )}

            <Form<SignUpFormValues>
              form={signUpForm}
              layout="vertical"
              onFinish={handleSignUpStep1}
              requiredMark={false}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Form.Item
                  name="firstName"
                  label={
                    <span className="text-sm font-medium text-slate-700">
                      {t.signUp.firstNameLabel}
                    </span>
                  }
                  rules={[
                    {
                      validator: (_, value: string) => {
                        const result = validatePersonName(value || '');
                        if (!result.valid) {
                          return Promise.reject(
                            new Error(
                              result.reason === 'required'
                                ? t.validation.requiredFirstName
                                : t.validation.firstNameMaxLength,
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    size="large"
                    placeholder={t.signUp.firstNamePlaceholder}
                    autoComplete="given-name"
                    disabled={submitting}
                  />
                </Form.Item>

                <Form.Item
                  name="lastName"
                  label={
                    <span className="text-sm font-medium text-slate-700">
                      {t.signUp.lastNameLabel}
                    </span>
                  }
                  rules={[
                    {
                      validator: (_, value: string) => {
                        const result = validatePersonName(value || '');
                        if (!result.valid) {
                          return Promise.reject(
                            new Error(
                              result.reason === 'required'
                                ? t.validation.requiredLastName
                                : t.validation.lastNameMaxLength,
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    size="large"
                    placeholder={t.signUp.lastNamePlaceholder}
                    autoComplete="family-name"
                    disabled={submitting}
                  />
                </Form.Item>
              </div>

              <Form.Item
                name="email"
                label={<span className="text-sm font-medium text-slate-700">{t.signUp.emailLabel}</span>}
                rules={[
                  { required: true, message: t.validation.requiredEmail },
                  {
                    validator: (_, value: string) =>
                      !value || isValidEmail(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error(t.validation.invalidEmail)),
                  },
                ]}
              >
                <Input
                  size="large"
                  prefix={<Mail className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder={t.signUp.emailPlaceholder}
                  autoComplete="email"
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name="username"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {t.signUp.usernameLabel}
                  </span>
                }
                rules={[
                  { required: true, message: t.validation.requiredUsername },
                  {
                    validator: (_, value: string) =>
                      !value || isValidUsername(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error(t.validation.invalidUsername)),
                  },
                ]}
              >
                <Input
                  size="large"
                  prefix={<User className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder={t.signUp.usernamePlaceholder}
                  autoComplete="username"
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {t.signUp.passwordLabel}
                  </span>
                }
                extra={
                  <div className="flex items-center justify-between gap-2 text-xs mt-1">
                    <span className="text-slate-500">{t.signUp.passwordHelp}</span>
                    <span
                      className={`font-mono tabular-nums shrink-0 ${
                        signUpPasswordBytes > 72 ? 'text-red-600 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {signUpPasswordBytes}/72 B
                    </span>
                  </div>
                }
                rules={[
                  { required: true, message: t.validation.requiredPassword },
                  {
                    validator: (_, value: string) => {
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
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input.Password
                  size="large"
                  prefix={<KeyRound className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder={t.signUp.passwordPlaceholder}
                  autoComplete="new-password"
                  disabled={submitting}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                label={
                  <span className="text-sm font-medium text-slate-700">
                    {t.signUp.confirmPasswordLabel}
                  </span>
                }
                rules={[
                  { required: true, message: t.validation.requiredConfirmPassword },
                  ({ getFieldValue }) => ({
                    validator(_, value: string) {
                      if (!value || getFieldValue('password') === value) {
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
                  placeholder={t.signUp.confirmPasswordPlaceholder}
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </Form.Item>

              <Form.Item
                name="humanVerified"
                rules={[
                  {
                    validator: (_, checked: boolean) =>
                      checked
                        ? Promise.resolve()
                        : Promise.reject(new Error(t.validation.humanCheckRequired)),
                  },
                ]}
              >
                <HumanVerificationField
                  language={language}
                  disabled={submitting}
                  resetSignal={humanResetSignal}
                />
              </Form.Item>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5">
                <Button
                  size="large"
                  onClick={onCancel}
                  disabled={submitting}
                  className="!min-h-[44px] sm:w-32"
                >
                  {tg.cancelButton}
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={submitting}
                  disabled={resendCooldownSecondsLeft > 0}
                  className="!min-h-[44px]"
                >
                  {resendCooldownSecondsLeft > 0 ? (
                    <span className="tabular-nums">
                      {t.otp.resendCooldown} ({resendCooldownSecondsLeft}s)
                    </span>
                  ) : (
                    t.signUp.submit
                  )}
                </Button>
              </div>
            </Form>
          </div>
        )}
      </div>
    </Modal>
  );
}
