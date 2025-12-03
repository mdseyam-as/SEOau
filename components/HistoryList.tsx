import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { Clock, FileText, ChevronDown, ChevronUp, Trash2, Copy, Check } from 'lucide-react';
import { ResultView } from './ResultView';

interface HistoryListProps {
  history: HistoryItem[];
  onDelete: (itemId: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onDelete }) => {
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
      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">История пуста</h3>
        <p className="text-slate-500 text-sm mt-1">Здесь будут отображаться результаты ваших генераций.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
          <div
            className={`p-3 sm:p-4 md:p-5 cursor-pointer flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between sm:items-center ${expandedId === item.id ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
            onClick={() => toggleExpand(item.id)}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg mt-1 md:mt-0 ${expandedId === item.id ? 'bg-white shadow-sm text-brand-green' : 'bg-gray-100 text-gray-500'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm md:text-base">
                  {item.topic || 'Без темы'}
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDate(item.timestamp)}
                  </span>
                  {item.targetUrl && (
                    <span className="font-mono text-gray-400">
                      {item.targetUrl}
                    </span>
                  )}
                  {item.config?.model && (
                    <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px] text-gray-600">
                      {item.config.model.split('/').pop()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Удалить эту запись?')) onDelete(item.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Удалить"
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
            <div className="border-t border-gray-200 p-4 md:p-6 bg-white animate-in slide-in-from-top-2">
              <ResultView result={item.result} />

              <div className="mt-6 pt-6 border-t border-gray-100">
                <h5 className="font-bold text-slate-700 text-sm mb-3">Использованные настройки:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <span className="font-bold">Модель:</span> {item.config.model}
                  </div>
                  <div>
                    <span className="font-bold">Лимиты:</span> {item.config.minChars} - {item.config.maxChars} симв.
                  </div>
                  <div>
                    <span className="font-bold">LSI:</span> {item.config.lsiKeywords || 'Нет'}
                  </div>
                  <div>
                    <span className="font-bold">Конкуренты:</span> {item.config.competitorUrls || 'Нет'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
