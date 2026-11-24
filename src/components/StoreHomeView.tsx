import { useState } from 'react';
import { Button } from 'antd';
import {
  ArrowRight,
  FolderTree,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  User as UserIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../i18n/translations';
import type { Language, UserProfile } from '../types/auth';
import { StoreHeader } from './StoreHeader';

const BRAND_IMAGE_SRC = '/src/assets/images/oson_market_brand_1795278421395.jpg';

interface StoreHomeViewProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile;
  onLogout: () => void;
}

export function StoreHomeView({
  language,
  onLanguageChange,
  profile,
  onLogout,
}: StoreHomeViewProps) {
  const t = translations[language];
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);

  const firstName = profile.firstName?.trim() || `@${profile.username}`;

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-900 flex flex-col">
      <StoreHeader
        language={language}
        onLanguageChange={onLanguageChange}
        profile={profile}
        profileComplete
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        {/* Welcome Hero Card */}
        <section className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#15803d]">
              <Store className="w-4 h-4 shrink-0" />
              <span>{t.brandName}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              {t.workspace.storeHome.welcomeTitle}, {firstName}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              {t.workspace.storeHome.welcomeSubtitle}
            </p>

            <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-4 space-y-1">
              <div className="text-sm font-semibold text-[#166534]">
                {t.workspace.storeHome.readyBannerTitle}
              </div>
              <p className="text-xs sm:text-sm text-[#15803d] leading-relaxed">
                {t.workspace.storeHome.readyBannerSubtitle}
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden bg-[#f7f6f2] border border-[#e6e4dd]">
              {!imageFailed ? (
                <img
                  src={BRAND_IMAGE_SRC}
                  alt={t.heroImageAlt}
                  referrerPolicy="no-referrer"
                  onError={() => setImageFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                  <ShoppingBag className="w-10 h-10 mb-2 text-[#16a34a]" />
                  <span className="text-sm font-medium text-slate-700">{t.brandName}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Working Store Account Actions */}
        <section
          className={`grid grid-cols-1 md:grid-cols-2 ${
            profile.role === 'ADMIN' ? 'lg:grid-cols-3' : ''
          } gap-4 sm:gap-6`}
        >
          <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center">
                <UserIcon className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                {t.workspace.storeHome.openProfileTitle}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.workspace.storeHome.openProfileDesc}
              </p>
            </div>

            <div>
              <Button
                type="primary"
                size="large"
                onClick={() => navigate('/profile')}
                className="!w-full sm:!w-auto !min-h-[44px] !inline-flex !items-center !justify-center !gap-2"
              >
                <span>{t.workspace.storeHome.openProfileAction}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                {t.workspace.storeHome.openSecurityTitle}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t.workspace.storeHome.openSecurityDesc}
              </p>
            </div>

            <div>
              <Button
                type="default"
                size="large"
                onClick={() => navigate('/security')}
                className="!w-full sm:!w-auto !min-h-[44px] !inline-flex !items-center !justify-center !gap-2"
              >
                <span>{t.workspace.storeHome.openSecurityAction}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {profile.role === 'ADMIN' && (
            <>
              <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center">
                    <FolderTree className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                    {t.workspace.storeHome.openCategoriesTitle}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {t.workspace.storeHome.openCategoriesDesc}
                  </p>
                </div>

                <div>
                  <Button
                    type="default"
                    size="large"
                    onClick={() => navigate('/admin/categories')}
                    className="!w-full sm:!w-auto !min-h-[44px] !inline-flex !items-center !justify-center !gap-2"
                  >
                    <span>{t.workspace.storeHome.openCategoriesAction}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center">
                    <Tag className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                    {t.workspace.storeHome.openBrandsTitle}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {t.workspace.storeHome.openBrandsDesc}
                  </p>
                </div>

                <div>
                  <Button
                    type="default"
                    size="large"
                    onClick={() => navigate('/admin/brands')}
                    className="!w-full sm:!w-auto !min-h-[44px] !inline-flex !items-center !justify-center !gap-2"
                  >
                    <span>{t.workspace.storeHome.openBrandsAction}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-white border border-[#e6e4dd] rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                    {t.workspace.storeHome.openProductsTitle}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {t.workspace.storeHome.openProductsDesc}
                  </p>
                </div>

                <div>
                  <Button
                    type="default"
                    size="large"
                    onClick={() => navigate('/admin/products')}
                    className="!w-full sm:!w-auto !min-h-[44px] !inline-flex !items-center !justify-center !gap-2"
                  >
                    <span>{t.workspace.storeHome.openProductsAction}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
