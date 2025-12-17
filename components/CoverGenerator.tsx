import React, { useState } from 'react';
import { Image, Copy, Check, Palette, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { apiService } from '../services/apiService';
import { SubscriptionPlan } from '../types';

interface CoverGeneratorProps {
  title: string;
  topic: string;
  keywords: string[];
  userPlan?: SubscriptionPlan | null;
  onUserUpdate?: (user: any) => void;
}

type CoverStyle = 'modern' | 'minimalist' | 'corporate' | 'creative' | 'tech';

interface CoverPrompts {
  dallePrompt: string;
  midjourneyPrompt: string;
  stableDiffusionPrompt: string;
  negativePrompt: string;
  description: string;
}

interface CoverResult {
  prompts: CoverPrompts;
  alt: string;
  style: string;
  message: string;
}

const styleOptions: { value: CoverStyle; label: string; description: string }[] = [
  { value: 'modern', label: 'Современный', description: 'Градиенты и геометрия' },
  { value: 'minimalist', label: 'Минимализм', description: 'Чистый дизайн' },
  { value: 'corporate', label: 'Корпоративный', description: 'Бизнес-стиль' },
  { value: 'creative', label: 'Креативный', description: 'Яркие цвета' },
  { value: 'tech', label: 'Технологичный', description: 'Неон и футуризм' },
];

const aiServices = [
  { name: 'DALL-E 3', url: 'https://openai.com/dall-e-3', promptKey: 'dallePrompt' as const },
  { name: 'Midjourney', url: 'https://midjourney.com', promptKey: 'midjourneyPrompt' as const },
  { name: 'Leonardo AI', url: 'https://leonardo.ai', promptKey: 'stableDiffusionPrompt' as const },
  { name: 'Stable Diffusion', url: 'https://stability.ai', promptKey: 'stableDiffusionPrompt' as const },
];

export const CoverGenerator: React.FC<CoverGeneratorProps> = ({
  title,
  topic,
  keywords,
  userPlan,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverResult, setCoverResult] = useState<CoverResult | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<CoverStyle>('modern');
  const [error, setError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [copiedAlt, setCopiedAlt] = useState(false);

  const canGenerate = userPlan?.canGenerateCover;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const { cover } = await apiService.generateCover(title, topic, keywords, selectedStyle);
      setCoverResult(cover);
    } catch (err: any) {
      setError(err.message || 'Не удалось сгенерировать промпты');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = (promptKey: keyof CoverPrompts, promptName: string) => {
    if (!coverResult?.prompts) return;
    navigator.clipboard.writeText(coverResult.prompts[promptKey]);
    setCopiedPrompt(promptKey);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const handleCopyAlt = () => {
    if (!coverResult?.alt) return;
    navigator.clipboard.writeText(coverResult.alt);
    setCopiedAlt(true);
    setTimeout(() => setCopiedAlt(false), 2000);
  };

  if (!canGenerate) {
    return (
      <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl opacity-60">
        <div className="flex items-center gap-3 text-slate-400">
          <Image className="w-5 h-5" />
          <div>
            <h3 className="font-bold text-sm sm:text-base">Генератор обложки</h3>
            <p className="text-xs">Недоступно для вашего тарифа</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl">
      <h3 className="font-bold text-sm sm:text-base lg:text-lg mb-4 text-white flex items-center gap-2">
        <Image className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
        Генератор обложки (AI Prompts)
      </h3>

      {/* Style Selection */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-400 mb-2">
          <Palette className="w-3 h-3 inline mr-1" />
          Стиль обложки
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {styleOptions.map((style) => (
            <button
              key={style.value}
              onClick={() => setSelectedStyle(style.value)}
              disabled={isGenerating}
              className={`
                p-2 rounded-lg text-left transition-all border
                ${selectedStyle === style.value
                  ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="text-xs font-bold">{style.label}</div>
              <div className="text-[10px] opacity-70 hidden sm:block">{style.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`
          w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all
          ${isGenerating
            ? 'bg-slate-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 shadow-lg hover:shadow-pink-500/25'}
        `}
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Генерация промптов...
          </>
        ) : coverResult ? (
          <>
            <RefreshCw className="w-4 h-4" />
            Сгенерировать заново
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Сгенерировать промпты для обложки
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Generated Prompts Display */}
      {coverResult && (
        <div className="mt-4 space-y-3">
          {/* Description */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <p className="text-xs text-slate-300 leading-relaxed">
              <Sparkles className="w-3 h-3 inline mr-1 text-pink-400" />
              {coverResult.prompts.description}
            </p>
          </div>

          {/* AI Services with Prompts */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Промпты для AI-генераторов
            </span>

            {aiServices.map((service) => (
              <div key={service.name} className="bg-slate-900/50 rounded-lg p-3 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{service.name}</span>
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-400 hover:text-pink-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <button
                    onClick={() => handleCopyPrompt(service.promptKey, service.name)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-pink-400 transition-colors"
                  >
                    {copiedPrompt === service.promptKey ? (
                      <><Check className="w-3 h-3" /> Скопировано</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Копировать</>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 font-mono leading-relaxed break-words">
                  {coverResult.prompts[service.promptKey]}
                </p>
              </div>
            ))}

            {/* Negative Prompt (for Stable Diffusion) */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-orange-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-orange-400">Negative Prompt (SD)</span>
                <button
                  onClick={() => handleCopyPrompt('negativePrompt', 'Negative')}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-orange-400 transition-colors"
                >
                  {copiedPrompt === 'negativePrompt' ? (
                    <><Check className="w-3 h-3" /> Скопировано</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Копировать</>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 font-mono leading-relaxed">
                {coverResult.prompts.negativePrompt}
              </p>
            </div>
          </div>

          {/* Alt Text */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">
                SEO Alt-текст для изображения
              </span>
              <button
                onClick={handleCopyAlt}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-green-400 transition-colors"
              >
                {copiedAlt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedAlt ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{coverResult.alt}</p>
            <p className="text-[10px] text-slate-500 mt-2">
              Используйте этот alt-текст при вставке изображения в статью для SEO
            </p>
          </div>

          {/* Usage Tip */}
          <div className="text-[10px] text-slate-500 leading-relaxed bg-white/5 rounded-lg p-3">
            <strong>Как использовать:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Скопируйте промпт для нужного AI-генератора</li>
              <li>Перейдите на сайт генератора (например, <a href="https://leonardo.ai" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">Leonardo AI</a> - бесплатный)</li>
              <li>Вставьте промпт и сгенерируйте изображение</li>
              <li>Скачайте и добавьте в статью с SEO alt-текстом</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
