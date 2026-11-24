import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Input, type InputRef } from 'antd';
import { Phone, User } from 'lucide-react';
import { translations } from '../i18n/translations';
import { authApi, AuthApiError } from '../services/authApi';
import type { AuthSession, Language, UserProfile } from '../types/auth';
import {
  getMissingProfileFields,
  validatePersonName,
  validatePhone,
  type RequiredProfileField,
} from '../utils/validation';

interface ProfileCompletionViewProps {
  language: Language;
  profile: UserProfile;
  session: AuthSession;
  onCompleted: (updatedProfile: UserProfile) => void;
  onUnauthorized: (message?: string) => void;
}

interface CompletionFormValues {
  firstName: string;
  lastName: string;
  phone: string;
}

function buildMissingFieldsMessage(
  missing: RequiredProfileField[],
  language: Language,
): string {
  const t = translations[language].workspace.profileCompletion;
  const labels = missing.map((field) => t.fieldLabels[field]);
  const connector = language === 'ru' ? ' и ' : ' va ';

  let joined = '';
  if (labels.length === 1) {
    joined = labels[0];
  } else if (labels.length === 2) {
    joined = `${labels[0]}${connector}${labels[1]}`;
  } else if (labels.length >= 3) {
    joined = `${labels.slice(0, -1).join(', ')}${connector}${labels[labels.length - 1]}`;
  }

  return `${t.missingPrefix}${joined}${t.missingSuffix}`;
}

export function ProfileCompletionView({
  language,
  profile,
  session,
  onCompleted,
  onUnauthorized,
}: ProfileCompletionViewProps) {
  const t = translations[language];
  const [form] = Form.useForm<CompletionFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const firstNameRef = useRef<InputRef | null>(null);
  const lastNameRef = useRef<InputRef | null>(null);
  const phoneRef = useRef<InputRef | null>(null);

  const initialMissing = getMissingProfileFields(profile);
  const [watchedValues, setWatchedValues] = useState<CompletionFormValues>({
    firstName: profile.firstName?.trim() ? profile.firstName : '',
    lastName: profile.lastName?.trim() ? profile.lastName : '',
    phone: profile.phone?.trim() ? profile.phone : '',
  });

  useEffect(() => {
    const nextValues: CompletionFormValues = {
      firstName: profile.firstName?.trim() ? profile.firstName : '',
      lastName: profile.lastName?.trim() ? profile.lastName : '',
      phone: profile.phone?.trim() ? profile.phone : '',
    };
    form.setFieldsValue(nextValues);
    setWatchedValues(nextValues);
  }, [profile.firstName, profile.lastName, profile.phone, form]);

  useEffect(() => {
    const missing = getMissingProfileFields(profile);
    const firstMissing = missing[0];
    const timer = window.setTimeout(() => {
      if (firstMissing === 'firstName') {
        firstNameRef.current?.focus();
      } else if (firstMissing === 'lastName') {
        lastNameRef.current?.focus();
      } else if (firstMissing === 'phone') {
        phoneRef.current?.focus();
      }
    }, 60);

    return () => window.clearTimeout(timer);
    // Focus the first missing field on initial entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missingMessage = buildMissingFieldsMessage(initialMissing, language);

  const isFieldCurrentlyMissing = (field: RequiredProfileField): boolean => {
    const val = watchedValues[field];
    return !val || !val.trim();
  };

  const handleFinish = async (values: CompletionFormValues) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const updated = await authApi.updateProfile(
        session.accessToken,
        {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phone: values.phone.trim(),
        },
        language,
      );
      onCompleted(updated);
    } catch (error) {
      if (error instanceof AuthApiError) {
        if (error.status === 401) {
          onUnauthorized(error.message);
          return;
        }
        setSubmitError(error.message);
        const mapped = error.fields
          .filter((f) => f === 'firstName' || f === 'lastName' || f === 'phone')
          .map((name) => ({ name: name as keyof CompletionFormValues, errors: [error.message] }));
        if (mapped.length > 0) {
          form.setFields(mapped);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 w-full px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
      <div className="w-full max-w-[680px] mx-auto bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-8 shadow-xs">
        <div className="space-y-2 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {t.workspace.profileCompletion.title}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">{missingMessage}</p>
        </div>

        {submitError && (
          <Alert
            type="error"
            showIcon
            title={submitError}
            className="text-xs rounded-lg mb-5"
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onValuesChange={(_, allValues: CompletionFormValues) => {
            setWatchedValues(allValues);
          }}
          requiredMark={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Form.Item
              name="firstName"
              className={isFieldCurrentlyMissing('firstName') ? 'oson-field-attention' : ''}
              label={
                <span className="text-sm font-medium text-slate-700">
                  {t.workspace.fields.firstName}
                </span>
              }
              rules={[
                {
                  validator: (_, value: string) => {
                    const check = validatePersonName(value || '');
                    if (!check.valid) {
                      if (check.reason === 'required') {
                        return Promise.reject(new Error(t.validation.requiredFirstName));
                      }
                      return Promise.reject(new Error(t.validation.firstNameMaxLength));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                ref={firstNameRef}
                size="large"
                prefix={<User className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder={t.workspace.personalForm.firstNamePlaceholder}
                autoComplete="given-name"
                disabled={submitting}
                className="!min-h-[44px]"
              />
            </Form.Item>

            <Form.Item
              name="lastName"
              className={isFieldCurrentlyMissing('lastName') ? 'oson-field-attention' : ''}
              label={
                <span className="text-sm font-medium text-slate-700">
                  {t.workspace.fields.lastName}
                </span>
              }
              rules={[
                {
                  validator: (_, value: string) => {
                    const check = validatePersonName(value || '');
                    if (!check.valid) {
                      if (check.reason === 'required') {
                        return Promise.reject(new Error(t.validation.requiredLastName));
                      }
                      return Promise.reject(new Error(t.validation.lastNameMaxLength));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                ref={lastNameRef}
                size="large"
                prefix={<User className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder={t.workspace.personalForm.lastNamePlaceholder}
                autoComplete="family-name"
                disabled={submitting}
                className="!min-h-[44px]"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              className={`md:col-span-2 ${
                isFieldCurrentlyMissing('phone') ? 'oson-field-attention' : ''
              }`}
              label={
                <span className="text-sm font-medium text-slate-700">
                  {t.workspace.personalForm.phoneLabel}
                </span>
              }
              extra={
                <span className="text-xs text-slate-500">
                  {t.workspace.profileCompletion.phoneHelp}
                </span>
              }
              rules={[
                {
                  validator: (_, value: string) => {
                    const trimmed = (value || '').trim();
                    if (!trimmed) {
                      return Promise.reject(new Error(t.validation.requiredPhone));
                    }
                    const check = validatePhone(trimmed);
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
                ref={phoneRef}
                type="tel"
                inputMode="tel"
                size="large"
                prefix={<Phone className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder={t.workspace.personalForm.phonePlaceholder}
                autoComplete="tel"
                disabled={submitting}
                className="!min-h-[44px]"
              />
            </Form.Item>
          </div>

          <div className="pt-2">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
              className="!min-h-[44px] !font-semibold"
            >
              {t.workspace.profileCompletion.submitButton}
            </Button>
          </div>
        </Form>
      </div>
    </main>
  );
}
