import React, { useState } from 'react';
import {
  Search, AlertTriangle, AlertCircle, Info, CheckCircle2, ExternalLink,
  Globe, FileText, Image, Link2, Code, Smartphone, Zap, RefreshCw,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { User } from '../types';

interface SeoAuditResult {
  url: string;
  extracted: {
    title: string;
    titleLength: number;
    metaDescription: string;
    metaDescriptionLength: number;
    h1: string[];
    h2: string[];
    h3: string[];
    images: { total: number; withoutAlt: number };
    links: { internal: number; external: number; nofollow: number };
    canonical: string;
    robots: string;
    ogTags: Record<string, string>;
    schemaOrg: boolean;
    viewport: boolean;
    contentLength: number;
  };
  analysis: {
    score: number;
    summary: string;
    issues: Array<{
      severity: 'critical' | 'warning' | 'info';
      category: string;
      title: string;
      description: string;
      recommendation: string;
    }>;
    positives: string[];
  };
}

interface SeoAuditorProps {
  onUserUpdate?: (user: User) => void;
  onClose?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  meta: <FileText className="w-4 h-4" />,
  content: <Globe className="w-4 h-4" />,
  technical: <Code className="w-4 h-4" />,
  schema: <Code className="w-4 h-4" />,
  mobile: <Smartphone className="w-4 h-4" />,
  performance: <Zap className="w-4 h-4" />,
};

const SEVERITY_CONFIG = {
  critical: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
    text: 'text-red-400',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Критично'
  },
  warning: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/40',
    text: 'text-yellow-400',
    icon: <AlertCircle className="w-4 h-4" />,
    label: 'Внимание'
  },
  info: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    icon: <Info className="w-4 h-4" />,
    label: 'Информация'
  }
};

export const SeoAuditor: React.FC<SeoAuditorProps> = ({ onUserUpdate, onClose }) => {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SeoAuditResult | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Введите URL страницы');
      return;
    }

    // Validate URL
    let validUrl = url.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    try {
      new URL(validUrl);
    } catch {
      setError('Некорректный URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.seoAudit(validUrl);
      setResult(response);
      if (onUserUpdate && response.user) {
        onUserUpdate(response.user);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка анализа');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleIssue = (index: number) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIssues(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 px-4 sm:px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/30 rounded-xl">
              <Search className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">SEO Аудитор</h2>
              <p className="text-xs text-slate-400">Анализ страницы на SEO-оптимизацию</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* URL Input */}
      <div className="p-4 sm:p-6 border-b border-white/5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-xl transition-all shadow-lg disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Анализ...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Анализировать
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="p-8 text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Загружаем и анализируем страницу...</p>
          <p className="text-xs text-slate-500 mt-2">Это может занять несколько секунд</p>
        </div>
      )}

      {/* Results */}
      {result && !isAnalyzing && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Score Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64" cy="64" r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-white/10"
                />
                <circle
                  cx="64" cy="64" r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={351.86}
                  strokeDashoffset={351.86 - (351.86 * result.analysis.score) / 100}
                  className={`${getScoreColor(result.analysis.score)} transition-all duration-1000`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${getScoreColor(result.analysis.score)}`}>
                  {result.analysis.score}
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Score</span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-400 hover:text-purple-300 flex items-center justify-center sm:justify-start gap-1 mb-2"
              >
                {result.url}
                <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-slate-300 text-sm leading-relaxed">
                {result.analysis.summary}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
              <FileText className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{result.extracted.titleLength}</div>
              <div className="text-[10px] text-slate-400 uppercase">Title</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
              <FileText className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{result.extracted.h1.length}</div>
              <div className="text-[10px] text-slate-400 uppercase">H1</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
              <Image className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{result.extracted.images.total}</div>
              <div className="text-[10px] text-slate-400 uppercase">Картинки</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
              <Link2 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{result.extracted.links.internal + result.extracted.links.external}</div>
              <div className="text-[10px] text-slate-400 uppercase">Ссылки</div>
            </div>
          </div>

          {/* Positives */}
          {result.analysis.positives && result.analysis.positives.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <h3 className="text-sm font-bold text-green-400 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" />
                Что хорошо
              </h3>
              <ul className="space-y-2">
                {result.analysis.positives.map((positive, index) => (
                  <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {positive}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Issues */}
          {result.analysis.issues && result.analysis.issues.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Проблемы и рекомендации ({result.analysis.issues.length})
              </h3>

              {result.analysis.issues.map((issue, index) => {
                const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
                const isExpanded = expandedIssues.has(index);

                return (
                  <div
                    key={index}
                    className={`${config.bg} border ${config.border} rounded-xl overflow-hidden transition-all`}
                  >
                    <button
                      onClick={() => toggleIssue(index)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className={config.text}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${config.bg} ${config.text}`}>
                            {config.label}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                            {CATEGORY_ICONS[issue.category]}
                            {issue.category}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white mt-1 truncate">
                          {issue.title}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-white/10 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Описание</p>
                          <p className="text-sm text-slate-300">{issue.description}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Как исправить</p>
                          <p className="text-sm text-green-300">{issue.recommendation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Extracted Data Details */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-bold text-slate-400 hover:text-slate-300 flex items-center gap-2">
              <Code className="w-4 h-4" />
              Извлеченные данные
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-4 bg-slate-900/50 rounded-xl p-4 text-xs font-mono text-slate-400 overflow-x-auto">
              <pre>{JSON.stringify(result.extracted, null, 2)}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
