import { Capacitor } from '@capacitor/core';
import { PUBLIC_SITE_ORIGIN } from '../constants';
import type { Language } from '../types/auth';

export type Consent = { termsAccepted: boolean; privacyAcknowledged: boolean };
export const emptyConsent: Consent = { termsAccepted: false, privacyAcknowledged: false };

export function AuthConsent({ language, value, onChange }: {
  language: Language; value: Consent; onChange: (value: Consent) => void;
}) {
  const ru = language === 'ru';
  const origin = Capacitor.isNativePlatform() ? PUBLIC_SITE_ORIGIN : '';
  return <fieldset className="mb-4 space-y-2 text-sm">
    <label className="flex items-start gap-2">
      <input className="mt-1 accent-green-700" type="checkbox" checked={value.termsAccepted}
        onChange={e => onChange({ ...value, termsAccepted: e.target.checked })} />
      <span>{ru ? 'Я прочитал(а) и принимаю ' : 'Men '}
        <a href={origin + '/terms'} target="_blank" rel="noopener noreferrer" className="underline">
          {ru ? 'условия использования' : 'foydalanish shartlarini'}
        </a>{ru ? '.' : ' o‘qidim va ularga roziman.'}</span>
    </label>
    <label className="flex items-start gap-2">
      <input className="mt-1 accent-green-700" type="checkbox" checked={value.privacyAcknowledged}
        onChange={e => onChange({ ...value, privacyAcknowledged: e.target.checked })} />
      <span>{ru ? 'Я ознакомился(-ась) с ' : 'Men '}
        <a href={origin + '/privacy-policy'} target="_blank" rel="noopener noreferrer" className="underline">
          {ru ? 'политикой конфиденциальности' : 'maxfiylik siyosati'}
        </a>{ru ? '.' : ' bilan tanishdim.'}</span>
    </label>
  </fieldset>;
}
