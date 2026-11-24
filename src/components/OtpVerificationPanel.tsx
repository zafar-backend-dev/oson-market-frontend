import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Steps } from 'antd';
import { ArrowLeft, Clock, KeyRound, RefreshCw, ShieldAlert } from 'lucide-react';
import type { Language } from '../types/auth';
import { translations } from '../i18n/translations';
import { OTP_MAX_ATTEMPTS } from '../services/authApi';
import {
  formatCountdown,
  getUtf8ByteLength,
  normalizeOtpDigits,
  validatePasswordRules,
} from '../utils/validation';
import { HumanVerificationField } from './HumanVerificationField';

export type OtpFlowType = 'sign-in' | 'sign-up' | 'reset-password';

interface OtpVerificationPanelProps {
  language: Language;
  flowType: OtpFlowType;
  targetLabel: string;
  challengeId: string;
  serverInfoMessage: string;
  validitySecondsLeft: number;
  resendCooldownSecondsLeft: number;
  failedAttempts: number;
  errorMessage: string | null;
  errorFields: string[];
  submitting: boolean;
  resending: boolean;
  onVerify: (payload: { code: string; newPassword?: string }) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
}

interface OtpFormValues {
  code: string;
  newPassword?: string;
  confirmPassword?: string;
  humanVerified?: boolean;
}

export function OtpVerificationPanel({
  language,
  flowType,
  targetLabel,
  challengeId,
  serverInfoMessage,
  validitySecondsLeft,
  resendCooldownSecondsLeft,
  failedAttempts,
  errorMessage,
  errorFields,
  submitting,
  resending,
  onVerify,
  onResend,
  onBack,
}: OtpVerificationPanelProps) {
  const t = translations[language];
  const [form] = Form.useForm<OtpFormValues>();
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [humanResetSignal, setHumanResetSignal] = useState(0);

  useEffect(() => {
    form.setFieldsValue({
      code: '',
      newPassword: '',
      confirmPassword: '',
      humanVerified: false,
    });
    setNewPasswordValue('');
    setHumanResetSignal((prev) => prev + 1);
  }, [challengeId, form]);

  useEffect(() => {
    if (!errorMessage || errorFields.length === 0) return;
    const fieldErrors = errorFields
      .filter((f) => f === 'code' || f === 'newPassword')
      .map((name) => ({
        name: name as keyof OtpFormValues,
        errors: [errorMessage],
      }));
    if (fieldErrors.length > 0) {
      form.setFields(fieldErrors);
    }
  }, [errorMessage, errorFields, form]);

  const heading =
    flowType === 'sign-in'
      ? t.otp.verifyHeadingSignIn
      : flowType === 'sign-up'
        ? t.otp.verifyHeadingSignUp
        : t.otp.verifyHeadingReset;

  const remainingAttempts = Math.max(0, OTP_MAX_ATTEMPTS - failedAttempts);
  const newPasswordBytes = getUtf8ByteLength(newPasswordValue);

  const handleFinish = async (values: OtpFormValues) => {
    const cleanCode = normalizeOtpDigits(values.code || '');
    await onVerify({
      code: cleanCode,
      newPassword: flowType === 'reset-password' ? values.newPassword : undefined,
    });
  };

  return (
    <div className="space-y-5">
      <Steps
        size="small"
        current={1}
        items={[
          { title: t.otp.step1Label },
          { title: t.otp.step2Label },
        ]}
      />

      <div>
        <button
          type="button"
          onClick={onBack}
          disabled={submitting || resending}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50 mb-3 whitespace-nowrap"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.otp.changeDetails}</span>
        </button>

        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{heading}</h2>
        <p className="mt-1.5 text-xs text-slate-500">
          {t.otp.codeSentTo}: <strong className="text-slate-800 font-medium">{targetLabel}</strong>
        </p>
      </div>

      {serverInfoMessage && (
        <Alert
          type="info"
          showIcon
          title={serverInfoMessage}
          className="text-xs rounded-lg"
        />
      )}

      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title={errorMessage}
          className="text-xs rounded-lg"
        />
      )}

      <div className="flex items-center justify-between gap-4 py-2.5 px-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>{t.otp.validityLabel}:</span>
          <span
            className={`font-mono-tabular font-semibold ${
              validitySecondsLeft <= 30 ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {formatCountdown(validitySecondsLeft)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-600">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>
            {t.otp.attemptsRemaining}:{' '}
            <strong
              className={`font-mono-tabular ${
                remainingAttempts <= 1 ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {remainingAttempts}/{OTP_MAX_ATTEMPTS}
            </strong>
          </span>
        </div>
      </div>

      {validitySecondsLeft === 0 && (
        <Alert type="warning" showIcon title={t.otp.expiredNotice} className="text-xs rounded-lg" />
      )}

      {remainingAttempts === 0 && (
        <Alert type="warning" showIcon title={t.otp.attemptsExhausted} className="text-xs rounded-lg" />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
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
            disabled={submitting || resending}
          />
        </Form.Item>

        {flowType === 'reset-password' && (
          <>
            <Form.Item
              name="newPassword"
              label={
                <span className="text-sm font-medium text-slate-700">{t.otp.newPasswordLabel}</span>
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
                placeholder={t.otp.newPasswordPlaceholder}
                autoComplete="new-password"
                disabled={submitting || resending}
                onChange={(e) => setNewPasswordValue(e.target.value)}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['newPassword']}
              label={
                <span className="text-sm font-medium text-slate-700">
                  {t.otp.confirmNewPasswordLabel}
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
                placeholder={t.otp.confirmNewPasswordPlaceholder}
                autoComplete="new-password"
                disabled={submitting || resending}
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
                disabled={submitting || resending}
                resetSignal={humanResetSignal}
              />
            </Form.Item>
          </>
        )}

        <div className="space-y-3 pt-1">
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={submitting}
            disabled={resending}
          >
            {flowType === 'reset-password' ? t.otp.resetSubmit : t.otp.verifySubmit}
          </Button>

          <Button
            type="default"
            size="large"
            block
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            loading={resending}
            disabled={submitting || resendCooldownSecondsLeft > 0}
            onClick={onResend}
          >
            {resendCooldownSecondsLeft > 0 ? (
              <span className="tabular-nums">
                {t.otp.resendCooldown} ({resendCooldownSecondsLeft}s)
              </span>
            ) : (
              t.otp.resendButton
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}
