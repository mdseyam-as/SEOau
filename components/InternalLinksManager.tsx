import React, { useState, useEffect } from 'react';
import { Link2, Plus, Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { InternalLink } from '../types';
import { apiService } from '../services/apiService';

interface InternalLinksManagerProps {
  onLinksChange?: (links: InternalLink[]) => void;
}

export const InternalLinksManager: React.FC<InternalLinksManagerProps> = ({ onLinksChange }) => {
  const [links, setLinks] = useState<InternalLink[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newLink, setNewLink] = useState({
    url: '',
    anchorText: '',
    keywords: '',
    priority: 0
  });

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const data = await apiService.getInternalLinks();
      setLinks(data.links || []);
      onLinksChange?.(data.links || []);
    } catch (err) {
      console.error('Failed to load internal links:', err);
    }
  };

  const handleAddLink = async () => {
    if (!newLink.url) {
      setError('URL обязателен');
      return;
    }

    try {
      setError(null);
      const data = await apiService.addInternalLink({
        url: newLink.url,
        anchorText: newLink.anchorText || undefined,
        keywords: newLink.keywords.split(',').map(k => k.trim()).filter(Boolean),
        priority: newLink.priority
      });

      const newLinks = [...links, data.link];
      setLinks(newLinks);
      onLinksChange?.(newLinks);
      setNewLink({ url: '', anchorText: '', keywords: '', priority: 0 });
    } catch (err: any) {
      setError(err.message || 'Ошибка добавления ссылки');
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      await apiService.deleteInternalLink(id);
      const newLinks = links.filter(l => l.id !== id);
      setLinks(newLinks);
      onLinksChange?.(newLinks);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Удалить все внутренние ссылки?')) return;

    try {
      await apiService.deleteAllInternalLinks();
      setLinks([]);
      onLinksChange?.([]);
    } catch (err) {
      console.error('Clear all failed:', err);
    }
  };

  return (
    <div className="app-dark-card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#46fa9c]/20 bg-[rgba(70,250,156,0.08)]">
            <Link2 className="w-5 h-5 text-[#46fa9c]" />
          </div>
          <span className="font-semibold text-white">Внутренние ссылки</span>
          <span className="text-xs text-[#ab888e] bg-white/[0.03] border border-white/10 px-2 py-0.5 rounded-full">
            {links.length}/50
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#ab888e]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#ab888e]" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4">
          <p className="text-sm text-[#ab888e] mb-4 leading-relaxed">
            Добавьте URL страниц вашего сайта. AI автоматически вставит ссылки в контент.
          </p>

          {/* Add new link form */}
          <div className="space-y-3 mb-4">
            <input
              type="url"
              placeholder="URL страницы (https://...)"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              className="app-input-dark"
            />

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Анкор текст"
                value={newLink.anchorText}
                onChange={(e) => setNewLink({ ...newLink, anchorText: e.target.value })}
                className="app-input-dark"
              />

              <input
                type="text"
                placeholder="Ключи через запятую"
                value={newLink.keywords}
                onChange={(e) => setNewLink({ ...newLink, keywords: e.target.value })}
                className="app-input-dark"
              />
            </div>

            <div className="flex flex-col xl:flex-row gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#ab888e]">Приоритет:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={newLink.priority}
                  onChange={(e) => setNewLink({ ...newLink, priority: parseInt(e.target.value) || 0 })}
                  className="w-16 app-input-dark px-2 py-1 text-center"
                />
              </div>

              <button
                onClick={handleAddLink}
                disabled={!newLink.url}
                className="app-btn-primary flex-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-4 text-red-200 text-sm bg-[rgba(74,23,29,0.88)] p-2 rounded-[8px] border border-red-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Links list */}
          {links.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-[#ab888e]">Добавленные ссылки:</span>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Удалить все
                </button>
              </div>

              {links.map(link => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-[8px] border border-white/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white break-all">{link.url}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {link.anchorText && (
                        <span className="text-xs text-[#46fa9c] bg-[#46fa9c]/10 px-2 py-0.5 rounded-full border border-[#46fa9c]/20">
                          {link.anchorText}
                        </span>
                      )}
                      {link.keywords.length > 0 && (
                        <span className="text-xs text-[#ab888e]">
                          {link.keywords.slice(0, 3).join(', ')}
                          {link.keywords.length > 3 && ` +${link.keywords.length - 3}`}
                        </span>
                      )}
                      <span className="text-xs text-[#ab888e]">P:{link.priority}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="Удалить ссылку"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {links.length === 0 && (
            <p className="text-center text-[#ab888e] text-sm py-4">
              Нет добавленных ссылок
            </p>
          )}
        </div>
      )}
    </div>
  );
};
