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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2 pb-[calc(0.375rem+env(safe-area-inset-bottom))] sm:px-5">
      <div className="pointer-events-auto mx-auto grid h-[3.625rem] max-w-md grid-cols-5 gap-0.5 rounded-[1.4rem] border border-[#dce9e1] bg-white/95 p-1 shadow-[0_6px_28px_-12px_rgba(20,62,43,0.32)] backdrop-blur-md">
        {items.map(({ to, label, icon: Icon, active }) => {
          const className = `flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.05rem] px-0.5 text-center text-[10px] leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-green-700 motion-reduce:transition-none ${active ? 'bg-[#e6f5ec] font-semibold text-green-900!' : 'font-medium text-[#4f6c5c]! active:bg-[#f2f7f4]'}`;
          const content = <>
            <span className="relative grid size-6 place-items-center">
              <Icon size={20} strokeWidth={active ? 2.15 : 1.8} aria-hidden="true" />
              {to === '/cart' && totalQuantity > 0 && <span aria-hidden="true"
                className="absolute -right-2 -top-1 min-w-4 rounded-full bg-green-700 px-1 py-0.5 text-[8px] leading-none text-white ring-2 ring-white">{totalQuantity}</span>}
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
