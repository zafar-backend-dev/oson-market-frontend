import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { buildSiteLogoUrl } from '../services/siteLogoApi';

interface SiteLogoContextValue {
  logoVersion: string | null;
  logoUrl: string;
  notifyLogoUpdated: (updatedAt?: string | null) => void;
}

const SiteLogoContext = createContext<SiteLogoContextValue | null>(null);

function syncDocumentFavicon(href: string): void {
  if (typeof document === 'undefined' || !document.head) return;

  const upsertIconLink = (rel: string) => {
    let link = document.head.querySelector<HTMLLinkElement>(
      `link[rel="${rel}"][data-oson-site-logo="true"]`,
    );
    if (!link) {
      link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    }
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.setAttribute('data-oson-site-logo', 'true');
    link.type = 'image/png';
    link.href = href;
  };

  upsertIconLink('icon');
  upsertIconLink('shortcut icon');
}

export function SiteLogoProvider({ children }: { children: ReactNode }) {
  const [logoVersion, setLogoVersion] = useState<string | null>(null);

  const logoUrl = useMemo(() => buildSiteLogoUrl(logoVersion), [logoVersion]);

  useEffect(() => {
    syncDocumentFavicon(logoUrl);
  }, [logoUrl]);

  const notifyLogoUpdated = useCallback((updatedAt?: string | null) => {
    const clean = typeof updatedAt === 'string' && updatedAt.trim() ? updatedAt.trim() : null;
    setLogoVersion(clean ?? String(Date.now()));
  }, []);

  const value = useMemo<SiteLogoContextValue>(
    () => ({
      logoVersion,
      logoUrl,
      notifyLogoUpdated,
    }),
    [logoVersion, logoUrl, notifyLogoUpdated],
  );

  return <SiteLogoContext.Provider value={value}>{children}</SiteLogoContext.Provider>;
}

export function useSiteLogo(): SiteLogoContextValue {
  const ctx = useContext(SiteLogoContext);
  if (!ctx) {
    throw new Error('useSiteLogo must be used within SiteLogoProvider');
  }
  return ctx;
}
