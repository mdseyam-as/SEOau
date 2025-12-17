import React, { useState, useEffect } from 'react';
import { Image, Download, RefreshCw, Copy, Check, Palette } from 'lucide-react';
import { apiService } from '../services/apiService';
import { CoverImage, SubscriptionPlan } from '../types';

interface CoverGeneratorProps {
  title: string;
  topic: string;
  keywords: string[];
  userPlan?: SubscriptionPlan | null;
  onUserUpdate?: (user: any) => void;
}

type CoverStyle = 'modern' | 'minimalist' | 'corporate' | 'creative' | 'tech';

const styleOptions: { value: CoverStyle; label: string; description: string }[] = [
  { value: 'modern', label: 'Современный', description: 'Градиенты и жирная типографика' },
  { value: 'minimalist', label: 'Минимализм', description: 'Чистый дизайн с пустым пространством' },
  { value: 'corporate', label: 'Корпоративный', description: 'Профессиональный бизнес-стиль' },
  { value: 'creative', label: 'Креативный', description: 'Яркие цвета и уникальная композиция' },
  { value: 'tech', label: 'Технологичный', description: 'Футуристичный стиль с неоновыми акцентами' },
];

export const CoverGenerator: React.FC<CoverGeneratorProps> = ({
  title,
  topic,
  keywords,
  userPlan,
  onUserUpdate
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverImage, setCoverImage] = useState<CoverImage | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<CoverStyle>('modern');
  const [error, setError] = useState<string | null>(null);
  const [copiedAlt, setCopiedAlt] = useState(false);

  const canGenerate = userPlan?.canGenerateCover;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const { cover, user } = await apiService.generateCover(title, topic, keywords, selectedStyle);

      setCoverImage({
        url: cover.url || '',
        base64: cover.base64 || undefined,
        alt: cover.alt,
        prompt: cover.prompt
      });

      if (onUserUpdate) {
        onUserUpdate(user);
      }
    } catch (err: any) {
      setError(err.message || 'Не удалось сгенерировать обложку');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!coverImage) return;

    const imageSource = coverImage.base64 || coverImage.url;
    if (!imageSource) return;

    const link = document.createElement('a');
    link.href = imageSource;
    link.download = `cover-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAlt = () => {
    if (!coverImage?.alt) return;
    navigator.clipboard.writeText(coverImage.alt);
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
        Генератор обложки
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
            Генерация обложки...
          </>
        ) : coverImage ? (
          <>
            <RefreshCw className="w-4 h-4" />
            Сгенерировать заново
          </>
        ) : (
          <>
            <Image className="w-4 h-4" />
            Сгенерировать обложку
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Generated Cover Display */}
      {coverImage && (coverImage.url || coverImage.base64) && (
        <div className="mt-4 space-y-3">
          {/* Image Preview */}
          <div className="relative rounded-xl overflow-hidden border border-white/10">
            <img
              src={coverImage.base64 || coverImage.url}
              alt={coverImage.alt}
              className="w-full h-auto"
            />
            <button
              onClick={handleDownload}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
              title="Скачать"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Alt Text */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                SEO Alt-текст
              </span>
              <button
                onClick={handleCopyAlt}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-pink-400 transition-colors"
              >
                {copiedAlt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedAlt ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{coverImage.alt}</p>
          </div>

          {/* HTML Code */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              HTML код для вставки
            </span>
            <code className="text-xs text-pink-300 font-mono block overflow-x-auto">
              {`<img src="${coverImage.url || '[base64_data]'}" alt="${coverImage.alt}" />`}
            </code>
          </div>
        </div>
      )}
    </div>
  );
};
