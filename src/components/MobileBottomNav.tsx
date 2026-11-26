import { ClipboardList, Info, MessageCircle, Store, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { Language } from '../types/auth';

export function MobileBottomNav({ language }: { language: Language }) {
  const { pathname } = useLocation();
  const ru = language === 'ru';
  const items = [
    { to: '/', label: ru ? 'Товары' : 'Mahsulotlar', icon: Store, active: /^\/(?:$|catalog(?:\/|$)|products(?:\/|$))/.test(pathname) },
    { to: '/orders', label: ru ? 'Мои заказы' : 'Buyurtmalarim', icon: ClipboardList, active: /^\/orders(?:\/|$)/.test(pathname) },
    { to: '/chat', label: ru ? 'Чат' : 'Chat', icon: MessageCircle, active: pathname === '/chat' },
    { to: '/about', label: ru ? 'О нас' : 'Biz haqimizda', icon: Info, active: pathname === '/about' },
    { to: '/profile', label: ru ? 'Профиль' : 'Profilim', icon: User, active: pathname === '/profile' },
  ];
  return (
    <nav aria-label={ru ? 'Главное меню' : 'Asosiy menyu'}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-5 px-1">
        {items.map(({ to, label, icon: Icon, active }) => (
          <Link key={to} to={to} aria-current={active ? 'page' : undefined}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 text-center text-[10px] leading-none ${active ? 'font-bold text-green-800' : 'font-medium text-slate-600'}`}>
            <span className={`rounded-full px-3 py-1 ${active ? 'bg-green-100' : ''}`}>
              <Icon size={20} aria-hidden="true" />
            </span>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
