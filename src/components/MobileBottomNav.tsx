import { useCart } from '../contexts/CartContext';
import { Info, MessageCircle, ShoppingCart, Store, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { Language } from '../types/auth';

export function MobileBottomNav({ language }: { language: Language }) {
  const { openDrawer, drawerOpen, totalQuantity } = useCart();
  const { pathname } = useLocation();
  const ru = language === 'ru';
  const items = [
    { to: '/', label: ru ? 'Товары' : 'Mahsulotlar', icon: Store, active: /^\/(?:$|catalog(?:\/|$)|products(?:\/|$))/.test(pathname) },
    { to: '/cart', label: ru ? 'Корзина' : 'Savat', icon: ShoppingCart, active: drawerOpen },
    { to: '/chat', label: ru ? 'Чат' : 'Chat', icon: MessageCircle, active: pathname === '/chat' },
    { to: '/about', label: ru ? 'О нас' : 'Biz haqimizda', icon: Info, active: pathname === '/about' },
    { to: '/profile', label: ru ? 'Профиль' : 'Profilim', icon: User, active: pathname === '/profile' },
  ];
  return (
    <nav aria-label={ru ? 'Главное меню' : 'Asosiy menyu'}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-5 px-1">
        {items.map(({ to, label, icon: Icon, active }) => {
          const className = `flex min-w-0 flex-col items-center justify-center gap-1 [&_svg]:text-current text-center text-[10px] leading-none ${active ? 'font-bold text-green-800' : 'font-medium text-green-700'}`;
          const content = <>
            <span className={`relative rounded-full px-3 py-1 ${active ? 'bg-green-100' : ''}`}>
              <Icon size={20} aria-hidden="true" />
              {to === '/cart' && totalQuantity > 0 && <span aria-hidden="true"
                className="absolute -right-1 -top-1 min-w-4 rounded-full bg-green-700 px-1 py-0.5 text-[9px] text-white">{totalQuantity}</span>}
            </span>
            {label}
          </>;
          return to === '/cart'
            ? <button key={to} type="button" onClick={() => openDrawer()} aria-expanded={drawerOpen}
                aria-label={`${label} (${totalQuantity})`} className={className}>{content}</button>
            : <Link key={to} to={to} aria-current={active ? 'page' : undefined}
                className={className}>{content}</Link>;
        })}
      </div>
    </nav>
  );
}
