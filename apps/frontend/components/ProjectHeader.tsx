import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  History,
  Home,
  ListTree,
  Menu,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  BarChart3,
  X,
} from 'lucide-react';
import { Project } from '../types';

type ProjectTab = 'generator' | 'outline' | 'history' | 'audit' | 'rewrite' | 'serp' | 'monitoring' | 'competitors' | 'ours';

interface ProjectHeaderProps {
  project: Project;
  currentTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  onBackToProjects: () => void;
  historyCount?: number;
}

interface TabConfig {
  id: ProjectTab;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const primaryTabs: TabConfig[] = [
  { id: 'generator', label: 'Intelligence', description: 'Генерация, рабочие материалы и итоговый контент.', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'outline', label: 'PRD / Outline', description: 'Структура, требования и подготовка контента.', icon: <ListTree className="w-4 h-4" /> },
  { id: 'audit', label: 'Analysis', description: 'SEO аудит, диагностика и поиск слабых мест.', icon: <Search className="w-4 h-4" /> },
  { id: 'rewrite', label: 'Content Lab', description: 'Рерайт, polishing и доработка текста.', icon: <RefreshCw className="w-4 h-4" /> },
  { id: 'serp', label: 'Rankings', description: 'SERP, ориентиры конкурентов и поисковые паттерны.', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'history', label: 'History', description: 'Сохранённые генерации и история запусков.', icon: <History className="w-4 h-4" /> },
];

const monitoringTabs: TabConfig[] = [
  { id: 'monitoring', label: 'SEO Monitoring', description: 'Изменения страниц, алерты и технические сигналы.', icon: <BellRing className="w-4 h-4" /> },
  { id: 'competitors', label: 'Competitors', description: 'Стратегические сдвиги, кластеры и рыночные сигналы.', icon: <Radar className="w-4 h-4" /> },
  { id: 'ours', label: 'Our Site', description: 'Ваш сайт как опорный источник для comparison и ссылок.', icon: <ShieldCheck className="w-4 h-4" /> },
];

const allTabs = [...primaryTabs, ...monitoringTabs];
const monitoringTabIds: ProjectTab[] = ['monitoring', 'competitors', 'ours'];

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  currentTab,
  onTabChange,
  onBackToProjects,
  historyCount = 0,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMonitoringExpanded, setIsMonitoringExpanded] = useState(monitoringTabIds.includes(currentTab));
  const activeTab = useMemo(
    () => allTabs.find((tab) => tab.id === currentTab) || primaryTabs[0],
    [currentTab]
  );
  const isMonitoringSectionActive = monitoringTabIds.includes(currentTab);
  const quickActions = [
    {
      label: 'К проектам',
      description: 'Вернуться к рабочим пространствам',
      onClick: onBackToProjects,
    },
    {
      label: 'История',
      description: historyCount > 0 ? `${historyCount} сохранений` : 'Без сохранений',
      onClick: () => onTabChange('history'),
      isActive: currentTab === 'history',
    },
  ];

  useEffect(() => {
    if (!isMonitoringSectionActive) return;
    setIsMonitoringExpanded(true);
  }, [isMonitoringSectionActive]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  const tabButtonClass = (isActive: boolean) => (
    `group flex w-full items-center gap-3 px-6 py-4 text-left transition-all duration-300 ${
      isActive
        ? 'border-r-2 border-[#ff2d78] bg-[#ff2d78]/5 text-[#ff2d78] shadow-[0_0_15px_rgba(255,45,120,0.10)]'
        : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
    }`
  );

  const renderTabButton = (tab: TabConfig, mobile = false) => {
    const isActive = currentTab === tab.id;

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => {
          onTabChange(tab.id);
          if (mobile) setIsMobileMenuOpen(false);
        }}
        className={tabButtonClass(isActive)}
      >
        <span className={`transition-colors ${isActive ? 'text-[#ff2d78]' : 'text-slate-500 group-hover:text-slate-200'}`}>
          {tab.icon}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block truncate text-[10px] font-bold uppercase tracking-[0.10em]">{tab.label}</span>
          <span className={`mt-1 block truncate text-[11px] ${isActive ? 'text-[#ffb1c0]' : 'text-slate-500 group-hover:text-slate-400'}`}>
            {tab.description}
          </span>
        </span>
        {tab.id === 'history' && historyCount > 0 && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-400'}`}>
            {historyCount}
          </span>
        )}
      </button>
    );
  };

  const renderSidebarContent = (mobile = false) => (
    <>
      <div className="mb-7 mt-2 shrink-0">
        <div className="text-lg font-black tracking-[-0.04em] text-white uppercase">AURA SEO</div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ffb1c0]/30 bg-[#ff2d78]/10 text-[#ffb1c0]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Core Engine</div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-[#ab888e]">v2.4 Neural Link</div>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
        {primaryTabs.map((tab) => renderTabButton(tab, mobile))}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsMonitoringExpanded((prev) => !prev)}
            className={tabButtonClass(isMonitoringSectionActive)}
          >
            <span className={`${isMonitoringSectionActive ? 'text-emerald-300' : 'text-slate-500 group-hover:text-emerald-300'}`}>
              <BellRing className="w-4 h-4" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-sm">Monitoring</span>
              <span className={`mt-1 block text-xs ${isMonitoringSectionActive ? 'text-[#ffb1c0]' : 'text-slate-500 group-hover:text-slate-400'}`}>
                SEO monitoring, competitors и ваш сайт
              </span>
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isMonitoringSectionActive ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-400'}`}>
              {monitoringTabs.length}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isMonitoringExpanded ? 'rotate-180' : ''}`} />
          </button>

          <div className={`overflow-hidden transition-all duration-300 ${isMonitoringExpanded ? 'max-h-80 opacity-100 pt-2' : 'max-h-0 opacity-0'}`}>
            <div className="ml-4 border-l border-white/10 pl-3 space-y-2">
              {monitoringTabs.map((tab) => renderTabButton(tab, mobile))}
            </div>
          </div>
        </div>
      </nav>

      <div className="mt-6 shrink-0 space-y-4 border-t border-white/5 pt-6">
        <button
          type="button"
          onClick={onBackToProjects}
          className="w-full rounded-[6px] border border-[#ff2d78] bg-[#ff2d78]/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#ffb1c0] transition-all hover:bg-[#ff2d78]/20"
        >
          All Projects
        </button>

        <div className="flex items-center gap-3 rounded-[8px] border border-white/5 bg-white/[0.02] px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2c1b1e] text-[#ffb1c0]">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{project.name}</div>
            <div className="truncate text-[11px] uppercase tracking-[0.12em] text-[#ab888e]">Project workspace</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed left-0 top-[72px] bottom-0 z-30 hidden w-[16rem] flex-col overflow-y-auto border-r border-white/5 bg-[#020305]/80 py-8 shadow-[40px_0_80px_rgba(0,0,0,0.38)] backdrop-blur-[20px] xl:flex">
        {renderSidebarContent(false)}
      </aside>

      <div className="space-y-5">
        <div className="rounded-[10px] border border-white/10 bg-[#020305]/80 px-4 py-4 shadow-[0_16px_44px_rgba(0,0,0,0.35)] backdrop-blur-[20px] md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <nav className="mb-2 flex items-center text-sm text-slate-500" aria-label="Навигация">
                <button
                  onClick={onBackToProjects}
                  className="flex items-center gap-1 rounded transition-colors hover:text-emerald-300"
                  aria-label="Вернуться к списку проектов"
                >
                  <Home className="w-3 h-3" />
                  Dashboard
                </button>
                <ChevronRight className="mx-1 h-4 w-4 text-slate-600" />
                <span className="text-slate-300">{activeTab.label}</span>
              </nav>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 xl:hidden"
                  aria-label="Открыть навигацию проекта"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{activeTab.label}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-[#ab888e] md:text-base">
                    {activeTab.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="hidden rounded-[6px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 lg:inline-flex">
                {isMonitoringSectionActive ? 'Monitoring stack' : 'Content workspace'}
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={`inline-flex items-center gap-2 rounded-[6px] border px-4 py-3 text-sm font-medium transition-colors ${
                      action.isActive
                        ? 'border-[#ffb1c0] bg-[#ffb1c0] text-[#660029]'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/15 hover:text-white'
                    }`}
                    title={action.description}
                  >
                    {action.label}
                    {action.label === 'История' && historyCount > 0 && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white">
                        {historyCount}
                      </span>
                    )}
                  </button>
                ))}
                <div className="max-w-full rounded-[6px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  {project.name}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,15,18,0.96),rgba(15,18,24,0.92))] shadow-[0_32px_80px_rgba(0,0,0,0.28)]">
          <div className="relative overflow-hidden border-b border-white/6 px-5 py-6 md:px-8 md:py-8">
            <div className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-[#ff2d78]/10 blur-[100px]" />
            <div className="pointer-events-none absolute left-10 top-4 h-28 w-28 rounded-full bg-[#46fa9c]/10 blur-[90px]" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ff2d78]/20 bg-[#ff2d78]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffb1c0]">
                  <span className="h-2 w-2 rounded-full bg-[#ff2d78] shadow-[0_0_12px_rgba(255,45,120,0.7)]" />
                  {activeTab.label}
                </div>
                <h3 className="max-w-3xl text-2xl font-bold tracking-tight text-white sm:text-3xl xl:text-[3.25rem]">
                  {project.name}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#ab888e] md:text-base">
                  {activeTab.description} Signal-driven workspace для генерации, анализа, monitoring и управления проектом.
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-[320px]">
                <div className="rounded-[8px] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#ab888e]">Project</div>
                  <div className="mt-2 break-words text-lg font-bold text-white">{project.name}</div>
                </div>
                <div className="rounded-[8px] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#ab888e]">History</div>
                  <div className="mt-2 text-lg font-bold text-white">{historyCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 transition-all duration-300 xl:hidden ${isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Закрыть мобильную навигацию"
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[88vw] max-w-[22rem] overflow-y-auto border-r border-white/10 bg-[#020305]/95 py-5 shadow-[20px_0_60px_rgba(0,0,0,0.45)] backdrop-blur-[24px] transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          role="dialog"
          aria-modal="true"
          aria-label="Навигация проекта"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm uppercase tracking-[0.18em] text-slate-500">Project Menu</div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200"
              aria-label="Закрыть меню"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {renderSidebarContent(true)}
        </aside>
      </div>
    </>
  );
};
