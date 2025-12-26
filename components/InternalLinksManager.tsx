import React, { useState, useEffect } from 'react';
import { Link2, Plus, Trash2, AlertCircle, ChevronDown, ChevronUp, Edit2, Save, X } from 'lucide-react';
import type { InternalLink } from '../types';

interface InternalLinksManagerProps {
  onLinksChange?: (links: InternalLink[]) => void;
}

export const InternalLinksManager: React.FC<InternalLinksManagerProps> = ({ onLinksChange }) => {
  const [links, setLinks] = useState<InternalLink[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      const response = await fetch('/api/internal-links', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links || []);
        onLinksChange?.(data.links || []);
      }
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
      const response = await fetch('/api/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: newLink.url,
          anchorText: newLink.anchorText || null,
          keywords: newLink.keywords.split(',').map(k => k.trim()).filter(Boolean),
          priority: newLink.priority
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newLinks = [...links, data.link];
        setLinks(newLinks);
        onLinksChange?.(newLinks);
        setNewLink({ url: '', anchorText: '', keywords: '', priority: 0 });
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка добавления ссылки');
      }
    } catch (err) {
      setError('Не удалось добавить ссылку');
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      const response = await fetch(`/api/internal-links/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        const newLinks = links.filter(l => l.id !== id);
        setLinks(newLinks);
        onLinksChange?.(newLinks);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Удалить все внутренние ссылки?')) return;

    try {
      const response = await fetch('/api/internal-links', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setLinks([]);
        onLinksChange?.([]);
      }
    } catch (err) {
      console.error('Clear all failed:', err);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-brand-green" />
          <span className="font-semibold text-white">Внутренние ссылки</span>
          <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
            {links.length}/50
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-4">
          <p className="text-sm text-slate-400 mb-4">
            Добавьте URL страниц вашего сайта. AI автоматически вставит ссылки в контент.
          </p>

          {/* Add new link form */}
          <div className="space-y-3 mb-4">
            <input
              type="url"
              placeholder="URL страницы (https://...)"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-green focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Анкор текст"
                value={newLink.anchorText}
                onChange={(e) => setNewLink({ ...newLink, anchorText: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-green focus:outline-none"
              />

              <input
                type="text"
                placeholder="Ключи через запятую"
                value={newLink.keywords}
                onChange={(e) => setNewLink({ ...newLink, keywords: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-green focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-400">Приоритет:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={newLink.priority}
                  onChange={(e) => setNewLink({ ...newLink, priority: parseInt(e.target.value) || 0 })}
                  className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white text-center focus:border-brand-green focus:outline-none"
                />
              </div>

              <button
                onClick={handleAddLink}
                disabled={!newLink.url}
                className="flex-1 flex items-center justify-center gap-2 bg-brand-green text-black px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-green/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-4 text-red-400 text-sm bg-red-500/10 p-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Links list */}
          {links.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Добавленные ссылки:</span>
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
                  className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{link.url}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {link.anchorText && (
                        <span className="text-xs text-brand-green bg-brand-green/10 px-2 py-0.5 rounded">
                          {link.anchorText}
                        </span>
                      )}
                      {link.keywords.length > 0 && (
                        <span className="text-xs text-slate-400">
                          {link.keywords.slice(0, 3).join(', ')}
                          {link.keywords.length > 3 && ` +${link.keywords.length - 3}`}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">P:{link.priority}</span>
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
            <p className="text-center text-slate-500 text-sm py-4">
              Нет добавленных ссылок
            </p>
          )}
        </div>
      )}
    </div>
  );
};
