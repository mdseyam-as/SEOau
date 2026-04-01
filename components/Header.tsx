import React from 'react';
import { LayoutDashboard, LogOut, ShieldCheck, Crown, ChevronRight } from 'lucide-react';
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
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4 xl:max-w-7xl">
        <div className="flex items-center justify-between gap-3">
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

          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
            <button
              onClick={onLogout}
              className="sm:hidden p-2 hover:bg-white/10 rounded-full transition-all duration-300 text-slate-400 hover:text-white shrink-0 active:scale-95 focus-ring-brand"
              aria-label="Выйти из аккаунта"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2 sm:gap-3 md:gap-4">
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

              {user.role !== 'admin' && onOpenSubscription && (
                <button
                  onClick={onOpenSubscription}
                  className="subscription-buy-button px-2.5 md:px-3 py-1.5 md:py-2 text-[11px] md:text-xs lg:text-sm rounded-full font-medium flex items-center gap-1.5 md:gap-2 transition-all duration-300 whitespace-nowrap bg-brand-green/10 text-brand-green hover:bg-brand-green/15 border border-brand-green/30 shadow-glow-sm focus-ring-brand"
                  aria-label="Купить подписку"
                >
                  <TicketPlus className="w-3 h-3 md:w-[14px] md:h-[14px] shrink-0" />
                  <span className="hidden md:inline">Купить подписку</span>
                  <span className="md:hidden">Тарифы</span>
                </button>
              )}

              {children}

              <div className="hidden lg:block text-xs sm:text-sm text-slate-300 max-w-[120px] xl:max-w-none truncate font-medium">
                {user.firstName} {user.username ? `(@${user.username})` : ''}
              </div>

              <button
                onClick={onLogout}
                className="p-2 sm:p-2.5 hover:bg-white/10 rounded-full transition-all duration-300 text-slate-400 hover:text-white shrink-0 active:scale-95 focus-ring-brand"
                aria-label="Выйти из аккаунта"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="sm:hidden mt-3 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            {children}
          </div>

          {user.role !== 'admin' && onOpenSubscription && (
            <button
              onClick={onOpenSubscription}
              className="subscription-buy-mobile shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full font-medium transition-all duration-300 bg-gradient-to-r from-brand-green/15 via-brand-green/10 to-emerald-500/10 text-brand-green border border-brand-green/20 shadow-glow-sm focus-ring-brand"
              aria-label="Открыть тарифы подписки"
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-semibold leading-none">Премиум</span>
              <ChevronRight className="w-3 h-3 shrink-0 opacity-80" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
