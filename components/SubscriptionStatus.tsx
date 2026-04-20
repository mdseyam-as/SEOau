import React from 'react';
import { Zap, Clock, Lock } from 'lucide-react';
import { SubscriptionPlan } from '../services/authService';

interface SubscriptionStatusProps {
  userPlan: SubscriptionPlan | null;
  dailyRemaining: number | string;
  monthlyRemaining: number | string;
  isSubscriptionActive: boolean;
  daysRemaining: number;
  userPlanId?: string;
  compact?: boolean;
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  userPlan,
  dailyRemaining,
  monthlyRemaining,
  isSubscriptionActive,
  daysRemaining,
  userPlanId,
  compact = false
}) => {
  // Mobile compact version
  if (compact) {
    return (
      <div className="flex sm:hidden items-center gap-1.5 animate-fade-in-up">
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-2.5 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.18)]">
          <Zap className="w-3 h-3 text-amber-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
          <span className="text-[10px] font-bold text-white text-readable">
            {dailyRemaining}/{monthlyRemaining}
          </span>
        </div>
        {isSubscriptionActive ? (
          <div className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(56,189,248,0.10))] px-2.5 py-1.5 shadow-[0_12px_28px_rgba(16,185,129,0.14)]">
            <Clock className="w-3 h-3 text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]" />
            <span className="text-[10px] font-bold text-brand-green text-readable">
              {userPlanId === 'free' ? '∞' : `${daysRemaining}д`}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1.5 shadow-[0_10px_24px_rgba(239,68,68,0.10)]">
            <Lock className="w-3 h-3 text-red-300" />
          </div>
        )}
      </div>
    );
  }

  // Desktop version
  return (
    <div className="hidden sm:flex items-center gap-2 md:gap-3 animate-fade-in-up">
      <div
        className="flex items-center gap-2 sm:gap-3 rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] px-3 sm:px-4 py-1.5 sm:py-2 shadow-[0_12px_30px_rgba(2,6,23,0.20)]"
        title="Осталось генераций"
      >
        <Zap className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 text-amber-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.45)]" />
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-medium text-gray-200 text-readable">
          <span title="Осталось на сегодня" className="whitespace-nowrap">
            <span className="hidden lg:inline text-gray-400">Сутки: </span>
            <span 
              className={`font-bold ${
                (typeof dailyRemaining === 'number' && dailyRemaining <= 0) 
                  ? 'text-red-400' 
                  : 'text-white'
              }`}
            >
              {dailyRemaining}
            </span>
          </span>
          <span className="text-white/20">|</span>
          <span title="Осталось на месяц" className="whitespace-nowrap">
            <span className="hidden lg:inline text-gray-400">Всего: </span>
            <span 
              className={`font-bold ${
                (typeof monthlyRemaining === 'number' && monthlyRemaining <= 0) 
                  ? 'text-red-400' 
                  : 'text-white'
              }`}
            >
              {monthlyRemaining}
            </span>
          </span>
        </div>
      </div>

      {isSubscriptionActive ? (
        <div className="flex items-center gap-2 sm:gap-3 rounded-full border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(56,189,248,0.10))] px-3 sm:px-4 py-1.5 sm:py-2 shadow-[0_16px_34px_rgba(16,185,129,0.16)]">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]" />
          {userPlanId === 'free' ? (
            <span className="text-xs sm:text-sm font-bold text-brand-green whitespace-nowrap text-readable">
              Бессрочно
            </span>
          ) : (
            <span className="text-xs sm:text-sm font-bold text-brand-green whitespace-nowrap text-readable">
              {daysRemaining} дн.
            </span>
          )}
          {userPlan && (
            <span className="ml-1 hidden rounded-full border border-emerald-400/20 bg-white/10 px-2 py-0.5 text-xs font-medium text-emerald-200 xl:inline">
              {userPlan.name}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 sm:gap-3 rounded-full border border-red-400/20 bg-red-500/10 px-3 sm:px-4 py-1.5 sm:py-2 shadow-[0_12px_30px_rgba(239,68,68,0.10)]">
          <Lock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 text-red-300" />
          <span className="text-xs sm:text-sm font-bold text-red-400 whitespace-nowrap text-readable">
            Нет доступа
          </span>
        </div>
      )}
    </div>
  );
};
