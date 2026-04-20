import React, { useState } from 'react';
import { Project } from '../types';
import { FolderPlus, Folder, Trash2, ChevronRight, Clock } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  onCreateProject: (name: string, description: string) => void;
  onSelectProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onCreateProject, onSelectProject, onDeleteProject }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

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

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="app-dark-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 sm:p-6 lg:p-7">
        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            Workspace
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white flex items-center gap-3 tracking-tight">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(56,189,248,0.12))] border border-emerald-400/20 shadow-[0_14px_30px_rgba(16,185,129,0.14)]">
              <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
            </div>
            Мои проекты
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
            Управляйте генерацией, мониторингом и историей по отдельным рабочим пространствам.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="app-btn-primary w-full sm:w-auto text-sm sm:text-base"
        >
          <FolderPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          Новый проект
        </button>
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

      {projects.length === 0 ? (
        <div className="app-dark-card text-center py-12 sm:py-16 lg:py-20 px-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(56,189,248,0.10))] rounded-[24px] flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-[0_14px_36px_rgba(16,185,129,0.12)]">
            <Folder className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-emerald-300" />
          </div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white">Пока нет проектов</h3>
          <p className="text-slate-300 text-sm sm:text-base mt-2 px-4 max-w-lg mx-auto leading-relaxed">Создайте первое рабочее пространство, чтобы вести генерации, аудит и мониторинг в одном месте.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="app-dark-card group flex flex-col h-full p-5 sm:p-6 rounded-[24px] hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(2,6,23,0.28)] transition-all duration-300 cursor-pointer relative overflow-hidden"
              onClick={() => onSelectProject(project)}
            >
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-emerald-400/20 rounded-full blur-3xl -mr-12 -mt-12 sm:-mr-14 sm:-mt-14 lg:-mr-16 lg:-mt-16 transition-opacity opacity-0 group-hover:opacity-100"></div>

              <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
                <div className="bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(56,189,248,0.10))] p-2.5 sm:p-3 rounded-2xl group-hover:scale-105 transition-all border border-emerald-400/20">
                  <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300 drop-shadow-sm" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Удалить проект и всю историю?')) onDeleteProject(project.id);
                  }}
                  className="text-slate-400 hover:text-red-300 p-2 rounded-2xl hover:bg-red-500/10 transition-all sm:opacity-0 sm:group-hover:opacity-100 border border-transparent hover:border-red-400/10"
                  title="Удалить проект"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <h3 className="font-bold text-base sm:text-lg lg:text-xl text-white mb-1.5 sm:mb-2 line-clamp-1 group-hover:text-emerald-300 transition-colors" title={project.name}>
                {project.name}
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm mb-4 sm:mb-6 line-clamp-2 h-8 sm:h-10 leading-relaxed">
                {project.description || 'Нет описания'}
              </p>

              <div className="mt-auto flex items-center justify-between pt-3 sm:pt-4 border-t border-white/10 relative z-10">
                <div className="flex items-center text-[10px] sm:text-xs text-slate-400 gap-1 sm:gap-1.5 font-medium">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {formatDate(project.createdAt)}
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-300 sm:opacity-0 sm:group-hover:opacity-100 transform sm:translate-x-[-10px] sm:group-hover:translate-x-0 transition-all duration-300">
                  Открыть <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
