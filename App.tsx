
import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { SettingsForm } from './components/SettingsForm';
import { ResultView } from './components/ResultView';
import { KeywordList } from './components/KeywordList';
import { AuthScreen } from './components/AuthScreen';
import { AdminPanel } from './components/AdminPanel';
import { ProjectList } from './components/ProjectList';
import { HistoryList } from './components/HistoryList';
import { calculateSeoMetrics } from './services/geminiService';
import { GenerationConfig, KeywordRow, SeoResult, AIModel, Project, TextTone, TextStyle, GenerationMode, ContentLanguage } from './types';
import { LayoutDashboard, LogOut, ShieldCheck, Clock, Lock, ExternalLink, ChevronRight, Home, History, Sparkles, Zap, Search, RefreshCw } from 'lucide-react';
import { User, authService, SubscriptionPlan } from './services/authService';
import { projectService } from './services/projectService';
import { apiService } from './services/apiService';
import { projectConfigService } from './services/projectConfigService';
import { SeoAuditor } from './components/SeoAuditor';
import { RewriteMode } from './components/RewriteMode';
import { useToast } from './components/Toast';
import { ResultSkeleton } from './components/Skeleton';
import { GenerationProgress } from './components/GenerationProgress';

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
  model: AIModel.GEMINI_3_FLASH,
  generationMode: 'seo' as GenerationMode,
  language: ContentLanguage.RUSSIAN,
};

export default function App() {
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userPlan, setUserPlan] = useState<SubscriptionPlan | null>(null);

  // Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectTab, setProjectTab] = useState<'generator' | 'history' | 'audit' | 'rewrite'>('generator');
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
      const loadPlan = async () => {
        try {
          const { plan } = await apiService.getPlan(user.planId);
          setUserPlan(plan);

          // Update config if current model is not allowed in new plan
          if (!plan.allowedModels.includes(config.model as string) && plan.allowedModels.length > 0) {
            setConfig(prev => ({ ...prev, model: plan.allowedModels[0] as AIModel }));
          }
        } catch (e) {
          console.error("Failed to load plan", e);
          // Fallback to local if API fails
          const localPlan = authService.getPlanById(user.planId);
          setUserPlan(localPlan);
        }
      };
      loadPlan();
      loadProjects();
    }
  }, [user]);

  // Load history when project changes
  useEffect(() => {
    if (currentProject) {
      const loadHistory = async () => {
        const history = await projectService.getHistory(currentProject.id);
        setProjectHistory(history);
      };
      loadHistory();

      // Load saved config for this project or use default
      const savedConfig = projectConfigService.getConfig(currentProject.id);
      if (savedConfig) {
        setConfig(savedConfig);
      } else {
        setConfig(DEFAULT_CONFIG);
      }

      // Reset generator state
      setKeywords([]);
      setResult(null);
      setProjectTab('generator');
    }
  }, [currentProject]);

  const loadProjects = async () => {
    if (user) {
      const loadedProjects = await projectService.getProjects(user.telegramId);
      setProjects(loadedProjects);
    }
  };

  const handleCreateProject = async (name: string, description: string) => {
    if (user) {
      try {
        await projectService.createProject(user.telegramId, name, description);
        await loadProjects();
      } catch (err: any) {
        console.error('Failed to create project:', err);
        setError(err.message || 'Не удалось создать проект');
      }
    }
  };

  const handleDeleteProject = async (id: string) => {
    // Delete saved config when deleting project
    projectConfigService.deleteConfig(id);
    await projectService.deleteProject(id);
    await loadProjects();
  };

  // Auto-save config when it changes (only if in a project)
  useEffect(() => {
    if (currentProject && config) {
      projectConfigService.saveConfig(currentProject.id, config);
    }
  }, [config, currentProject]);

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
      // Use backend API for generation (API key stays on server)
      const { result: data, user: updatedUser } = await apiService.generate(config, keywords);

      setResult(data);
      setUser(updatedUser);

      // Save to History if in a project
      if (currentProject) {
        await projectService.addToHistory(currentProject.id, config, data);
        const history = await projectService.getHistory(currentProject.id);
        setProjectHistory(history);
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
  };

  const handleFixSpam = async (content: string, analysis: string, model: string) => {
    if (!userPlan?.canCheckSpam || !result || !user) return;

    setIsFixingSpam(true);
    try {
      // Use backend API for spam fix
      const { content: newContent, user: updatedUser } = await apiService.fixSpam(content, analysis, model);

      // Update result with new content
      const updatedResult = { ...result, content: newContent };

      // Re-check spam on new content
      try {
        const reCheck = await apiService.checkSpam(newContent);
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
      setUser(updatedUser);

      // Save to history
      if (currentProject) {
        await projectService.addToHistory(currentProject.id, { ...config, topic: config.topic + " (Fix Spam)" }, updatedResult);
        const history = await projectService.getHistory(currentProject.id);
        setProjectHistory(history);
      }

    } catch (err: any) {
      if (err.message?.includes('Limit exceeded')) {
        toast.error("Лимит исчерпан", "Исправление недоступно. Обновите подписку.");
      } else {
        toast.error("Ошибка", err.message || "Не удалось исправить текст");
      }
    } finally {
      setIsFixingSpam(false);
    }
  };

  const handleOptimizeRelevance = async (missingKeywords: string[]) => {
    if (!userPlan?.canOptimizeRelevance || !result || !user) return;

    setIsOptimizingRelevance(true);
    try {
      // Use backend API for optimization
      const { content: newContent, user: updatedUser } = await apiService.optimizeRelevance(result.content, missingKeywords, config);

      const updatedResult = { ...result, content: newContent };

      // Recalculate metrics
      try {
        updatedResult.metrics = calculateSeoMetrics(newContent, keywords);
      } catch (e) { console.error("Metrics recalc failed", e); }

      // Re-check spam
      if (userPlan.canCheckSpam) {
        try {
          const spam = await apiService.checkSpam(newContent);
          updatedResult.spamScore = spam.spamScore;
          updatedResult.spamAnalysis = spam.spamAnalysis;
        } catch (e) { }
      }

      setResult(updatedResult);
      setUser(updatedUser);

      if (currentProject) {
        await projectService.addToHistory(currentProject.id, { ...config, topic: config.topic + " (Optimize)" }, updatedResult);
        const history = await projectService.getHistory(currentProject.id);
        setProjectHistory(history);
      }
    } catch (err: any) {
      if (err.message?.includes('Limit exceeded')) {
        toast.error("Лимит исчерпан", "Оптимизация недоступна. Обновите подписку.");
      } else {
        toast.error("Ошибка оптимизации", err.message);
      }
    } finally {
      setIsOptimizingRelevance(false);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await projectService.deleteHistoryItem(id);
    if (currentProject) {
      const history = await projectService.getHistory(currentProject.id);
      setProjectHistory(history);
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

  const handleLogin = async (loggedInUser: User) => {
    setUser(loggedInUser);

    // Load global settings from backend (API key, system prompt, etc.)
    try {
      await authService.loadGlobalSettings();
      const settings = authService.getGlobalSettings();
      setTelegramLink(settings.telegramLink);
    } catch (e) {
      console.error('Failed to load global settings:', e);
    }

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
      <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        {/* Project Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200">
          <div>
            <div className="flex items-center text-sm text-slate-500 mb-1">
              <button onClick={() => setCurrentProject(null)} className="hover:text-brand-green flex items-center gap-1">
                <Home className="w-3 h-3" /> Проекты
              </button>
              <ChevronRight className="w-4 h-4 mx-1" />
              <span className="font-bold text-slate-800">{currentProject.name}</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">{currentProject.name}</h2>
          </div>

          <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-auto">
            <button
              onClick={() => setProjectTab('generator')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${projectTab === 'generator' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Генератор</span>
            </button>
            <button
              onClick={() => setProjectTab('audit')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${projectTab === 'audit' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Search className="w-4 h-4" /> <span className="hidden sm:inline">Аудит</span>
            </button>
            <button
              onClick={() => setProjectTab('rewrite')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${projectTab === 'rewrite' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Рерайт</span>
            </button>
            <button
              onClick={() => setProjectTab('history')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${projectTab === 'history' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <History className="w-4 h-4" /> <span className="hidden sm:inline">История</span> <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full text-gray-600 ml-1">{projectHistory.length}</span>
            </button>
          </div>
        </div>

        {projectTab === 'history' ? (
          <HistoryList history={projectHistory} onDelete={handleDeleteHistoryItem} />
        ) : projectTab === 'audit' ? (
          <SeoAuditor onUserUpdate={setUser} />
        ) : projectTab === 'rewrite' ? (
          <RewriteMode onUserUpdate={setUser} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Left Sidebar: Inputs */}
            <div className="lg:col-span-4 space-y-4 sm:space-y-5 lg:space-y-6 order-1">

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

              <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-slate-900">1. Источник данных</h2>
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <GenerationProgress
                    keywordsCount={keywords.length}
                    isGeoMode={config.generationMode === 'geo'}
                  />
                  <ResultSkeleton />
                </div>
              )}

              {!isGenerating && !result && (
                <div
                  className={`flex flex-col items-center justify-center h-64 md:h-96 bg-white rounded-xl shadow-sm border border-gray-200 border-dashed relative ${isLocked ? 'pointer-events-none' : ''}`}
                  aria-disabled={isLocked}
                >
                  {isLocked && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
                      <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-white/60 mx-auto mb-2" />
                        <p className="text-white/80 font-medium text-sm">Доступ ограничен</p>
                      </div>
                    </div>
                  )}
                  <div className="p-4 md:p-6 bg-gray-50 rounded-full mb-4">
                    <LayoutDashboard className="w-8 h-8 md:w-12 md:h-12 text-gray-300" />
                  </div>
                  <p className="text-base md:text-lg text-slate-500 font-medium">Готов к работе</p>
                  <p className="text-xs md:text-sm text-slate-400 text-center px-4">Загрузите Excel, настройте контекст и параметры.</p>
                </div>
              )}

              {!isGenerating && result && (
                <div className={`relative ${isLocked ? 'pointer-events-none select-none' : ''}`} aria-disabled={isLocked}>
                  {isLocked && (
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-20">
                      <div className="text-center p-6 bg-slate-800/90 rounded-2xl border border-white/10">
                        <Lock className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <p className="text-white font-bold mb-1">Доступ ограничен</p>
                        <p className="text-slate-400 text-sm">Обновите подписку для просмотра</p>
                      </div>
                    </div>
                  )}
                  <ResultView
                    result={result}
                    onFixSpam={userPlan?.canCheckSpam ? handleFixSpam : undefined}
                    isFixingSpam={isFixingSpam}
                    userPlan={userPlan}
                    onOptimizeRelevance={userPlan?.canOptimizeRelevance ? handleOptimizeRelevance : undefined}
                    isOptimizingRelevance={isOptimizingRelevance}
                    onUserUpdate={setUser}
                    topic={config.topic}
                    keywords={keywords.map(k => k.keyword)}
                    isGeoMode={config.generationMode === 'geo'}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render
  return (
    <div className="min-h-screen bg-mesh-animated text-slate-100 font-sans pb-10 md:pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <header className="glass-panel-dark sticky top-0 z-50 border-b border-white/5 shadow-glass">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4 flex items-center justify-between xl:max-w-7xl">
          <div className="flex items-center gap-3 sm:gap-4 cursor-pointer min-w-0 group" onClick={() => { setCurrentProject(null); setShowAdminPanel(false); }}>
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-brand-green to-emerald-600 rounded-xl flex items-center justify-center shadow-glow-sm shrink-0 group-hover:scale-105 transition-transform duration-300">
              <LayoutDashboard className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">SEO Generator</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            {/* Admin Toggle */}
            {user.role === 'admin' && (
              <button
                onClick={() => { setShowAdminPanel(!showAdminPanel); setCurrentProject(null); }}
                className={`
                  px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full font-medium flex items-center gap-2 transition-all duration-300 whitespace-nowrap
                  ${showAdminPanel
                    ? 'bg-white text-brand-dark shadow-glow'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}
                `}
              >
                <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{showAdminPanel ? 'Выйти' : 'Админка'}</span>
              </button>
            )}

            {/* Subscription Counter (For Users) - Mobile compact version */}
            {user.role !== 'admin' && (
              <div className="flex sm:hidden items-center gap-1.5">
                <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] font-bold text-white">{dailyRemaining}/{monthlyRemaining}</span>
                </div>
                {isSubscriptionActive ? (
                  <div className="flex items-center gap-1 bg-brand-green/10 px-2 py-1 rounded-full border border-brand-green/30">
                    <Clock className="w-3 h-3 text-brand-green" />
                    <span className="text-[10px] font-bold text-brand-green">
                      {user.planId === 'free' ? '∞' : `${daysRemaining}д`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/30">
                    <Lock className="w-3 h-3 text-red-400" />
                  </div>
                )}
              </div>
            )}

            {/* Subscription Counter (For Users) - Desktop version */}
            {user.role !== 'admin' && (
              <div className="hidden sm:flex items-center gap-2 md:gap-3">
                {/* Generation Usage Counter - REMAINING */}
                <div className="flex items-center gap-2 sm:gap-3 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 backdrop-blur-sm" title="Осталось генераций">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 shrink-0 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                  <div className="flex items-center gap-2 sm:gap-3 text-xs font-medium text-gray-200">
                    <span title="Осталось на сегодня" className="whitespace-nowrap">
                      <span className="hidden lg:inline text-gray-400">Сутки: </span>
                      <span className={`font-bold ${(typeof dailyRemaining === 'number' && dailyRemaining <= 0) ? 'text-red-400' : 'text-white'}`}>{dailyRemaining}</span>
                    </span>
                    <span className="text-white/20">|</span>
                    <span title="Осталось на месяц" className="whitespace-nowrap">
                      <span className="hidden lg:inline text-gray-400">Всего: </span>
                      <span className={`font-bold ${(typeof monthlyRemaining === 'number' && monthlyRemaining <= 0) ? 'text-red-400' : 'text-white'}`}>{monthlyRemaining}</span>
                    </span>
                  </div>
                </div>

                {isSubscriptionActive ? (
                  <div className="flex items-center gap-2 sm:gap-3 bg-brand-green/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-brand-green/30 backdrop-blur-sm">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-brand-green shrink-0 drop-shadow-[0_0_8px_rgba(0,220,130,0.5)]" />
                    {user.planId === 'free' ? (
                      <span className="text-xs sm:text-sm font-bold text-brand-green whitespace-nowrap">Бессрочно</span>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold text-brand-green whitespace-nowrap">
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
                  <div className="flex items-center gap-2 sm:gap-3 bg-red-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-red-500/30 backdrop-blur-sm">
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-red-400 whitespace-nowrap">Нет доступа</span>
                  </div>
                )}
              </div>
            )}

            <div className="hidden lg:block text-xs sm:text-sm text-slate-300 max-w-[120px] xl:max-w-none truncate font-medium">
              {user.firstName} {user.username ? `(@${user.username})` : ''}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 sm:p-2.5 hover:bg-white/10 rounded-full transition-all duration-300 text-slate-400 hover:text-white shrink-0 active:scale-95"
              title="Выйти"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 xl:max-w-7xl">
        {renderContent()}
      </main>
    </div>
  );
}
