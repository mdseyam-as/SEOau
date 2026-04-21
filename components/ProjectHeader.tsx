import React, { useEffect, useState } from 'react';
import {
  Home,
  ChevronRight,
  Sparkles,
  Search,
  RefreshCw,
  BarChart3,
  History,
  ListTree,
  BellRing,
  Radar,
  ShieldCheck,
  Menu,
  X,
  ArrowUpRight,
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
  colorClass: string;
  bgClass: string;
  iconSurfaceClass: string;
  activeSurfaceClass: string;
  glowClass: string;
}

const tabs: TabConfig[] = [
  {
    id: 'generator',
    label: 'Генератор',
    description: 'Основной режим генерации и редактирования результата',
    icon: <Sparkles className="w-4 h-4" />,
    colorClass: 'text-brand-green',
    bgClass: 'bg-white text-brand-green shadow-sm',
    iconSurfaceClass: 'bg-emerald-50',
    activeSurfaceClass: 'from-emerald-500 via-emerald-400 to-teal-400',
    glowClass: 'shadow-[0_22px_50px_rgba(16,185,129,0.22)]',
  },
  {
    id: 'outline',
    label: 'Outline',
    description: 'Постройте структуру статьи до генерации текста',
    icon: <ListTree className="w-4 h-4" />,
    colorClass: 'text-amber-600',
    bgClass: 'bg-white text-amber-600 shadow-sm',
    iconSurfaceClass: 'bg-amber-50',
    activeSurfaceClass: 'from-amber-500 via-orange-400 to-yellow-300',
    glowClass: 'shadow-[0_22px_50px_rgba(245,158,11,0.22)]',
  },
  {
    id: 'audit',
    label: 'Аудит',
    description: 'Проверьте страницу на SEO-ошибки и риски',
    icon: <Search className="w-4 h-4" />,
    colorClass: 'text-purple-600',
    bgClass: 'bg-white text-purple-600 shadow-sm',
    iconSurfaceClass: 'bg-violet-50',
    activeSurfaceClass: 'from-violet-600 via-fuchsia-500 to-pink-400',
    glowClass: 'shadow-[0_22px_50px_rgba(139,92,246,0.22)]',
  },
  {
    id: 'rewrite',
    label: 'Рерайт',
    description: 'Перепишите текст под новую задачу или стиль',
    icon: <RefreshCw className="w-4 h-4" />,
    colorClass: 'text-pink-600',
    bgClass: 'bg-white text-pink-600 shadow-sm',
    iconSurfaceClass: 'bg-pink-50',
    activeSurfaceClass: 'from-pink-600 via-rose-500 to-orange-400',
    glowClass: 'shadow-[0_22px_50px_rgba(236,72,153,0.22)]',
  },
  {
    id: 'serp',
    label: 'SERP',
    description: 'Соберите ориентиры по выдаче и конкурентам',
    icon: <BarChart3 className="w-4 h-4" />,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-white text-indigo-600 shadow-sm',
    iconSurfaceClass: 'bg-indigo-50',
    activeSurfaceClass: 'from-indigo-600 via-sky-500 to-cyan-400',
    glowClass: 'shadow-[0_22px_50px_rgba(79,70,229,0.22)]',
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    description: 'Следите за изменениями на важных страницах',
    icon: <BellRing className="w-4 h-4" />,
    colorClass: 'text-rose-600',
    bgClass: 'bg-white text-rose-600 shadow-sm',
    iconSurfaceClass: 'bg-rose-50',
    activeSurfaceClass: 'from-rose-600 via-orange-500 to-amber-400',
    glowClass: 'shadow-[0_22px_50px_rgba(244,63,94,0.22)]',
  },
  {
    id: 'ours',
    label: 'Мы',
    description: 'Ваш сайт проекта для comparison, тем и внутренних ссылок',
    icon: <ShieldCheck className="w-4 h-4" />,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-white text-emerald-600 shadow-sm',
    iconSurfaceClass: 'bg-emerald-50',
    activeSurfaceClass: 'from-emerald-600 via-teal-500 to-cyan-400',
    glowClass: 'shadow-[0_22px_50px_rgba(16,185,129,0.22)]',
  },
  {
    id: 'competitors',
    label: 'Competitors',
    description: 'Отслеживайте кластеры и стратегические сдвиги у конкурентов',
    icon: <Radar className="w-4 h-4" />,
    colorClass: 'text-cyan-600',
    bgClass: 'bg-white text-cyan-600 shadow-sm',
    iconSurfaceClass: 'bg-cyan-50',
    activeSurfaceClass: 'from-cyan-600 via-sky-500 to-emerald-400',
    glowClass: 'shadow-[0_22px_50px_rgba(6,182,212,0.22)]',
  },
  {
    id: 'history',
    label: 'История',
    description: 'Откройте сохранённые результаты и прошлые генерации',
    icon: <History className="w-4 h-4" />,
    colorClass: 'text-brand-green',
    bgClass: 'bg-white text-brand-green shadow-sm',
    iconSurfaceClass: 'bg-slate-100',
    activeSurfaceClass: 'from-slate-900 via-slate-700 to-slate-500',
    glowClass: 'shadow-[0_22px_50px_rgba(15,23,42,0.22)]',
  },
];

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  currentTab,
  onTabChange,
  onBackToProjects,
  historyCount = 0
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const activeTab = tabs.find(tab => tab.id === currentTab);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  const handleTabChange = (tabId: ProjectTab) => {
    onTabChange(tabId);
    setIsMenuOpen(false);
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[24px] shadow-sm border border-slate-200/80">
        <div>
          <nav className="flex items-center text-sm text-slate-500 mb-1.5" aria-label="Навигация">
            <button
              onClick={onBackToProjects}
              className="hover:text-brand-green flex items-center gap-1 transition-colors focus-ring-brand rounded"
              aria-label="Вернуться к списку проектов"
            >
              <Home className="w-3 h-3" aria-hidden="true" />
              Проекты
            </button>
            <ChevronRight className="w-4 h-4 mx-1 text-gray-400" aria-hidden="true" />
            <span className="font-bold text-slate-800">{project.name}</span>
          </nav>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 text-title">
            {project.name}
          </h2>
        </div>

        <div className="w-full lg:w-auto flex items-center justify-between gap-3">
          <div className="relative min-w-0 flex-1 lg:flex-none overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_40px_rgba(148,163,184,0.10)]">
            <div className="pointer-events-none absolute -right-6 top-0 h-20 w-20 rounded-full bg-emerald-200/30 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 left-10 h-16 w-16 rounded-full bg-sky-200/25 blur-2xl" />
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
              Текущий режим
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)] ${activeTab?.colorClass ?? 'text-white'}`}>
                {activeTab?.icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                  {activeTab?.label ?? 'Раздел'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {activeTab?.id === 'history' && historyCount > 0
                    ? `${historyCount} сохраненных запусков`
                    : activeTab?.description ?? 'Переключите инструмент через меню'}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="group relative shrink-0 inline-flex items-center gap-3 overflow-hidden rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,#020617_0%,#111827_50%,#0f172a_100%)] px-4 py-3 text-white shadow-[0_18px_48px_rgba(15,23,42,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_56px_rgba(15,23,42,0.28)] focus:outline-none focus:ring-2 focus:ring-brand-green/40"
            aria-label="Открыть меню функций"
            aria-expanded={isMenuOpen}
            aria-controls="project-functions-drawer"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12),_transparent_40%),linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.08)_50%,transparent_100%)] opacity-90" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 transition-colors group-hover:bg-white/15">
              <Menu className="w-5 h-5" />
            </div>
            <div className="relative hidden sm:block text-left">
              <div className="text-xs uppercase tracking-[0.18em] text-white/55">Меню</div>
              <div className="text-sm font-semibold">Функции проекта</div>
            </div>
            <div className="relative hidden md:flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.85)]" />
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!isMenuOpen}
      >
        <button
          type="button"
          onClick={() => setIsMenuOpen(false)}
          className={`absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Закрыть меню"
        />

        <aside
          id="project-functions-drawer"
          className={`absolute right-0 top-0 h-full w-full max-w-[28rem] overflow-hidden border-l border-white/20 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_rgba(255,255,255,0.96)_36%,_rgba(248,250,252,0.98)_100%)] shadow-[-24px_0_80px_rgba(15,23,42,0.22)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
          role="dialog"
          aria-modal="true"
          aria-label="Меню функций проекта"
        >
          <div className="relative flex h-full flex-col">
            <div className="pointer-events-none absolute -left-10 top-10 h-32 w-32 rounded-full bg-emerald-300/25 blur-3xl" />
            <div className="pointer-events-none absolute right-6 top-32 h-24 w-24 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-20 right-[-20px] h-40 w-40 rounded-full bg-rose-200/20 blur-3xl" />

            <div className="relative border-b border-slate-200/80 px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Навигация</div>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">Функции проекта</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Аккуратное рабочее меню для быстрого перехода между всеми режимами проекта.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 transition-colors hover:bg-white"
                  aria-label="Закрыть меню"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] px-4 py-4 shadow-[0_22px_54px_rgba(15,23,42,0.20)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Сейчас открыт</div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_14px_32px_rgba(0,0,0,0.28)] ${activeTab?.activeSurfaceClass ?? 'from-emerald-500 to-teal-400'}`}>
                        {activeTab?.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{activeTab?.label}</div>
                        <div className="text-sm text-white/55">{activeTab?.description ?? 'Основная рабочая область проекта'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Проект</div>
                    <div className="mt-1 max-w-[8rem] truncate text-sm font-semibold text-white">{project.name}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Инструментов</div>
                    <div className="mt-1 text-lg font-semibold text-white">{tabs.length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">История</div>
                    <div className="mt-1 text-lg font-semibold text-white">{historyCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Разделы</div>
                <div className="text-xs text-slate-500">Быстрое переключение</div>
              </div>

              <div className="space-y-3" role="tablist" aria-label="Вкладки проекта">
                {tabs.map((tab, index) => {
                  const isActive = currentTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id)}
                      className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-[24px] border px-4 py-4 text-left transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isActive
                          ? `border-transparent bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] text-white ${tab.glowClass}`
                          : 'border-slate-200/80 bg-white/80 text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_18px_38px_rgba(148,163,184,0.12)]'
                      }`}
                      style={{
                        transitionDelay: isMenuOpen ? `${index * 28}ms` : '0ms',
                        opacity: isMenuOpen ? 1 : 0,
                        transform: isMenuOpen ? 'translateX(0) scale(1)' : 'translateX(28px) scale(0.98)',
                      }}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${tab.id}`}
                      aria-label={tab.label}
                    >
                      <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'group-hover:opacity-100'}`}>
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${isActive ? tab.activeSurfaceClass : 'from-slate-100 via-white to-slate-50'}`}
                          style={{ opacity: isActive ? 1 : 0.4 }}
                        />
                      </div>

                      <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isActive ? `bg-gradient-to-br ${tab.activeSurfaceClass} text-white shadow-[0_14px_32px_rgba(0,0,0,0.22)]` : `${tab.iconSurfaceClass} ${tab.colorClass}`}`}>
                        {tab.icon}
                      </div>

                      <div className="relative min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-base font-semibold">{tab.label}</span>
                          {tab.id === 'history' && historyCount > 0 && (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isActive ? 'bg-white/12 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {historyCount}
                            </span>
                          )}
                        </div>
                        <div className={`mt-1 text-sm ${isActive ? 'text-white/72' : 'text-slate-500'}`}>
                          {tab.description}
                        </div>
                      </div>

                      <ArrowUpRight className={`relative h-5 w-5 shrink-0 transition-transform duration-300 ${isActive ? 'text-white/75' : 'text-slate-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};
