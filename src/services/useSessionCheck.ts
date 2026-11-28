import { useEffect } from 'react';

export function useSessionCheck(token: string | undefined, check: (token: string, signal: AbortSignal) => Promise<void>) {
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let running = false;
    const verify = async () => {
      if (running || controller.signal.aborted) return;
      running = true;
      try {
        await check(token, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]));
      } catch {
        // The next lifecycle event or interval retries transient failures.
      } finally {
        running = false;
      }
    };
    const visible = () => { if (document.visibilityState === 'visible') void verify(); };
    const events = ['online', 'focus', 'pageshow', 'oson-session-check'];
    events.forEach(event => window.addEventListener(event, verify));
    document.addEventListener('visibilitychange', visible);
    const timer = window.setInterval(verify, 15000);
    void verify();
    return () => {
      controller.abort();
      window.clearInterval(timer);
      events.forEach(event => window.removeEventListener(event, verify));
      document.removeEventListener('visibilitychange', visible);
    };
  }, [token, check]);
}
