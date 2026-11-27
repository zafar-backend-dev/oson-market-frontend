import { canOfferAndroidDownload } from '../utils/androidDownload';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { Button, Drawer } from 'antd';
import { Capacitor } from '@capacitor/core';
import { ANDROID_APK_URL } from '../constants';
import {
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  FolderTree,
  Image as ImageIcon,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tag,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useNotifications } from '../contexts/NotificationContext';
import { translations } from '../i18n/translations';
import type { Language, UserProfile } from '../types/auth';
import { LanguageSelector } from './LanguageSelector';
import { SiteLogo } from './SiteLogo';

interface StoreHeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  profile: UserProfile | null;
  profileComplete: boolean;
  onLogout?: () => void;
  onSignIn?: () => void;
}

interface NavItemConfig {
  key: string;
  path: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}

interface AdaptiveNavRowProps {
  items: NavItemConfig[];
  ariaLabel: string;
  moreLabel: string;
  moreAriaLabel: string;
  onNavigate: (path: string) => void;
  variant: 'primary' | 'admin';
  align?: 'center' | 'start';
}

function AdaptiveNavRow({
  items,
  ariaLabel,
  moreLabel,
  moreAriaLabel,
  onNavigate,
  variant,
  align = 'center',
}: AdaptiveNavRowProps) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureItemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const measureMoreRef = useRef<HTMLSpanElement | null>(null);
  const dropdownWrapperRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [visibleCount, setVisibleCount] = useState(items.length);
  const [moreOpen, setMoreOpen] = useState(false);

  const itemButtonClass =
    variant === 'admin'
      ? 'inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2'
      : 'inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2';

  const recomputeVisibleCount = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;

    const gap = 4; // gap-1 = 4px
    const safetyMargin = 4;
    const widths = items.map((_, index) => measureItemRefs.current[index]?.offsetWidth ?? 0);
    const totalAllWidth =
      widths.reduce((sum, w) => sum + w, 0) + Math.max(0, items.length - 1) * gap;

    if (totalAllWidth <= availableWidth - safetyMargin) {
      setVisibleCount((prev) => (prev === items.length ? prev : items.length));
      return;
    }

    const moreWidth = measureMoreRef.current?.offsetWidth ?? 88;
    let usedWidth = 0;
    let fitCount = 0;

    for (let i = 0; i < items.length; i += 1) {
      const nextItemWidth = widths[i];
      const nextUsed = usedWidth + (i > 0 ? gap : 0) + nextItemWidth;
      const reservedForMore = gap + moreWidth;
      if (nextUsed + reservedForMore <= availableWidth - safetyMargin) {
        usedWidth = nextUsed;
        fitCount = i + 1;
      } else {
        break;
      }
    }

    setVisibleCount((prev) => (prev === fitCount ? prev : fitCount));
  }, [items]);

  useLayoutEffect(() => {
    recomputeVisibleCount();
  }, [recomputeVisibleCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      recomputeVisibleCount();
    });
    observer.observe(container);

    const handleWindowResize = () => recomputeVisibleCount();
    window.addEventListener('resize', handleWindowResize);

    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) recomputeVisibleCount();
      });
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [recomputeVisibleCount]);

  const visibleItems = items.slice(0, visibleCount);
  const overflowItems = items.slice(visibleCount);
  const hasActiveOverflow = overflowItems.some((item) => item.active);

  useEffect(() => {
    if (overflowItems.length === 0 && moreOpen) {
      setMoreOpen(false);
    }
  }, [overflowItems.length, moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        dropdownWrapperRef.current &&
        !dropdownWrapperRef.current.contains(event.target as Node)
      ) {
        setMoreOpen(false);
      }
    };

    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [moreOpen]);

  const focusMenuItemAt = (index: number) => {
    if (overflowItems.length === 0) return;
    const bounded = (index + overflowItems.length) % overflowItems.length;
    menuItemRefs.current[bounded]?.focus();
  };

  const handleMoreTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!moreOpen) {
        setMoreOpen(true);
        const activeIdx = overflowItems.findIndex((item) => item.active);
        const targetIdx = activeIdx >= 0 ? activeIdx : 0;
        requestAnimationFrame(() => focusMenuItemAt(targetIdx));
      } else if (event.key === 'ArrowDown') {
        focusMenuItemAt(0);
      } else {
        setMoreOpen(false);
      }
    } else if (event.key === 'Escape' && moreOpen) {
      event.preventDefault();
      setMoreOpen(false);
      moreButtonRef.current?.focus();
    }
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusMenuItemAt(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusMenuItemAt(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusMenuItemAt(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusMenuItemAt(overflowItems.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setMoreOpen(false);
      moreButtonRef.current?.focus();
    } else if (event.key === 'Tab') {
      setMoreOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      {/* Off-flow hidden measurement strip inside overflow-hidden box so page never gets horizontal scroll */}
      <div
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-x-0 top-0 overflow-hidden whitespace-nowrap"
      >
        <div className="inline-flex items-center gap-1">
          {items.map((item, idx) => (
            <span
              key={item.key}
              ref={(el) => {
                measureItemRefs.current[idx] = el;
              }}
              className={itemButtonClass}
            >
              {item.icon}
              <span>{item.label}</span>
            </span>
          ))}
          <span ref={measureMoreRef} className={`${itemButtonClass} gap-1`}>
            <span>{moreLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          </span>
        </div>
      </div>

      {/* Visible single-line navigation items + optional "Yana / Ещё" overflow dropdown */}
      <nav
        aria-label={ariaLabel}
        className={`flex items-center gap-1 min-w-0 ${
          align === 'center' ? 'justify-center' : 'justify-start'
        }`}
      >
        {visibleItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setMoreOpen(false);
              onNavigate(item.path);
            }}
            aria-current={item.active ? 'page' : undefined}
            className={`${itemButtonClass} ${
              item.active
                ? variant === 'admin'
                  ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] font-semibold'
                  : 'bg-[#f0fdf4] text-[#15803d] font-semibold'
                : variant === 'admin'
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-[#f2f0ea]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#f7f6f2]'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        {overflowItems.length > 0 && (
          <div ref={dropdownWrapperRef} className="relative shrink-0">
            <button
              ref={moreButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              aria-controls={menuId}
              aria-label={moreAriaLabel}
              onClick={() => setMoreOpen((prev) => !prev)}
              onKeyDown={handleMoreTriggerKeyDown}
              className={`${itemButtonClass} gap-1 ${
                hasActiveOverflow
                  ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] font-semibold'
                  : moreOpen
                    ? 'bg-[#f7f6f2] text-slate-900 border border-[#e6e4dd]'
                    : variant === 'admin'
                      ? 'text-slate-700 hover:text-slate-900 hover:bg-[#f2f0ea]'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-[#f7f6f2]'
              }`}
            >
              <span>{moreLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                  moreOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {moreOpen && (
              <div
                id={menuId}
                role="menu"
                aria-label={moreAriaLabel}
                className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px] max-w-[280px] rounded-xl border border-[#e6e4dd] bg-white p-1.5 shadow-lg"
              >
                {overflowItems.map((item, idx) => (
                  <button
                    key={item.key}
                    ref={(el) => {
                      menuItemRefs.current[idx] = el;
                    }}
                    type="button"
                    role="menuitem"
                    aria-current={item.active ? 'page' : undefined}
                    onClick={() => {
                      setMoreOpen(false);
                      onNavigate(item.path);
                    }}
                    onKeyDown={(e) => handleMenuKeyDown(e, idx)}
                    className={`w-full flex items-center gap-2.5 px-3 min-h-[40px] rounded-lg text-sm text-left whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-inset ${
                      item.active
                        ? 'bg-[#f0fdf4] text-[#15803d] font-semibold'
                        : 'text-slate-700 hover:bg-[#f7f6f2] hover:text-slate-900 font-medium'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}

export function StoreHeader({
  language,
  onLanguageChange,
  profile,
  profileComplete,
  onLogout,
  onSignIn,
}: StoreHeaderProps) {
  const t = translations[language];
  const th = t.workspace.header;
  const location = useLocation();
  const navigate = useNavigate();
  const { totalQuantity, openDrawer: openCartDrawer } = useCart();
  const { unreadCount, openDrawer: openNotificationsDrawer } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hamburgerButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasDrawerOpenRef = useRef(false);

  const cleanPath = location.pathname.replace(/\/+$/, '') || '/';
  const isCatalogRoute =
    cleanPath === '/' ||
    cleanPath === '/catalog' ||
    cleanPath.startsWith('/products/') ||
    cleanPath.startsWith('/catalog/');
  const isCustomerOrdersRoute = cleanPath === '/orders' || cleanPath.startsWith('/orders/');
  const isTelegramRecipientsRoute = cleanPath === '/admin/orders/telegram-recipients';
  const isAdminOrdersRoute =
    (cleanPath === '/admin/orders' || cleanPath.startsWith('/admin/orders/')) &&
    !isTelegramRecipientsRoute;

  const isBranchesRoute = cleanPath === '/branches' || cleanPath.startsWith('/branches/');
  const isAboutRoute = cleanPath === '/about';

  const isAdmin = profile?.role === 'ADMIN';
  const showAdminSubHeader = Boolean(isAdmin);

  const displayName = profile
    ? profile.firstName || profile.lastName
      ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
      : `@${profile.username}`
    : null;

  const primaryNavItems: NavItemConfig[] = !profile
    ? [
        {
          key: 'catalog',
          path: '/',
          label: t.catalog.navCatalog,
          icon: <Store className="w-4 h-4 shrink-0" />,
          active: isCatalogRoute,
        },
        {
          key: 'branches',
          path: '/branches',
          label: t.catalog.navBranches,
          icon: <MapPin className="w-4 h-4 shrink-0" />,
          active: isBranchesRoute,
        },
        {
          key: 'about',
          path: '/about',
          label: t.catalog.navAbout,
          icon: <FileText className="w-4 h-4 shrink-0" />,
          active: isAboutRoute,
        },
      ]
    : profileComplete
      ? [
          {
            key: 'catalog',
            path: '/',
            label: t.catalog.navCatalog,
            icon: <Store className="w-4 h-4 shrink-0" />,
            active: isCatalogRoute,
          },
          {
            key: 'branches',
            path: '/branches',
            label: t.catalog.navBranches,
            icon: <MapPin className="w-4 h-4 shrink-0" />,
            active: isBranchesRoute,
          },
          {
            key: 'about',
            path: '/about',
            label: t.catalog.navAbout,
            icon: <FileText className="w-4 h-4 shrink-0" />,
            active: isAboutRoute,
          },
          {
            key: 'my-orders',
            path: '/orders',
            label: t.workspace.menuMyOrders,
            icon: <ClipboardList className="w-4 h-4 shrink-0" />,
            active: isCustomerOrdersRoute,
          },
          ...(isAdmin
            ? []
            : [
                {
                  key: 'profile',
                  path: '/profile',
                  label: t.workspace.menuProfile,
                  icon: <UserIcon className="w-4 h-4 shrink-0" />,
                  active: cleanPath === '/profile',
                },
              ]),
          {
            key: 'security',
            path: '/security',
            label: t.workspace.menuSecurity,
            icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
            active: cleanPath === '/security',
          },
        ]
      : [
          {
            key: 'profile',
            path: '/profile',
            label: t.workspace.menuProfile,
            icon: <UserIcon className="w-4 h-4 shrink-0" />,
            active: cleanPath === '/profile',
          },
        ];

  const chatLabel = Capacitor.isNativePlatform() ? (language === 'ru' ? 'Чат' : 'Chat')
    : (language === 'ru' ? 'Чат с администратором' : 'Admin bilan chat');
  if (profile && !isAdmin) {
    primaryNavItems.splice(1, 0, {
      key: 'support-chat',
      path: '/chat',
      label: chatLabel,
      icon: <MessageCircle className="size-4 shrink-0" />,
      active: cleanPath === '/chat',
    });
  }

  if (canOfferAndroidDownload()) {
    primaryNavItems.splice(1, 0, {
      key: 'android-download',
      path: '/download',
      label: language === 'ru' ? 'Скачать приложение' : 'Ilovani yuklab olish',
      icon: <Download className="w-4 h-4 shrink-0" />,
      active: false,
    });
  }

  const adminNavItems: NavItemConfig[] = isAdmin
    ? [
        {
          key: 'admin-statistics',
          path: '/admin/statistics',
          label: t.workspace.menuAdminStatistics,
          icon: <BarChart3 className="w-4 h-4 shrink-0" />,
          active: cleanPath === '/admin/statistics',
        },
        ...(!Capacitor.isNativePlatform() ? [{
          key: 'admin-chat',
          path: '/admin/chat',
          label: language === 'ru' ? 'Сообщения' : 'Xabarlar',
          icon: <MessageCircle className="w-4 h-4 shrink-0" />,
          active: cleanPath === '/admin/chat',
        }] : []),
        {
          key: 'admin-categories',
          path: '/admin/categories',
          label: t.workspace.menuCategories,
          icon: <FolderTree className="w-4 h-4 shrink-0" />,
          active: cleanPath === '/admin/categories',
        },
        {
          key: 'admin-brands',
          path: '/admin/brands',
          label: t.workspace.menuBrands,
          icon: <Tag className="w-4 h-4 shrink-0" />,
          active: cleanPath === '/admin/brands',
        },
        {
          key: 'admin-products',
          path: '/admin/products',
          label: t.workspace.menuProducts,
          icon: <Package className="w-4 h-4 shrink-0" />,
          active: cleanPath === '/admin/products' || cleanPath.startsWith('/admin/products/'),
        },
        {
          key: 'admin-orders',
          path: '/admin/orders',
          label: t.workspace.menuAdminOrders,
          icon: <ClipboardList className="w-4 h-4 shrink-0" />,
          active: isAdminOrdersRoute,
        },
        {
          key: 'admin-branches',
          path: '/admin/branches',
          label: t.workspace.menuBranches,
          icon: <MapPin className="w-4 h-4 shrink-0" />,
          active: cleanPath === '/admin/branches' || cleanPath.startsWith('/admin/branches/'),
        },
        {
          key: 'admin-users',
          path: '/admin/users',
          label: t.workspace.menuAdminUsers,
          icon: <Users className="w-4 h-4 shrink-0" />,
          active: cleanPath === '/admin/users',
        },
        {
          key: 'admin-telegram-recipients',
          path: '/admin/orders/telegram-recipients',
          label: t.workspace.menuTelegramRecipients,
          icon: <Bell className="w-4 h-4 shrink-0" />,
          active: isTelegramRecipientsRoute,
        },
        {
          key: 'admin-site-logo',
          path: '/admin/site-logo',
          label: t.workspace.menuSiteLogo,
          icon: <ImageIcon className="w-4 h-4 shrink-0" />,
          active: cleanPath === '/admin/site-logo',
        },
        {
          key: 'admin-android-release', path: '/admin/android-release',
          label: language === 'ru' ? 'Обновления Android' : 'Android yangilanishlari',
          icon: <Download className="size-4 shrink-0" />, active: cleanPath === '/admin/android-release',
        },
        {
          key: 'admin-about',
          path: '/admin/about',
          label: t.workspace.menuSiteAbout,
          icon: <FileText className="w-4 h-4 shrink-0" />,
          active: cleanPath === '/admin/about',
        },
        {
          key: 'admin-advertisements',
          path: '/admin/advertisements',
          label: t.workspace.menuAdminAdvertisements,
          icon: <Megaphone className="w-4 h-4 shrink-0" />,
          active:
            cleanPath === '/admin/advertisements' ||
            cleanPath.startsWith('/admin/advertisements/'),
        },
      ]
    : [];

  const handleNavigate = (path: string) => {
    setMobileMenuOpen(false);
    if (ANDROID_APK_URL && path === ANDROID_APK_URL) {
      window.location.assign(ANDROID_APK_URL);
      return;
    }
    navigate(path);
  };

  const handleSignInClick = () => {
    setMobileMenuOpen(false);
    if (onSignIn) {
      onSignIn();
    } else {
      navigate('/auth/sign-in');
    }
  };

  const handleOpenNotifications = () => {
    setMobileMenuOpen(false);
    openNotificationsDrawer();
  };

  const handleDrawerAfterOpenChange = (open: boolean) => {
    if (open) {
      wasDrawerOpenRef.current = true;
    } else if (wasDrawerOpenRef.current) {
      wasDrawerOpenRef.current = false;
      requestAnimationFrame(() => {
        hamburgerButtonRef.current?.focus();
      });
    }
  };

  return (
    <header className="bg-white border-b border-[#e6e4dd] sticky top-0 z-30 w-full">
      {/* Row 1: Strict 3-Zone Header (Left: Logo | Center: Adaptive Nav | Right: Cart, Notifications, Language & Account) */}
      <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4 lg:gap-6">
        {/* Zone 1: Brand Wordmark / Dynamic Site Logo */}
        <button
          type="button"
          onClick={() => handleNavigate(!profile || profileComplete ? '/' : '/profile')}
          aria-label={th.homeAriaLabel}
          className="inline-flex items-center min-h-[40px] sm:min-h-[44px] max-w-[126px] sm:max-w-[168px] text-left cursor-pointer shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2"
        >
          <SiteLogo
            language={language}
            size="md"
            imgClassName="max-w-[120px] sm:max-w-[160px]"
          />
        </button>

        {/* Zone 2: Center Primary Navigation with automatic "Yana / Ещё" overflow */}
        <div className="hidden lg:flex flex-1 min-w-0 items-center">
          <AdaptiveNavRow
            items={primaryNavItems}
            ariaLabel={t.brandName}
            moreLabel={th.moreButton}
            moreAriaLabel={th.moreMenuAriaLabel}
            onNavigate={handleNavigate}
            variant="primary"
            align="center"
          />
        </div>

        {/* Zone 3: Right Actions — Savat, Notifications, Language, Account Actions & Mobile Hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative z-10">
          <button
            type="button"
            onClick={() => openCartDrawer()}
            aria-label={`${t.catalog.cartButtonLabel} (${totalQuantity})`}
            title={t.catalog.cartButtonLabel}
            className={`inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 min-w-[40px] h-10 rounded-lg border text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 ${
              totalQuantity > 0
                ? 'border-[#16a34a] bg-[#f0fdf4] text-[#15803d]'
                : 'border-[#e6e4dd] bg-white text-slate-700 hover:border-[#86efac] hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t.catalog.cartButtonLabel}</span>
            <span className="font-semibold tabular-nums">({totalQuantity})</span>
          </button>

          {profile && (
            <button
              type="button"
              onClick={handleOpenNotifications}
              aria-label={t.notificationsPanel.bellAriaLabel}
              title={t.notificationsPanel.bellAriaLabel}
              className={`inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 min-w-[40px] h-10 rounded-lg border text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 ${
                unreadCount > 0
                  ? 'border-[#16a34a] bg-[#f0fdf4] text-[#15803d]'
                  : 'border-[#e6e4dd] bg-white text-slate-700 hover:border-[#86efac] hover:text-slate-900'
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              {unreadCount > 0 && (
                <span className="font-semibold tabular-nums">{unreadCount}</span>
              )}
            </button>
          )}

          <LanguageSelector
            value={language}
            onChange={onLanguageChange}
            ariaLabel={th.languageSwitchAriaLabel}
          />

          {profile ? (
            <>
              <button
                type="button"
                onClick={() => handleNavigate('/profile')}
                aria-current={cleanPath === '/profile' ? 'page' : undefined}
                title={displayName || t.workspace.menuProfile}
                className={`hidden lg:inline-flex items-center gap-2 px-3 h-10 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer max-w-[144px] xl:max-w-[180px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 ${
                  cleanPath === '/profile'
                    ? 'border-[#16a34a] bg-[#f0fdf4] text-[#15803d] font-semibold'
                    : 'border-[#e6e4dd] bg-[#faf9f5] hover:border-[#86efac] text-slate-800'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                <span className="truncate">{displayName}</span>
              </button>

              {onLogout && (
                <Button
                  type="default"
                  icon={<LogOut className="w-3.5 h-3.5" />}
                  onClick={onLogout}
                  className="!hidden lg:!inline-flex !items-center !min-h-[40px] whitespace-nowrap shrink-0"
                >
                  {t.workspace.logoutButton}
                </Button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSignInClick}
                aria-label={t.catalog.navSignIn}
                title={t.catalog.navSignIn}
                className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#16a34a] text-white hover:bg-[#15803d] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2"
              >
                <LogIn className="w-4 h-4 shrink-0" />
              </button>

              <Button
                type="primary"
                icon={<LogIn className="w-3.5 h-3.5" />}
                onClick={handleSignInClick}
                className="!hidden sm:!inline-flex !items-center !min-h-[40px] !px-3.5 whitespace-nowrap shrink-0"
              >
                {t.catalog.navSignIn}
              </Button>
            </>
          )}

          <button
            ref={hamburgerButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={th.openMenuAriaLabel}
            title={th.openMenuAriaLabel}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#e6e4dd] bg-white text-slate-700 hover:text-slate-900 hover:bg-[#f7f6f2] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Row 2: Dedicated Admin Sub-Header on Desktop (lg+) with adaptive "Yana / Ещё" */}
      {showAdminSubHeader && (
        <div className="hidden lg:block border-t border-[#f2f0ea] bg-[#faf9f5]">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center">
            <AdaptiveNavRow
              items={adminNavItems}
              ariaLabel={th.adminNavAriaLabel}
              moreLabel={th.moreButton}
              moreAriaLabel={th.moreMenuAriaLabel}
              onNavigate={handleNavigate}
              variant="admin"
              align="start"
            />
          </div>
        </div>
      )}

      {/* Tablet & Mobile Drawer Navigation */}
      <Drawer
        title={<SiteLogo language={language} size="sm" />}
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        afterOpenChange={handleDrawerAfterOpenChange}
        keyboard
        closable={{ 'aria-label': th.closeMenuAriaLabel }}
        size="100%"
      >
        <div className="flex flex-col h-full justify-between gap-6">
          <div className="space-y-4">
            {profile && (
              <div className="rounded-lg border border-[#e6e4dd] bg-[#f7f6f2] px-3.5 py-3">
                <div className="text-sm font-semibold text-slate-900 truncate">{displayName}</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">@{profile.username}</div>
              </div>
            )}

            <nav className="flex flex-col gap-1.5" aria-label={t.brandName}>
              {primaryNavItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigate(item.path)}
                  aria-current={item.active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 ${
                    item.active
                      ? 'bg-[#f0fdf4] text-[#15803d] font-semibold'
                      : 'text-slate-700 hover:bg-[#f7f6f2]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}

              {profile && (
                <button
                  type="button"
                  onClick={handleOpenNotifications}
                  className="flex items-center justify-between gap-3 px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-slate-700 hover:bg-[#f7f6f2] text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2"
                >
                  <span className="inline-flex items-center gap-3">
                    <Bell className="w-4 h-4 shrink-0" />
                    <span>{t.notificationsPanel.drawerTitle}</span>
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-xs font-bold text-[#15803d] tabular-nums">
                      ({unreadCount})
                    </span>
                  )}
                </button>
              )}

              {isAdmin && (
                <div className="pt-3 mt-1 border-t border-[#f2f0ea] space-y-1">
                  <div className="px-3.5 pb-1 text-xs font-semibold text-slate-400">
                    {th.adminSectionLabel}
                  </div>
                  {adminNavItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleNavigate(item.path)}
                      aria-current={item.active ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 ${
                        item.active
                          ? 'bg-[#f0fdf4] text-[#15803d] font-semibold'
                          : 'text-slate-700 hover:bg-[#f7f6f2]'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                  {profileComplete && (
                    <button
                      type="button"
                      onClick={() => handleNavigate('/profile')}
                      aria-current={cleanPath === '/profile' ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 ${
                        cleanPath === '/profile'
                          ? 'bg-[#f0fdf4] text-[#15803d] font-semibold'
                          : 'text-slate-700 hover:bg-[#f7f6f2]'
                      }`}
                    >
                      <UserIcon className="w-4 h-4 shrink-0" />
                      <span>{t.workspace.menuProfile}</span>
                    </button>
                  )}
                </div>
              )}
            </nav>

            <div className="space-y-2 border-t border-[#f2f0ea] pt-4">
              <div className="text-sm font-medium text-slate-700">{t.languageLabel}</div>
              <LanguageSelector fullWidth value={language} onChange={onLanguageChange} ariaLabel={t.languageLabel} />
            </div>
          </div>

          {profile && onLogout ? (
            <Button
              danger
              size="large"
              block
              icon={<LogOut className="w-4 h-4" />}
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="!min-h-[44px]"
            >
              {t.workspace.logoutButton}
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              block
              icon={<LogIn className="w-4 h-4" />}
              onClick={handleSignInClick}
              className="!min-h-[44px]"
            >
              {t.catalog.navSignIn}
            </Button>
          )}
        </div>
      </Drawer>
    </header>
  );
}
