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
      <div className="app-dark-card text-center py-20 px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[10px] border border-[#ffb1c0]/20 bg-[linear-gradient(135deg,rgba(255,76,131,0.12),rgba(255,177,192,0.08))] shadow-[0_14px_34px_rgba(255,76,131,0.10)] animate-pulse-slow">
          <Clock className="w-8 h-8 text-[#ffb1c0]" />
        </div>
        <div className="app-badge mb-3">History</div>
        <h3 className="text-lg sm:text-xl font-semibold text-white">История пуста</h3>
        <p className="text-[#ab888e] text-sm mt-2">Здесь будут отображаться результаты ваших генераций.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="list" aria-label="История генераций">
      {history.map((item) => (
        <article
          key={item.id}
          className="app-dark-card overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-[#ffb1c0]/20 hover:shadow-[0_22px_50px_rgba(0,0,0,0.28)]"
          role="listitem"
        >
          <div
            className={`p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row gap-4 justify-between sm:items-center transition-colors ${expandedId === item.id ? 'bg-[linear-gradient(180deg,rgba(43,27,30,0.9),rgba(31,15,18,0.84))]' : 'hover:bg-white/[0.03]'}`}
            onClick={() => toggleExpand(item.id)}
            role="button"
            tabIndex={0}
            aria-expanded={expandedId === item.id}
            aria-label={`${item.topic || 'Без темы'}, ${formatDate(item.timestamp)}`}
            onKeyDown={(e) => e.key === 'Enter' && toggleExpand(item.id)}
          >
            <div className="flex items-start gap-4">
              <div className={`mt-1 rounded-[8px] border p-2.5 transition-colors ${expandedId === item.id ? 'border-[#ffb1c0]/20 bg-[rgba(255,76,131,0.12)] text-[#ffb1c0] shadow-[0_12px_30px_rgba(255,76,131,0.10)]' : 'border-white/10 bg-white/[0.03] text-[#ab888e]'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base md:text-lg mb-1">
                  {item.topic || 'Без темы'}
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#ab888e] font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {formatDate(item.timestamp)}
                  </span>
                  {item.targetUrl && (
                    <span className="rounded-full border border-[#5b3f44] bg-white/[0.03] px-2.5 py-1 font-mono text-[#d6b1b8]">
                      {item.targetUrl}
                    </span>
                  )}
                  {item.config?.model && (
                    <span className="rounded-full border border-[#ffb1c0]/20 bg-[rgba(255,76,131,0.08)] px-2.5 py-1 text-[#ffb1c0]">
                      {item.config.model.split('/').pop()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto border-t md:border-t-0 border-white/10 pt-3 md:pt-0 mt-2 md:mt-0">
              {onOpen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(item);
                  }}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] border border-[#46fa9c]/20 bg-[rgba(70,250,156,0.08)] p-2 text-[#46fa9c] transition-colors hover:bg-[rgba(70,250,156,0.14)]"
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
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.03] p-2 text-[#ab888e] transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
                aria-label="Удалить запись из истории"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-center text-xs font-bold uppercase tracking-[0.18em] text-[#ffb1c0]">
                {expandedId === item.id ? (
                  <>Свернуть <ChevronUp className="w-4 h-4 ml-1" /></>
                ) : (
                  <>Подробнее <ChevronDown className="w-4 h-4 ml-1" /></>
                )}
              </div>
            </div>
          </div>

          {expandedId === item.id && (
            <div className="animate-in slide-in-from-top-2 border-t border-white/10 bg-[linear-gradient(180deg,rgba(15,18,24,0.82),rgba(15,18,24,0.68))] p-4 md:p-6">
              <ResultView result={item.result} isAioMode={item.config.generationMode === 'aio' || item.config.generationMode === 'geo'} />

              <div className="mt-8 border-t border-white/10 pt-6">
                <h5 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                  <FileText className="w-4 h-4 text-[#ffb1c0]" />
                  Использованные настройки:
                </h5>
                <div className="app-light-soft grid grid-cols-1 gap-4 p-5 text-xs text-[#ab888e] md:grid-cols-2">
                  <div>
                    <span className="mb-1 block font-bold text-[#ab888e]">Модель:</span>
                    <span className="rounded-full border border-[#5b3f44] bg-white/[0.03] px-2.5 py-1 text-white">{item.config.model}</span>
                  </div>
                  <div>
                    <span className="mb-1 block font-bold text-[#ab888e]">Лимиты:</span>
                    <span className="text-white">{item.config.minChars} - {item.config.maxChars} симв.</span>
                  </div>
                  <div>
                    <span className="mb-1 block font-bold text-[#ab888e]">LSI Ключи:</span>
                    <span className="italic text-white">{item.config.lsiKeywords || 'Нет'}</span>
                  </div>
                  <div>
                    <span className="mb-1 block font-bold text-[#ab888e]">Конкуренты:</span>
                    <span className="block max-w-full truncate text-[#ffb1c0] underline">{item.config.competitorUrls || 'Нет'}</span>
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
