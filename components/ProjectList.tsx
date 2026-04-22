import React, { useMemo, useState } from 'react';
import { Project } from '../types';
import { FolderPlus, Folder, Trash2, ChevronRight, Clock, Search, Filter, FileText, Sparkles, LayoutDashboard, X } from 'lucide-react';
import { useToast } from './Toast';

interface ProjectListProps {
  projects: Project[];
  onCreateProject: (name: string, description: string) => void;
  onSelectProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onCreateProject, onSelectProject, onDeleteProject }) => {
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'described' | 'empty'>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateProject(newName, newDesc);
    setNewName('');
    setNewDesc('');
    setIsCreating(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteProjectClick = async (event: React.MouseEvent, projectId: string, projectName: string) => {
    event.stopPropagation();
    const confirmed = await toast.confirm(
      'Удалить проект?',
      `Проект "${projectName}" и вся его история будут удалены без возможности восстановления.`
    );

    if (!confirmed) return;

    onDeleteProject(projectId);
    toast.success('Проект удалён');
  };

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return sortedProjects.filter((project, index) => {
      const matchesSearch = !normalizedQuery || [project.name, project.description || '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);

      if (!matchesSearch) return false;

      switch (activeFilter) {
        case 'recent':
          return index < 6;
        case 'described':
          return Boolean(project.description?.trim());
        case 'empty':
          return !project.description?.trim();
        default:
          return true;
      }
    });
  }, [sortedProjects, searchTerm, activeFilter]);

  const describedProjects = useMemo(
    () => projects.filter((project) => Boolean(project.description?.trim())).length,
    [projects]
  );

  const recentProjectsCount = Math.min(sortedProjects.length, 6);
  const emptyProjectsCount = Math.max(projects.length - describedProjects, 0);

  const filterButtons: Array<{ id: 'all' | 'recent' | 'described' | 'empty'; label: string; hint: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'Все проекты', hint: `${projects.length} workspace`, icon: <Folder className="w-4 h-4" /> },
    { id: 'recent', label: 'Недавние', hint: `Последние ${recentProjectsCount}`, icon: <Clock className="w-4 h-4" /> },
    { id: 'described', label: 'С описанием', hint: `${describedProjects} готово`, icon: <FileText className="w-4 h-4" /> },
    { id: 'empty', label: 'Нужна структура', hint: `${emptyProjectsCount} пустых`, icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden xl:flex xl:flex-col rounded-[28px] border border-white/8 bg-slate-900/80 px-6 py-6 shadow-[40px_0_80px_rgba(0,0,0,0.35)] backdrop-blur-[40px] min-h-[calc(100vh-10rem)] sticky top-28">
          <div className="mb-8">
            <div className="text-xl font-black tracking-[-0.04em] text-emerald-300">SEO Command</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">AI Optimization Active</div>
          </div>

          <nav className="flex-1 space-y-2">
            <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">Фильтры</div>
            {filterButtons.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-400/10 text-emerald-300 shadow-[0_0_20px_rgba(69,249,156,0.10)]'
                      : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className={`${isActive ? 'text-emerald-300' : 'text-slate-500'}`}>{filter.icon}</span>
                  <span className="flex-1">
                    <span className="block">{filter.label}</span>
                    <span className={`mt-1 block text-xs ${isActive ? 'text-emerald-200/80' : 'text-slate-500'}`}>{filter.hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4 border-t border-white/5 pt-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Всего</div>
                <div className="mt-2 text-xl font-bold text-white">{projects.length}</div>
              </div>
              <div className="rounded-[18px] border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">В поиске</div>
                <div className="mt-2 text-xl font-bold text-white">{filteredProjects.length}</div>
              </div>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="w-full rounded-[18px] bg-[linear-gradient(135deg,#45f99c_0%,#00dc82_100%)] px-4 py-3 font-bold text-[#00391d] shadow-[0_0_20px_rgba(69,249,156,0.25)] transition-all hover:scale-[0.99]"
            >
              Create Project
            </button>
            <div className="flex items-center gap-3 rounded-[18px] border border-white/5 bg-white/[0.02] px-3 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-emerald-300">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Активный фильтр</div>
                <div className="text-xs text-slate-500">{filterButtons.find((filter) => filter.id === activeFilter)?.label}</div>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-[28px] border border-white/8 bg-slate-950/60 px-5 py-5 shadow-[0_24px_60px_rgba(2,6,23,0.24)] backdrop-blur-[40px]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center rounded-full border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-400">
                  <Search className="h-4 w-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Поиск по названию или описанию проекта"
                    className="ml-2 w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Workspace hub
                  </span>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-300 transition-colors hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                      Сбросить поиск
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 xl:hidden">
                  {filterButtons.map((filter) => {
                    const isActive = activeFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setActiveFilter(filter.id)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:text-slate-200'
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3 self-end">
                <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400 sm:inline-flex">
                  {filteredProjects.length} видимо сейчас
                </div>
                <button
                  onClick={() => setIsCreating(true)}
                  className="app-btn-primary text-sm"
                >
                  <FolderPlus className="w-4 h-4" />
                  Create Project
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(23,27,38,0.94),rgba(15,19,29,0.92))] px-5 py-6 shadow-[0_32px_80px_rgba(15,19,29,0.18)] md:px-8 md:py-8">
            <nav className="mb-3 flex items-center text-sm text-slate-500">
              <span className="flex items-center gap-1 text-slate-400">
                <HomeDot />
                Home
              </span>
              <ChevronRight className="mx-1 h-4 w-4 text-slate-600" />
              <span className="text-slate-300">Projects</span>
            </nav>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Projects
                </div>
                <h2 className="text-3xl font-black tracking-[-0.04em] text-white md:text-[3rem]">
                  Мои проекты
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
                  Управляйте мониторингом, генерацией и AI-driven SEO campaigns внутри отдельных рабочих пространств.
                </p>
              </div>

              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#45f99c_0%,#00dc82_100%)] px-5 py-3 text-sm font-bold text-[#00391d] shadow-[0_0_20px_rgba(69,249,156,0.25)] transition-all hover:scale-[0.99]"
              >
                <FolderPlus className="w-4 h-4" />
                Create Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="mt-10 app-dark-card text-center py-12 sm:py-16 lg:py-20 px-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(56,189,248,0.10))] rounded-[24px] flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-[0_14px_36px_rgba(16,185,129,0.12)]">
                  <Folder className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-emerald-300" />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white">Пока нет проектов</h3>
                <p className="text-slate-300 text-sm sm:text-base mt-2 px-4 max-w-lg mx-auto leading-relaxed">Создайте первое рабочее пространство, чтобы вести генерации, аудит и мониторинг в одном месте.</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="mt-10 app-dark-card text-center py-12 px-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-slate-400">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-white">Ничего не найдено</h3>
                <p className="mt-2 max-w-lg mx-auto text-sm leading-relaxed text-slate-400">
                  Попробуйте изменить поисковый запрос или переключить фильтр слева.
                </p>
              </div>
            ) : (
              <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(28,31,42,0.96),rgba(23,27,38,0.9))] p-5 shadow-[0_24px_60px_rgba(15,19,29,0.16)] transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.06] cursor-pointer"
                    onClick={() => onSelectProject(project)}
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-emerald-400/10 blur-[70px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative z-10">
                  <div className="mb-5 flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/10 text-sky-300 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
                          <Folder className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                            {project.description ? 'Active' : 'Draft'}
                          </span>
                          <button
                            onClick={(event) => handleDeleteProjectClick(event, project.id, project.name)}
                            className="rounded-2xl border border-transparent p-2 text-slate-500 transition-all hover:border-red-400/10 hover:bg-red-500/10 hover:text-red-300"
                            title="Удалить проект"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="max-w-[14rem] text-xl font-bold leading-tight text-white transition-colors group-hover:text-emerald-300">
                        {project.name}
                      </h3>
                      <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-slate-400">
                        {project.description || 'Добавьте описание, чтобы быстрее ориентироваться в задачах, мониторинге и контентных потоках.'}
                      </p>

                      <div className="mt-6 flex items-center justify-between border-t border-white/6 pt-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(project.createdAt)}
                        </div>
                        <div className="flex items-center gap-1 text-sm font-semibold text-emerald-300 transition-all duration-300 group-hover:translate-x-0.5">
                          Open
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="app-dark-card p-5 sm:p-6 lg:p-8 w-full max-w-[calc(100vw-24px)] sm:max-w-md animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#10b981,#38bdf8,#f472b6)]"></div>
            <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Новый проект</div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 tracking-tight">Создание проекта</h3>
            <p className="text-sm text-slate-300 mb-5 leading-relaxed">Соберите отдельное пространство под клиента, сайт или кампанию.</p>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-bold text-slate-200 ml-1">Название</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Например: Ипотека 2025"
                  className="app-input-dark text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-bold text-slate-200 ml-1">Описание (опционально)</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Статьи для раздела ипотеки..."
                  className="app-input-dark text-sm"
                />
              </div>
              <div className="flex gap-3 sm:gap-4 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="app-btn-dark flex-1 text-sm sm:text-base"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="app-btn-primary flex-1 text-sm sm:text-base disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const HomeDot = () => <span className="inline-flex h-4 w-4 items-center justify-center text-slate-500">•</span>;
