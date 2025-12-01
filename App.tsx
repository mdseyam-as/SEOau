
import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { SettingsForm } from './components/SettingsForm';
import { ResultView } from './components/ResultView';
import { KeywordList } from './components/KeywordList';
import { AuthScreen } from './components/AuthScreen';
import { AdminPanel } from './components/AdminPanel';
import { ProjectList } from './components/ProjectList';
import { HistoryList } from './components/HistoryList';
import { generateSeoContent, checkContentForSpam, fixContentSpam, optimizeContentRelevance, calculateSeoMetrics } from './services/geminiService';
import { GenerationConfig, KeywordRow, SeoResult, AIModel, Project, TextTone, TextStyle } from './types';
import { LayoutDashboard, LogOut, ShieldCheck, Clock, Lock, ExternalLink, ChevronRight, Home, History, Sparkles, Zap } from 'lucide-react';
import { User, authService, SubscriptionPlan } from './services/authService';
import { projectService } from './services/projectService';
import { apiService } from './services/apiService';

const DEFAULT_CONFIG: GenerationConfig = {
  websiteName: '',
  targetCountry: 'Казахстан',
  targetUrl: '',
  topic: '',
  lsiKeywords: '',
  competitorUrls: '',
  exampleContent: '',
  tone: TextTone.PROFESSIONAL,
  style: TextStyle.INFORMATIVE,
  minChars: 2500,
  maxChars: 5000,
  minParas: 3,
  maxParas: 12,
  model: AIModel.GEMINI_2_0_FLASH,
};

export default function App() {
  // Detect if running in Telegram WebApp environment
  const isTelegramEnv = typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;

  // Helper function to check limits (API or localStorage based on environment)
  const checkLimits = async (user: User) => {
    if (isTelegramEnv) {
      return apiService.checkLimits(user.telegramId);
    }
    // dev-режим
    return authService.checkGenerationLimit(user);
  };

  // Helper function to increment usage (API or localStorage based on environment)
  const incrementUsage = async (user: User) => {
    if (isTelegramEnv) {
      const { user: updatedUser } = await apiService.incrementUsage(user.telegramId);
      return updatedUser;
    }
    // dev-режим
    return authService.incrementGenerationUsage(user.telegramId);
  };
  const [user, setUser] = useState<User | null>(null);
  const [userPlan, setUserPlan] = useState<SubscriptionPlan | null>(null);

  // Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectTab, setProjectTab] = useState<'generator' | 'history'>('generator');
  const [projectHistory, setProjectHistory] = useState<any[]>([]);

  // Generator State
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [config, setConfig] = useState<GenerationConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<SeoResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spam Fix State
  const [isFixingSpam, setIsFixingSpam] = useState(false);

  // Relevance Optimization State
  const [isOptimizingRelevance, setIsOptimizingRelevance] = useState(false);

  // Admin State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [telegramLink, setTelegramLink] = useState('');

  useEffect(() => {
    const settings = authService.getGlobalSettings();
    setTelegramLink(settings.telegramLink);
  }, []);

  // Update plan when user changes
  useEffect(() => {
    if (user) {
      const plan = authService.getPlanById(user.planId);
      setUserPlan(plan);
      loadProjects();

      // Update config if current model is not allowed in new plan
      if (!plan.allowedModels.includes(config.model as string) && plan.allowedModels.length > 0) {
        setConfig(prev => ({ ...prev, model: plan.allowedModels[0] as AIModel }));
      }
    }
  }, [user]);

  // Load history when project changes
  useEffect(() => {
    if (currentProject) {
      const history = projectService.getHistory(currentProject.id);
      setProjectHistory(history);
      // Reset generator when entering project
      setKeywords([]);
      setConfig(DEFAULT_CONFIG);
      setResult(null);
      setProjectTab('generator');
    }
  }, [currentProject]);

  const loadProjects = () => {
    if (user) {
      setProjects(projectService.getProjects(user.telegramId));
    }
  };

  const handleCreateProject = (name: string, description: string) => {
    if (user) {
      projectService.createProject(user.telegramId, name, description);
      loadProjects();
    }
  };

  const handleDeleteProject = (id: string) => {
    projectService.deleteProject(id);
    loadProjects();
  };

  const isSubscriptionActive = React.useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.planId === 'free') return true;
    if (!user.subscriptionExpiry) return false;
    return new Date(user.subscriptionExpiry) > new Date();
  }, [user]);

  const daysRemaining = React.useMemo(() => {
    if (!user || !user.subscriptionExpiry) return 0;
    const diff = new Date(user.subscriptionExpiry).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;

    // 1. Check Generation Limit
    const limitCheck = await checkLimits(user);
    if (!limitCheck.allowed) {
      if (limitCheck.reason === 'daily_limit') {
        setError(`Превышен дневной лимит генераций (${userPlan?.maxGenerationsPerDay || 0}). Приходите завтра!`);
      } else {
        setError(`Превышен месячный лимит генераций (${userPlan?.maxGenerationsPerMonth || 0}). Обновите подписку.`);
      }
      return;
    }

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
      const data = await generateSeoContent(config, keywords);

      // -- SPAM CHECK INTEGRATION --
      if (userPlan?.canCheckSpam) {
        try {
          const spamResult = await checkContentForSpam(data.content);
          data.spamScore = spamResult.spamScore;
          data.spamAnalysis = spamResult.spamAnalysis;
        } catch (spamError) {
          console.error("Auto spam check failed", spamError);
        }
      }

      setResult(data);

      // Save to History if in a project
      if (currentProject) {
        projectService.addToHistory(currentProject.id, config, data);
        // Refresh history
        setProjectHistory(projectService.getHistory(currentProject.id));
      }

      // 2. Increment usage
      const updatedUser = await incrementUsage(user);
      setUser(updatedUser); // Update local state to reflect count change

    } catch (err: any) {
      setError(err.message || "Ошибка генерации. Проверьте настройки API ключа.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFixSpam = async (content: string, analysis: string, model: string) => {
    if (!userPlan?.canCheckSpam || !result || !user) return;

    // 1. Check Limits (Fixing counts as a generation)
    const limitCheck = await checkLimits(user);
    if (!limitCheck.allowed) {
      const msg = limitCheck.reason === 'daily_limit'
        ? `Превышен дневной лимит (${userPlan?.maxGenerationsPerDay}). Исправление недоступно.`
        : `Превышен месячный лимит (${userPlan?.maxGenerationsPerMonth}). Исправление недоступно.`;
      alert(msg);
      return;
    }

    setIsFixingSpam(true);
    try {
      // 2. Rewriting text using the User-Selected Model
      const newContent = await fixContentSpam(content, analysis, model);

      // Update result with new content
      const updatedResult = { ...result, content: newContent };

      // 3. Re-check spam on new content using Grok (Standard Procedure)
      try {
        const reCheck = await checkContentForSpam(newContent);
        updatedResult.spamScore = reCheck.spamScore;
        updatedResult.spamAnalysis = reCheck.spamAnalysis;
      } catch (e) {
        console.error("Re-check failed", e);
        updatedResult.spamAnalysis = "Текст обновлен, но повторный анализ не удался.";
      }

      // Re-calculate Metrics
      try {
        updatedResult.metrics = calculateSeoMetrics(newContent, keywords);
      } catch (e) { console.error("Metrics recalc failed", e); }

      setResult(updatedResult);

      // 4. Increment usage
      const updatedUser = await incrementUsage(user);
      setUser(updatedUser);

      // Optionally update history if needed, but complex to find/replace
      if (currentProject) {
        // Just add as a new history item for now to preserve original
        projectService.addToHistory(currentProject.id, { ...config, topic: config.topic + " (Fix Spam)" }, updatedResult);
        setProjectHistory(projectService.getHistory(currentProject.id));
      }

    } catch (err: any) {
      alert("Не удалось исправить текст: " + err.message);
    } finally {
      setIsFixingSpam(false);
    }
  };

  const handleOptimizeRelevance = async (missingKeywords: string[]) => {
    if (!userPlan?.canOptimizeRelevance || !result || !user) return;

    const limitCheck = await checkLimits(user);
    if (!limitCheck.allowed) {
      alert("Лимит генераций исчерпан. Функция недоступна.");
      return;
    }

    setIsOptimizingRelevance(true);
    try {
      const newContent = await optimizeContentRelevance(result.content, missingKeywords, config);

      const updatedResult = { ...result, content: newContent };

      // Recalculate metrics
      try {
        updatedResult.metrics = calculateSeoMetrics(newContent, keywords);
      } catch (e) { console.error("Metrics recalc failed", e); }

      // Re-check spam
      if (userPlan.canCheckSpam) {
        try {
          const spam = await checkContentForSpam(newContent);
          updatedResult.spamScore = spam.spamScore;
          updatedResult.spamAnalysis = spam.spamAnalysis;
        } catch (e) { }
      }

      setResult(updatedResult);

      const updatedUser = await incrementUsage(user);
      setUser(updatedUser);

      if (currentProject) {
        projectService.addToHistory(currentProject.id, { ...config, topic: config.topic + " (Optimize)" }, updatedResult);
        setProjectHistory(projectService.getHistory(currentProject.id));
      }
    } catch (err: any) {
      alert("Ошибка оптимизации: " + err.message);
    } finally {
      setIsOptimizingRelevance(false);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    projectService.deleteHistoryItem(id);
    if (currentProject) {
      setProjectHistory(projectService.getHistory(currentProject.id));
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUserPlan(null);
    setResult(null);
    setKeywords([]);
    setConfig(DEFAULT_CONFIG);
    setShowAdminPanel(false);
    setCurrentProject(null);
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'admin') {
      // Don't auto-show admin panel, let them choose.
      // But we can default to projects.
    }
  };

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const isLocked = !isSubscriptionActive && user.role !== 'admin';

  // Calculate daily usage for display
  const today = new Date().toISOString().slice(0, 10);
  const dailyUsed = (user.lastGenerationDate === today) ? (user.generationsUsedToday || 0) : 0;
  const monthlyUsed = (user.generationsUsed || 0);

  // Calculate remaining limits
  const dailyLimit = userPlan?.maxGenerationsPerDay || 0;
  const monthlyLimit = userPlan?.maxGenerationsPerMonth || 0;

  const dailyRemaining = dailyLimit === 0 ? '∞' : Math.max(0, dailyLimit - dailyUsed);
  const monthlyRemaining = monthlyLimit === 0 ? '∞' : Math.max(0, monthlyLimit - monthlyUsed);

  const renderContent = () => {
    if (showAdminPanel && user.role === 'admin') {
      return <AdminPanel />;
    }

    // --- Project Selection View ---
    if (!currentProject) {
      return (
        <ProjectList
          projects={projects}
          onCreateProject={handleCreateProject}
          onSelectProject={setCurrentProject}
          onDeleteProject={handleDeleteProject}
        />
      );
    }

    // --- Project Detail View ---
    return (
      <div className="space-y-6">
        {/* Project Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div>
            <div className="flex items-center text-sm text-slate-500 mb-1">
              <button onClick={() => setCurrentProject(null)} className="hover:text-brand-green flex items-center gap-1">
                <Home className="w-3 h-3" /> Проекты
              </button>
              <ChevronRight className="w-4 h-4 mx-1" />
              <span className="font-bold text-slate-800">{currentProject.name}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{currentProject.name}</h2>
          </div>

          <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-auto">
            <button
              onClick={() => setProjectTab('generator')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${projectTab === 'generator' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Sparkles className="w-4 h-4" /> Генератор
            </button>
            <button
              onClick={() => setProjectTab('history')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${projectTab === 'history' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <History className="w-4 h-4" /> История <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full text-gray-600 ml-1">{projectHistory.length}</span>
            </button>
          </div>
        </div>

        {projectTab === 'history' ? (
          <HistoryList history={projectHistory} onDelete={handleDeleteHistoryItem} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 animate-in fade-in slide-in-from-bottom-2">
            {/* Left Sidebar: Inputs */}
            <div className="lg:col-span-4 space-y-6 order-1">

              {/* Subscription Alert */}
              {isLocked && (
                <div className="relative overflow-hidden bg-white rounded-xl shadow-lg border border-red-100 animate-in slide-in-from-top duration-500 z-10">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-orange-500"></div>
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-red-50 rounded-full text-red-500 shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight">
                          Доступ ограничен
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Срок действия вашей подписки истек.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <a
                        href={telegramLink}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold py-2 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Купить подписку
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="font-bold text-lg mb-4 text-slate-900">1. Источник данных</h2>
                <FileUpload
                  onKeywordsLoaded={setKeywords}
                  disabled={isLocked}
                  maxKeywords={userPlan?.maxKeywords}
                />
                <KeywordList keywords={keywords} />
              </div>

              <SettingsForm
                key={currentProject ? currentProject.id : 'global'}
                config={config}
                onChange={setConfig}
                disabled={isGenerating}
                isLocked={isLocked}
                onSubmit={handleGenerate}
                userPlan={userPlan}
              />
            </div>

            {/* Right Area: Results & Status */}
            <div className="lg:col-span-8 order-2">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg animate-in fade-in">
                  <p className="text-red-700 font-medium text-sm md:text-base">Ошибка: {error}</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-64 md:h-96 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-lg md:text-xl font-semibold text-slate-900">Генерация контента...</h3>
                  <p className="text-sm md:text-base text-slate-500 mt-2 text-center max-w-xs md:max-w-md px-4">
                    Анализ {keywords.length} ключевых слов и генерация статьи...
                  </p>
                </div>
              )}

              {!isGenerating && !result && (
                <div className={`flex flex-col items-center justify-center h-64 md:h-96 bg-white rounded-xl shadow-sm border border-gray-200 border-dashed ${isLocked ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <div className="p-4 md:p-6 bg-gray-50 rounded-full mb-4">
                    <LayoutDashboard className="w-8 h-8 md:w-12 md:h-12 text-gray-300" />
                  </div>
                  <p className="text-base md:text-lg text-slate-500 font-medium">Готов к работе</p>
                  <p className="text-xs md:text-sm text-slate-400 text-center px-4">Загрузите Excel, настройте контекст и параметры.</p>
                </div>
              )}

              {!isGenerating && result && (
                <div className={isLocked ? 'opacity-60 grayscale-[0.5] pointer-events-none select-none blur-[1px]' : ''}>
                  <ResultView
                    result={result}
                    onFixSpam={userPlan?.canCheckSpam ? handleFixSpam : undefined}
                    isFixingSpam={isFixingSpam}
                    userPlan={userPlan}
                    onOptimizeRelevance={userPlan?.canOptimizeRelevance ? handleOptimizeRelevance : undefined}
                    isOptimizingRelevance={isOptimizingRelevance}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-10 md:pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <header className="bg-brand-dark text-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between xl:max-w-7xl">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentProject(null); setShowAdminPanel(false); }}>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-green rounded-lg flex items-center justify-center shadow-lg shrink-0">
              <LayoutDashboard className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-lg md:text-xl font-bold tracking-tight truncate">SEO Generator</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Admin Toggle */}
            {user.role === 'admin' && (
              <button
                onClick={() => { setShowAdminPanel(!showAdminPanel); setCurrentProject(null); }}
                className={`
                  px-3 py-1.5 text-xs md:text-sm rounded-full font-medium flex items-center gap-2 transition-colors
                  ${showAdminPanel ? 'bg-white text-brand-dark' : 'bg-slate-700 text-white hover:bg-slate-600'}
                `}
              >
                <ShieldCheck className="w-4 h-4" />
                {showAdminPanel ? 'Выйти' : 'Админка'}
              </button>
            )}

            {/* Subscription Counter (For Users) */}
            {user.role !== 'admin' && (
              <div className="hidden md:flex items-center gap-2">
                {/* Generation Usage Counter - REMAINING */}
                <div className="flex flex-col items-end sm:flex-row sm:items-center gap-2 bg-slate-700 px-3 py-1.5 rounded-lg sm:rounded-full border border-slate-600" title="Осталось генераций">
                  <Zap className={`w-4 h-4 text-yellow-400`} />
                  <div className="flex flex-col sm:flex-row gap-0 sm:gap-3 text-xs sm:text-sm font-medium text-gray-200">
                    <span title="Осталось на сегодня">
                      Сутки: <span className={(typeof dailyRemaining === 'number' && dailyRemaining <= 0) ? 'text-red-400' : 'text-white'}>{dailyRemaining}</span>
                    </span>
                    <span className="hidden sm:inline text-slate-500">|</span>
                    <span title="Осталось на месяц">
                      Всего: <span className={(typeof monthlyRemaining === 'number' && monthlyRemaining <= 0) ? 'text-red-400' : 'text-white'}>{monthlyRemaining}</span>
                    </span>
                  </div>
                </div>

                {isSubscriptionActive ? (
                  <div className="flex items-center gap-2 bg-brand-green/10 bg-opacity-20 px-3 py-1.5 rounded-full border border-brand-green/30">
                    <Clock className="w-4 h-4 text-brand-green" />
                    {user.planId === 'free' ? (
                      <span className="text-sm font-medium text-green-400">Бессрочно</span>
                    ) : (
                      <span className="text-sm font-medium text-green-400">
                        {daysRemaining} дн.
                      </span>
                    )}
                    {userPlan && (
                      <span className="hidden lg:inline text-xs bg-brand-dark/50 px-2 py-0.5 rounded text-gray-300 ml-1">
                        {userPlan.name}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/50">
                    <Lock className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">Нет доступа</span>
                  </div>
                )}
              </div>
            )}

            <div className="hidden md:block text-sm text-slate-400">
              {user.firstName} {user.username ? `(@${user.username})` : ''}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 xl:max-w-7xl">
        {renderContent()}
      </main>
    </div>
  );
}
