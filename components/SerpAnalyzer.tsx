import React, { useState } from 'react';
import { 
  Search, TrendingUp, FileText, List, Image, Table2, 
  HelpCircle, Globe, Loader2, CheckCircle, AlertTriangle,
  Target, Lightbulb, BarChart3, ChevronDown, ChevronUp
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { SerpAnalysisResult, SerpCompetitor } from '../types';

interface SerpAnalyzerProps {
  onApplyRecommendations?: (recommendations: {
    minChars: number;
    maxChars: number;
    suggestedH2: string[];
    lsiKeywords: string[];
  }) => void;
}

export const SerpAnalyzer: React.FC<SerpAnalyzerProps> = ({ onApplyRecommendations }) => {
  const [query, setQuery] = useState('');
  const [searchEngine, setSearchEngine] = useState<'google' | 'yandex'>('google');
  const [region, setRegion] = useState('ru');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SerpAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompetitors, setShowCompetitors] = useState(false);

  const handleAnalyze = async () => {
    if (!query.trim()) {
      setError('Введите поисковый запрос');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiService.serpAnalyze(query, searchEngine, region, 10);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка анализа');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (result && onApplyRecommendations) {
      onApplyRecommendations({
        minChars: Math.round(result.recommendations.targetCharCount * 0.9),
        maxChars: result.recommendations.targetCharCount,
        suggestedH2: result.recommendations.suggestedH2Titles,
        lsiKeywords: result.recommendations.lsiKeywords
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base sm:text-lg">SERP Analyzer</h3>
            <p className="text-white/80 text-xs sm:text-sm">Анализ топ-10 выдачи конкурентов</p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите поисковый запрос..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={searchEngine}
              onChange={(e) => setSearchEngine(e.target.value as 'google' | 'yandex')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="google">Google</option>
              <option value="yandex">Яндекс</option>
            </select>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="ru">Россия</option>
              <option value="kz">Казахстан</option>
              <option value="ua">Украина</option>
              <option value="by">Беларусь</option>
            </select>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !query.trim()}
              className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                isAnalyzing || !query.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Анализ...</>
              ) : (
                <><Search className="w-4 h-4" /> Анализировать</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Summary */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Lightbulb className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Рекомендация</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<FileText className="w-4 h-4" />}
              label="Средний объём"
              value={`${result.analysis.avgWordCount.toLocaleString()} слов`}
              target={`Цель: ${result.recommendations.targetWordCount.toLocaleString()}`}
              color="blue"
            />
            <StatCard
              icon={<List className="w-4 h-4" />}
              label="Заголовков H2"
              value={result.analysis.avgH2Count.toString()}
              target={`Цель: ${result.recommendations.targetH2Count}`}
              color="green"
            />
            <StatCard
              icon={<Table2 className="w-4 h-4" />}
              label="Таблиц"
              value={result.analysis.avgTablesCount.toString()}
              target={result.recommendations.mustHaveElements.includes('таблица') ? 'Нужна!' : 'Опционально'}
              color="amber"
            />
            <StatCard
              icon={<HelpCircle className="w-4 h-4" />}
              label="FAQ блоков"
              value={result.analysis.avgFaqCount.toString()}
              target={result.recommendations.mustHaveElements.includes('FAQ') ? 'Нужен!' : 'Опционально'}
              color="purple"
            />
          </div>

          {/* Must Have Elements */}
          <div>
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              Обязательные элементы
            </h4>
            <div className="flex flex-wrap gap-2">
              {result.recommendations.mustHaveElements.map((element, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                >
                  {element}
                </span>
              ))}
            </div>
          </div>

          {/* Suggested H2 Titles */}
          <div>
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <List className="w-4 h-4 text-green-600" />
              Рекомендуемые заголовки H2
            </h4>
            <ul className="space-y-2">
              {result.recommendations.suggestedH2Titles.map((title, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {title}
                </li>
              ))}
            </ul>
          </div>

          {/* LSI Keywords */}
          <div>
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              LSI ключевые слова
            </h4>
            <div className="flex flex-wrap gap-2">
              {result.recommendations.lsiKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Content Gaps */}
          <div>
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-purple-600" />
              Что упускают конкуренты
            </h4>
            <ul className="space-y-2">
              {result.recommendations.contentGaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-purple-500 mt-0.5">💡</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>

          {/* Unique Angle */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <h4 className="font-bold text-slate-800 mb-2">🎯 Уникальный угол подачи</h4>
            <p className="text-sm text-slate-600">{result.recommendations.uniqueAngle}</p>
          </div>

          {/* Competitors (Collapsible) */}
          <div>
            <button
              onClick={() => setShowCompetitors(!showCompetitors)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Анализ конкурентов ({result.competitors.length})
              </span>
              {showCompetitors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showCompetitors && (
              <div className="mt-3 space-y-3">
                {result.competitors.map((comp, i) => (
                  <CompetitorCard key={i} competitor={comp} />
                ))}
              </div>
            )}
          </div>

          {/* Apply Button */}
          {onApplyRecommendations && (
            <button
              onClick={handleApply}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Применить рекомендации к генерации
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  target: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}> = ({ icon, label, value, target, color }) => {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600'
  };

  return (
    <div className={`p-3 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] opacity-70">{target}</div>
    </div>
  );
};

// Competitor Card Component
const CompetitorCard: React.FC<{ competitor: SerpCompetitor }> = ({ competitor }) => (
  <div className="p-4 bg-white border border-gray-200 rounded-lg">
    <div className="flex items-start justify-between mb-2">
      <div>
        <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold mr-2">
          {competitor.position}
        </span>
        <span className="font-medium text-slate-800">{competitor.domain}</span>
      </div>
      <span className="text-xs text-slate-500">{competitor.wordCount.toLocaleString()} слов</span>
    </div>
    <p className="text-sm text-slate-600 mb-2 line-clamp-1">{competitor.title}</p>
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="px-2 py-0.5 bg-gray-100 rounded">H2: {competitor.h2Count}</span>
      {competitor.hasTable && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">Таблица</span>}
      {competitor.hasFaq && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">FAQ</span>}
    </div>
    {competitor.strengths.length > 0 && (
      <div className="mt-2 text-xs text-green-600">
        ✓ {competitor.strengths.slice(0, 2).join(', ')}
      </div>
    )}
  </div>
);

export default SerpAnalyzer;
