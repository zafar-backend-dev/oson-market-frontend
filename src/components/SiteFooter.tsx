import { canOfferAndroidDownload } from '../utils/androidDownload';
import { Link } from 'react-router-dom';
import { ANDROID_APK_URL } from '../constants';
import { translations } from '../i18n/translations';
import type { Language } from '../types/auth';
import { SiteLogo } from './SiteLogo';

interface SiteFooterProps {
  language: Language;
  homePath?: string;
}

export function SiteFooter({ language, homePath = '/' }: SiteFooterProps) {
  const t = translations[language];
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#e6e4dd] mt-auto">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          to={homePath}
          aria-label={t.brandName}
          className="inline-flex items-center gap-2.5 shrink-0"
        >
          <SiteLogo language={language} size="sm" />
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-600">
          <Link
            to="/"
            className="rounded px-1 py-0.5 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2"
          >
            {t.catalog.navCatalog}
          </Link>
          <Link
            to="/branches"
            className="rounded px-1 py-0.5 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2"
          >
            {t.catalog.navBranches}
          </Link>
          <Link
            to="/about"
            className="rounded px-1 py-0.5 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2"
          >
            {t.catalog.navAbout}
          </Link>
        </nav>
        {ANDROID_APK_URL && canOfferAndroidDownload() && <a href={ANDROID_APK_URL} download
          className="rounded px-1 py-0.5 text-sm font-medium text-green-700 hover:text-green-900">
          {language === 'ru' ? 'Скачать приложение' : 'Ilovani yuklab olish'}
        </a>}

        <div className="text-xs text-slate-500 tabular-nums">
          © {currentYear} {t.brandName}
        </div>
      </div>
    </footer>
  );
}
