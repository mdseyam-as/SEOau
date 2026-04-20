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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(180deg,rgba(7,11,19,0.84),rgba(11,15,25,0.68))] backdrop-blur-2xl shadow-[0_16px_44px_rgba(2,6,23,0.28)]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4 xl:max-w-7xl">
        <div className="flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-3 sm:gap-4 cursor-pointer min-w-0 group"
            onClick={() => {
              onToggleAdmin?.();
            }}
          >
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border border-white/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.22),rgba(56,189,248,0.18))] shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.24),transparent_58%)]" />
              <LayoutDashboard className="relative text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate text-white">
                  SEO Generator
                </h1>
                <span className="hidden md:inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                  App
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 mt-0.5">
                Контент, анализ и monitoring в одном рабочем пространстве
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
            <button
              onClick={onLogout}
              className="sm:hidden p-2 hover:bg-white/10 rounded-full transition-all duration-300 text-slate-400 hover:text-white shrink-0 active:scale-95 focus-ring-brand border border-transparent hover:border-white/10"
              aria-label="Выйти из аккаунта"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2 sm:gap-3 md:gap-4">
              {user.role === 'admin' && onToggleAdmin && (
                <button
                  onClick={onToggleAdmin}
                  className={`
                    px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-full font-medium flex items-center gap-2 transition-all duration-300 whitespace-nowrap btn-magnetic btn-ripple
                    ${showAdmin
                      ? 'bg-white text-brand-dark shadow-[0_14px_30px_rgba(255,255,255,0.18)]'
                      : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}
                  `}
                  aria-label={showAdmin ? 'Выйти из админки' : 'Открыть админку'}
                >
                  <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">{showAdmin ? 'Выйти' : 'Админка'}</span>
                </button>
              )}

              {user.role !== 'admin' && onOpenSubscription && (
                <button
                  onClick={onOpenSubscription}
                  className="subscription-buy-button px-2.5 md:px-3 py-2 text-[11px] md:text-xs lg:text-sm rounded-full font-medium flex items-center gap-1.5 md:gap-2 transition-all duration-300 whitespace-nowrap bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(56,189,248,0.12))] text-emerald-300 hover:text-white border border-emerald-400/20 shadow-[0_16px_36px_rgba(16,185,129,0.14)] focus-ring-brand"
                  aria-label="Купить подписку"
                >
                  <Crown className="w-3 h-3 md:w-[14px] md:h-[14px] shrink-0" />
                  <span className="hidden md:inline">Купить подписку</span>
                  <span className="md:hidden">Тарифы</span>
                </button>
              )}

              {children}

              <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm text-slate-300 max-w-[220px] xl:max-w-none truncate font-medium">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                <span className="truncate">{user.firstName} {user.username ? `(@${user.username})` : ''}</span>
              </div>

              <button
                onClick={onLogout}
                className="p-2 sm:p-2.5 hover:bg-white/10 rounded-full transition-all duration-300 text-slate-400 hover:text-white shrink-0 active:scale-95 focus-ring-brand border border-transparent hover:border-white/10"
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
              className="subscription-buy-mobile shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full font-medium transition-all duration-300 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(56,189,248,0.12))] text-emerald-300 border border-emerald-400/20 shadow-[0_16px_36px_rgba(16,185,129,0.14)] focus-ring-brand"
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
