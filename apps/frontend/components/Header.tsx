import React from 'react';
import { Search, Bell, Sparkles, LogOut, ShieldCheck, Crown, ChevronRight } from 'lucide-react';
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020305]/80 backdrop-blur-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 xl:max-w-[1600px]">
        <div className="flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-3 cursor-pointer min-w-0 group"
            onClick={() => {
              onToggleAdmin?.();
            }}
          >
            <div className="min-w-0">
              <div className="text-[1.05rem] font-black uppercase tracking-[-0.04em] text-white sm:text-lg">
                AURA SEO
              </div>
              <p className="hidden sm:block text-[11px] uppercase tracking-[0.14em] text-[#ab888e] mt-1">
                Operator workspace
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
              <button
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white lg:inline-flex"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white lg:inline-flex"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>
              <button
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white lg:inline-flex"
                aria-label="AI actions"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              {user.role === 'admin' && onToggleAdmin && (
                <button
                  onClick={onToggleAdmin}
                  className={`
                    px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-[6px] font-medium flex items-center gap-2 transition-all duration-300 whitespace-nowrap btn-magnetic btn-ripple border
                    ${showAdmin
                      ? 'border-[#ffb1c0] bg-[#ffb1c0] text-[#660029] shadow-[0_0_24px_rgba(255,177,192,0.18)]'
                      : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}
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
                  className="subscription-buy-button px-2.5 md:px-3 py-2 text-[11px] md:text-xs lg:text-sm rounded-[6px] font-semibold flex items-center gap-1.5 md:gap-2 transition-all duration-300 whitespace-nowrap border border-[#ff2d78] bg-[#ff2d78]/10 text-[#ffb1c0] hover:bg-[#ff2d78]/20 hover:text-white focus-ring-brand"
                  aria-label="Купить подписку"
                >
                  <Crown className="w-3 h-3 md:w-[14px] md:h-[14px] shrink-0" />
                  <span className="hidden md:inline">Купить подписку</span>
                  <span className="md:hidden">Тарифы</span>
                </button>
              )}

              {children}

              <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm text-slate-300 max-w-[220px] xl:max-w-none truncate font-medium">
                <div className="h-2 w-2 rounded-full bg-[#46fa9c] shadow-[0_0_12px_rgba(70,250,156,0.8)]" />
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
              className="subscription-buy-mobile shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] font-medium transition-all duration-300 border border-[#ff2d78] bg-[#ff2d78]/10 text-[#ffb1c0] focus-ring-brand"
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
