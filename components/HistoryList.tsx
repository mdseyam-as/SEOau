import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { Clock, FileText, ChevronDown, ChevronUp, Trash2, Copy, Check } from 'lucide-react';
import { ResultView } from './ResultView';
import { useToast } from './Toast';

interface HistoryListProps {
  history: HistoryItem[];
  onDelete: (itemId: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onDelete }) => {
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
          <Clock className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg sm:text-xl font-medium text-white">История пуста</h3>
        <p className="text-slate-400 text-sm mt-2">Здесь будут отображаться результаты ваших генераций.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="list" aria-label="История генераций">
      {history.map((item) => (
        <article key={item.id} className="glass-panel rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-glow-sm" role="listitem">
          <div
            className={`p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row gap-4 justify-between sm:items-center ${expandedId === item.id ? 'bg-white/5' : 'hover:bg-white/5'}`}
            onClick={() => toggleExpand(item.id)}
            role="button"
            tabIndex={0}
            aria-expanded={expandedId === item.id}
            aria-label={`${item.topic || 'Без темы'}, ${formatDate(item.timestamp)}`}
            onKeyDown={(e) => e.key === 'Enter' && toggleExpand(item.id)}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl mt-1 md:mt-0 transition-colors ${expandedId === item.id ? 'bg-brand-green/20 text-brand-green' : 'bg-white/5 text-slate-400'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base md:text-lg mb-1">
                  {item.topic || 'Без темы'}
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {formatDate(item.timestamp)}
                  </span>
                  {item.targetUrl && (
                    <span className="font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                      {item.targetUrl}
                    </span>
                  )}
                  {item.config?.model && (
                    <span className="px-2 py-0.5 bg-brand-purple/20 text-brand-purple rounded border border-brand-purple/20">
                      {item.config.model.split('/').pop()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3 md:pt-0 mt-2 md:mt-0">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const confirmed = await toast.confirm('Удалить запись?', 'Это действие нельзя отменить.');
                  if (confirmed) {
                    onDelete(item.id);
                    toast.success('Удалено', 'Запись удалена из истории');
                  }
                }}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Удалить запись из истории"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-center text-xs font-bold text-brand-green uppercase tracking-wider">
                {expandedId === item.id ? (
                  <>Свернуть <ChevronUp className="w-4 h-4 ml-1" /></>
                ) : (
                  <>Подробнее <ChevronDown className="w-4 h-4 ml-1" /></>
                )}
              </div>
            </div>
          </div>

          {expandedId === item.id && (
            <div className="border-t border-white/10 p-4 md:p-6 bg-black/20 animate-in slide-in-from-top-2">
              <ResultView result={item.result} isGeoMode={item.config.generationMode === 'geo'} />

              <div className="mt-8 pt-6 border-t border-white/10">
                <h5 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-green" />
                  Использованные настройки:
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 bg-white/5 p-5 rounded-xl border border-white/5">
                  <div>
                    <span className="font-bold text-slate-400 block mb-1">Модель:</span>
                    <span className="text-white bg-white/10 px-2 py-1 rounded">{item.config.model}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block mb-1">Лимиты:</span>
                    <span className="text-white">{item.config.minChars} - {item.config.maxChars} симв.</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block mb-1">LSI Ключи:</span>
                    <span className="text-white italic">{item.config.lsiKeywords || 'Нет'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block mb-1">Конкуренты:</span>
                    <span className="text-brand-blue underline truncate block max-w-full">{item.config.competitorUrls || 'Нет'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
};
