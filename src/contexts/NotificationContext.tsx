import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { showOrderAlert } from '../services/orderAlerts';
import { startOrderPush } from '../services/orderPush';
import { getOrderStatusLabel } from '../utils/orderStatus';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { API_BASE_URL } from '../constants';
import { AuthApiError } from '../services/authApi';
import { orderApi } from '../services/orderApi';
import { sessionManager } from '../services/sessionManager';
import type { Language } from '../types/auth';
import type { OrderNotificationItem, OrderPageMetadata } from '../types/order';

const FALLBACK_POLL_INTERVAL_MS = 15_000;
const WS_AUTH_TIMEOUT_MS = 10_000;
const WS_BASE_RECONNECT_MS = 1_000;
const WS_MAX_RECONNECT_MS = 30_000;
const NOTIFICATIONS_PAGE_SIZE = 20;

export interface OrderLiveUpdateSignal {
  type: 'ready' | 'event' | 'sync';
  orderId?: string;
  notificationId?: string;
  status?: string;
  action?: string;
  createdAt?: string;
}

type OrderLiveUpdateListener = (signal: OrderLiveUpdateSignal) => void;

interface NotificationContextValue {
  unreadCount: number;
  items: OrderNotificationItem[];
  pageMeta: OrderPageMetadata | null;
  loading: boolean;
  loadingMore: boolean;
  errorMessage: string | null;
  drawerOpen: boolean;
  isSocketReady: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  refreshUnreadCount: () => Promise<void>;
  loadNotifications: (page?: number, append?: boolean) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  markNotificationAsRead: (notification: OrderNotificationItem) => Promise<void>;
  subscribeOrderLiveUpdate: (listener: OrderLiveUpdateListener) => () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function buildOrdersWsUrl(): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  if (base.startsWith('https://')) {
    return `wss://${base.slice('https://'.length)}/ws/orders`;
  }
  if (base.startsWith('http://')) {
    return `ws://${base.slice('http://'.length)}/ws/orders`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/orders`;
}

interface NotificationProviderProps {
  accessToken: string | null;
  isAuthenticated: boolean;
  language: Language;
  onUnauthorized: (message?: string) => void;
  children: ReactNode;
}

export function NotificationProvider({
  accessToken,
  isAuthenticated,
  language,
  onUnauthorized,
  children,
}: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<OrderNotificationItem[]>([]);
  const [pageMeta, setPageMeta] = useState<OrderPageMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSocketReady, setIsSocketReady] = useState(false);

  const hasLoadedListRef = useRef(false);
  const drawerOpenRef = useRef(false);
  drawerOpenRef.current = drawerOpen;

  const hasToken = Boolean(accessToken);
  const languageRef = useRef(language);
  languageRef.current = language;
  useEffect(() => {
    if (!isAuthenticated || !hasToken) return;
    return startOrderPush(language, () => sessionManager.getCurrentAccessToken());
  }, [isAuthenticated, hasToken, language]);
  const activeAuthRef = useRef<{ token: string | null; authed: boolean }>({
    token: accessToken,
    authed: isAuthenticated,
  });
  activeAuthRef.current = { token: accessToken, authed: isAuthenticated };

  const liveListenersRef = useRef<Set<OrderLiveUpdateListener>>(new Set());
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  const wsRef = useRef<WebSocket | null>(null);
  const authTimeoutRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  const emitLiveUpdate = useCallback((signal: OrderLiveUpdateSignal) => {
    for (const listener of liveListenersRef.current) {
      try {
        listener(signal);
      } catch {
        // Isolate individual listener errors
      }
    }
  }, []);

  const subscribeOrderLiveUpdate = useCallback((listener: OrderLiveUpdateListener) => {
    liveListenersRef.current.add(listener);
    return () => {
      liveListenersRef.current.delete(listener);
    };
  }, []);

  const clearSocketTimers = useCallback(() => {
    if (authTimeoutRef.current !== null) {
      window.clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const closeActiveSocket = useCallback(() => {
    clearSocketTimers();
    const socket = wsRef.current;
    wsRef.current = null;
    if (socket) {
      intentionalCloseRef.current = true;
      try {
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close(1000, 'Client closing');
        }
      } catch {
        // Ignore close errors
      }
    }
    setIsSocketReady(false);
  }, [clearSocketTimers]);

  const resetAllState = useCallback(() => {
    closeActiveSocket();
    seenNotificationIdsRef.current.clear();
    reconnectAttemptRef.current = 0;
    setUnreadCount(0);
    setItems([]);
    setPageMeta(null);
    setLoading(false);
    setLoadingMore(false);
    setErrorMessage(null);
    setDrawerOpen(false);
    hasLoadedListRef.current = false;
  }, [closeActiveSocket]);

  const refreshUnreadCount = useCallback(async () => {
    const token = sessionManager.getCurrentAccessToken() ?? activeAuthRef.current.token;
    if (!activeAuthRef.current.authed || !token) return;
    const startEpoch = sessionManager.getAuthEpoch();

    try {
      const res = await orderApi.getUnreadNotificationCount(token, language);
      if (!activeAuthRef.current.authed || sessionManager.getAuthEpoch() !== startEpoch) return;
      const nextCount = typeof res?.count === 'number' && Number.isFinite(res.count) ? res.count : 0;
      setUnreadCount(Math.max(0, nextCount));
    } catch (error) {
      if (!activeAuthRef.current.authed || sessionManager.getAuthEpoch() !== startEpoch) return;
      if (error instanceof AuthApiError && error.status === 401) {
        onUnauthorized(error.message);
      }
    }
  }, [language, onUnauthorized]);

  const loadNotifications = useCallback(
    async (targetPage = 0, append = false) => {
      const token = sessionManager.getCurrentAccessToken() ?? activeAuthRef.current.token;
      if (!activeAuthRef.current.authed || !token) return;
      const startEpoch = sessionManager.getAuthEpoch();

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);

      try {
        const res = await orderApi.listNotifications(
          token,
          { page: targetPage, size: NOTIFICATIONS_PAGE_SIZE },
          language,
        );
        if (!activeAuthRef.current.authed || sessionManager.getAuthEpoch() !== startEpoch) return;

        const content = Array.isArray(res.content) ? res.content : [];
        hasLoadedListRef.current = true;
        setPageMeta(res.page ?? null);
        setItems((prev) => {
          if (!append) return content;
          const seen = new Set(prev.map((entry) => entry.id));
          return [...prev, ...content.filter((entry) => !seen.has(entry.id))];
        });
      } catch (error) {
        if (!activeAuthRef.current.authed || sessionManager.getAuthEpoch() !== startEpoch) return;
        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            onUnauthorized(error.message);
            return;
          }
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            language === 'ru'
              ? 'Не удалось загрузить уведомления.'
              : 'Bildirishnomalarni yuklab bo‘lmadi.',
          );
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [language, onUnauthorized],
  );

  // Refs to latest callbacks for WebSocket handlers without reconnecting on language change
  const refreshUnreadCountRef = useRef(refreshUnreadCount);
  refreshUnreadCountRef.current = refreshUnreadCount;
  const loadNotificationsRef = useRef(loadNotifications);
  loadNotificationsRef.current = loadNotifications;

  // Reset immediately on logout / unauthenticated state
  useEffect(() => {
    if (!isAuthenticated || !hasToken) {
      resetAllState();
    }
  }, [isAuthenticated, hasToken, resetAllState]);

  // Initial unread count on session open & reload on language switch
  useEffect(() => {
    if (!isAuthenticated || !hasToken) return;
    void refreshUnreadCount();
    if (drawerOpen || hasLoadedListRef.current) {
      void loadNotifications(0, false);
    }
  }, [isAuthenticated, hasToken, language, drawerOpen, refreshUnreadCount, loadNotifications]);

  // Authenticated WebSocket /ws/orders lifecycle with backoff & tab recovery
  useEffect(() => {
    if (!isAuthenticated || !hasToken) {
      closeActiveSocket();
      return;
    }

    let disposed = false;

    const connectSocket = () => {
      if (disposed || !activeAuthRef.current.authed) return;
      const latestToken = sessionManager.getCurrentAccessToken() ?? activeAuthRef.current.token;
      if (!latestToken) return;

      const existing = wsRef.current;
      if (
        existing &&
        (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      clearSocketTimers();
      intentionalCloseRef.current = false;

      let socket: WebSocket;
      try {
        socket = new WebSocket(buildOrdersWsUrl());
      } catch {
        setIsSocketReady(false);
        scheduleReconnect();
        return;
      }

      wsRef.current = socket;

      socket.onopen = () => {
        if (disposed || wsRef.current !== socket) return;
        const tokenForAuth = sessionManager.getCurrentAccessToken() ?? latestToken;
        try {
          socket.send(
            JSON.stringify({
              type: 'AUTH',
              accessToken: tokenForAuth,
            }),
          );
        } catch {
          socket.close();
          return;
        }

        authTimeoutRef.current = window.setTimeout(() => {
          if (disposed || wsRef.current !== socket) return;
          setIsSocketReady(false);
          try {
            socket.close(4000, 'Auth timeout');
          } catch {
            // Ignore close errors
          }
        }, WS_AUTH_TIMEOUT_MS);
      };

      socket.onmessage = (event) => {
        if (disposed || wsRef.current !== socket) return;
        if (typeof event.data !== 'string') return;

        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = JSON.parse(event.data) as Record<string, unknown>;
        } catch {
          return;
        }
        if (!parsed || typeof parsed.type !== 'string') return;

        if (parsed.type === 'READY') {
          if (authTimeoutRef.current !== null) {
            window.clearTimeout(authTimeoutRef.current);
            authTimeoutRef.current = null;
          }
          reconnectAttemptRef.current = 0;
          setIsSocketReady(true);
          void refreshUnreadCountRef.current();
          if (drawerOpenRef.current || hasLoadedListRef.current) {
            void loadNotificationsRef.current(0, false);
          }
          emitLiveUpdate({ type: 'ready' });
          return;
        }

        if (parsed.type === 'ORDER_CHANGED') {
          emitLiveUpdate({ type: 'event', orderId: typeof parsed.orderId === 'string' ? parsed.orderId : undefined });
          return;
        }

        if (parsed.type === 'ORDER_STATUS_CHANGED') {
          const notificationId =
            typeof parsed.notificationId === 'string' ? parsed.notificationId : undefined;
          if (notificationId) {
            if (seenNotificationIdsRef.current.has(notificationId)) {
              return;
            }
            seenNotificationIdsRef.current.add(notificationId);
            if (typeof parsed.status === 'string' && typeof parsed.orderId === 'string') {
              const lang = languageRef.current;
              void showOrderAlert(parsed.orderId, getOrderStatusLabel(parsed.status, lang), lang, notificationId).catch(() => {});
            }
            if (seenNotificationIdsRef.current.size > 500) {
              const oldest = seenNotificationIdsRef.current.values().next().value;
              if (oldest) seenNotificationIdsRef.current.delete(oldest);
            }
          }

          void refreshUnreadCountRef.current();
          if (drawerOpenRef.current || hasLoadedListRef.current) {
            void loadNotificationsRef.current(0, false);
          }

          emitLiveUpdate({
            type: 'event',
            notificationId,
            orderId: typeof parsed.orderId === 'string' ? parsed.orderId : undefined,
            status: typeof parsed.status === 'string' ? parsed.status : undefined,
            action: typeof parsed.action === 'string' ? parsed.action : undefined,
            createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : undefined,
          });
        }
      };

      socket.onerror = () => {
        if (disposed || wsRef.current !== socket) return;
        setIsSocketReady(false);
      };

      socket.onclose = event => {
        if (event.code === 1008) window.dispatchEvent(new Event("oson-session-check"));
        if (authTimeoutRef.current !== null) {
          window.clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
        setIsSocketReady(false);

        if (disposed || intentionalCloseRef.current || !activeAuthRef.current.authed) {
          return;
        }
        scheduleReconnect();
      };
    };

    function scheduleReconnect() {
      if (disposed || reconnectTimerRef.current !== null || !activeAuthRef.current.authed) return;
      const attempt = reconnectAttemptRef.current;
      reconnectAttemptRef.current = Math.min(attempt + 1, 6);
      const jitter = Math.floor(Math.random() * 400);
      const delay = Math.min(WS_MAX_RECONNECT_MS, WS_BASE_RECONNECT_MS * 2 ** attempt) + jitter;
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connectSocket();
      }, delay);
    }

    connectSocket();

    const handleTabReturn = (nativeResume: boolean) => {
      if (disposed || (!nativeResume && document.visibilityState !== 'visible')) return;
      void refreshUnreadCountRef.current();
      if (drawerOpenRef.current || hasLoadedListRef.current) {
        void loadNotificationsRef.current(0, false);
      }
      emitLiveUpdate({ type: 'sync' });

      const current = wsRef.current;
      if (
        !current ||
        (current.readyState !== WebSocket.OPEN && current.readyState !== WebSocket.CONNECTING)
      ) {
        if (reconnectTimerRef.current !== null) {
          window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        reconnectAttemptRef.current = 0;
        connectSocket();
      }
    };

    const nativeResume = Capacitor.isNativePlatform()
      ? CapacitorApp.addListener('resume', () => handleTabReturn(true))
      : null;
    const handleBrowserReturn = () => handleTabReturn(false);
    window.addEventListener('focus', handleBrowserReturn);
    document.addEventListener('visibilitychange', handleBrowserReturn);

    return () => {
      disposed = true;
      if (nativeResume) void nativeResume.then(handle => handle.remove()).catch(() => {});
      window.removeEventListener('focus', handleBrowserReturn);
      document.removeEventListener('visibilitychange', handleBrowserReturn);
      closeActiveSocket();
    };
  }, [isAuthenticated, hasToken, clearSocketTimers, closeActiveSocket, emitLiveUpdate]);

  // Temporary polling fallback while WebSocket is down
  useEffect(() => {
    if (!isAuthenticated || !hasToken || isSocketReady) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
        if (drawerOpenRef.current) {
          void loadNotifications(0, false);
        }
        emitLiveUpdate({ type: 'sync' });
      }
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, hasToken, isSocketReady, refreshUnreadCount, loadNotifications, emitLiveUpdate]);

  const openDrawer = useCallback(() => {
    if (!activeAuthRef.current.authed || !activeAuthRef.current.token) return;
    setDrawerOpen(true);
    void refreshUnreadCount();
    void loadNotifications(0, false);
  }, [loadNotifications, refreshUnreadCount]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const markNotificationAsRead = useCallback(
    async (notification: OrderNotificationItem) => {
      const token = sessionManager.getCurrentAccessToken() ?? activeAuthRef.current.token;
      if (!activeAuthRef.current.authed || !token) return;
      if (notification.readAt !== null) return;
      const startEpoch = sessionManager.getAuthEpoch();

      const nowIso = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, readAt: nowIso } : item,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await orderApi.markNotificationRead(token, notification.id, language);
        if (!activeAuthRef.current.authed || sessionManager.getAuthEpoch() !== startEpoch) return;
        await Promise.all([refreshUnreadCount(), loadNotifications(0, false)]);
      } catch (error) {
        if (!activeAuthRef.current.authed || sessionManager.getAuthEpoch() !== startEpoch) return;
        if (error instanceof AuthApiError && error.status === 401) {
          onUnauthorized(error.message);
        }
      }
    },
    [language, loadNotifications, onUnauthorized, refreshUnreadCount],
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    const token = sessionManager.getCurrentAccessToken() ?? activeAuthRef.current.token;
    if (!activeAuthRef.current.authed || !token) return;
    const epoch = sessionManager.getAuthEpoch();
    try {
      await orderApi.markAllNotificationsRead(token, language);
      if (!activeAuthRef.current.authed || sessionManager.getAuthEpoch() !== epoch) return;
      await Promise.all([refreshUnreadCount(), loadNotifications(0, false)]);
    } catch (error) {
      if (!activeAuthRef.current.authed || sessionManager.getAuthEpoch() !== epoch) return;
      if (error instanceof AuthApiError && error.status === 401) {
        onUnauthorized(error.message);
      } else {
        throw error;
      }
    }
  }, [language, loadNotifications, onUnauthorized, refreshUnreadCount]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      unreadCount,
      items,
      pageMeta,
      loading,
      loadingMore,
      errorMessage,
      drawerOpen,
      isSocketReady,
      openDrawer,
      closeDrawer,
      refreshUnreadCount,
      loadNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      subscribeOrderLiveUpdate,
    }),
    [
      unreadCount,
      items,
      pageMeta,
      loading,
      loadingMore,
      errorMessage,
      drawerOpen,
      isSocketReady,
      openDrawer,
      closeDrawer,
      refreshUnreadCount,
      loadNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      subscribeOrderLiveUpdate,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
