import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  Segmented,
  Steps,
} from 'antd';
import { KeyRound, Lock, Mail, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import {
  authApi,
  AuthApiError,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_VALIDITY_SECONDS,
} from '../services/authApi';
import { buildAuthSession } from '../services/sessionManager';
import type { AuthScreenMode, AuthSession, Language } from '../types/auth';
import {
  getUtf8ByteLength,
  isValidEmail,
  isValidUsername,
  validatePasswordRules,
  validatePersonName,
} from '../utils/validation';
import { HumanVerificationField } from './HumanVerificationField';
import { LanguageSelector } from './LanguageSelector';
import { OtpVerificationPanel, type OtpFlowType } from './OtpVerificationPanel';
import { SiteFooter } from './SiteFooter';
import { SiteLogo } from './SiteLogo';


interface AuthPortalProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  externalNotice: { type: 'info' | 'warning' | 'success' | 'error'; text: string } | null;
  onClearExternalNotice: () => void;
  onAuthenticated: (session: AuthSession, flow: 'sign-in' | 'sign-up') => Promise<void>;
  onPasswordResetComplete: (message: string) => void;
}

interface PendingChallengeState {
  flowType: OtpFlowType;
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
  forgotEmail?: string;
}

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

interface ForgotFormValues {
  email: string;
  humanVerified?: boolean;
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

type AuthRouteView =
  | 'sign-in'
  | 'sign-in-verify'
  | 'sign-up'
  | 'sign-up-verify'
  | 'forgot-password'
  | 'reset-password'
  | 'unknown';

function resolveAuthRoute(pathname: string): AuthRouteView {
  const clean = pathname.replace(/\/+$/, '');
  switch (clean) {
    case '/auth/sign-in':
      return 'sign-in';
    case '/auth/sign-in/verify':
      return 'sign-in-verify';
    case '/auth/sign-up':
      return 'sign-up';
    case '/auth/sign-up/verify':
      return 'sign-up-verify';
    case '/auth/forgot-password':
      return 'forgot-password';
    case '/auth/reset-password':
      return 'reset-password';
    default:
      return 'unknown';
  }
}

export function AuthPortal({
  language,
  onLanguageChange,
  externalNotice,
  onClearExternalNotice,
  onAuthenticated,
  onPasswordResetComplete,
}: AuthPortalProps) {
  const t = translations[language];
  const location = useLocation();
  const navigate = useNavigate();

  const routeView = resolveAuthRoute(location.pathname);

  const [challenge, setChallenge] = useState<PendingChallengeState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [apiError, setApiError] = useState<{
    message: string;
    fields: string[];
  } | null>(null);

  const [validitySecondsLeft, setValiditySecondsLeft] = useState(0);
  const [resendCooldownSecondsLeft, setResendCooldownSecondsLeft] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const [signUpDraft, setSignUpDraft] = useState<Omit<SignUpFormValues, 'humanVerified'> | null>(
    null,
  );
  const [signUpPassword, setSignUpPassword] = useState('');
  const [humanResetSignal, setHumanResetSignal] = useState(0);

  const [signInForm] = Form.useForm<SignInFormValues>();
  const [signUpForm] = Form.useForm<SignUpFormValues>();
  const [forgotForm] = Form.useForm<ForgotFormValues>();

  const cooldownIntervalRef = useRef<number | null>(null);
  const validityIntervalRef = useRef<number | null>(null);
  const preserveErrorOnRouteRef = useRef(false);

  useEffect(() => {
    if (preserveErrorOnRouteRef.current) {
      preserveErrorOnRouteRef.current = false;
      return;
    }
    setApiError(null);
  }, [location.pathname]);

  useEffect(() => {
    if (routeView !== 'sign-up') return;
    const draft = challenge?.signUpPayload
      ? {
          ...challenge.signUpPayload,
          confirmPassword: challenge.signUpPayload.password,
        }
      : signUpDraft;
    if (draft) {
      signUpForm.setFieldsValue({
        ...draft,
        humanVerified: false,
      });
      setSignUpPassword(draft.password);
    }
  }, [routeView, challenge, signUpDraft, signUpForm]);

  useEffect(() => {
    if (routeView !== 'sign-up' || !apiError || apiError.fields.length === 0) return;
    const mapped = apiError.fields
      .filter(
        (f) =>
          f === 'firstName' ||
          f === 'lastName' ||
          f === 'email' ||
          f === 'username' ||
          f === 'password',
      )
      .map((name) => ({ name: name as keyof SignUpFormValues, errors: [apiError.message] }));
    if (mapped.length > 0) {
      signUpForm.setFields(mapped);
    }
  }, [routeView, apiError, signUpForm]);

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

  const clearError = () => {
    setApiError(null);
    onClearExternalNotice();
  };

  const navigateToMode = (nextMode: AuthScreenMode) => {
    clearError();
    setFailedAttempts(0);
    setHumanResetSignal((prev) => prev + 1);
    signInForm.setFieldValue('humanVerified', false);
    signUpForm.setFieldValue('humanVerified', false);
    forgotForm.setFieldValue('humanVerified', false);
    if (nextMode === 'sign-in') navigate('/auth/sign-in');
    else if (nextMode === 'sign-up') navigate('/auth/sign-up');
    else navigate('/auth/forgot-password');
  };

  if (routeView === 'unknown') {
    return <Navigate to="/auth/sign-in" replace />;
  }

  if (routeView === 'sign-in-verify' && challenge?.flowType !== 'sign-in') {
    return <Navigate to="/auth/sign-in" replace />;
  }

  if (routeView === 'sign-up-verify' && challenge?.flowType !== 'sign-up') {
    return <Navigate to="/auth/sign-up" replace />;
  }

  if (routeView === 'reset-password' && challenge?.flowType !== 'reset-password') {
    return <Navigate to="/auth/forgot-password" replace />;
  }

  const isVerifyRoute =
    routeView === 'sign-in-verify' ||
    routeView === 'sign-up-verify' ||
    routeView === 'reset-password';

  const activeNavMode: AuthScreenMode =
    routeView === 'sign-up' || routeView === 'sign-up-verify'
      ? 'sign-up'
      : routeView === 'forgot-password' || routeView === 'reset-password'
        ? 'forgot-password'
        : 'sign-in';

  const applyServerErrorToForm = (
    err: AuthApiError,
    targetForm: 'sign-in' | 'sign-up' | 'forgot',
  ) => {
    setApiError({
      message: err.message,
      fields: err.fields,
    });

    if (err.status === 429 && err.retryAfterSeconds) {
      setResendCooldownSecondsLeft(err.retryAfterSeconds);
    }

    if (err.fields.length === 0) return;

    if (targetForm === 'sign-in') {
      const mapped = err.fields
        .filter((f) => f === 'login' || f === 'password')
        .map((name) => ({ name: name as keyof SignInFormValues, errors: [err.message] }));
      if (mapped.length > 0) signInForm.setFields(mapped);
    } else if (targetForm === 'sign-up') {
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
    } else if (targetForm === 'forgot') {
      const mapped = err.fields
        .filter((f) => f === 'email')
        .map((name) => ({ name: name as keyof ForgotFormValues, errors: [err.message] }));
      if (mapped.length > 0) forgotForm.setFields(mapped);
    }
  };

  const handleSignInStep1 = async (values: SignInFormValues) => {
    clearError();
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
      navigate('/auth/sign-in/verify');
    } catch (error) {
      if (error instanceof AuthApiError) {
        applyServerErrorToForm(error, 'sign-in');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUpStep1 = async (values: SignUpFormValues) => {
    clearError();
    setSubmitting(true);
    try {
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email,
        username: values.username,
        password: values.password,
      };
      setSignUpDraft({
        ...payload,
        confirmPassword: values.confirmPassword,
      });
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
      navigate('/auth/sign-up/verify');
    } catch (error) {
      if (error instanceof AuthApiError) {
        applyServerErrorToForm(error, 'sign-up');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotStep1 = async (values: ForgotFormValues) => {
    clearError();
    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword({ email: values.email }, language);
      setChallenge({
        flowType: 'reset-password',
        challengeId: res.challengeId,
        targetLabel: values.email.trim().toLowerCase(),
        serverInfoMessage: res.message,
        forgotEmail: values.email,
      });
      setValiditySecondsLeft(OTP_VALIDITY_SECONDS);
      setResendCooldownSecondsLeft(OTP_RESEND_COOLDOWN_SECONDS);
      setFailedAttempts(0);
      forgotForm.setFieldValue('humanVerified', false);
      navigate('/auth/reset-password');
    } catch (error) {
      if (error instanceof AuthApiError) {
        applyServerErrorToForm(error, 'forgot');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpVerify = async ({
    code,
    newPassword,
  }: {
    code: string;
    newPassword?: string;
  }) => {
    if (!challenge) return;
    clearError();
    setSubmitting(true);

    try {
      if (challenge.flowType === 'sign-in') {
        const tokenRes = await authApi.verifySignIn(
          { challengeId: challenge.challengeId, code },
          language,
        );
        await onAuthenticated(buildAuthSession(tokenRes), 'sign-in');
      } else if (challenge.flowType === 'sign-up') {
        const tokenRes = await authApi.verifySignUp(
          { challengeId: challenge.challengeId, code },
          language,
        );
        await onAuthenticated(buildAuthSession(tokenRes), 'sign-up');
      } else if (challenge.flowType === 'reset-password') {
        const res = await authApi.resetPassword(
          {
            challengeId: challenge.challengeId,
            code,
            newPassword: newPassword || '',
          },
          language,
        );
        setChallenge(null);
        signInForm.resetFields();
        onPasswordResetComplete(res.message || t.notifications.passwordResetSuccess);
        navigate('/auth/sign-in', { replace: true });
      }
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.code === 'auth.signup.restart' && challenge.flowType === 'sign-up') {
          if (challenge.signUpPayload) {
            setSignUpDraft({
              ...challenge.signUpPayload,
              confirmPassword: challenge.signUpPayload.password,
            });
          }
          preserveErrorOnRouteRef.current = true;
          setApiError({
            message: error.message,
            fields: error.fields,
          });
          setChallenge(null);
          setFailedAttempts(0);
          setHumanResetSignal((prev) => prev + 1);
          navigate('/auth/sign-up', { replace: true });
          return;
        }
        if (error.status === 400) {
          setFailedAttempts((prev) => prev + 1);
        }
        setApiError({
          message: error.message,
          fields: error.fields,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!challenge || resendCooldownSecondsLeft > 0) return;
    clearError();
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
      } else if (challenge.flowType === 'reset-password' && challenge.forgotEmail) {
        const res = await authApi.forgotPassword({ email: challenge.forgotEmail }, language);
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
          if (challenge.signUpPayload) {
            setSignUpDraft({
              ...challenge.signUpPayload,
              confirmPassword: challenge.signUpPayload.password,
            });
          }
          preserveErrorOnRouteRef.current = true;
          setApiError({
            message: error.message,
            fields: error.fields,
          });
          setChallenge(null);
          setFailedAttempts(0);
          setHumanResetSignal((prev) => prev + 1);
          navigate('/auth/sign-up', { replace: true });
          return;
        }
        if (error.status === 429) {
          setResendCooldownSecondsLeft(error.retryAfterSeconds ?? OTP_RESEND_COOLDOWN_SECONDS);
        }
        setApiError({
          message: error.message,
          fields: error.fields,
        });
      }
    } finally {
      setResending(false);
    }
  };

  const handleGoogleRedirect = () => {
    void authApi.startGoogleLogin(language);
  };

  const signUpPasswordBytes = getUtf8ByteLength(signUpPassword);

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      {/* Three-zone Top Navigation Bar */}
      <header className="bg-white border-b border-[#e6e4dd] sticky top-0 z-30">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label={t.brandName}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display cursor-pointer"
          >
            <SiteLogo language={language} size="md" />
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="transition-colors cursor-pointer whitespace-nowrap shrink-0 hover:text-slate-900"
            >
              {t.catalog.navCatalog}
            </button>
            <button
              type="button"
              onClick={() => navigateToMode('sign-in')}
              className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeNavMode === 'sign-in' ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'
              }`}
            >
              {t.tabs.signIn}
            </button>
            <button
              type="button"
              onClick={() => navigateToMode('sign-up')}
              className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeNavMode === 'sign-up' ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'
              }`}
            >
              {t.tabs.signUp}
            </button>
            <button
              type="button"
              onClick={() => navigateToMode('forgot-password')}
              className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeNavMode === 'forgot-password'
                  ? 'text-slate-900 font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              {t.tabs.forgotPassword}
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <LanguageSelector
              value={language}
              onChange={onLanguageChange}
              ariaLabel={t.languageLabel}
            />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:py-10">
        <div className="w-full max-w-[480px] bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-8">
          {!isVerifyRoute && activeNavMode !== 'forgot-password' && (
            <div className="mb-6">
              <Segmented
                block
                size="large"
                value={activeNavMode}
                onChange={(val) => navigateToMode(val as AuthScreenMode)}
                options={[
                  { label: t.tabs.signIn, value: 'sign-in' },
                  { label: t.tabs.signUp, value: 'sign-up' },
                ]}
              />
            </div>
          )}

          {externalNotice && (
            <div className="mb-5">
              <Alert
                type={externalNotice.type}
                showIcon
                closable
                onClose={onClearExternalNotice}
                title={externalNotice.text}
                className="text-xs rounded-lg"
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {isVerifyRoute && challenge ? (
              <motion.div
                key={`otp-${challenge.flowType}-${challenge.challengeId}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
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
                    clearError();
                    if (routeView === 'sign-in-verify') navigate('/auth/sign-in');
                    else if (routeView === 'sign-up-verify') navigate('/auth/sign-up');
                    else navigate('/auth/forgot-password');
                  }}
                />
              </motion.div>
            ) : routeView === 'sign-in' ? (
              <motion.div
                key="sign-in-step1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <Steps
                  size="small"
                  current={0}
                  items={[{ title: t.otp.step1Label }, { title: t.otp.step2Label }]}
                />

                <div>
                  <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                    {t.signIn.heading}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{t.signIn.subheading}</p>
                </div>

                {apiError && (
                  <Alert
                    type="error"
                    showIcon
                    title={apiError.message}
                    className="text-xs rounded-lg"
                  />
                )}

                <Form
                  form={signInForm}
                  layout="vertical"
                  onFinish={handleSignInStep1}
                  requiredMark={false}
                >
                  <Form.Item
                    name="login"
                    label={
                      <span className="text-sm font-medium text-slate-700">
                        {t.signIn.loginLabel}
                      </span>
                    }
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

                  <div className="flex items-center justify-end mb-4 -mt-2">
                    <button
                      type="button"
                      onClick={() => navigateToMode('forgot-password')}
                      className="text-xs font-medium text-[#16a34a] hover:text-[#15803d] transition-colors cursor-pointer whitespace-nowrap min-h-[36px] inline-flex items-center"
                    >
                      {t.signIn.forgotLink}
                    </button>
                  </div>

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

                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={submitting}
                    disabled={resendCooldownSecondsLeft > 0}
                  >
                    {resendCooldownSecondsLeft > 0 ? (
                      <span className="tabular-nums">
                        {t.otp.resendCooldown} ({resendCooldownSecondsLeft}s)
                      </span>
                    ) : (
                      t.signIn.submit
                    )}
                  </Button>
                </Form>

                <Divider plain className="!my-4 !text-xs !text-slate-400">
                  {t.signIn.orDivider}
                </Divider>

                <Button
                  size="large"
                  block
                  icon={<GoogleMark />}
                  onClick={handleGoogleRedirect}
                  disabled={submitting}
                  className="!flex !items-center !justify-center !gap-2.5"
                >
                  <span>{t.signIn.googleButton}</span>
                </Button>
              </motion.div>
            ) : routeView === 'sign-up' ? (
              <motion.div
                key="sign-up-step1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <Steps
                  size="small"
                  current={0}
                  items={[{ title: t.otp.step1Label }, { title: t.otp.step2Label }]}
                />

                <div>
                  <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                    {t.signUp.heading}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{t.signUp.subheading}</p>
                </div>

                {apiError && (
                  <Alert
                    type="error"
                    showIcon
                    title={apiError.message}
                    className="text-xs rounded-lg"
                  />
                )}

                <Form
                  form={signUpForm}
                  layout="vertical"
                  onFinish={handleSignUpStep1}
                  requiredMark={false}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                              if (result.reason === 'required') {
                                return Promise.reject(new Error(t.validation.requiredFirstName));
                              }
                              return Promise.reject(
                                new Error(t.validation.firstNameMaxLength),
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
                              if (result.reason === 'required') {
                                return Promise.reject(new Error(t.validation.requiredLastName));
                              }
                              return Promise.reject(
                                new Error(t.validation.lastNameMaxLength),
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
                    label={
                      <span className="text-sm font-medium text-slate-700">
                        {t.signUp.emailLabel}
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
                    extra={<span className="text-xs text-slate-500">{t.signUp.usernameHelp}</span>}
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
                          className={`font-mono-tabular shrink-0 ${
                            signUpPasswordBytes > 72
                              ? 'text-red-600 font-semibold'
                              : 'text-slate-500'
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

                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={submitting}
                    disabled={resendCooldownSecondsLeft > 0}
                  >
                    {resendCooldownSecondsLeft > 0 ? (
                      <span className="tabular-nums">
                        {t.otp.resendCooldown} ({resendCooldownSecondsLeft}s)
                      </span>
                    ) : (
                      t.signUp.submit
                    )}
                  </Button>
                </Form>

                <Divider plain className="!my-4 !text-xs !text-slate-400">
                  {t.signIn.orDivider}
                </Divider>

                <Button
                  size="large"
                  block
                  icon={<GoogleMark />}
                  onClick={handleGoogleRedirect}
                  disabled={submitting}
                  className="!flex !items-center !justify-center !gap-2.5"
                >
                  <span>{t.signIn.googleButton}</span>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="forgot-step1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <Steps
                  size="small"
                  current={0}
                  items={[{ title: t.otp.step1Label }, { title: t.otp.step2Label }]}
                />

                <div>
                  <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                    {t.forgotPassword.heading}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{t.forgotPassword.subheading}</p>
                </div>

                {apiError && (
                  <Alert
                    type="error"
                    showIcon
                    title={apiError.message}
                    className="text-xs rounded-lg"
                  />
                )}

                <Form
                  form={forgotForm}
                  layout="vertical"
                  onFinish={handleForgotStep1}
                  requiredMark={false}
                >
                  <Form.Item
                    name="email"
                    label={
                      <span className="text-sm font-medium text-slate-700">
                        {t.forgotPassword.emailLabel}
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
                      placeholder={t.forgotPassword.emailPlaceholder}
                      autoComplete="email"
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

                  <div className="space-y-3">
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      loading={submitting}
                      disabled={resendCooldownSecondsLeft > 0}
                    >
                      {resendCooldownSecondsLeft > 0 ? (
                        <span className="tabular-nums">
                          {t.otp.resendCooldown} ({resendCooldownSecondsLeft}s)
                        </span>
                      ) : (
                        t.forgotPassword.submit
                      )}
                    </Button>

                    <Button
                      type="default"
                      size="large"
                      block
                      disabled={submitting}
                      onClick={() => navigateToMode('sign-in')}
                    >
                      {t.forgotPassword.backToSignIn}
                    </Button>
                  </div>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <SiteFooter language={language} />
    </div>
  );
}
