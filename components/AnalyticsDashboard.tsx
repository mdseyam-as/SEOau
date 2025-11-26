

import React from 'react';
import { SeoResult } from '../types';
import { BarChart, Activity, FileText, TrendingUp, Lock } from 'lucide-react';
import { SubscriptionPlan } from '../services/authService';

interface AnalyticsDashboardProps {
  result: SeoResult;
  onOptimizeRelevance?: (missingKeywords: string[]) => void;
  isOptimizing?: boolean;
  userPlan?: SubscriptionPlan | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ result, onOptimizeRelevance, isOptimizing, userPlan }) => {
  if (!result.metrics) return null;

  const { wordCount, relevanceScore, keywordAnalysis } = result.metrics;

  // Normalize values for visualization
  const maxFreq = Math.max(...keywordAnalysis.map(k => k.targetFrequency)) || 1;
  const maxCount = Math.max(...keywordAnalysis.map(k => k.actualCount)) || 1;

  // Identify missing keywords for optimization
  const missingKeywords = keywordAnalysis
    .filter(k => k.actualCount === 0)
    .map(k => k.keyword);

  const canOptimize = userPlan?.canOptimizeRelevance;
  const isPerfectScore = relevanceScore === 100;
  const hasMissingKeys = missingKeywords.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
       
       {/* Chart Card */}
       <div className="lg:col-span-2 bg-[#0F172A] text-white p-5 md:p-6 rounded-xl shadow-lg flex flex-col border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
               <BarChart className="w-5 h-5 text-[#38BDF8]" />
               HAR Анализ: Частота vs Вхождения
            </h3>
            <div className="flex gap-4 text-[10px] md:text-xs">
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#38BDF8]"></div>
                  <span className="text-slate-400">Частота (Excel)</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#00A859]"></div>
                  <span className="text-slate-400">Плотность (Текст)</span>
               </div>
            </div>
          </div>

          <div className="flex-1 flex items-end gap-1 md:gap-3 min-h-[180px] pb-2 border-b border-slate-700/50">
             {keywordAnalysis.map((item, idx) => {
                const heightFreq = Math.max(5, (item.targetFrequency / maxFreq) * 100);
                const heightCount = Math.max(5, (item.actualCount / maxCount) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col justify-end gap-1 group relative h-full">
                     {/* Tooltip */}
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 border border-slate-600 shadow-xl text-xs p-2 rounded hidden group-hover:block z-20 whitespace-nowrap">
                        <div className="font-bold text-white mb-1">{item.keyword}</div>
                        <div className="text-[#38BDF8]">Частота: {item.targetFrequency}</div>
                        <div className="text-[#00A859]">В тексте: {item.actualCount}</div>
                     </div>

                     <div className="w-full flex gap-0.5 md:gap-1 items-end h-full">
                        {/* Freq Bar */}
                        <div
                            style={{ height: `${heightFreq}%` }}
                            className="flex-1 bg-[#38BDF8] rounded-t-sm opacity-90 hover:opacity-100 transition-all duration-500"
                        ></div>
                        {/* Count Bar */}
                        <div
                            style={{ height: `${heightCount}%` }}
                            className="flex-1 bg-[#00A859] rounded-t-sm opacity-90 hover:opacity-100 transition-all duration-500"
                        ></div>
                     </div>
                  </div>
                )
             })}
          </div>
          <div className="mt-2 text-center text-xs text-slate-500">
             Топ-{keywordAnalysis.length} ключевых слов по популярности
          </div>
       </div>

       {/* Metrics Card */}
       <div className="bg-[#1E293B] text-white p-5 md:p-6 rounded-xl shadow-lg flex flex-col justify-between border border-slate-700">
          <div>
            <h4 className="font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-green" />
                Метрики
            </h4>
            
            <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-slate-400">Оценка релевантности</span>
                    <span className={`text-2xl font-bold ${relevanceScore >= 80 ? 'text-[#22D3EE]' : relevanceScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {relevanceScore}/100
                    </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${relevanceScore >= 80 ? 'bg-gradient-to-r from-blue-400 to-[#22D3EE]' : relevanceScore >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${relevanceScore}%` }}
                    ></div>
                </div>
                
                {/* Increase Relevance Button */}
                {!isPerfectScore && hasMissingKeys && onOptimizeRelevance && (
                   <button
                     onClick={() => canOptimize && onOptimizeRelevance(missingKeywords)}
                     disabled={isOptimizing || !canOptimize}
                     className={`
                        w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all
                        ${canOptimize 
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95' 
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-75'
                        }
                     `}
                     title={canOptimize ? `Добавить ключи: ${missingKeywords.slice(0, 3).join(', ')}...` : 'Недоступно в вашем тарифе'}
                   >
                     {isOptimizing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     ) : !canOptimize ? (
                        <> <Lock className="w-3 h-3" /> Повысить (Нужен PRO) </>
                     ) : (
                        <> <TrendingUp className="w-3 h-3" /> Повысить релевантность </>
                     )}
                   </button>
                )}

                <p className="text-xs text-slate-500 mt-2">
                   Основано на вхождении топ-ключей в текст.
                </p>
            </div>

            <div className="pt-6 border-t border-slate-700/50">
                <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm">
                    <FileText className="w-4 h-4" /> Количество слов
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{wordCount}</div>
                {/* Visual indicator for word count aim */}
                 <div className="flex gap-1 mt-2">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${wordCount > i * 500 ? 'bg-slate-500' : 'bg-slate-700'}`}></div>
                    ))}
                 </div>
            </div>
          </div>
       </div>
    </div>
  )
}