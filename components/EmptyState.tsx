import React from 'react';
import { Sparkles, FileText, Search, Lock, Crown } from 'lucide-react';

export interface EmptyStateProps {
  /** Иконка для отображения */
  icon?: React.ReactNode;
  /** Заголовок пустого состояния */
  title: string;
  /** Описание пустого состояния */
  description?: string;
  /** Действие (кнопка) */
  action?: React.ReactNode;
  /** Вариант стиля */
  variant?: 'default' | 'locked' | 'premium';
  /** Дополнительный класс */
  className?: string;
}

const variantStyles = {
  default: {
    iconBg: 'bg-white/10 border border-white/10',
    iconColor: 'text-slate-200',
  },
  locked: {
    iconBg: 'bg-red-500/10 border border-red-400/20',
    iconColor: 'text-red-300',
  },
  premium: {
    iconBg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/15 border border-purple-400/20',
    iconColor: 'text-pink-200',
  },
};

const defaultIcons = {
  default: <Sparkles className="w-8 h-8 md:w-12 md:h-12" />,
  locked: <Lock className="w-8 h-8 md:w-12 md:h-12" />,
  premium: <Crown className="w-8 h-8 md:w-12 md:h-12" />,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className = ''
}) => {
  const styles = variantStyles[variant];
  const defaultIcon = defaultIcons[variant];

  return (
    <div
      className={`app-dark-card flex flex-col items-center justify-center h-64 md:h-96 px-6 animate-fade-in-scale ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className={`p-4 md:p-6 ${styles.iconBg} rounded-[24px] mb-4 shadow-[0_18px_40px_rgba(148,163,184,0.12)]`}>
        <div className={`${styles.iconColor} icon-bounce`}>
          {icon || defaultIcon}
        </div>
      </div>
      <h3 className="text-lg md:text-xl text-white font-semibold mb-2 text-title text-center tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-sm md:text-base text-slate-300 text-center px-4 mb-6 max-w-md text-body leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="flex flex-col sm:flex-row gap-3 stagger-children">
          {action}
        </div>
      )}
    </div>
  );
};

/* Pre-configured Empty States */
export const GeneratorEmptyState: React.FC<{ onUpload?: () => void }> = ({ onUpload }) => (
  <EmptyState
    icon={<Sparkles className="w-8 h-8 md:w-12 md:h-12" />}
    title="Начните генерацию"
    description="Загрузите ключевые слова из Excel или введите тему для создания SEO-контента"
    action={
      onUpload && (
        <button
          onClick={onUpload}
          className="app-btn-primary"
        >
          Загрузить Excel
        </button>
      )
    }
  />
);

export const LockedFeatureEmptyState: React.FC<{
  featureName: string;
  onUpgrade?: () => void;
}> = ({ featureName, onUpgrade }) => (
  <div className="app-dark-card p-8 text-center">
    <div className="inline-flex rounded-[24px] border border-red-400/20 bg-red-500/10 p-4 shadow-[0_16px_36px_rgba(239,68,68,0.10)] mb-4">
      <Lock className="w-12 h-12 text-red-300" />
    </div>
    <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Upgrade</div>
    <h3 className="text-lg font-bold text-white mb-2 text-readable">
      {featureName} недоступен
    </h3>
    <p className="text-slate-300 text-sm mb-5 max-w-md mx-auto leading-relaxed">
      Эта функция недоступна для вашего тарифа. Обновите подписку для доступа к {featureName.toLowerCase()}.
    </p>
    {onUpgrade && (
      <button
        onClick={onUpgrade}
        className="app-btn-primary"
      >
        Обновить тариф
      </button>
    )}
  </div>
);

export const PremiumFeatureEmptyState: React.FC<{
  featureName: string;
  description?: string;
  onUpgrade?: () => void;
}> = ({ featureName, description, onUpgrade }) => (
  <EmptyState
    variant="premium"
    icon={<Crown className="w-8 h-8 md:w-12 md:h-12" />}
    title={`${featureName} — Premium`}
    description={description || `Разблокируйте ${featureName.toLowerCase()} с премиум подпиской`}
    action={
      onUpgrade && (
        <button
          onClick={onUpgrade}
          className="app-btn-primary"
        >
          <Crown className="w-4 h-4 inline mr-2" />
          Получить Premium
        </button>
      )
    }
  />
);

export const SearchEmptyState: React.FC<{
  searchTerm?: string;
}> = ({ searchTerm }) => (
  <EmptyState
    icon={<Search className="w-8 h-8 md:w-12 md:h-12" />}
    title={searchTerm ? `Ничего не найдено по запросу "${searchTerm}"` : 'Введите поисковый запрос'}
    description={searchTerm ? 'Попробуйте изменить запрос или фильтры' : 'Начните вводить для поиска...'}
  />
);

export const HistoryEmptyState: React.FC = () => (
  <EmptyState
    icon={<FileText className="w-8 h-8 md:w-12 md:h-12" />}
    title="История пуста"
    description="Здесь будут отображаться ваши предыдущие генерации"
  />
);
