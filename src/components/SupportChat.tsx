import { useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { ImagePlus, MessageCircle, Mic, Play, Reply, Send, Square, Trash2, X } from 'lucide-react';
import { Drawer } from 'antd';
import { ChatVoicePlayer, voiceTime } from './ChatVoicePlayer';
import { API_BASE_URL } from '../constants';
import type { Language } from '../types/auth';

type Props = {
  admin?: boolean;
  onBack?: () => void;
  actorId: string;
  token: string;
  language: Language;
  request: (path: string, init?: RequestInit) => Promise<Response>;
};
type Message = {
  id: number; userId: string; senderAdmin: boolean; kind: 'TEXT' | 'IMAGE' | 'VOICE';
  text: string | null; fileName: string | null; createdAt: string; readAt: string | null;
  senderId: string; replyToId?: number | null; deleted?: boolean;
  userReaction?: string | null; adminReaction?: string | null; revision?: number;
};
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉', '😍', '😊', '🤔', '😎', '🤩', '💯', '✅', '👎', '😡', '🙌', '💚', '✨', '👀', '🤝', '💪'];
type ChatProfile = { firstName?: string | null; lastName?: string | null; phone?: string | null };
type Conversation = ChatProfile & { userId: string; username: string | null; unread: number; lastMessageId: number };
type Customer = ChatProfile & { id: string; role: string; username: string; email: string };
type Attachment = { kind: 'IMAGE' | 'VOICE'; file: File; requestId: string };
type Activity = { activity: string; expiresAt: string };

const IMAGE_LIMIT = 20 * 1024 * 1024;
const ChatFileSaver = registerPlugin<{
  save(options: { name: string; mimeType: string; data: string }): Promise<{ saved: boolean }>;
}>('ChatFileSaver');

function readBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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

function ChatImage({ file, name, className }: { file: Blob; name: string; className: string }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const original = URL.createObjectURL(file);
    setUrl(original);
    setFailed(false);
    return () => URL.revokeObjectURL(original);
  }, [file]);

  useEffect(() => {
    if (!failed) return;
    let active = true;
    let converted = '';
    void (async () => {
      try {
        const { heicTo, isHeic } = await import('heic-to');
        if (!active || !await isHeic(new File([file], name, { type: file.type }))) return;
        const image = await heicTo({ blob: file, type: 'image/png' });
        if (active) {
          converted = URL.createObjectURL(image);
          setUrl(converted);
        }
      } catch {
        // The original remains available for download.
      }
    })();
    return () => {
      active = false;
      if (converted) URL.revokeObjectURL(converted);
    };
  }, [failed, file, name]);

  if (!url) return null;
  return <img src={url} alt={name} className={className} onError={() => setFailed(true)} />;
}

function Media({ message, request, language }: Pick<Props, 'request' | 'language'> & { message: Message }) {
  const t = copy[language];
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const lifetime = useRef<AbortController | null>(null);
  const objectUrl = useRef('');
  const preview = useRef<HTMLDivElement>(null);
  const currentRequest = useRef(request);
  useEffect(() => { currentRequest.current = request; }, [request]);

  async function open() {
    if (lifetime.current || objectUrl.current) return;
    const controller = new AbortController();
    lifetime.current = controller;
    setLoading(true);
    setFailed(false);
    try {
      const response = await currentRequest.current(`/api/mobile/chat/attachments/${message.id}`, { signal: controller.signal });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl.current = URL.createObjectURL(blob);
      setUrl(objectUrl.current);
      setFile(blob);
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      if (lifetime.current === controller) lifetime.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  async function save() {
    if (!file || saving) return;
    setSaving(true);
    setSaveStatus('');
    try {
      const result = await ChatFileSaver.save({
        name: message.fileName || (message.kind === 'IMAGE' ? 'image' : 'voice'),
        mimeType: file.type || 'application/octet-stream',
        data: await readBase64(file),
      });
      if (result.saved) setSaveStatus(language === 'ru' ? 'Файл сохранён' : 'Fayl saqlandi');
    } catch {
      setSaveStatus(language === 'ru' ? 'Не удалось сохранить файл' : 'Faylni saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const element = preview.current;
    let observer: IntersectionObserver | undefined;
    if (message.kind === 'IMAGE' && element) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer?.disconnect();
          void open();
        }
      }, { rootMargin: '150px' });
      observer.observe(element);
    }
    return () => {
      observer?.disconnect();
      lifetime.current?.abort();
      lifetime.current = null;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = '';
    };
  }, [message.id, message.kind]);

  return <div ref={preview} className={message.kind === 'IMAGE' ? 'min-h-16 min-w-24' : undefined}>
    {url ? <>
      {message.kind === 'VOICE' ? <ChatVoicePlayer url={url} language={language} autoPlay
        durationHint={Number(message.fileName?.match(/^voice-(\d+)\./)?.[1] ?? 0) / 1000} /> :
        file && <ChatImage file={file} name={message.fileName ?? ''}
          className="max-h-72 max-w-full rounded-xl object-contain" />}
      {Capacitor.getPlatform() === 'android'
        ? <button type="button" disabled={saving} onClick={() => void save()} className="min-h-9 text-sm underline">
          {saving ? '…' : t.download}
        </button>
        : <a href={url} download={message.fileName ?? undefined} className="text-sm underline">{t.download}</a>}
      {saveStatus && <p role="status" className="text-xs text-slate-700">{saveStatus}</p>}
    </> : <>
      <button type="button" className={message.kind === 'VOICE'
        ? 'flex min-h-11 items-center gap-2 rounded-full bg-green-700 px-4 font-medium text-white disabled:opacity-50'
        : 'underline'} onClick={open} disabled={loading}>
        {message.kind === 'VOICE' && <Play size={16} fill="currentColor" />}
        {loading ? '…' : message.kind === 'VOICE' ? (language === 'ru' ? 'Прослушать' : 'Tinglash') : message.fileName || t.open}
      </button>
      {failed && <p role="alert">{t.failed}</p>}
    </>}
  </div>;
}

export function SupportChat({ admin = false, onBack, actorId, token, language, request }: Props) {
  const t = copy[language];
  const labels = language === 'ru'
    ? { reply: 'Ответить', react: 'Реакция', remove: 'Удалить', deleted: 'Сообщение удалено',
        confirm: 'Удалить сообщение для всех?', quote: 'Сообщение', actions: 'Действия с сообщением' }
    : { reply: 'Javob berish', react: 'Reaksiya', remove: 'O‘chirish', deleted: 'Xabar o‘chirildi',
        confirm: 'Xabar ikkala tomon uchun o‘chirilsinmi?', quote: 'Xabar', actions: 'Xabar amallari' };
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('user');
  const userId = admin && selectedId && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(selectedId)
    ? selectedId : undefined;
  const [details, setDetails] = useState<Customer | null>(null);
  const [profileError, setProfileError] = useState(false);
  const profileRequest = useRef(request);
  useEffect(() => { profileRequest.current = request; }, [request]);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void profileRequest.current(`/api/admin/users/${userId}`).then(async response => {
      if (!response.ok) throw new Error();
      const user = await response.json() as Customer;
      if (active) setDetails(user);
    }).catch(() => { if (active) setProfileError(true); });
    return () => { active = false; };
  }, [userId, token]);

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
  const [replyToId, setReplyToId] = useState<number>();
  const [jumpToId, setJumpToId] = useState<number>();
  const [highlightedId, setHighlightedId] = useState<number>();
  const jumpCursor = useRef<number | undefined>(undefined);
  const highlightTimer = useRef<number | undefined>(undefined);
  const messageList = useRef<HTMLUListElement>(null);
  const [actionId, setActionId] = useState<number>();
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  function cancelPress() {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  }

  useEffect(() => cancelPress, []);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [requestingMic, setRequestingMic] = useState(false);
  const [peerActivities, setPeerActivities] = useState<Record<string, Activity>>({});
  const socket = useRef<WebSocket | null>(null);
  const pendingText = useRef<{ requestId: string; text: string; replyToId?: number } | null>(null);
  const typing = useRef<number | undefined>(undefined);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordAction = useRef<'preview' | 'send' | 'cancel'>('preview');
  const [voicePreviewUrl, setVoicePreviewUrl] = useState('');
  useEffect(() => {
    if (attachment?.kind !== 'VOICE') {
      setVoicePreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(attachment.file);
    setVoicePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);
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
    setJumpToId(undefined);
    setHighlightedId(undefined);
    jumpCursor.current = undefined;
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
        jumpCursor.current = undefined;
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
          case 'MESSAGE_UPDATED': {
            const update = event.data as Message;
            if (admin && update.deleted) frame('CONVERSATIONS');
            if (admin && update.userId !== userId) break;
            setMessages(current => current.map(message => message.id === update.id
              && (update.revision ?? 0) >= (message.revision ?? 0)
              ? { ...update, readAt: update.readAt ?? message.readAt } : message));
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
              setReplyToId(undefined);
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
            if (event.requestId === 'reply-jump') setJumpToId(undefined);
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
      const latest = messages.slice().reverse().find(message => message.senderAdmin !== admin && !message.readAt && !message.deleted);
      if (latest && latest.id > seen.current && frame('MARK_READ', { throughId: latest.id })) seen.current = latest.id;
    }
    markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => document.removeEventListener('visibilitychange', markRead);
  }, [messages, ready, admin, userId]);

  useEffect(() => {
    if (!jumpToId) return;
    const target = messageList.current?.querySelector(`[data-message-id="${jumpToId}"]`);
    if (target) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'instant' : 'smooth' });
      setHighlightedId(jumpToId);
      window.clearTimeout(highlightTimer.current);
      highlightTimer.current = window.setTimeout(() => setHighlightedId(undefined), 1800);
      setJumpToId(undefined);
      return;
    }
    if (!loaded || !ready) return;
    const first = messages[0]?.id;
    if (!older || first === undefined || jumpToId >= first) {
      setJumpToId(undefined);
      setError(t.failed);
      return;
    }
    if (first !== jumpCursor.current && frame('HISTORY', { requestId: 'reply-jump', beforeId: first })) {
      jumpCursor.current = first;
    }
  }, [jumpToId, messages, loaded, ready, older, userId, t.failed]);

  useEffect(() => () => window.clearTimeout(highlightTimer.current), []);

  useEffect(() => () => {
    generation.current++;
    searchRequest.current?.abort();
    window.clearTimeout(typing.current);
    const capture = recorder.current;
    capture?.stream.getTracks().forEach(track => track.stop());
    if (capture?.state === 'recording') capture.stop();
  }, []);

  function choose(customer: Customer | Conversation | null) {
    frame('ACTIVITY', { activity: 'IDLE' });
    setParams(customer ? { user: 'userId' in customer ? customer.userId : customer.id } : {});
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

  function finishRecording(action: typeof recordAction.current) {
    const capture = recorder.current;
    if (capture?.state !== 'recording') return;
    recordAction.current = action;
    capture.stop();
  }

  async function record() {
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
      recordAction.current = 'preview';
      const started = performance.now();
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
        if (recordAction.current === 'cancel') return;
        if (recordedBytes > 10 * 1024 * 1024) return setError(t.size);
        if (!recordedBytes) return setError(t.failed);
        const type = capture.mimeType.split(';')[0];
        const extension = type === 'audio/mp4' ? 'm4a' : type === 'audio/ogg' ? 'ogg' : 'webm';
        const duration = Math.max(1, Math.round(performance.now() - started));
        const voice: Attachment = { kind: 'VOICE', file: new File(chunks, `voice-${duration}.${extension}`, { type }),
          requestId: crypto.randomUUID() };
        setAttachment(voice);
        if (recordAction.current === 'send') void uploadAttachment(voice);
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
      const command = { requestId: crypto.randomUUID(), text, replyToId };
      if (frame('SEND_TEXT', command)) {
        pendingText.current = command;
        setSending(true);
      }
      return;
    }
    await uploadAttachment(attachment);
  }

  async function uploadAttachment(attachment: Attachment) {
    const attempt = generation.current;
    setSending(true);
    const body = new FormData();
    body.set('kind', attachment.kind);
    body.set('requestId', attachment.requestId);
    if (userId) body.set('userId', userId);
    if (replyToId) body.set('replyToId', String(replyToId));
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
      setReplyToId(undefined);
      frame('ACTIVITY', { activity: 'IDLE' });
    } catch {
      if (attempt === generation.current) setError(t.failed);
    } finally {
      if (attempt === generation.current) setSending(false);
    }
  }

  const selected = details ?? conversations.find(item => item.userId === userId);
  function profileName(customer: Customer | Conversation) {
    return [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
      customer.username || ('email' in customer ? customer.email : customer.userId);
  }

  const active = Object.values(peerActivities);
  const messagesById = new Map(messages.map(message => [message.id, message]));
  const actionMessage = onBack && actionId ? messagesById.get(actionId) : undefined;
  function quote(id: number) {
    const original = messagesById.get(id);
    if (!original) return labels.quote + ' #' + id;
    if (original.deleted) return labels.deleted;
    return original.text || original.fileName || labels.quote;
  }
  const peerStatus = active.some(value => value.activity === 'RECORDING_VOICE') ? t.recording :
    active.some(value => value.activity === 'TYPING') ? t.typing : '';
  const iconButton = 'grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 disabled:opacity-40';
  const actionButton = 'min-h-11 rounded-xl bg-green-700 px-4 text-white disabled:opacity-40';
  const fullScreen = Boolean(onBack);
  return <main className={fullScreen
    ? 'flex h-dvh flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
    : 'mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-7'}>
    <div className={fullScreen ? 'flex min-h-0 flex-1 flex-col' :
      `grid overflow-hidden rounded-2xl border border-slate-200 bg-white ${admin ? 'md:grid-cols-[18rem_1fr]' : ''}`}>
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
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-green-100 text-sm font-semibold text-green-900">
                {profileName(customer).slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{profileName(customer)}</span>
                <span className="block truncate text-xs text-slate-600">{customer.phone || (customer.username ? '@' + customer.username : '')}</span>
              </span>
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
      {(!admin || userId) ? <section className={fullScreen ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'min-w-0'}>
        <header className="shrink-0 border-b border-slate-200 px-4 py-3">
          {onBack && <button type="button" onClick={onBack} className="float-left mr-3 size-11 rounded-xl bg-slate-100"
            aria-label={language === 'ru' ? 'Назад' : 'Orqaga'}>←</button>}
          {admin && <button className="mb-1 min-h-11 text-green-800 md:hidden" onClick={() => choose(null)}>← {t.back}</button>}
          <h2 className="text-lg font-semibold">{selected ? profileName(selected) : admin ? t.title : t.support}</h2>
          {admin && selected?.phone && <a href={`tel:${selected.phone.replace(/[^+\d]/g, '')}`}
            className="inline-block rounded-full bg-green-50 px-2 py-1 text-sm font-medium text-green-800">{selected.phone}</a>}
          {admin && profileError && !selected && <p role="status" className="text-sm text-slate-600">{t.noUsers}</p>}
          <p className="min-h-5 text-sm text-slate-600" aria-live="polite">{peerStatus || (ready ? t.online : t.offline)}</p>
        </header>
        <div className={`overflow-y-auto overscroll-contain bg-slate-50 px-3 py-3 sm:px-5 ${fullScreen
          ? 'min-h-0 flex-1' : 'h-[48dvh] min-h-48 sm:h-[54dvh]'}`}>
          {older && <button onClick={() => frame('HISTORY', { requestId: 'older', beforeId: messages[0]?.id })}
            disabled={!ready || !!jumpToId} className="mx-auto mb-3 block min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm">{t.older}</button>}
          {loaded && messages.length === 0 && <p className="py-8 text-center text-sm text-slate-600">{t.empty}</p>}
          <ul ref={messageList} className="space-y-2">
            {messages.map(message => {
              const own = message.senderAdmin === admin;
              const reactions = [message.userReaction, message.adminReaction].filter((emoji): emoji is string => !!emoji);
              const myReaction = admin ? message.adminReaction : message.userReaction;
              return <li key={message.id} data-message-id={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div className={`min-w-0 max-w-[88%] rounded-2xl px-3 py-2 transition-shadow sm:max-w-[75%] ${own ? 'bg-green-100' : 'border border-slate-200 bg-white'} ${onBack ? 'select-none' : ''} ${highlightedId === message.id ? 'ring-2 ring-green-600 ring-offset-2' : ''}`}
                  onPointerDown={event => {
                    if (!onBack || message.deleted || !event.isPrimary || event.button !== 0 ||
                        (event.target as Element).closest('button, a, audio')) return;
                    cancelPress();
                    press.current = { x: event.clientX, y: event.clientY, timer: window.setTimeout(() => {
                      press.current = null;
                      suppressClickUntil.current = Date.now() + 700;
                      setActionId(message.id);
                    }, 450) };
                  }}
                  onPointerMove={event => {
                    const start = press.current;
                    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancelPress();
                  }}
                  onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerLeave={cancelPress}
                  onContextMenu={event => {
                    if (!onBack || message.deleted || (event.target as Element).closest('button, a, audio')) return;
                    event.preventDefault();
                    cancelPress();
                    setActionId(message.id);
                  }}
                  onClickCapture={event => {
                    if (Date.now() < suppressClickUntil.current) {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}>
                  {!message.deleted && message.replyToId && <button type="button" onClick={() => {
                    jumpCursor.current = undefined;
                    setJumpToId(message.replyToId ?? undefined);
                  }} className="mb-2 flex w-full min-w-0 items-center gap-2 rounded-lg border-l-2 border-green-600 bg-white/75 px-2 py-1.5 text-left text-xs text-slate-700 active:bg-green-50">
                    <Reply size={14} className="shrink-0 text-green-700" />
                    <span className="truncate">{quote(message.replyToId)}</span>
                  </button>}
                  {message.deleted ? <p className="text-sm italic text-slate-600">{labels.deleted}</p> :
                    message.kind === 'TEXT' ? <p className="whitespace-pre-wrap break-words">{message.text}</p> :
                    <Media message={message} request={request} language={language} />}
                  {!message.deleted && reactions.length > 0 &&
                    <div className="mt-2 flex flex-wrap gap-1.5" aria-label={labels.react}>
                      {[...new Set(reactions)].map(emoji => <span key={emoji}
                        className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-sm leading-none ${emoji === myReaction
                          ? 'border-green-300 bg-green-50 text-green-800' : 'border-slate-200 bg-white text-slate-700'}`}>
                        {emoji}{reactions.length === 2 && reactions[0] === reactions[1] && <span className="text-xs font-medium">2</span>}
                      </span>)}
                    </div>}
                  <p className="mt-1 text-right text-xs text-slate-600">
                    {new Date(message.createdAt).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    {own && !message.deleted && ` · ${message.readAt ? t.read : t.sent}`}
                  </p>
                  {onBack && !message.deleted && <button type="button"
                    className="sr-only focus:not-sr-only" onClick={() => setActionId(message.id)}>{labels.actions}</button>}
                  {!onBack && !message.deleted && <div className="flex flex-wrap items-center gap-x-3">
                    <button type="button" disabled={sending} className="min-h-8 text-xs text-green-800 disabled:opacity-40"
                      onClick={() => { setReplyToId(message.id); setActionId(undefined); }}>{labels.reply}</button>
                    <button type="button" className="min-h-8 text-xs text-green-800"
                      aria-expanded={actionId === message.id} onClick={() =>
                        setActionId(current => current === message.id ? undefined : message.id)}>{labels.react}</button>
                    {message.senderId === actorId && <button type="button" disabled={!ready || sending}
                      className="min-h-8 text-xs text-red-700 disabled:opacity-40"
                      onClick={() => { if (window.confirm(labels.confirm)) frame('DELETE_MESSAGE', { messageId: message.id }); }}>
                      {labels.remove}
                    </button>}
                  </div>}
                  {!onBack && !message.deleted && actionId === message.id && <div className="flex flex-wrap">
                    {REACTIONS.map(emoji => {
                      const selected = (admin ? message.adminReaction : message.userReaction) === emoji;
                      return <button key={emoji} type="button" aria-pressed={selected} disabled={!ready}
                        className={`size-10 rounded-lg ${selected ? 'bg-white ring-1 ring-green-600' : ''}`}
                        onClick={() => {
                          frame('REACT', { messageId: message.id, emoji: selected ? null : emoji });
                          setActionId(undefined);
                        }}>{emoji}</button>;
                    })}
                  </div>}
                </div>
              </li>;
            })}
          </ul>
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="shrink-0 space-y-2 border-t border-slate-200 p-3">
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {replyToId && <div className="flex items-center gap-2 rounded-lg border-l-2 border-green-600 bg-green-50 px-3 py-1">
            <p className="min-w-0 flex-1 truncate text-sm">{quote(replyToId)}</p>
            <button type="button" className={iconButton} disabled={sending} onClick={() => setReplyToId(undefined)}
              aria-label={t.cancel}><X size={18} /></button>
          </div>}
          {recording && <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-2">
            <button type="button" className={iconButton} onClick={() => finishRecording('cancel')} aria-label={t.cancel}>
              <Trash2 size={18} className="text-red-700" />
            </button>
            <div className="min-w-0 flex-1 px-1">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2 shrink-0 animate-pulse rounded-full bg-red-600 motion-reduce:animate-none" />
                <time className="font-semibold tabular-nums text-red-900">{voiceTime(recordingSeconds)}</time>
              </div>
              <p role="status" className="truncate text-xs text-red-800">{t.recording}</p>
            </div>
            <button type="button" className={iconButton} onClick={() => finishRecording('preview')} aria-label={t.stop}>
              <Square size={17} fill="currentColor" className="text-red-700" />
            </button>
            <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full bg-green-700 text-white disabled:opacity-40"
              disabled={!ready} onClick={() => finishRecording('send')} aria-label={t.send}><Send size={18} /></button>
          </div>}
          {attachment && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1">
            {attachment.kind === 'IMAGE' && <ChatImage file={attachment.file} name={attachment.file.name}
              className="size-16 shrink-0 rounded-lg object-cover" />}
            {attachment.kind === 'VOICE' ? <div className="min-w-0 flex-1">
              {voicePreviewUrl && <ChatVoicePlayer url={voicePreviewUrl} language={language}
                durationHint={Number(attachment.file.name.match(/^voice-(\d+)\./)?.[1] ?? 0) / 1000} />}
            </div> : <span className="min-w-0 flex-1 truncate">{attachment.file.name}</span>}
            <button type="button" className={iconButton} disabled={sending} onClick={() => setAttachment(null)} aria-label={t.cancel}><X size={18} /></button>
          </div>}
          {!recording && <div className="flex items-end gap-1.5 sm:gap-2">
            <input type="file" accept="image/*,.heic,.heif,.avif,.tif,.tiff,.svg,.psd,.jxl,.jp2,.dng,.cr2,.cr3,.nef,.arw,.raf,.rw2,.orf" ref={input} hidden onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setError('');
              setAttachment({ file, kind: 'IMAGE', requestId: crypto.randomUUID() });
            }} />
            <button type="button" className={iconButton} disabled={sending || recording || requestingMic} onClick={() => input.current?.click()} aria-label={t.image}><ImagePlus size={19} /></button>
            <button type="button" className={iconButton} disabled={sending || requestingMic || !!attachment} onClick={() => void record()} aria-label={t.voice}>
              <Mic size={19} />
            </button>
            <textarea className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5"
              rows={1} aria-label={t.write} placeholder={t.write} maxLength={4000} value={draft}
              disabled={sending || recording || !!attachment} onChange={event => changeDraft(event.target.value)} />
            <button className="grid size-11 shrink-0 place-items-center rounded-xl bg-green-700 text-white disabled:opacity-40"
              disabled={!ready || sending || recording || (!draft.trim() && !attachment)} aria-label={t.send}><Send size={18} /></button>
          </div>}
        </form>
      </section> : <section className="hidden min-h-96 place-content-center justify-items-center gap-3 text-slate-600 md:grid">
        <MessageCircle size={32} /><p>{t.choose}</p>
      </section>}
    </div>
    {onBack && <Drawer placement="bottom" open={!!actionMessage && !actionMessage.deleted}
      title={labels.actions} onClose={() => setActionId(undefined)}
      height="auto" styles={{ body: { paddingBottom: 'max(24px, env(safe-area-inset-bottom))', maxHeight: '65dvh' } }}>
      {actionMessage && <div className="mx-auto max-w-md space-y-3">
        <p className="truncate rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{quote(actionMessage.id)}</p>
        <div className="grid grid-cols-6 gap-1 rounded-2xl bg-slate-50 p-2 sm:grid-cols-8" role="group" aria-label={labels.react}>
          {REACTIONS.map(emoji => {
            const selected = (admin ? actionMessage.adminReaction : actionMessage.userReaction) === emoji;
            return <button key={emoji} type="button" aria-pressed={selected} disabled={!ready}
              className={`min-h-11 rounded-xl text-xl disabled:opacity-40 ${selected ? 'bg-green-100 ring-1 ring-green-600' : 'active:bg-slate-200'}`}
              onClick={() => {
                frame('REACT', { messageId: actionMessage.id, emoji: selected ? null : emoji });
                setActionId(undefined);
              }}>{emoji}</button>;
          })}
        </div>
        <button type="button" disabled={sending} className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-green-50 px-3 text-green-800"
          onClick={() => { setReplyToId(actionMessage.id); setActionId(undefined); }}>
          <Reply size={19} />{labels.reply}
        </button>
        {actionMessage.senderId === actorId && <button type="button" disabled={!ready || sending}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-red-50 px-3 text-red-700 disabled:opacity-40"
          onClick={() => {
            if (window.confirm(labels.confirm)) {
              frame('DELETE_MESSAGE', { messageId: actionMessage.id });
              setActionId(undefined);
            }
          }}><Trash2 size={19} />{labels.remove}</button>}
      </div>}
    </Drawer>}
  </main>;
}
