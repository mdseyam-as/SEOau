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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-panel p-6 rounded-2xl">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            <div className="p-2 bg-brand-green/20 rounded-lg border border-brand-green/30">
              <Folder className="w-6 h-6 sm:w-7 sm:h-7 text-brand-green drop-shadow-glow" />
            </div>
            Мои проекты
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Управляйте задачами генерации по проектам
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-brand-green to-emerald-600 hover:from-emerald-500 hover:to-brand-green text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-glow transform hover:-translate-y-0.5 active:scale-95"
        >
          <FolderPlus className="w-5 h-5" />
          Новый проект
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel-dark border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-green to-brand-purple"></div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">Создание проекта</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-300 ml-1">Название</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Например: Ипотека 2025"
                  className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none transition-all"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-300 ml-1">Описание (опционально)</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Статьи для раздела ипотеки..."
                  className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green outline-none transition-all"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3.5 border border-white/10 rounded-xl text-slate-300 font-bold hover:bg-white/5 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="flex-1 py-3.5 bg-brand-green text-white rounded-xl font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow transition-all"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
            <Folder className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500" />
          </div>
          <h3 className="text-lg sm:text-xl font-medium text-white">Нет проектов</h3>
          <p className="text-slate-400 text-sm mt-2 px-4">Создайте свой первый проект, чтобы начать генерацию</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="glass-card group flex flex-col h-full p-6 rounded-2xl hover:scale-[1.02] hover:shadow-glow-sm transition-all duration-300 cursor-pointer relative overflow-hidden"
              onClick={() => onSelectProject(project)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/10 rounded-full blur-2xl -mr-16 -mt-16 transition-opacity opacity-0 group-hover:opacity-100"></div>

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="bg-brand-green/10 p-3 rounded-xl group-hover:bg-brand-green/20 transition-colors">
                  <Folder className="w-6 h-6 text-brand-green drop-shadow-sm" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Удалить проект и всю историю?')) onDeleteProject(project.id);
                  }}
                  className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  title="Удалить проект"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <h3 className="font-bold text-xl text-white mb-2 line-clamp-1 group-hover:text-brand-green transition-colors drop-shadow-sm" title={project.name}>
                {project.name}
              </h3>
              <p className="text-slate-300 text-sm mb-6 line-clamp-2 h-10 leading-relaxed">
                {project.description || 'Нет описания'}
              </p>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
                <div className="flex items-center text-xs text-slate-300 gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(project.createdAt)}
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-brand-green opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                  Открыть <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
