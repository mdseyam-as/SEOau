import React from 'react';
import { LayoutDashboard, LogOut, ShieldCheck, TicketPlus } from 'lucide-react';
import { User } from '../services/authService';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleAdmin?: () => void;
  showAdmin?: boolean;
  onOpenSubscription?: () => void;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onToggleAdmin,
  showAdmin = false,
  onOpenSubscription,
  children
}) => {
  return (
    <header className="glass-panel-dark sticky top-0 z-50 border-b border-brand-green/20 shadow-glass">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4 flex items-center justify-between xl:max-w-7xl">
        <div 
          className="flex items-center gap-3 sm:gap-4 cursor-pointer min-w-0 group" 
          onClick={() => {
            onToggleAdmin?.();
          }}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-brand-green to-emerald-600 rounded-xl flex items-center justify-center shadow-glow-sm shrink-0 float-animation">
            <LayoutDashboard className="text-white w-5 h-5 sm:w-6 sm:h-6 icon-bounce" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate text-white text-glow-brand">
              SEO Generator
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Admin Toggle */}
          {user.role === 'admin' && onToggleAdmin && (
            <button
              onClick={onToggleAdmin}
              className={`
                px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full font-medium flex items-center gap-2 transition-all duration-300 whitespace-nowrap btn-magnetic btn-ripple
                ${showAdmin
                  ? 'bg-white text-brand-dark shadow-glow animate-pulse-glow'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}
              `}
              aria-label={showAdmin ? 'Выйти из админки' : 'Открыть админку'}
            >
              <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 icon-bounce" />
              <span className="hidden xs:inline">{showAdmin ? 'Выйти' : 'Админка'}</span>
            </button>
          )}

          {/* Subscription Plans Button */}
          {user.role !== 'admin' && onOpenSubscription && (
            <button
              onClick={onOpenSubscription}
              className="subscription-buy-button px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs md:text-sm rounded-full font-medium flex items-center gap-1.5 sm:gap-2 transition-all duration-300 whitespace-nowrap bg-brand-green/10 text-brand-green hover:bg-brand-green/15 border border-brand-green/30 shadow-glow-sm focus-ring-brand"
              aria-label="Купить подписку"
            >
              <TicketPlus className="w-3 h-3 shrink-0" />
              <span className="subscription-buy-label hidden sm:inline">Купить подписку</span>
            </button>
          )}

          {/* Additional children (e.g., subscription status) */}
          {children}

          {/* User Info */}
          <div className="hidden lg:block text-xs sm:text-sm text-slate-300 max-w-[120px] xl:max-w-none truncate font-medium">
            {user.firstName} {user.username ? `(@${user.username})` : ''}
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="p-2 sm:p-2.5 hover:bg-white/10 rounded-full transition-all duration-300 text-slate-400 hover:text-white shrink-0 active:scale-95 focus-ring-brand"
            aria-label="Выйти из аккаунта"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
