import React from 'react';
import { Home, ChevronRight, Sparkles, Search, RefreshCw, BarChart3, History } from 'lucide-react';
import { Project } from '../types';

type ProjectTab = 'generator' | 'history' | 'audit' | 'rewrite' | 'serp';

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
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

const tabs: TabConfig[] = [
  {
    id: 'generator',
    label: 'Генератор',
    icon: <Sparkles className="w-4 h-4" />,
    colorClass: 'text-brand-green',
    bgClass: 'bg-white text-brand-green shadow-sm',
  },
  {
    id: 'audit',
    label: 'Аудит',
    icon: <Search className="w-4 h-4" />,
    colorClass: 'text-purple-600',
    bgClass: 'bg-white text-purple-600 shadow-sm',
  },
  {
    id: 'rewrite',
    label: 'Рерайт',
    icon: <RefreshCw className="w-4 h-4" />,
    colorClass: 'text-pink-600',
    bgClass: 'bg-white text-pink-600 shadow-sm',
  },
  {
    id: 'serp',
    label: 'SERP',
    icon: <BarChart3 className="w-4 h-4" />,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-white text-indigo-600 shadow-sm',
  },
  {
    id: 'history',
    label: 'История',
    icon: <History className="w-4 h-4" />,
    colorClass: 'text-brand-green',
    bgClass: 'bg-white text-brand-green shadow-sm',
  },
];

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  currentTab,
  onTabChange,
  onBackToProjects,
  historyCount = 0
}) => {
  const activeTab = tabs.find(tab => tab.id === currentTab);

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200">
      <div>
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-slate-500 mb-1" aria-label="Навигация">
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
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 text-title">
          {project.name}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-auto" role="tablist" aria-label="Вкладки проекта">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all btn-micro
              ${currentTab === tab.id ? tab.bgClass : 'text-gray-500 hover:text-gray-700'}
            `}
            role="tab"
            aria-selected={currentTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            aria-label={tab.label}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.id === 'history' && historyCount > 0 && (
              <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded-full text-gray-600 ml-1">
                {historyCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
