import React, { useState } from 'react';
import { Image, Copy, Check, Palette, RefreshCw, Sparkles, ExternalLink, Download, AlertCircle } from 'lucide-react';
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
  dallePrompt?: string;
  midjourneyPrompt?: string;
  altText?: string;
}

interface CoverResult {
  imageUrl?: string | null;
  prompts?: CoverPrompts;
  alt: string;
  style: string;
  model?: string;
  prompt?: string;
  error?: string;
}

const styleOptions: { value: CoverStyle; label: string; description: string }[] = [
  { value: 'modern', label: 'Современный', description: 'Градиенты и геометрия' },
  { value: 'minimalist', label: 'Минимализм', description: 'Чистый дизайн' },
  { value: 'corporate', label: 'Корпоративный', description: 'Бизнес-стиль' },
  { value: 'creative', label: 'Креативный', description: 'Яркие цвета' },
  { value: 'tech', label: 'Технологичный', description: 'Неон и футуризм' },
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
  const [copiedAlt, setCopiedAlt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const canGenerate = userPlan?.canGenerateCover;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const { cover } = await apiService.generateCover(title, topic, keywords, selectedStyle);
      setCoverResult(cover);
    } catch (err: any) {
      setError(err.message || 'Не удалось сгенерировать обложку');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAlt = () => {
    if (!coverResult?.alt) return;
    navigator.clipboard.writeText(coverResult.alt);
    setCopiedAlt(true);
    setTimeout(() => setCopiedAlt(false), 2000);
  };

  const handleCopyPrompt = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedPrompt(key);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const handleDownload = async () => {
    if (!coverResult?.imageUrl) return;
    
    try {
      // Handle both base64 and URL images
      if (coverResult.imageUrl.startsWith('data:')) {
        // Base64 image - convert to blob
        const response = await fetch(coverResult.imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cover-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // External URL - open in new tab for download
        window.open(coverResult.imageUrl, '_blank');
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
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
        Генератор обложки (AI)
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
            Генерация изображения...
          </>
        ) : coverResult ? (
          <>
            <RefreshCw className="w-4 h-4" />
            Сгенерировать заново
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
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

      {/* Generated Image Display */}
      {coverResult && (
        <div className="mt-4 space-y-3">
          {/* Image Preview */}
          {coverResult.imageUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-800">
                <img
                  src={coverResult.imageUrl}
                  alt={coverResult.alt}
                  className="w-full h-auto"
                  style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {coverResult.model || 'Gemini AI'}
                    </span>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1 px-3 py-1.5 bg-pink-500 hover:bg-pink-400 rounded-lg text-xs font-bold text-white transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Скачать
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : coverResult.error ? (
            /* Fallback: Show prompts if image generation failed */
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <p className="text-xs text-orange-300">{coverResult.error}</p>
              </div>

              {coverResult.prompts && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Используйте эти промпты в AI-генераторах:
                  </span>

                  {coverResult.prompts.dallePrompt && (
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">DALL-E / Leonardo AI</span>
                        <button
                          onClick={() => handleCopyPrompt('dalle', coverResult.prompts!.dallePrompt!)}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-pink-400"
                        >
                          {copiedPrompt === 'dalle' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedPrompt === 'dalle' ? 'Скопировано' : 'Копировать'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 font-mono break-words">
                        {coverResult.prompts.dallePrompt}
                      </p>
                    </div>
                  )}

                  {coverResult.prompts.midjourneyPrompt && (
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">Midjourney</span>
                        <button
                          onClick={() => handleCopyPrompt('mj', coverResult.prompts!.midjourneyPrompt!)}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-pink-400"
                        >
                          {copiedPrompt === 'mj' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedPrompt === 'mj' ? 'Скопировано' : 'Копировать'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 font-mono break-words">
                        {coverResult.prompts.midjourneyPrompt}
                      </p>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 p-2">
                    <a href="https://leonardo.ai" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                      Leonardo AI
                    </a> — бесплатный генератор изображений
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Alt Text */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">
                SEO Alt-текст
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
          </div>
        </div>
      )}
    </div>
  );
};
