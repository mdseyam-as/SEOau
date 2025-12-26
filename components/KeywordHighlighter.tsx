import React, { useMemo, useState } from 'react';
import { Tag, Eye, EyeOff, BarChart2 } from 'lucide-react';

interface KeywordHighlighterProps {
  content: string;
  keywords: string[];
  onAnalyze?: () => void;
}

interface KeywordStats {
  keyword: string;
  count: number;
  used: boolean;
}

export const KeywordHighlighter: React.FC<KeywordHighlighterProps> = ({
  content,
  keywords,
  onAnalyze
}) => {
  const [showHighlight, setShowHighlight] = useState(true);
  const [showStats, setShowStats] = useState(false);

  const stats = useMemo(() => {
    const contentLower = content.toLowerCase();

    return keywords.map(keyword => {
      const kw = keyword.toLowerCase();
      const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'gi');
      const matches = content.match(regex);
      const count = matches ? matches.length : 0;

      return {
        keyword,
        count,
        used: count > 0
      };
    });
  }, [content, keywords]);

  const usedCount = stats.filter(s => s.used).length;
  const missingCount = stats.filter(s => !s.used).length;

  const highlightedContent = useMemo(() => {
    if (!showHighlight || keywords.length === 0) {
      return content;
    }

    let result = content;
    const usedKeywords = stats.filter(s => s.used).map(s => s.keyword);

    // Sort by length (longer first to avoid partial matches)
    const sortedKeywords = [...usedKeywords].sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
      const regex = new RegExp(`(\\b${escapeRegex(keyword)}\\b)`, 'gi');
      result = result.replace(regex, '{{HIGHLIGHT}}$1{{/HIGHLIGHT}}');
    }

    return result;
  }, [content, keywords, stats, showHighlight]);

  const renderContent = () => {
    if (!showHighlight) {
      return <span className="text-slate-300">{content}</span>;
    }

    const parts = highlightedContent.split(/(\{\{HIGHLIGHT\}\}.*?\{\{\/HIGHLIGHT\}\})/g);

    return parts.map((part, index) => {
      if (part.startsWith('{{HIGHLIGHT}}') && part.endsWith('{{/HIGHLIGHT}}')) {
        const text = part.replace('{{HIGHLIGHT}}', '').replace('{{/HIGHLIGHT}}', '');
        return (
          <mark
            key={index}
            className="bg-brand-green/30 text-brand-green rounded px-0.5"
          >
            {text}
          </mark>
        );
      }
      return <span key={index} className="text-slate-300">{part}</span>;
    });
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-brand-green" />
          <span className="text-sm font-medium text-white">Анализ ключевых слов</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-xs mr-2">
            <span className="text-green-400">{usedCount} использовано</span>
            <span className="text-red-400">{missingCount} пропущено</span>
          </div>

          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-1.5 rounded transition-colors ${
              showStats ? 'bg-slate-700 text-brand-green' : 'text-slate-400 hover:text-white'
            }`}
            title="Статистика"
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowHighlight(!showHighlight)}
            className={`p-1.5 rounded transition-colors ${
              showHighlight ? 'bg-slate-700 text-brand-green' : 'text-slate-400 hover:text-white'
            }`}
            title={showHighlight ? 'Скрыть подсветку' : 'Показать подсветку'}
          >
            {showHighlight ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats panel */}
      {showStats && (
        <div className="p-3 border-b border-slate-700 bg-slate-900/50">
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`flex items-center justify-between text-xs p-2 rounded ${
                  stat.used
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                <span className="truncate">{stat.keyword}</span>
                <span className="ml-2 shrink-0">x{stat.count}</span>
              </div>
            ))}
          </div>

          {keywords.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-2">
              Нет ключевых слов для анализа
            </p>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 max-h-64 overflow-y-auto">
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {renderContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {keywords.length > 0
              ? `${Math.round((usedCount / keywords.length) * 100)}% ключевых слов использовано`
              : 'Загрузите ключевые слова для анализа'
            }
          </span>

          {onAnalyze && (
            <button
              onClick={onAnalyze}
              className="text-brand-green hover:underline"
            >
              Подробный анализ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
