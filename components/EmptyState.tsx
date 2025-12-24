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
    iconBg: 'bg-gray-50',
    iconColor: 'text-gray-300',
  },
  locked: {
    iconBg: 'bg-red-50',
    iconColor: 'text-red-400',
  },
  premium: {
    iconBg: 'bg-gradient-to-br from-purple-50 to-pink-50',
    iconColor: 'text-purple-400',
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
      className={`flex flex-col items-center justify-center h-64 md:h-96 bg-white rounded-xl shadow-sm border border-gray-200 border-dashed animate-fade-in-scale ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className={`p-4 md:p-6 ${styles.iconBg} rounded-full mb-4 float-animation`}>
        <div className={`${styles.iconColor} icon-bounce`}>
          {icon || defaultIcon}
        </div>
      </div>
      <h3 className="text-base md:text-lg text-slate-900 font-medium mb-2 text-title">
        {title}
      </h3>
      {description && (
        <p className="text-xs md:text-sm text-slate-500 text-center px-4 mb-6 max-w-md text-body">
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
          className="px-6 py-2.5 bg-brand-green hover:bg-emerald-500 text-white rounded-lg font-bold transition-all duration-200 focus-ring-brand haptic-press"
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
  <div className="glass-panel p-8 rounded-2xl text-center">
    <div className="p-4 bg-red-50 rounded-full inline-flex mb-4">
      <Lock className="w-12 h-12 text-red-400" />
    </div>
    <h3 className="text-lg font-bold text-white mb-2 text-readable">
      {featureName} недоступен
    </h3>
    <p className="text-slate-400 text-sm mb-4">
      Эта функция недоступна для вашего тарифа. Обновите подписку для доступа к {featureName.toLowerCase()}.
    </p>
    {onUpgrade && (
      <button
        onClick={onUpgrade}
        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-all duration-200 focus-ring-brand haptic-press"
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
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-bold transition-all duration-200 focus-ring-brand haptic-press"
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
