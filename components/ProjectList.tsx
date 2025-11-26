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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Folder className="w-6 h-6 text-brand-green" />
            Мои проекты
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Управляйте задачами генерации по проектам
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-brand-green hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <FolderPlus className="w-5 h-5" />
          Новый проект
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Создание проекта</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Название</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Например: Ипотека 2025"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Описание (опционально)</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Статьи для раздела ипотеки..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-slate-600 font-bold hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="flex-1 py-3 bg-brand-green text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Нет проектов</h3>
          <p className="text-slate-500 text-sm mt-1">Создайте свой первый проект, чтобы начать генерацию</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-brand-green hover:shadow-md transition-all group flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="bg-green-50 p-2 rounded-lg">
                  <Folder className="w-6 h-6 text-brand-green" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm('Удалить проект и всю историю?')) onDeleteProject(project.id);
                  }}
                  className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Удалить проект"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-1" title={project.name}>
                {project.name}
              </h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2 h-10">
                {project.description || 'Нет описания'}
              </p>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center text-xs text-slate-400 gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(project.createdAt)}
                </div>
                <button
                  onClick={() => onSelectProject(project)}
                  className="flex items-center gap-1 text-sm font-bold text-brand-green hover:underline"
                >
                  Открыть <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
