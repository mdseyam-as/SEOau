

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
    if(onFixSpam) {
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
      {result.spamScore !== undefined && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 overflow-hidden relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            
            {/* Gauge */}
            <div className="relative flex-shrink-0">
               <svg className="w-24 h-24 transform -rotate-90">
                 <circle
                   cx="48"
                   cy="48"
                   r="40"
                   stroke="currentColor"
                   strokeWidth="8"
                   fill="transparent"
                   className="text-gray-100"
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
                     <AlertCircle className="w-8 h-8 text-gray-400 mb-1" />
                     <span className="text-[10px] text-gray-400 uppercase font-bold">Ошибка</span>
                   </>
                 ) : (
                   <>
                     <span className={`text-xl font-bold ${getSpamColor(result.spamScore!)}`}>
                       {result.spamScore}%
                     </span>
                     <span className="text-[10px] text-gray-500 uppercase font-bold">Spam</span>
                   </>
                 )}
               </div>
            </div>

            <div className="flex-1 w-full">
              <h3 className="font-bold text-base md:text-lg mb-2 text-slate-800 flex items-center gap-2">
                <AlertOctagon className={`w-5 h-5 ${isSpamError ? 'text-gray-400' : getSpamColor(result.spamScore!)}`} />
                Анализ переспама (Grok)
              </h3>
              <p className={`text-sm mb-4 leading-relaxed ${isSpamError ? 'text-red-500 bg-red-50 p-3 rounded-lg border border-red-100' : 'text-slate-600'}`}>
                {result.spamAnalysis || 'Анализ не предоставлен.'}
              </p>
              
              {/* Fix Control Area */}
              {onFixSpam && !isSpamError && result.spamScore! > 20 && (
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                   
                   <div className="flex-1 w-full sm:w-auto">
                     <label className="block text-xs font-bold text-slate-500 mb-1">Модель для исправления:</label>
                     <div className="relative">
                        <select
                          value={selectedFixModel}
                          onChange={(e) => setSelectedFixModel(e.target.value)}
                          disabled={isFixingSpam}
                          className="w-full appearance-none bg-white border border-gray-300 text-slate-700 py-2 px-3 pr-8 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-green"
                        >
                          {userPlan?.allowedModels.map(modelId => (
                            <option key={modelId} value={modelId}>
                              {modelNames[modelId] || modelId.split('/')[1] || modelId}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                     </div>
                   </div>

                   <button
                    onClick={handleFixClick}
                    disabled={isFixingSpam}
                    className={`
                      w-full sm:w-auto mt-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-md h-[38px]
                      ${isFixingSpam ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="font-bold text-base md:text-lg mb-4 text-slate-800 flex items-center gap-2">
          <Globe className="w-5 h-5 text-brand-green" /> Мета-данные
        </h3>
        <div className="space-y-4">
          <div>
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">Title Tag ({result.metaTitle.length} симв.)</span>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-slate-700 font-medium mt-1 text-sm md:text-base">
              {result.metaTitle}
            </div>
          </div>
          <div>
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">Meta Description ({result.metaDescription.length} симв.)</span>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-slate-600 mt-1 text-sm md:text-base">
              {result.metaDescription}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-base md:text-lg text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-green" /> Готовый текст
          </h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-xs md:text-sm font-medium text-gray-600 hover:text-brand-green transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Скопировано!' : 'Копировать Markdown'}
          </button>
        </div>
        <div className="p-4 md:p-8 prose prose-sm md:prose-base prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-a:text-brand-green">
          <ReactMarkdown>{result.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};