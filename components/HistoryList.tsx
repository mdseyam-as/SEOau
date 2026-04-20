import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { Clock, FileText, ChevronDown, ChevronUp, Trash2, ExternalLink } from 'lucide-react';
import { ResultView } from './ResultView';
import { useToast } from './Toast';

interface HistoryListProps {
  history: HistoryItem[];
  onDelete: (itemId: string) => void;
  onOpen?: (item: HistoryItem) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onDelete, onOpen }) => {
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
      <div className="app-light-card text-center py-20 px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(56,189,248,0.10))] shadow-[0_14px_34px_rgba(16,185,129,0.10)] animate-pulse-slow">
          <Clock className="w-8 h-8 text-emerald-600" />
        </div>
        <div className="app-badge mb-3">History</div>
        <h3 className="text-lg sm:text-xl font-semibold text-slate-900">История пуста</h3>
        <p className="text-slate-500 text-sm mt-2">Здесь будут отображаться результаты ваших генераций.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="list" aria-label="История генераций">
      {history.map((item) => (
        <article
          key={item.id}
          className="app-light-card overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.10)]"
          role="listitem"
        >
          <div
            className={`p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row gap-4 justify-between sm:items-center transition-colors ${expandedId === item.id ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))]' : 'hover:bg-slate-50/80'}`}
            onClick={() => toggleExpand(item.id)}
            role="button"
            tabIndex={0}
            aria-expanded={expandedId === item.id}
            aria-label={`${item.topic || 'Без темы'}, ${formatDate(item.timestamp)}`}
            onKeyDown={(e) => e.key === 'Enter' && toggleExpand(item.id)}
          >
            <div className="flex items-start gap-4">
              <div className={`mt-1 rounded-2xl border p-2.5 transition-colors ${expandedId === item.id ? 'border-emerald-200 bg-emerald-50 text-emerald-600 shadow-[0_12px_30px_rgba(16,185,129,0.10)]' : 'border-slate-200 bg-white text-slate-400'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base md:text-lg mb-1">
                  {item.topic || 'Без темы'}
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {formatDate(item.timestamp)}
                  </span>
                  {item.targetUrl && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-slate-500">
                      {item.targetUrl}
                    </span>
                  )}
                  {item.config?.model && (
                    <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-sky-700">
                      {item.config.model.split('/').pop()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 mt-2 md:mt-0">
              {onOpen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(item);
                  }}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-100"
                  aria-label="Открыть в генераторе"
                  title="Открыть в генераторе"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const confirmed = await toast.confirm('Удалить запись?', 'Это действие нельзя отменить.');
                  if (confirmed) {
                    onDelete(item.id);
                    toast.success('Удалено', 'Запись удалена из истории');
                  }
                }}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-500"
                aria-label="Удалить запись из истории"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-center text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                {expandedId === item.id ? (
                  <>Свернуть <ChevronUp className="w-4 h-4 ml-1" /></>
                ) : (
                  <>Подробнее <ChevronDown className="w-4 h-4 ml-1" /></>
                )}
              </div>
            </div>
          </div>

          {expandedId === item.id && (
            <div className="animate-in slide-in-from-top-2 border-t border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.72))] p-4 md:p-6">
              <ResultView result={item.result} isGeoMode={item.config.generationMode === 'geo'} />

              <div className="mt-8 border-t border-slate-200 pt-6">
                <h5 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Использованные настройки:
                </h5>
                <div className="app-light-soft grid grid-cols-1 gap-4 p-5 text-xs text-slate-600 md:grid-cols-2">
                  <div>
                    <span className="mb-1 block font-bold text-slate-400">Модель:</span>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-900">{item.config.model}</span>
                  </div>
                  <div>
                    <span className="mb-1 block font-bold text-slate-400">Лимиты:</span>
                    <span className="text-slate-900">{item.config.minChars} - {item.config.maxChars} симв.</span>
                  </div>
                  <div>
                    <span className="mb-1 block font-bold text-slate-400">LSI Ключи:</span>
                    <span className="italic text-slate-900">{item.config.lsiKeywords || 'Нет'}</span>
                  </div>
                  <div>
                    <span className="mb-1 block font-bold text-slate-400">Конкуренты:</span>
                    <span className="block max-w-full truncate text-sky-700 underline">{item.config.competitorUrls || 'Нет'}</span>
                  </div>
                </div>
                
                {onOpen && (
                  <button
                    onClick={() => onOpen(item)}
                    className="app-btn-primary mt-4 w-full"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Открыть в генераторе
                  </button>
                )}
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
};
