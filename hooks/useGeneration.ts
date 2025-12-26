/**
 * useGeneration Hook
 * Hook для управления генерацией контента
 */

import { useState, useCallback } from 'react';
import { GenerationConfig, KeywordRow, SeoResult } from '../types';
import { apiService } from '../services/apiService';
import { User } from '../services/authService';
import { SubscriptionPlan } from '../services/authService';
import { projectService } from '../services/projectService';
import { calculateSeoMetrics } from '../services/geminiService';

interface UseGenerationReturn {
  keywords: KeywordRow[];
  setKeywords: (keywords: KeywordRow[]) => void;
  config: GenerationConfig;
  setConfig: (config: GenerationConfig) => void;
  result: SeoResult | null;
  setResult: (result: SeoResult | null) => void;
  isGenerating: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  handleGenerate: () => Promise<void>;
  handleFixSpam: (content: string, analysis: string, model: string) => Promise<void>;
  handleOptimizeRelevance: (missingKeywords: string[]) => Promise<void>;
  handleHumanize: (content: string, intensity: 'light' | 'medium' | 'strong', model: string) => Promise<void>;
}

export function useGeneration(
  user: User | null,
  userPlan: SubscriptionPlan | null,
  currentProjectId: string | null,
  hapticNotification: (type: 'success' | 'warning' | 'error') => void
): UseGenerationReturn {
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [config, setConfig] = useState<GenerationConfig>({
    websiteName: '',
    targetCountry: 'Казахстан',
    targetUrl: '',
    topic: '',
    lsiKeywords: '',
    competitorUrls: '',
    exampleContent: '',
    tone: 'Professional' as any,
    style: 'Informative' as any,
    minChars: 2500,
    maxChars: 5000,
    minParas: 3,
    maxParas: 12,
    model: 'gemini-3-flash' as any,
    generationMode: 'seo' as any,
    language: 'Russian' as any,
  });
  const [result, setResult] = useState<SeoResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!user) return;

    if (!keywords.length && !config.topic) {
      setError("Пожалуйста, загрузите ключевые слова или укажите тему.");
      return;
    }

    if (!config.websiteName) {
      setError("Пожалуйста, укажите название сайта/бренда.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const { result: data, user: updatedUser } = await apiService.generate(config, keywords);

      setResult(data);
      
      // Обновляем пользователя через callback
      hapticNotification('success');

      // Сохраняем в историю если есть проект
      if (currentProjectId) {
        await projectService.addToHistory(currentProjectId, config, data);
      }

    } catch (err: any) {
      if (err.message?.includes('Limit exceeded')) {
        if (err.message.includes('daily_limit')) {
          setError(`Превышен дневной лимит генераций (${userPlan?.maxGenerationsPerDay || 0}). Приходите завтра!`);
        } else if (err.message.includes('monthly_limit')) {
          setError(`Превышен месячный лимит генераций (${userPlan?.maxGenerationsPerMonth || 0}). Обновите подписку.`);
        } else {
          setError(err.message);
        }
      } else {
        setError(err.message || "Ошибка генерации. Проверьте настройки API ключа.");
      }
    } finally {
      setIsGenerating(false);
    }
  }, [user, userPlan, keywords, config, currentProjectId, hapticNotification]);

  const handleFixSpam = useCallback(async (content: string, analysis: string, model: string) => {
    if (!userPlan?.canCheckSpam || !result || !user) return;

    try {
      const { content: newContent, user: updatedUser } = await apiService.fixSpam(content, analysis, model);

      const updatedResult = { ...result, content: newContent };

      try {
        const reCheck = await apiService.checkSpam(newContent);
        updatedResult.spamScore = reCheck.spamScore;
        updatedResult.spamAnalysis = reCheck.spamAnalysis;
      } catch (e) {
        console.error("Re-check failed", e);
        updatedResult.spamAnalysis = "Текст обновлён, но повторный анализ не удался.";
      }

      try {
        updatedResult.metrics = calculateSeoMetrics(newContent, keywords);
      } catch (e) {
        console.error("Metrics recalc failed", e);
      }

      setResult(updatedResult);

      if (currentProjectId) {
        await projectService.addToHistory(currentProjectId, { ...config, topic: config.topic + " (Fix Spam)" }, updatedResult);
      }

    } catch (err: any) {
      if (err.message?.includes('Limit exceeded')) {
        setError("Лимит исчерпан. Исправление недоступно. Обновите подписку.");
      } else {
        setError(err.message || "Не удалось исправить текст");
      }
    }
  }, [userPlan, result, user, config, keywords, currentProjectId]);

  const handleOptimizeRelevance = useCallback(async (missingKeywords: string[]) => {
    if (!userPlan?.canOptimizeRelevance || !result || !user) return;

    try {
      const { content: newContent, user: updatedUser } = await apiService.optimizeRelevance(result.content, missingKeywords, config);

      const updatedResult = { ...result, content: newContent };

      try {
        updatedResult.metrics = calculateSeoMetrics(newContent, keywords);
      } catch (e) {
        console.error("Metrics recalc failed", e);
      }

      if (userPlan.canCheckSpam) {
        try {
          const spam = await apiService.checkSpam(newContent);
          updatedResult.spamScore = spam.spamScore;
          updatedResult.spamAnalysis = spam.spamAnalysis;
        } catch (e) {
          console.error("Spam recheck failed", e);
        }
      }

      setResult(updatedResult);

      if (currentProjectId) {
        await projectService.addToHistory(currentProjectId, { ...config, topic: config.topic + " (Optimize)" }, updatedResult);
      }

    } catch (err: any) {
      if (err.message?.includes('Limit exceeded')) {
        setError("Лимит исчерпан. Оптимизация недоступна. Обновите подписку.");
      } else {
        setError(err.message || "Ошибка оптимизации");
      }
    }
  }, [userPlan, result, user, config, keywords, currentProjectId]);

  const handleHumanize = useCallback(async (content: string, intensity: 'light' | 'medium' | 'strong', model: string) => {
    if (!result || !user) return;

    try {
      const languageMap: Record<string, string> = {
        'Русский': 'ru',
        'English': 'en',
        'Қазақша': 'kk',
        'Українська': 'uk',
        'Deutsch': 'de',
        'Français': 'fr',
        'Español': 'es',
        'Português': 'pt',
        'Italiano': 'it',
        'Polski': 'pl',
        'Türkçe': 'tr',
        '中文': 'zh',
        '日本語': 'ja',
        '한국어': 'ko',
        'العربية': 'ar'
      };
      const language = languageMap[config.language] || 'ru';

      const { content: humanizedContent, user: updatedUser } = await apiService.humanize(content, language, intensity, model);

      const updatedResult = { ...result, content: humanizedContent };

      try {
        updatedResult.metrics = calculateSeoMetrics(humanizedContent, keywords);
      } catch (e) {
        console.error("Metrics recalc failed", e);
      }

      if (userPlan?.canCheckSpam) {
        try {
          const spam = await apiService.checkSpam(humanizedContent);
          updatedResult.spamScore = spam.spamScore;
          updatedResult.spamAnalysis = spam.spamAnalysis;
        } catch (e) {
          console.error("Spam recheck failed", e);
        }
      }

      setResult(updatedResult);

      if (currentProjectId) {
        await projectService.addToHistory(currentProjectId, { ...config, topic: config.topic + " (Humanized)" }, updatedResult);
      }

    } catch (err: any) {
      if (err.message?.includes('Limit exceeded')) {
        setError("Лимит исчерпан. Humanize недоступен. Обновите подписку.");
      } else {
        setError(err.message || "Не удалось обработать текст");
      }
    }
  }, [result, user, config, keywords, currentProjectId, userPlan]);

  return {
    keywords,
    setKeywords,
    config,
    setConfig,
    result,
    setResult,
    isGenerating,
    error,
    setError,
    handleGenerate,
    handleFixSpam,
    handleOptimizeRelevance,
    handleHumanize,
  };
}
