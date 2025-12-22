import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  count = 1
}) => {
  const baseClasses = 'animate-pulse bg-white/10';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl'
  };

  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? (variant === 'text' ? '1em' : '100%')
  };

  const elements = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  ));

  return count === 1 ? elements[0] : <>{elements}</>;
};

// Pre-built skeleton layouts
export const ResultSkeleton: React.FC = () => (
  <div className="space-y-4 animate-in fade-in duration-500" role="status" aria-label="Загрузка результатов">
    {/* Analytics Dashboard Skeleton */}
    <div className="glass-panel p-6 rounded-xl">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={20} width="40%" />
          <Skeleton variant="text" height={14} width="60%" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </div>
    </div>

    {/* Meta Info Skeleton */}
    <div className="glass-panel p-6 rounded-xl">
      <Skeleton variant="text" height={24} width="30%" className="mb-4" />
      <div className="space-y-3">
        <Skeleton height={50} />
        <Skeleton height={70} />
      </div>
    </div>

    {/* Content Skeleton */}
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="bg-white/5 px-6 py-4 border-b border-white/10">
        <Skeleton variant="text" height={24} width="20%" />
      </div>
      <div className="p-6 space-y-4">
        <Skeleton variant="text" height={32} width="70%" />
        <Skeleton variant="text" height={16} width="100%" count={3} className="mb-2" />
        <Skeleton variant="text" height={24} width="50%" className="mt-6" />
        <Skeleton variant="text" height={16} width="100%" count={4} className="mb-2" />
        <Skeleton variant="text" height={24} width="40%" className="mt-6" />
        <Skeleton variant="text" height={16} width="100%" count={3} className="mb-2" />
      </div>
    </div>

    <span className="sr-only">Загрузка контента...</span>
  </div>
);

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <div className="space-y-3" role="status" aria-label="Загрузка">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={16} width="60%" />
            <Skeleton variant="text" height={12} width="40%" />
          </div>
        </div>
      </div>
    ))}
    <span className="sr-only">Загрузка...</span>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-2" role="status" aria-label="Загрузка таблицы">
    {/* Header */}
    <div className="flex gap-4 p-3 bg-white/5 rounded-lg">
      {Array.from({ length: cols }, (_, i) => (
        <Skeleton key={i} variant="text" height={16} width={`${100 / cols}%`} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex gap-4 p-3">
        {Array.from({ length: cols }, (_, j) => (
          <Skeleton key={j} variant="text" height={14} width={`${100 / cols}%`} />
        ))}
      </div>
    ))}
    <span className="sr-only">Загрузка данных...</span>
  </div>
);
