import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, MessageCircle, Mic, Send, Square, X } from 'lucide-react';
import { API_BASE_URL } from '../constants';
import type { Language } from '../types/auth';

type Props = {
  admin?: boolean;
  token: string;
  language: Language;
  request: (path: string, init?: RequestInit) => Promise<Response>;
};
type Message = {
  id: number; userId: string; senderAdmin: boolean; kind: 'TEXT' | 'IMAGE' | 'VOICE';
  text: string | null; fileName: string | null; createdAt: string; readAt: string | null;
};
type Conversation = { userId: string; username: string | null; unread: number; lastMessageId: number };
type Customer = { id: string; role: string; username: string; email: string };
type Attachment = { kind: 'IMAGE' | 'VOICE'; file: File; requestId: string };
type Activity = { activity: string; expiresAt: string };

const IMAGE_LIMIT = 20 * 1024 * 1024;

async function resizeChatImage(file: File): Promise<File | null> {
  let url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      const { heicTo, isHeic } = await import('heic-to');
      if (!await isHeic(file)) return null;
      const converted = await heicTo({ blob: file, type: 'image/png' });
      URL.revokeObjectURL(url);
      url = URL.createObjectURL(converted);
      image.src = url;
      await image.decode();
    }
    const ratio = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.9));
    if (!blob || blob.size > IMAGE_LIMIT) return null;
    const extension = blob.type === 'image/webp' ? 'webp' : 'png';
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${extension}`, { type: blob.type });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const copy = {
  uz: {
    title: 'Xabarlar', support: 'Admin bilan chat', online: 'Ulandi', offline: 'Ulanmoqda…',
    typing: 'Yozmoqda…', recording: 'Ovozli xabar yozmoqda…', older: 'Avvalgi xabarlar',
    empty: 'Suhbatni xabar bilan boshlang.', write: 'Xabar yozing…', image: 'Rasm biriktirish',
    voice: 'Ovoz yozish', stop: 'Yozishni tugatish', send: 'Yuborish', cancel: 'Bekor qilish',
    search: 'Ism, username yoki email', find: 'Qidirish', more: 'Yana ko‘rsatish',
    choose: 'Suhbatni tanlang yoki foydalanuvchini qidiring.', failed: 'So‘rov bajarilmadi. Qayta urinib ko‘ring.',
    mic: 'Mikrofonni ochib bo‘lmadi. Ruxsatni tekshiring.', open: 'Faylni ochish', download: 'Yuklab olish',
    read: 'O‘qildi', sent: 'Yuborildi', back: 'Suhbatlar', size: 'Fayl hajmi limitdan oshdi.',
    unsupported: 'Bu fayl formatini yuborib bo‘lmadi.', users: 'Foydalanuvchilar', noUsers: 'Foydalanuvchi topilmadi.',
  },
  ru: {
    title: 'Сообщения', support: 'Чат с администратором', online: 'Подключено', offline: 'Подключение…',
    typing: 'Печатает…', recording: 'Записывает голосовое…', older: 'Предыдущие сообщения',
    empty: 'Отправьте первое сообщение.', write: 'Напишите сообщение…', image: 'Добавить изображение',
    voice: 'Записать голосовое', stop: 'Завершить запись', send: 'Отправить', cancel: 'Отменить',
    search: 'Имя, логин или email', find: 'Найти', more: 'Показать ещё',
    choose: 'Выберите чат или найдите пользователя.', failed: 'Запрос не выполнен. Попробуйте ещё раз.',
    mic: 'Не удалось включить микрофон. Проверьте разрешение.', open: 'Открыть файл', download: 'Скачать',
    read: 'Прочитано', sent: 'Отправлено', back: 'Чаты', size: 'Файл превышает допустимый размер.',
    unsupported: 'Этот формат файла не поддерживается.', users: 'Пользователи', noUsers: 'Пользователи не найдены.',
  },
};

function Media({ message, request, language }: Pick<Props, 'request' | 'language'> & { message: Message }) {
  const t = copy[language];
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const lifetime = useRef<AbortController | null>(null);
  const objectUrl = useRef('');
  useEffect(() => () => {
    lifetime.current?.abort();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  async function open() {
    const controller = new AbortController();
    lifetime.current = controller;
    setLoading(true);
    setFailed(false);
    try {
      const response = await request(`/api/mobile/chat/attachments/${message.id}`, { signal: controller.signal });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl.current = URL.createObjectURL(blob);
      setUrl(objectUrl.current);
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  if (!url) return <><button type="button" className="underline" onClick={open} disabled={loading}>
    {loading ? '…' : message.fileName || t.open}
  </button>{failed && <p role="alert">{t.failed}</p>}</>;
  return <>
    {message.kind === 'VOICE'
      ? <audio controls src={url} className="max-w-full" />
      : !previewFailed && <img src={url} onError={() => setPreviewFailed(true)} alt={message.fileName ?? ''}
          className="max-h-72 max-w-full rounded-xl object-contain" />}
    <a href={url} download={message.fileName ?? undefined} className="text-sm underline">{t.download}</a>
  </>;
}

export function SupportChat({ admin = false, token, language, request }: Props) {
  const t = copy[language];
  const [selected, setSelected] = useState<Customer | Conversation | null>(null);
  const userId = selected ? ('userId' in selected ? selected.userId : selected.id) : undefined;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState('');
  const searchRequest = useRef<AbortController | null>(null);
  const [searchPage, setSearchPage] = useState({ query: '', next: 0, more: false });
  const [messages, setMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [older, setOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [requestingMic, setRequestingMic] = useState(false);
  const [peerActivities, setPeerActivities] = useState<Record<string, Activity>>({});
  const socket = useRef<WebSocket | null>(null);
  const pendingText = useRef<{ requestId: string; text: string } | null>(null);
  const typing = useRef<number | undefined>(undefined);
  const recorder = useRef<MediaRecorder | null>(null);
  const generation = useRef(0);
  const seen = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const scrollOnChange = useRef(true);
  const input = useRef<HTMLInputElement>(null);

  function frame(type: string, fields: Record<string, unknown> = {}) {
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(JSON.stringify({ type, userId, ...fields }));
    return true;
  }

  useEffect(() => {
    let alive = true;
    let retry: number | undefined;
    let delay = 1000;
    let connected: WebSocket;
    setReady(false);
    setMessages([]);
    setLoaded(false);
    setOlder(false);
    setPeerActivities({});
    seen.current = 0;
    scrollOnChange.current = true;
    function connect() {
      const url = new URL(admin ? '/ws/admin/chat' : '/ws/mobile/chat', API_BASE_URL || location.origin);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(url);
      connected = ws;
      socket.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'AUTH', accessToken: token }));
      ws.onclose = () => {
        if (!alive) return;
        setReady(false);
        setLoaded(false);
        setPeerActivities({});
        retry = window.setTimeout(connect, delay);
        delay = Math.min(delay * 2, 15000);
      };
      ws.onmessage = ({ data }) => {
        if (!alive) return;
        const event = JSON.parse(data);
        switch (event.type) {
          case 'READY':
            delay = 1000;
            setReady(true);
            if (admin) frame('CONVERSATIONS');
            if (!admin || userId) frame('HISTORY', { requestId: 'latest' });
            if (pendingText.current) frame('SEND_TEXT', pendingText.current);
            break;
          case 'HISTORY': {
            const history = (event.data as Message[]).slice().reverse();
            if (event.requestId === 'latest') {
              const newest = history.at(-1)?.id ?? 0;
              scrollOnChange.current = true;
              setMessages(current => [...history, ...current.filter(message => message.id > newest)]);
            } else {
              setMessages(current => [...history.filter(message => !current.some(item => item.id === message.id)), ...current]);
            }
            setOlder(history.length === 30);
            setLoaded(true);
            break;
          }
          case 'CONVERSATIONS': {
            const page = event.data as Conversation[];
            setConversations(current => event.requestId === 'older' ? [
              ...current, ...page.filter(item => !current.some(previous => previous.userId === item.userId)),
            ] : page);
            setHasMoreConversations(page.length === 30);
            break;
          }
          case 'MESSAGE': {
            const message = event.data as Message;
            if (admin) frame('CONVERSATIONS');
            if (admin && message.userId !== userId) break;
            scrollOnChange.current = true;
            setMessages(current => current.some(item => item.id === message.id) ? current :
              [...current, message].sort((left, right) => left.id - right.id));
            break;
          }
          case 'ACK':
            if (event.requestId === pendingText.current?.requestId) {
              const message = event.data as Message;
              setMessages(current => current.some(item => item.id === message.id) ? current :
                [...current, message].sort((left, right) => left.id - right.id));
              scrollOnChange.current = true;
              pendingText.current = null;
              setSending(false);
              setDraft('');
            }
            break;
          case 'READ':
            if (admin) frame('CONVERSATIONS');
            if (admin && event.data.userId !== userId) break;
            setMessages(current => current.map(message => message.id <= event.data.throughId &&
              message.senderAdmin !== event.data.readerAdmin && !message.readAt
              ? { ...message, readAt: new Date().toISOString() } : message));
            break;
          case 'ACTIVITY':
            if (admin && event.userId !== userId) break;
            setPeerActivities(current => {
              const next = { ...current };
              if (event.activity === 'IDLE') delete next[event.activityId];
              else next[event.activityId] = { activity: event.activity, expiresAt: event.expiresAt };
              return next;
            });
            break;
          case 'ERROR':
            if (event.requestId === pendingText.current?.requestId) {
              pendingText.current = null;
              setSending(false);
            }
            setError(t.failed);
            break;
        }
      };
    }
    connect();
    const ping = window.setInterval(() => frame('PING'), 25000);
    return () => {
      alive = false;
      window.clearInterval(ping);
      window.clearTimeout(retry);
      connected?.close();
      socket.current = null;
    };
  }, [admin, token, userId, t.failed]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPeerActivities(current => {
        const active = Object.entries(current).filter(([, value]) => Date.parse(value.expiresAt) > Date.now());
        return active.length === Object.keys(current).length ? current : Object.fromEntries(active);
      });
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!recording) return;
    const started = performance.now();
    setRecordingSeconds(0);
    const timer = window.setInterval(() => setRecordingSeconds(Math.floor((performance.now() - started) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (!recording || !ready) return;
    frame('ACTIVITY', { activity: 'RECORDING_VOICE' });
    const timer = window.setInterval(() => frame('ACTIVITY', { activity: 'RECORDING_VOICE' }), 4000);
    return () => window.clearInterval(timer);
  }, [recording, ready, userId]);

  useEffect(() => {
    if (scrollOnChange.current) bottom.current?.scrollIntoView({ block: 'nearest' });
    scrollOnChange.current = false;
    function markRead() {
      if (!ready || document.visibilityState !== 'visible') return;
      const latest = messages.slice().reverse().find(message => message.senderAdmin !== admin && !message.readAt);
      if (latest && latest.id > seen.current && frame('MARK_READ', { throughId: latest.id })) seen.current = latest.id;
    }
    markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => document.removeEventListener('visibilitychange', markRead);
  }, [messages, ready, admin, userId]);

  useEffect(() => () => {
    generation.current++;
    searchRequest.current?.abort();
    window.clearTimeout(typing.current);
    const capture = recorder.current;
    capture?.stream.getTracks().forEach(track => track.stop());
    if (capture?.state === 'recording') capture.stop();
  }, []);

  function choose(customer: Customer | Conversation | null) {
    window.clearTimeout(typing.current);
    frame('ACTIVITY', { activity: 'IDLE' });
    generation.current++;
    const capture = recorder.current;
    if (capture?.state === 'recording') capture.stop();
    capture?.stream.getTracks().forEach(track => track.stop());
    recorder.current = null;
    pendingText.current = null;
    setRecording(false);
    setRequestingMic(false);
    setDraft('');
    setAttachment(null);
    setError('');
    setSending(false);
    setReady(false);
    setMessages([]);
    setPeerActivities({});
    setOlder(false);
    setLoaded(false);
    setSelected(customer);
  }

  async function find(query: string, page = 0) {
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setError('');
    try {
      const response = await request(`/api/admin/users?q=${encodeURIComponent(query)}&page=${page}&size=30`,
        { signal: controller.signal });
      if (!response.ok) throw new Error();
      const result = await response.json() as { content: Customer[]; page: { totalPages: number } };
      if (controller.signal.aborted) return;
      const entries = result.content.filter(item => item.role !== 'ADMIN');
      setCustomers(current => page === 0 ? entries : [...(current ?? []), ...entries]);
      setSearchPage({ query, next: page + 1, more: page + 1 < result.page.totalPages });
    } catch {
      if (!controller.signal.aborted) setError(t.failed);
    }
  }

  function changeDraft(value: string) {
    setDraft(value);
    window.clearTimeout(typing.current);
    if (!value.trim()) {
      frame('ACTIVITY', { activity: 'IDLE' });
      return;
    }
    frame('ACTIVITY', { activity: 'TYPING' });
    typing.current = window.setTimeout(() => frame('ACTIVITY', { activity: 'IDLE' }), 2000);
  }

  async function record() {
    if (recorder.current?.state === 'recording') {
      recorder.current.stop();
      return;
    }
    const attempt = generation.current;
    setRequestingMic(true);
    setError('');
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (attempt !== generation.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(stream, { mimeType });
      recorder.current = capture;
      const chunks: Blob[] = [];
      let recordedBytes = 0;
      capture.ondataavailable = event => {
        if (!event.data.size) return;
        chunks.push(event.data);
        recordedBytes += event.data.size;
        if (recordedBytes > 10 * 1024 * 1024 && capture.state === 'recording') capture.stop();
      };
      capture.onstop = () => {
        capture.stream.getTracks().forEach(track => track.stop());
        if (attempt !== generation.current) return;
        recorder.current = null;
        setRecording(false);
        frame('ACTIVITY', { activity: 'IDLE' });
        if (recordedBytes > 10 * 1024 * 1024) return setError(t.size);
        if (!recordedBytes) return setError(t.failed);
        const type = capture.mimeType.split(';')[0];
        const extension = type === 'audio/mp4' ? 'm4a' : type === 'audio/ogg' ? 'ogg' : 'webm';
        setAttachment({ kind: 'VOICE', file: new File(chunks, `voice.${extension}`, { type }), requestId: crypto.randomUUID() });
      };
      window.clearTimeout(typing.current);
      capture.start(1000);
      setRecording(true);
    } catch {
      stream?.getTracks().forEach(track => track.stop());
      if (attempt === generation.current) setError(t.mic);
    } finally {
      if (attempt === generation.current) setRequestingMic(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!ready || sending || recording || (admin && !userId)) return;
    setError('');
    window.clearTimeout(typing.current);
    if (!attachment) {
      const text = draft.trim();
      if (!text) return;
      const command = { requestId: crypto.randomUUID(), text };
      if (frame('SEND_TEXT', command)) {
        pendingText.current = command;
        setSending(true);
      }
      return;
    }
    const attempt = generation.current;
    setSending(true);
    const body = new FormData();
    body.set('kind', attachment.kind);
    body.set('requestId', attachment.requestId);
    if (userId) body.set('userId', userId);
    try {
      const image = attachment.kind === 'IMAGE';
      const original = attachment.file;
      const resizeFirst = image && (original.size > IMAGE_LIMIT || /\.svgz?$/i.test(original.name)
        || original.type === 'image/svg+xml');
      const file = resizeFirst ? await resizeChatImage(original) : original;
      if (attempt !== generation.current) return;
      if (!file) return setError(original.size > IMAGE_LIMIT ? t.size : t.unsupported);
      body.set('file', file);
      let response = await request('/api/mobile/chat/attachments', { method: 'POST', body });
      if (image && !resizeFirst && (response.status === 415 || response.status === 413 || response.status >= 500)) {
        const resized = await resizeChatImage(original);
        if (attempt !== generation.current) return;
        if (resized) {
          body.set('file', resized);
          response = await request('/api/mobile/chat/attachments', { method: 'POST', body });
        }
      }
      if (attempt !== generation.current) return;
      if (!response.ok) {
        setError(response.status === 415 ? t.unsupported : response.status === 413 ? t.size : `${t.failed} (HTTP ${response.status})`);
        return;
      }
      const message = await response.json() as Message;
      if (attempt !== generation.current) return;
      scrollOnChange.current = true;
      setMessages(current => current.some(item => item.id === message.id) ? current :
        [...current, message].sort((left, right) => left.id - right.id));
      setAttachment(null);
      frame('ACTIVITY', { activity: 'IDLE' });
    } catch {
      if (attempt === generation.current) setError(t.failed);
    } finally {
      if (attempt === generation.current) setSending(false);
    }
  }

  const active = Object.values(peerActivities);
  const peerStatus = active.some(value => value.activity === 'RECORDING_VOICE') ? t.recording :
    active.some(value => value.activity === 'TYPING') ? t.typing : '';
  const iconButton = 'grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 disabled:opacity-40';
  const actionButton = 'min-h-11 rounded-xl bg-green-700 px-4 text-white disabled:opacity-40';
  return <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-7">
    <div className={`grid overflow-hidden rounded-2xl border border-slate-200 bg-white ${admin ? 'md:grid-cols-[18rem_1fr]' : ''}`}>
      {admin && <aside className={`${userId ? 'hidden md:block' : ''} border-slate-200 p-4 md:border-r`}>
        <h1 className="mb-3 text-xl font-semibold">{t.title}</h1>
        <form className="mb-4 flex gap-2" onSubmit={event => { event.preventDefault(); void find(search.trim()); }}>
          <input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3" type="search" value={search}
            onChange={event => { setSearch(event.target.value); if (!event.target.value) {
              searchRequest.current?.abort();
              setCustomers(null);
            } }}
            placeholder={t.search} aria-label={t.search} maxLength={255} />
          <button className={actionButton}>{t.find}</button>
        </form>
        <div className="max-h-[62dvh] space-y-1 overflow-y-auto">
          {(customers ?? conversations).map(customer => {
            const id = 'userId' in customer ? customer.userId : customer.id;
            return <button key={id} onClick={() => { if (id !== userId) choose(customer); }}
              className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 text-left ${id === userId ? 'bg-green-50 text-green-800' : 'hover:bg-slate-50'}`}>
              <span className="min-w-0 truncate">{customer.username || ('email' in customer ? customer.email : id)}</span>
              {'unread' in customer && customer.unread > 0 &&
                <span className="rounded-full bg-green-700 px-2 text-sm text-white">{customer.unread}</span>}
            </button>;
          })}
          {customers?.length === 0 && <p className="text-sm text-slate-600">{t.noUsers}</p>}
          {customers ? searchPage.more && <button className="min-h-11 text-green-800" onClick={() => void find(searchPage.query, searchPage.next)}>{t.more}</button> :
            hasMoreConversations && <button className="min-h-11 text-green-800" onClick={() =>
              frame('CONVERSATIONS', { requestId: 'older', beforeId: conversations.at(-1)?.lastMessageId })}>{t.more}</button>}
        </div>
        {error && !userId && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </aside>}
      {(!admin || userId) ? <section className="min-w-0">
        <header className="border-b border-slate-200 px-4 py-3">
          {admin && <button className="mb-1 min-h-11 text-green-800 md:hidden" onClick={() => choose(null)}>← {t.back}</button>}
          <h2 className="text-lg font-semibold">{selected?.username || t.support}</h2>
          <p className="min-h-5 text-sm text-slate-600" aria-live="polite">{peerStatus || (ready ? t.online : t.offline)}</p>
        </header>
        <div className="h-[48dvh] min-h-48 overflow-y-auto bg-slate-50 px-3 py-3 sm:h-[54dvh] sm:px-5">
          {older && <button onClick={() => frame('HISTORY', { requestId: 'older', beforeId: messages[0]?.id })}
            disabled={!ready} className="mx-auto mb-3 block min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm">{t.older}</button>}
          {loaded && messages.length === 0 && <p className="py-8 text-center text-sm text-slate-600">{t.empty}</p>}
          <ul className="space-y-2">
            {messages.map(message => {
              const own = message.senderAdmin === admin;
              return <li key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 sm:max-w-[75%] ${own ? 'bg-green-100' : 'border border-slate-200 bg-white'}`}>
                  {message.kind === 'TEXT' ? <p className="whitespace-pre-wrap break-words">{message.text}</p> :
                    <Media message={message} request={request} language={language} />}
                  <p className="mt-1 text-right text-xs text-slate-600">
                    {new Date(message.createdAt).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    {own && ` · ${message.readAt ? t.read : t.sent}`}
                  </p>
                </div>
              </li>;
            })}
          </ul>
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="space-y-2 border-t border-slate-200 p-3">
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {recording && <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
            <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-red-600 motion-reduce:animate-none" />
            <span className="flex-1" role="status">{t.recording}</span>
            <time className="tabular-nums">{String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</time>
          </div>}
          {attachment && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1">
            <span className="min-w-0 flex-1 truncate">{attachment.file.name}</span>
            <button type="button" className={iconButton} disabled={sending} onClick={() => setAttachment(null)} aria-label={t.cancel}><X size={18} /></button>
          </div>}
          <div className="flex items-end gap-1.5 sm:gap-2">
            <input type="file" accept="image/*,.heic,.heif,.avif,.tif,.tiff,.svg,.psd,.jxl,.jp2,.dng,.cr2,.cr3,.nef,.arw,.raf,.rw2,.orf" ref={input} hidden onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setError('');
              setAttachment({ file, kind: 'IMAGE', requestId: crypto.randomUUID() });
            }} />
            <button type="button" className={iconButton} disabled={sending || recording || requestingMic} onClick={() => input.current?.click()} aria-label={t.image}><ImagePlus size={19} /></button>
            <button type="button" className={iconButton} disabled={sending || requestingMic || !!attachment} onClick={() => void record()} aria-label={recording ? t.stop : t.voice}>
              {recording ? <Square size={18} className="text-red-700" /> : <Mic size={19} />}
            </button>
            <textarea className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5"
              rows={1} aria-label={t.write} placeholder={t.write} maxLength={4000} value={draft}
              disabled={sending || recording || !!attachment} onChange={event => changeDraft(event.target.value)} />
            <button className="grid size-11 shrink-0 place-items-center rounded-xl bg-green-700 text-white disabled:opacity-40"
              disabled={!ready || sending || recording || (!draft.trim() && !attachment)} aria-label={t.send}><Send size={18} /></button>
          </div>
        </form>
      </section> : <section className="hidden min-h-96 place-content-center justify-items-center gap-3 text-slate-600 md:grid">
        <MessageCircle size={32} /><p>{t.choose}</p>
      </section>}
    </div>
  </main>;
}
