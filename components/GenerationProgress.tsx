import React, { useState, useEffect } from 'react';
import { Search, FileText, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

export type GenerationStage = 'analyzing' | 'generating' | 'formatting' | 'checking' | 'complete';

interface GenerationProgressProps {
  keywordsCount: number;
  isGeoMode?: boolean;
}

const STAGES = [
  { id: 'analyzing', label: 'Анализ ключевых слов', icon: Search, duration: 2000 },
  { id: 'generating', label: 'Генерация контента', icon: Sparkles, duration: 8000 },
  { id: 'formatting', label: 'Форматирование и структура', icon: FileText, duration: 3000 },
  { id: 'checking', label: 'Проверка качества', icon: CheckCircle2, duration: 2000 },
];

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  keywordsCount,
  isGeoMode = false
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress through stages
    const stageTimers: NodeJS.Timeout[] = [];
    let totalTime = 0;

    STAGES.forEach((stage, index) => {
      const timer = setTimeout(() => {
        setCurrentStageIndex(index);
      }, totalTime);
      stageTimers.push(timer);
      totalTime += stage.duration;
    });

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 2;
      });
    }, 200);

    return () => {
      stageTimers.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, []);

  const currentStage = STAGES[currentStageIndex];

  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-6"
      role="status"
      aria-live="polite"
      aria-label={`Генерация контента: ${currentStage.label}`}
    >
      {/* Main Animation */}
      <div className="relative mb-8">
        {/* Outer ring */}
        <div className="w-24 h-24 rounded-full border-4 border-white/10" />

        {/* Progress ring */}
        <svg className="absolute inset-0 w-24 h-24 -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-brand-green"
            strokeDasharray={276.46}
            strokeDashoffset={276.46 - (276.46 * progress) / 100}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-3 bg-brand-green/20 rounded-full">
            {React.createElement(currentStage.icon, {
              className: 'w-8 h-8 text-brand-green animate-pulse'
            })}
          </div>
        </div>
      </div>

      {/* Stage Info */}
      <h3 className="text-xl font-bold text-white mb-2">
        {currentStage.label}
      </h3>

      <p className="text-sm text-slate-400 text-center max-w-xs mb-6">
        {currentStageIndex === 0 && `Обрабатываем ${keywordsCount} ключевых слов...`}
        {currentStageIndex === 1 && (isGeoMode ? 'Создаём GEO-оптимизированный контент...' : 'Пишем SEO-текст с учётом всех требований...')}
        {currentStageIndex === 2 && 'Добавляем заголовки, списки и структуру...'}
        {currentStageIndex === 3 && 'Проверяем на переспам и релевантность...'}
      </p>

      {/* Stage Indicators */}
      <div className="flex items-center gap-2">
        {STAGES.map((stage, index) => (
          <div
            key={stage.id}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
              index < currentStageIndex
                ? 'bg-brand-green text-white'
                : index === currentStageIndex
                ? 'bg-brand-green/30 text-brand-green ring-2 ring-brand-green'
                : 'bg-white/10 text-slate-500'
            }`}
            aria-label={`${stage.label}: ${index < currentStageIndex ? 'завершено' : index === currentStageIndex ? 'в процессе' : 'ожидание'}`}
          >
            {index < currentStageIndex ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : index === currentStageIndex ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="text-xs font-bold">{index + 1}</span>
            )}
          </div>
        ))}
      </div>

      {/* Progress percentage */}
      <p className="mt-4 text-xs text-slate-500">
        {Math.round(progress)}% завершено
      </p>

      <span className="sr-only">
        Генерация контента, этап {currentStageIndex + 1} из {STAGES.length}: {currentStage.label}
      </span>
    </div>
  );
};
