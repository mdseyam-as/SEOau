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
        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full border border-white/10 glow-on-hover">
          <Zap className="w-3 h-3 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] scale-on-hover" />
          <span className="text-[10px] font-bold text-white text-readable">
            {dailyRemaining}/{monthlyRemaining}
          </span>
        </div>
        {isSubscriptionActive ? (
          <div className="flex items-center gap-1 bg-brand-green/10 px-2 py-1 rounded-full border border-brand-green/30 glow-on-hover">
            <Clock className="w-3 h-3 text-brand-green drop-shadow-[0_0_8px_rgba(0,220,130,0.5)] scale-on-hover" />
            <span className="text-[10px] font-bold text-brand-green text-readable">
              {userPlanId === 'free' ? '∞' : `${daysRemaining}д`}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/30 glow-on-hover">
            <Lock className="w-3 h-3 text-red-400 scale-on-hover" />
          </div>
        )}
      </div>
    );
  }

  // Desktop version
  return (
    <div className="hidden sm:flex items-center gap-2 md:gap-3 animate-fade-in-up">
      {/* Generation Usage Counter - REMAINING */}
      <div
        className="flex items-center gap-2 sm:gap-3 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 backdrop-blur-sm glow-on-hover"
        title="Осталось генераций"
      >
        <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 shrink-0 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] scale-on-hover" />
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
        <div className="flex items-center gap-2 sm:gap-3 bg-brand-green/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-brand-green/30 backdrop-blur-sm glow-on-hover">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-brand-green shrink-0 drop-shadow-[0_0_8px_rgba(0,220,130,0.5)] scale-on-hover" />
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
            <span className="hidden xl:inline text-xs bg-brand-green/20 px-2 py-0.5 rounded text-brand-green font-medium ml-1">
              {userPlan.name}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 sm:gap-3 bg-red-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-red-500/30 backdrop-blur-sm glow-on-hover">
          <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 shrink-0 scale-on-hover" />
          <span className="text-xs sm:text-sm font-bold text-red-400 whitespace-nowrap text-readable">
            Нет доступа
          </span>
        </div>
      )}
    </div>
  );
};
