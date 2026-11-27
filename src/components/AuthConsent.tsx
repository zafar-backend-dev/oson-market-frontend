import { useEffect, useRef, useState } from 'react';
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
  const [reachedEnd, setReachedEnd] = useState(false);
  const reader = useRef<HTMLDivElement>(null);

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

  function checkEnd() {
    const area = reader.current;
    if (area && area.clientHeight > 0 && area.scrollHeight - area.clientHeight - area.scrollTop <= 4) setReachedEnd(true);
  }

  useEffect(() => {
    if (!kind || !revision || !reader.current) return;
    const area = reader.current;
    const observer = new ResizeObserver(checkEnd);
    observer.observe(area);
    checkEnd();
    return () => observer.disconnect();
  }, [kind, revision, language]);

  function confirmReading() {
    if (!kind || !revision || !reachedEnd) return;
    onChange(kind === 'terms' ? { ...value, termsAccepted: true }
      : { ...value, privacyAcknowledged: true });
    setKind(undefined);
  }

  function openDocument(document: DocumentKind) {
    setReachedEnd(false);
    if (reader.current) reader.current.scrollTop = 0;
    setRevision(undefined);
    setError(false);
    setKind(document);
  }

  return <fieldset className="mb-4 space-y-2 text-sm">
    <div className="flex items-start gap-2">
      <input className="mt-1 accent-green-700" type="checkbox" checked={value.termsAccepted}
        aria-label={ru ? 'Я принимаю условия использования' : 'Foydalanish shartlariga roziman'}
        onChange={e => e.target.checked ? openDocument('terms') : onChange({ ...value, termsAccepted: false })} />
      <span>{ru ? 'Я прочитал(а) и принимаю ' : 'Men '}
        <button type="button" className="underline" onClick={() => openDocument('terms')}>
          {ru ? 'условия использования' : 'foydalanish shartlarini'}
        </button>{ru ? '.' : ' o‘qidim va ularga roziman.'}</span>
    </div>
    <div className="flex items-start gap-2">
      <input className="mt-1 accent-green-700" type="checkbox" checked={value.privacyAcknowledged}
        aria-label={ru ? 'Я ознакомился с политикой конфиденциальности' : 'Maxfiylik siyosati bilan tanishdim'}
        onChange={e => e.target.checked ? openDocument('privacy') : onChange({ ...value, privacyAcknowledged: false })} />
      <span>{ru ? 'Я ознакомился(-ась) с ' : 'Men '}
        <button type="button" className="underline" onClick={() => openDocument('privacy')}>
          {ru ? 'политикой конфиденциальности' : 'maxfiylik siyosati'}
        </button>{ru ? '.' : ' bilan tanishdim.'}</span>
    </div>
    <Modal open={!!kind} onCancel={() => setKind(undefined)} centered width={680}
      title={kind === 'terms' ? (ru ? 'Условия использования' : 'Foydalanish shartlari')
        : (ru ? 'Политика конфиденциальности' : 'Maxfiylik siyosati')}
      destroyOnHidden
      footer={<div className="flex justify-end gap-2">
        <button type="button" className="rounded-lg border px-4 py-2" onClick={() => setKind(undefined)}>
          {ru ? 'Закрыть' : 'Yopish'}
        </button>
        {revision && reachedEnd && <button type="button" className="rounded-lg bg-green-700 px-4 py-2 text-white" onClick={confirmReading}>
          {ru ? 'Да, я прочитал(а)' : 'Ha, o‘qidim'}
        </button>}
      </div>}>
      <div ref={reader} onScroll={checkEnd} tabIndex={0} className="max-h-[55dvh] overflow-y-auto overscroll-contain pr-2">
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

export function GoogleConsentHint({ language, value }: { language: Language; value: Consent }) {
  const ru = language === 'ru';
  if (value.termsAccepted && value.privacyAcknowledged) return null;
  const document = value.termsAccepted
    ? (ru ? 'Политику конфиденциальности' : 'Maxfiylik siyosatini')
    : value.privacyAcknowledged
      ? (ru ? 'Условия использования' : 'Foydalanish shartlarini')
      : (ru ? 'Условия использования и Политику конфиденциальности' : 'Foydalanish shartlari va Maxfiylik siyosatini');
  return <p role="status" className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">
    {ru ? <>Чтобы продолжить с Google, откройте {document} в форме выше. Прокрутите каждый документ до конца и нажмите «Да, я прочитал(а)».</>
      : <>Google orqali davom etish uchun yuqoridagi {document} oching. Har bir hujjatning oxiriga tushib, «Ha, o‘qidim» tugmasini bosing.</>}
  </p>;
}
