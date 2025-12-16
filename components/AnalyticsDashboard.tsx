

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 mb-4 sm:mb-6 lg:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">

         {/* Chart Card */}
         <div className="lg:col-span-2 glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl flex flex-col relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-6 relative z-10">
               <h3 className="text-xs sm:text-sm lg:text-base font-bold text-white flex items-center gap-1.5 sm:gap-2">
                  <BarChart className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
                  HAR Анализ
               </h3>
               <div className="flex gap-2 sm:gap-4 text-[9px] sm:text-[10px] md:text-xs">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                     <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(56,189,248,0.6)]"></div>
                     <span className="text-slate-300">Частота</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                     <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-green shadow-[0_0_8px_rgba(0,220,130,0.6)]"></div>
                     <span className="text-slate-300">Плотность</span>
                  </div>
               </div>
            </div>

            <div className="flex-1 flex items-end gap-0.5 sm:gap-1 md:gap-2 lg:gap-3 min-h-[140px] sm:min-h-[160px] lg:min-h-[180px] pb-2 border-b border-white/10 relative z-10">
               {keywordAnalysis.map((item, idx) => {
                  const heightFreq = Math.max(5, (item.targetFrequency / maxFreq) * 100);
                  const heightCount = Math.max(5, (item.actualCount / maxCount) * 100);

                  return (
                     <div key={idx} className="flex-1 flex flex-col justify-end gap-1 group relative h-full">
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-xl text-xs p-3 rounded-xl hidden group-hover:block z-20 whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                           <div className="font-bold text-white mb-1">{item.keyword}</div>
                           <div className="text-brand-blue">Частота: {item.targetFrequency}</div>
                           <div className="text-brand-green">В тексте: {item.actualCount}</div>
                        </div>

                        <div className="w-full flex gap-0.5 md:gap-1 items-end h-full">
                           {/* Freq Bar */}
                           <div
                              style={{ height: `${heightFreq}%` }}
                              className="flex-1 bg-brand-blue rounded-t-sm opacity-80 hover:opacity-100 transition-all duration-500 shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                           ></div>
                           {/* Count Bar */}
                           <div
                              style={{ height: `${heightCount}%` }}
                              className="flex-1 bg-brand-green rounded-t-sm opacity-80 hover:opacity-100 transition-all duration-500 shadow-[0_0_10px_rgba(0,220,130,0.3)]"
                           ></div>
                        </div>
                     </div>
                  )
               })}
            </div>
            <div className="mt-3 text-center text-xs text-slate-400">
               Топ-{keywordAnalysis.length} ключевых слов по популярности
            </div>
         </div>

         {/* Metrics Card */}
         <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl flex flex-col justify-between relative overflow-hidden">
            <div>
               <h4 className="font-bold text-white mb-4 sm:mb-5 lg:mb-6 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-brand-purple" />
                  Метрики
               </h4>

               <div className="mb-6 sm:mb-7 lg:mb-8">
                  <div className="flex justify-between items-end mb-2 sm:mb-3">
                     <span className="text-xs sm:text-sm text-slate-300">Оценка релевантности</span>
                     <span className={`text-xl sm:text-2xl font-bold ${relevanceScore >= 80 ? 'text-brand-blue drop-shadow-glow' : relevanceScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {relevanceScore}/100
                     </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 sm:h-3 overflow-hidden backdrop-blur-sm border border-white/5">
                     <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] ${relevanceScore >= 80 ? 'bg-gradient-to-r from-blue-500 to-brand-blue' : relevanceScore >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                        style={{ width: `${relevanceScore}%` }}
                     ></div>
                  </div>

                  {/* Increase Relevance Button */}
                  {!isPerfectScore && hasMissingKeys && onOptimizeRelevance && (
                     <button
                        onClick={() => canOptimize && onOptimizeRelevance(missingKeywords)}
                        disabled={isOptimizing || !canOptimize}
                        className={`
                        w-full mt-4 sm:mt-5 lg:mt-6 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-lg
                        ${canOptimize
                              ? 'bg-brand-blue hover:bg-blue-500 text-white hover:shadow-glow active:scale-95'
                              : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-75'
                           }
                     `}
                        title={canOptimize ? `Добавить ключи: ${missingKeywords.slice(0, 3).join(', ')}...` : 'Недоступно в вашем тарифе'}
                     >
                        {isOptimizing ? (
                           <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : !canOptimize ? (
                           <> <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Повысить (PRO) </>
                        ) : (
                           <> <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Повысить релевантность </>
                        )}
                     </button>
                  )}

                  <p className="text-[10px] sm:text-xs text-slate-400 mt-2 sm:mt-3">
                     Основано на вхождении топ-ключей в текст.
                  </p>
               </div>

               <div className="pt-4 sm:pt-5 lg:pt-6 border-t border-white/10">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 text-slate-300 text-xs sm:text-sm">
                     <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-green" /> Количество слов
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">{wordCount}</div>
                  {/* Visual indicator for word count aim */}
                  <div className="flex gap-1 sm:gap-1.5 mt-2 sm:mt-3">
                     {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-1 sm:h-1.5 flex-1 rounded-full transition-colors ${wordCount > i * 500 ? 'bg-brand-green shadow-[0_0_5px_rgba(0,220,130,0.5)]' : 'bg-white/10'}`}></div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
   )
}