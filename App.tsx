
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
import { GenerationConfig, KeywordRow, SeoResult, AIModel, Project, TextTone, TextStyle, GenerationMode, ContentLanguage, HistoryItem } from './types';
import { Lock } from 'lucide-react';
import { User, authService, SubscriptionPlan } from './services/authService';
import { projectService } from './services/projectService';
import { apiService } from './services/apiService';
import { projectConfigService } from './services/projectConfigService';
import { SeoAuditor } from './components/SeoAuditor';
import { RewriteMode } from './components/RewriteMode';
import { SerpAnalyzer } from './components/SerpAnalyzer';
import { OutlineEditor } from './components/OutlineEditor';
import { SubscriptionModal } from './components/SubscriptionModal';
import { useToast } from './components/Toast';
import { ResultSkeleton } from './components/Skeleton';
import { GenerationProgress } from './components/GenerationProgress';
// New design components
import { Header } from './components/Header';
import { SubscriptionStatus } from './components/SubscriptionStatus';
import { ProjectHeader } from './components/ProjectHeader';
import { EmptyState, GeneratorEmptyState, LockedFeatureEmptyState } from './components/EmptyState';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import { ServerHealthGate } from './components/ServerHealthGate';
import { MonitoringPanel } from './components/MonitoringPanel';
import { CompetitorWatcherPanel } from './components/CompetitorWatcherPanel';
import { ProjectSitePanel } from './components/ProjectSitePanel';

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
  // Telegram WebApp integration
  const { hapticNotification } = useTelegramWebApp();
  
  const [user, setUser] = useState<User | null>(null);
  const [userPlan, setUserPlan] = useState<SubscriptionPlan | null>(null);

  // Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectTab, setProjectTab] = useState<'generator' | 'outline' | 'history' | 'audit' | 'rewrite' | 'serp' | 'monitoring' | 'competitors' | 'ours'>('generator');
  const [projectHistory, setProjectHistory] = useState<any[]>([]);

  // Generator State
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [config, setConfig] = useState<GenerationConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<SeoResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsResetCounter, setSettingsResetCounter] = useState(0);

  // Spam Fix State
  const [isFixingSpam, setIsFixingSpam] = useState(false);

  // Relevance Optimization State
  const [isOptimizingRelevance, setIsOptimizingRelevance] = useState(false);

  // Humanizer State
  const [isHumanizing, setIsHumanizing] = useState(false);

  // Admin State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [telegramLink, setTelegramLink] = useState(authService.getGlobalSettings().telegramLink || '');
  // Subscription Modal State
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Update plan when user changes
  useEffect(() => {
    if (user && user.planId) {
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

  const handleGenerate = async (
    override?: {
      config?: GenerationConfig;
      keywords?: KeywordRow[];
    }
  ) => {
    if (!user) return;

    const generationConfig = override?.config ?? config;
    const generationKeywords = override?.keywords ?? keywords;

    if (!generationKeywords.length && !generationConfig.topic) {
      setError("Пожалуйста, загрузите ключевые слова или укажите тему.");
      return;
    }

    if (!generationConfig.websiteName) {
      setError("Пожалуйста, укажите название сайта/бренда.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      // Use backend API for generation (API key stays on server)
      const { result: data, user: updatedUser } = await apiService.generate(generationConfig, generationKeywords);

      setResult(data);
      setUser(updatedUser);
      
      // Haptic feedback for successful generation
      hapticNotification('success');

      // Save to History if in a project
      if (currentProject) {
        await projectService.addToHistory(currentProject.id, generationConfig, data);
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

  const handleHumanize = async (content: string, intensity: 'light' | 'medium' | 'strong', model: string) => {
    if (!result || !user) return;

    setIsHumanizing(true);
    try {
      // Get language code from config
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

      // Call humanize API
      const { content: humanizedContent, user: updatedUser } = await apiService.humanize(content, language, intensity, model);

      const updatedResult = { ...result, content: humanizedContent };

      // Recalculate metrics
      try {
        updatedResult.metrics = calculateSeoMetrics(humanizedContent, keywords);
      } catch (e) { console.error("Metrics recalc failed", e); }

      // Re-check spam if available
      if (userPlan?.canCheckSpam) {
        try {
          const spam = await apiService.checkSpam(humanizedContent);
          updatedResult.spamScore = spam.spamScore;
          updatedResult.spamAnalysis = spam.spamAnalysis;
        } catch (e) { console.error("Spam recheck failed", e); }
      }

      setResult(updatedResult);
      setUser(updatedUser);

      // Save to history
      if (currentProject) {
        await projectService.addToHistory(currentProject.id, { ...config, topic: config.topic + " (Humanized)" }, updatedResult);
        const history = await projectService.getHistory(currentProject.id);
        setProjectHistory(history);
      }

      toast.success("Текст очеловечен", `Интенсивность: ${intensity === 'light' ? 'Лёгкая' : intensity === 'medium' ? 'Средняя' : 'Сильная'}`);

    } catch (err: any) {
      if (err.message?.includes('Limit exceeded')) {
        toast.error("Лимит исчерпан", "Humanize недоступен. Обновите подписку.");
      } else {
        toast.error("Ошибка Humanizer", err.message || "Не удалось обработать текст");
      }
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await projectService.deleteHistoryItem(id);
    if (currentProject) {
      const history = await projectService.getHistory(currentProject.id);
      setProjectHistory(history);
    }
  };

  const handleClearProjectSettings = async () => {
    if (!currentProject) return;
    const confirmed = await toast.confirm(
      'Очистить настройки проекта?',
      'Это сбросит параметры генерации, ключевые слова и текущий результат.'
    );
    if (!confirmed) return;

    projectConfigService.deleteConfig(currentProject.id);
    setConfig(DEFAULT_CONFIG);
    setKeywords([]);
    setResult(null);
    setError(null);
    setSettingsResetCounter(prev => prev + 1);
    toast.success('Настройки очищены', 'Параметры проекта сброшены до значений по умолчанию.');
  };

  const handleLogout = () => {
    hapticNotification('warning');
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
      const settings = await authService.loadGlobalSettings();
      setTelegramLink(settings.telegramLink);
    } catch (e) {
      console.error('Failed to load global settings:', e);
    }

    if (loggedInUser.role === 'admin') {
      // Don't auto-show admin panel, let them choose.
      // But we can default to projects.
    }
  };

  const refreshCurrentUser = async () => {
    try {
      const { user: freshUser } = await apiService.getMe();
      setUser(freshUser);
    } catch (e) {
      console.error('Failed to refresh user after payment:', e);
    }
  };

  if (!user) {
    return (
      <ServerHealthGate>
        <AuthScreen onLogin={handleLogin} />
      </ServerHealthGate>
    );
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
      <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:pl-[18rem] 2xl:pl-[19rem]">
        {/* Project Header & Breadcrumbs */}
        <ProjectHeader
          project={currentProject}
          currentTab={projectTab}
          onTabChange={setProjectTab}
          onBackToProjects={() => setCurrentProject(null)}
          historyCount={projectHistory.length}
        />

        {projectTab === 'history' ? (
          <HistoryList 
            history={projectHistory} 
            onDelete={handleDeleteHistoryItem}
            onOpen={(item) => {
              // Load config and result from history item
              setConfig(item.config);
              setResult(item.result);
              setProjectTab('generator');
              toast.success('Загружено', 'Генерация загружена из истории');
            }}
          />
        ) : projectTab === 'audit' ? (
          userPlan?.canAudit || user?.role === 'admin' ? (
            <SeoAuditor onUserUpdate={setUser} />
          ) : (
            <LockedFeatureEmptyState
              featureName="SEO Аудит"
              onUpgrade={() => setShowSubscriptionModal(true)}
            />
          )
        ) : projectTab === 'rewrite' ? (
          userPlan?.canRewrite || user?.role === 'admin' ? (
            <RewriteMode onUserUpdate={setUser} />
          ) : (
            <LockedFeatureEmptyState
              featureName="Рерайт"
              onUpgrade={() => setShowSubscriptionModal(true)}
            />
          )
        ) : projectTab === 'serp' ? (
          <SerpAnalyzer 
            onApplyRecommendations={(recs) => {
              setConfig(prev => ({
                ...prev,
                minChars: recs.minChars,
                maxChars: recs.maxChars,
                lsiKeywords: recs.lsiKeywords.join(', ')
              }));
              setProjectTab('generator');
            }}
          />
        ) : projectTab === 'monitoring' ? (
          <MonitoringPanel projectId={currentProject.id} />
        ) : projectTab === 'competitors' ? (
          <CompetitorWatcherPanel projectId={currentProject.id} />
        ) : projectTab === 'ours' ? (
          <ProjectSitePanel projectId={currentProject.id} />
        ) : projectTab === 'outline' ? (
          <div className="app-shell-card p-4 sm:p-6">
              <OutlineEditor
              config={config}
              keywords={keywords}
              onGenerateContent={(outline) => {
                // Convert outline to topic and generate
                const outlineText = `H1: ${outline.h1}\n\n${outline.sections.map(s => 
                  `## ${s.h2}\n${s.h3s.map(h3 => `### ${h3}`).join('\n')}`
                ).join('\n\n')}`;
                const nextConfig = { ...config, topic: outline.h1, exampleContent: outlineText };
                setConfig(nextConfig);
                setProjectTab('generator');
                // Auto-trigger generation
                handleGenerate({ config: nextConfig, keywords });
              }}
              isGenerating={isGenerating}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(30rem,38rem)_minmax(0,1fr)] gap-4 sm:gap-5 lg:gap-6 animate-in fade-in slide-in-from-bottom-2 items-start">
            {/* Left Sidebar: Inputs */}
            <div className="space-y-4 sm:space-y-5 lg:space-y-6 order-1 min-w-0">

              {/* Subscription Alert */}
              {isLocked && (
                <div className="app-light-card relative overflow-hidden border-red-100 animate-in slide-in-from-top duration-500 z-10">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-orange-500"></div>
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-red-50 rounded-2xl text-red-500 shrink-0 border border-red-100">
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
                      <button
                        type="button"
                        onClick={() => setShowSubscriptionModal(true)}
                        className="block w-full bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold py-2 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2"
                      >
                        Купить подписку
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="app-dark-card p-3 sm:p-4 md:p-6">
                <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Step 1</div>
                <h2 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-white">Источник данных</h2>
                <FileUpload
                  onKeywordsLoaded={setKeywords}
                  disabled={isLocked}
                  maxKeywords={userPlan?.maxKeywords}
                />
                <KeywordList keywords={keywords} />
              </div>

              <SettingsForm
                key={`${currentProject ? currentProject.id : 'global'}:${settingsResetCounter}`}
                config={config}
                onChange={setConfig}
                disabled={isGenerating}
                isLocked={isLocked}
                onSubmit={handleGenerate}
                onClear={handleClearProjectSettings}
                userPlan={userPlan}
              />
            </div>

            {/* Right Area: Results & Status */}
            <div className="order-2 min-w-0">
              {error && (
                <div className="bg-red-50 border border-red-100 p-4 mb-6 rounded-[24px] animate-in fade-in shadow-[0_12px_30px_rgba(239,68,68,0.08)]">
                  <p className="text-red-700 font-medium text-sm md:text-base">Ошибка: {error}</p>
                </div>
              )}

              {isGenerating && (
                <div className="app-shell-card overflow-hidden">
                  <GenerationProgress
                    keywordsCount={keywords.length}
                    isGeoMode={config.generationMode === 'geo'}
                  />
                  <ResultSkeleton />
                </div>
              )}

              {!isGenerating && !result && (
                <div className="relative">
                  {isLocked && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
                      <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-white/60 mx-auto mb-2" />
                        <p className="text-white/80 font-medium text-sm">Доступ ограничен</p>
                      </div>
                    </div>
                  )}
                  <GeneratorEmptyState />
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
                    onHumanize={userPlan?.canHumanize ? handleHumanize : undefined}
                    isHumanizing={isHumanizing}
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

  // Render - wrapped in ServerHealthGate to block when server is offline
  return (
    <ServerHealthGate>
      <div className="min-h-screen bg-mesh-animated text-slate-100 font-sans pb-10 md:pb-20 animate-in fade-in duration-700">
        {/* Header */}
        <Header
          user={user}
          onLogout={handleLogout}
          onToggleAdmin={user.role === 'admin' ? () => { setShowAdminPanel(!showAdminPanel); setCurrentProject(null); } : undefined}
          showAdmin={showAdminPanel}
          onOpenSubscription={user.role !== 'admin' ? () => setShowSubscriptionModal(true) : undefined}
        >
          {/* Subscription Status */}
          {user.role !== 'admin' && (
            <SubscriptionStatus
              userPlan={userPlan}
              dailyRemaining={dailyRemaining}
              monthlyRemaining={monthlyRemaining}
              isSubscriptionActive={isSubscriptionActive}
              daysRemaining={daysRemaining}
              userPlanId={user.planId}
              compact={false}
            />
          )}
          {/* Mobile Subscription Status */}
          {user.role !== 'admin' && (
            <SubscriptionStatus
              userPlan={userPlan}
              dailyRemaining={dailyRemaining}
              monthlyRemaining={monthlyRemaining}
              isSubscriptionActive={isSubscriptionActive}
              daysRemaining={daysRemaining}
              userPlanId={user.planId}
              compact={true}
            />
          )}
        </Header>

        <main className="mx-auto w-full max-w-[1900px] px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          {renderContent()}
        </main>

        {/* Subscription Modal */}
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          currentPlanId={user.planId}
          telegramLink={telegramLink}
          onPurchaseComplete={refreshCurrentUser}
        />
      </div>
    </ServerHealthGate>
  );
}
