import { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { API_BASE_URL } from '../constants';
import type { Language } from '../types/auth';

export type Consent = { termsAccepted: boolean; privacyAcknowledged: boolean };
export const emptyConsent: Consent = { termsAccepted: false, privacyAcknowledged: false };

type DocumentKind = 'terms' | 'privacy';
type Revision = { version: string; publishedAt: string; contentUz: string; contentRu: string };

export function AuthConsent({ language, value, onChange }: {
  language: Language; value: Consent; onChange: (value: Consent) => void;
}) {
  const ru = language === 'ru';
  const [kind, setKind] = useState<DocumentKind>();
  const [revision, setRevision] = useState<Revision>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!kind) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setError(true);
      controller.abort();
    }, 15000);
    void fetch(API_BASE_URL + '/api/site/legal/' + kind, {
      signal: controller.signal, cache: 'no-store',
    }).then(async response => {
      if (response.status !== 200) throw new Error();
      const result: Revision = await response.json();
      if (!controller.signal.aborted) setRevision(result);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [kind, attempt]);

  function openDocument(document: DocumentKind) {
    setRevision(undefined);
    setError(false);
    setKind(document);
  }

  return <fieldset className="mb-4 space-y-2 text-sm">
    <div className="flex items-start gap-2">
      <input className="mt-1 accent-green-700" type="checkbox" checked={value.termsAccepted}
        aria-label={ru ? 'Я принимаю условия использования' : 'Foydalanish shartlariga roziman'}
        onChange={e => onChange({ ...value, termsAccepted: e.target.checked })} />
      <span>{ru ? 'Я прочитал(а) и принимаю ' : 'Men '}
        <button type="button" className="underline" onClick={() => openDocument('terms')}>
          {ru ? 'условия использования' : 'foydalanish shartlarini'}
        </button>{ru ? '.' : ' o‘qidim va ularga roziman.'}</span>
    </div>
    <div className="flex items-start gap-2">
      <input className="mt-1 accent-green-700" type="checkbox" checked={value.privacyAcknowledged}
        aria-label={ru ? 'Я ознакомился с политикой конфиденциальности' : 'Maxfiylik siyosati bilan tanishdim'}
        onChange={e => onChange({ ...value, privacyAcknowledged: e.target.checked })} />
      <span>{ru ? 'Я ознакомился(-ась) с ' : 'Men '}
        <button type="button" className="underline" onClick={() => openDocument('privacy')}>
          {ru ? 'политикой конфиденциальности' : 'maxfiylik siyosati'}
        </button>{ru ? '.' : ' bilan tanishdim.'}</span>
    </div>
    <Modal open={!!kind} onCancel={() => setKind(undefined)} centered width={680}
      title={kind === 'terms' ? (ru ? 'Условия использования' : 'Foydalanish shartlari')
        : (ru ? 'Политика конфиденциальности' : 'Maxfiylik siyosati')}
      footer={<button type="button" className="rounded-lg border px-4 py-2" onClick={() => setKind(undefined)}>
        {ru ? 'Закрыть' : 'Yopish'}
      </button>}>
      <div className="max-h-[55dvh] overflow-y-auto overscroll-contain pr-2">
        {revision ? <>
          <p className="mb-4 text-sm text-slate-500">{revision.version} · {new Date(revision.publishedAt).toLocaleDateString(language)}</p>
          <p className="whitespace-pre-wrap break-words leading-relaxed">{ru ? revision.contentRu : revision.contentUz}</p>
        </> : error ? <>
          <p role="alert">{ru ? 'Документ не удалось загрузить.' : 'Hujjatni yuklab bo‘lmadi.'}</p>
          <button type="button" className="mt-2 underline" onClick={() => { setError(false); setAttempt(n => n + 1); }}>
            {ru ? 'Повторить' : 'Qayta urinish'}
          </button>
        </> : <p role="status">{ru ? 'Загрузка…' : 'Yuklanmoqda…'}</p>}
      </div>
    </Modal>
  </fieldset>;
}
