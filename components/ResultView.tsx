import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { SeoResult, AIModel, FaqItem } from '../types';
import {
  Copy, Check, FileText, Globe, AlertOctagon, Sparkles, RefreshCw,
  ChevronDown, ChevronUp, AlertCircle, Code, GitBranch, ExternalLink,
  Image, MessageCircleQuestion, Layers
} from 'lucide-react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { SubscriptionPlan, authService } from '../services/authService';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#8b5cf6',
    primaryTextColor: '#fff',
    primaryBorderColor: '#6d28d9',
    lineColor: '#94a3b8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#0f172a',
    mainBkg: '#1e293b',
    nodeBorder: '#6d28d9',
    clusterBkg: '#1e293b',
    titleColor: '#f8fafc',
    edgeLabelBackground: '#1e293b'
  },
  flowchart: {
    curve: 'basis',
    padding: 20
  }
});

// ==================== MERMAID RENDERER ====================

interface MermaidDiagramProps {
  code: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError(null);
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setError(err.message || 'Ошибка рендеринга диаграммы');
      }
    };

    if (code) {
      renderDiagram();
    }
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-bold">Ошибка диаграммы</span>
        </div>
        <pre className="text-xs text-red-300 font-mono overflow-x-auto">{error}</pre>
        <details className="mt-3">
          <summary className="text-xs text-slate-400 cursor-pointer">Исходный код</summary>
          <pre className="mt-2 text-xs text-slate-400 font-mono bg-slate-900/50 p-3 rounded-lg overflow-x-auto">{code}</pre>
        </details>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        className="bg-slate-900/50 rounded-xl p-4 overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Скопировано' : 'Код'}
        </button>
        <a
          href={`https://mermaid.live/edit#pako:${btoa(code)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Открыть
        </a>
      </div>
    </div>
  );
};

// ==================== FAQ ACCORDION ====================

interface FaqAccordionProps {
  items: FaqItem[];
}

const FaqAccordion: React.FC<FaqAccordionProps> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
          >
            <span className="font-semibold text-white text-sm sm:text-base pr-4">
              {item.question}
            </span>
            {openIndex === index ? (
              <ChevronUp className="w-5 h-5 text-brand-green flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
            )}
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-4 pb-4 text-slate-300 text-sm leading-relaxed border-t border-white/5 pt-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== SVG RENDERER ====================

interface SvgRendererProps {
  svg: string;
}

const SvgRenderer: React.FC<SvgRendererProps> = ({ svg }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div
        className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl p-6 flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-80"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-brand-green transition-colors bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Скопировано' : 'SVG код'}
      </button>
    </div>
  );
};

// ==================== LEGACY CONTENT SANITIZER ====================

function sanitizeContent(content: string): { cleanContent: string; jsonLd: string | null; mermaidCode: string | null } {
  if (!content) return { cleanContent: '', jsonLd: null, mermaidCode: null };

  const scriptRegex = /<script\s+type=["']application\/ld\+json["'][\s\S]*?>([\s\S]*?)<\/script>/gi;
  let jsonLd: string | null = null;

  const matches = content.match(scriptRegex);
  if (matches && matches.length > 0) {
    const jsonMatch = matches[0].match(/<script[\s\S]*?>([\s\S]*?)<\/script>/i);
    if (jsonMatch && jsonMatch[1]) {
      jsonLd = jsonMatch[1].trim();
    }
  }

  const mermaidRegex = /```mermaid\s*([\s\S]*?)```/gi;
  let mermaidCode: string | null = null;

  const mermaidMatches = content.match(mermaidRegex);
  if (mermaidMatches && mermaidMatches.length > 0) {
    const codeMatch = mermaidMatches[0].match(/```mermaid\s*([\s\S]*?)```/i);
    if (codeMatch && codeMatch[1]) {
      mermaidCode = codeMatch[1].trim();
    }
  }

  const cleanContent = content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/```mermaid[\s\S]*?```/gi, '')
    .trim();

  return { cleanContent, jsonLd, mermaidCode };
}

// ==================== MAIN COMPONENT ====================

interface ResultViewProps {
  result: SeoResult;
  onFixSpam?: (content: string, analysis: string, model: string) => void;
  isFixingSpam?: boolean;
  userPlan?: SubscriptionPlan | null;
  onOptimizeRelevance?: (missingKeywords: string[]) => void;
  isOptimizingRelevance?: boolean;
  onUserUpdate?: (user: any) => void;
  topic?: string;
  keywords?: string[];
  isGeoMode?: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  onFixSpam,
  isFixingSpam,
  userPlan,
  onOptimizeRelevance,
  isOptimizingRelevance,
  onUserUpdate,
  topic = '',
  keywords = [],
  isGeoMode = false
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedJsonLd, setCopiedJsonLd] = useState(false);
  const [selectedFixModel, setSelectedFixModel] = useState<string>(
    userPlan?.allowedModels?.[0] || AIModel.GROK_CODE_FAST
  );
  const [modelNames, setModelNames] = useState<Record<string, string>>({});

  // Check if we have structured content
  const isStructured = result._structured && result.article;

  // For legacy mode: sanitize content
  const { cleanContent, jsonLd: legacyJsonLd, mermaidCode: legacyMermaid } = useMemo(() => {
    if (isStructured) return { cleanContent: '', jsonLd: null, mermaidCode: null };
    return sanitizeContent(result.content || '');
  }, [result.content, isStructured]);

  // Get visuals from structured or legacy
  const mermaidCode = isStructured ? result.visuals?.mermaid : legacyMermaid;
  const svgCode = isStructured ? result.visuals?.svg : null;
  const jsonLd = isStructured
    ? (result.seo?.schemaLD ? JSON.stringify(result.seo.schemaLD, null, 2) : null)
    : legacyJsonLd;

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
    <div className="space-y-4 sm:space-y-5 lg:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        result={result}
        onOptimizeRelevance={onOptimizeRelevance}
        isOptimizing={isOptimizingRelevance}
        userPlan={userPlan}
      />

      {/* Spam Score Card */}
      {result.spamScore !== undefined && (
        <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 lg:gap-6 items-start sm:items-center relative z-10">
            {/* Gauge */}
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <svg className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 transform -rotate-90 drop-shadow-glow">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                {!isSpamError && (
                  <circle
                    cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                    strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * result.spamScore!) / 100}
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
              <h3 className="font-bold text-sm sm:text-base lg:text-lg mb-1.5 sm:mb-2 text-white flex items-center gap-1.5 sm:gap-2">
                <AlertOctagon className={`w-4 h-4 sm:w-5 sm:h-5 ${isSpamError ? 'text-slate-400' : getSpamColor(result.spamScore!)}`} />
                Анализ переспама
              </h3>
              <p className={`text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed ${isSpamError ? 'text-red-400 bg-red-500/10 p-3 sm:p-4 rounded-xl border border-red-500/20 font-medium' : 'text-slate-300'}`}>
                {isSpamError
                  ? `⚠️ ${result.spamAnalysis || 'Не удалось выполнить анализ переспама.'}`
                  : (result.spamAnalysis || 'Анализ не предоставлен.')}
              </p>

              {/* Fix Control */}
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
                    className={`w-full sm:w-auto mt-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg h-[42px] ${isFixingSpam ? 'bg-slate-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-glow active:scale-95'}`}
                  >
                    {isFixingSpam ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Исправление...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Исправить переспам</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meta Info Card */}
      <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl">
        <h3 className="font-bold text-sm sm:text-base lg:text-lg mb-3 sm:mb-4 text-white flex items-center gap-1.5 sm:gap-2">
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-brand-green" />
          Мета-данные
          {result.seo?.schemaType && (
            <span className="ml-auto text-xs font-normal bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg">
              Schema: {result.seo.schemaType}
            </span>
          )}
        </h3>
        <div className="space-y-3 sm:space-y-4">
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Title Tag ({result.metaTitle.length} симв.)</span>
            <div className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base shadow-inner">
              {result.metaTitle}
            </div>
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Meta Description ({result.metaDescription.length} симв.)</span>
            <div className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl text-slate-300 mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base shadow-inner leading-relaxed">
              {result.metaDescription}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== STRUCTURED GEO CONTENT ==================== */}
      {isStructured && result.article ? (
        <>
          {/* H1 Title */}
          <div className="glass-panel rounded-xl sm:rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-brand-green/20 to-brand-purple/20 px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
                {result.article.h1}
              </h1>
            </div>

            {/* Introduction */}
            {result.article.intro && (
              <div className="p-4 sm:p-6 border-b border-white/5">
                <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:text-slate-200 prose-p:leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.article.intro}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* SVG Infographic (after intro) */}
            {svgCode && (
              <div className="p-4 sm:p-6 border-b border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <Image className="w-5 h-5 text-brand-green" />
                  <span className="font-bold text-white">Инфографика</span>
                </div>
                <SvgRenderer svg={svgCode} />
              </div>
            )}

            {/* Sections */}
            {result.article.sections && result.article.sections.length > 0 && (
              <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                {result.article.sections.map((section, index) => (
                  <div key={index} className="space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <span className="w-8 h-8 bg-brand-purple/20 text-brand-purple rounded-lg flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      {section.h2}
                    </h2>
                    <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-slate-300 prose-a:text-brand-green prose-strong:text-white prose-ul:text-slate-300 prose-ol:text-slate-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
                    </div>
                    {section.table && (
                      <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="px-4 sm:px-0 prose prose-invert prose-sm max-w-none prose-table:border-collapse prose-th:bg-white/10 prose-th:border prose-th:border-white/20 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.table}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Mermaid Diagram */}
            {mermaidCode && (
              <div className="p-4 sm:p-6 border-t border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <GitBranch className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-white">Диаграмма процесса</span>
                </div>
                <MermaidDiagram code={mermaidCode} />
              </div>
            )}

            {/* Conclusion */}
            {result.article.conclusion && (
              <div className="p-4 sm:p-6 bg-white/5 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-5 h-5 text-brand-green" />
                  <span className="font-bold text-white">Заключение</span>
                </div>
                <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.article.conclusion}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* FAQ Accordion */}
          {result.faq && result.faq.length > 0 && (
            <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl">
              <h3 className="font-bold text-sm sm:text-base lg:text-lg mb-4 text-white flex items-center gap-2">
                <MessageCircleQuestion className="w-5 h-5 text-amber-400" />
                FAQ — Часто задаваемые вопросы
                <span className="ml-auto text-xs font-normal bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg">
                  {result.faq.length} вопросов
                </span>
              </h3>
              <FaqAccordion items={result.faq} />
            </div>
          )}
        </>
      ) : (
        /* ==================== LEGACY CONTENT ==================== */
        <div className="glass-panel rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="bg-white/5 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 backdrop-blur-sm">
            <h3 className="font-bold text-sm sm:text-base lg:text-lg text-white flex items-center gap-1.5 sm:gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-brand-green" />
              Готовый текст
            </h3>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-slate-400 hover:text-brand-green transition-colors bg-white/5 hover:bg-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5"
            >
              {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>
          <div className="p-4 sm:p-6 lg:p-8 prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-slate-300 prose-a:text-brand-green prose-strong:text-white prose-code:text-brand-purple prose-code:bg-white/10 prose-code:px-1 prose-code:rounded prose-table:border-collapse prose-th:bg-white/10 prose-th:border prose-th:border-white/20 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2">
            {cleanContent ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanContent}</ReactMarkdown>
            ) : (
              <p className="text-slate-400 italic">Контент недоступен</p>
            )}
          </div>

          {/* Legacy Mermaid */}
          {legacyMermaid && (
            <div className="p-4 sm:p-6 border-t border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white">Mermaid-диаграмма</span>
              </div>
              <MermaidDiagram code={legacyMermaid} />
            </div>
          )}
        </div>
      )}

      {/* JSON-LD Schema Block */}
      {jsonLd && (
        <div className="glass-panel rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="bg-purple-500/10 px-4 sm:px-6 py-3 sm:py-4 border-b border-purple-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 backdrop-blur-sm">
            <h3 className="font-bold text-sm sm:text-base lg:text-lg text-white flex items-center gap-1.5 sm:gap-2">
              <Code className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              JSON-LD Schema (SEO)
            </h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`<script type="application/ld+json">\n${jsonLd}\n</script>`);
                setCopiedJsonLd(true);
                setTimeout(() => setCopiedJsonLd(false), 2000);
              }}
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-slate-400 hover:text-purple-400 transition-colors bg-white/5 hover:bg-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5"
            >
              {copiedJsonLd ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {copiedJsonLd ? 'Скопировано!' : 'Копировать код'}
            </button>
          </div>
          <div className="p-4 sm:p-6 bg-slate-900/50">
            <pre className="text-xs sm:text-sm text-purple-300 font-mono overflow-x-auto whitespace-pre-wrap break-words">
              <code>{`<script type="application/ld+json">\n${jsonLd}\n</script>`}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Copy Full Content Button */}
      <div className="flex justify-end">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Скопировано!' : 'Копировать весь контент'}
        </button>
      </div>
    </div>
  );
};
