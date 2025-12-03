

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { SeoResult, AIModel } from '../types';
import { Copy, Check, FileText, Globe, AlertOctagon, Sparkles, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { SubscriptionPlan, authService } from '../services/authService';

interface ResultViewProps {
  result: SeoResult;
  onFixSpam?: (content: string, analysis: string, model: string) => void;
  isFixingSpam?: boolean;
  userPlan?: SubscriptionPlan | null;
  onOptimizeRelevance?: (missingKeywords: string[]) => void;
  isOptimizingRelevance?: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({ result, onFixSpam, isFixingSpam, userPlan, onOptimizeRelevance, isOptimizingRelevance }) => {
  const [copied, setCopied] = useState(false);
  const [selectedFixModel, setSelectedFixModel] = useState<string>(
    userPlan?.allowedModels?.[0] || AIModel.GROK_CODE_FAST
  );

  // Need to know model names to display nicely
  const [modelNames, setModelNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const models = authService.getModels();
    const names: Record<string, string> = {};
    models.forEach(m => names[m.id] = m.name);
    setModelNames(names);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSpamColor = (score: number) => {
    if (score < 20) return 'text-green-500';
    if (score < 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleFixClick = () => {
    if (onFixSpam) {
      onFixSpam(result.content, result.spamAnalysis || '', selectedFixModel);
    }
  };

  const isSpamError = result.spamScore === -1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        result={result}
        onOptimizeRelevance={onOptimizeRelevance}
        isOptimizing={isOptimizingRelevance}
        userPlan={userPlan}
      />

      {/* Spam Score Card (New) */}
      {/* Spam Score Card (New) */}
      {result.spamScore !== undefined && (
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center relative z-10">

            {/* Gauge */}
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <svg className="w-24 h-24 transform -rotate-90 drop-shadow-glow">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-white/10"
                />
                {!isSpamError && (
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * result.spamScore!) / 100}
                    className={`${getSpamColor(result.spamScore!)} transition-all duration-1000 ease-out`}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isSpamError ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Ошибка</span>
                  </>
                ) : (
                  <>
                    <span className={`text-2xl font-bold ${getSpamColor(result.spamScore!)} drop-shadow-sm`}>
                      {result.spamScore}%
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Spam</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 w-full">
              <h3 className="font-bold text-lg mb-2 text-white flex items-center gap-2">
                <AlertOctagon className={`w-5 h-5 ${isSpamError ? 'text-slate-400' : getSpamColor(result.spamScore!)}`} />
                Анализ переспама (Grok)
              </h3>
              <p className={`text-sm mb-4 leading-relaxed ${isSpamError ? 'text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20 font-medium' : 'text-slate-300'}`}>
                {isSpamError
                  ? '⚠️ Не удалось выполнить анализ переспама. Возможно, сервис Grok временно недоступен или требуется настройка API на сервере. Вы можете продолжить работу с текстом без этого анализа.'
                  : (result.spamAnalysis || 'Анализ не предоставлен.')
                }
              </p>

              {/* Fix Control Area */}
              {onFixSpam && !isSpamError && result.spamScore! > 20 && (
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white/5 p-4 rounded-xl border border-white/10">

                  <div className="flex-1 w-full sm:w-auto">
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Модель для исправления:</label>
                    <div className="relative">
                      <select
                        value={selectedFixModel}
                        onChange={(e) => setSelectedFixModel(e.target.value)}
                        disabled={isFixingSpam}
                        className="w-full appearance-none bg-white/10 border border-white/10 text-white py-2.5 px-3 pr-8 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-green [&>option]:text-slate-900"
                      >
                        {userPlan?.allowedModels.map(modelId => (
                          <option key={modelId} value={modelId}>
                            {modelNames[modelId] || modelId.split('/')[1] || modelId}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <button
                    onClick={handleFixClick}
                    disabled={isFixingSpam}
                    className={`
                      w-full sm:w-auto mt-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg h-[42px]
                      ${isFixingSpam ? 'bg-slate-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-glow active:scale-95'}
                    `}
                  >
                    {isFixingSpam ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Исправление...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Исправить переспам
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meta Info Card */}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-brand-green" />
          Мета-данные
        </h3>
        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Title Tag ({result.metaTitle.length} симв.)</span>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium mt-2 text-base shadow-inner">
              {result.metaTitle}
            </div>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Meta Description ({result.metaDescription.length} симв.)</span>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-slate-300 mt-2 text-base shadow-inner leading-relaxed">
              {result.metaDescription}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 backdrop-blur-sm">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-green" />
            Готовый текст
          </h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-brand-green transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Скопировано!' : 'Копировать Markdown'}
          </button>
        </div>
        <div className="p-6 sm:p-8 prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-slate-300 prose-a:text-brand-green prose-strong:text-white prose-code:text-brand-purple prose-code:bg-white/10 prose-code:px-1 prose-code:rounded">
          <ReactMarkdown>{result.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};