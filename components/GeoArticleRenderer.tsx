import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import {
  Copy, Check, ChevronDown, ChevronUp, AlertCircle, GitBranch, ExternalLink,
  Image, MessageCircleQuestion, Layers
} from 'lucide-react';
import { StructuredArticle, StructuredVisuals, FaqItem, StructuredSeo } from '../types';

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
  flowchart: { curve: 'basis', padding: 20 }
});

// ==================== MERMAID DIAGRAM ====================

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
    if (code) renderDiagram();
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

// ==================== SVG RENDERER ====================

interface SvgRendererProps {
  svg: string;
}

const SvgRenderer: React.FC<SvgRendererProps> = ({ svg }) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate SVG
  const safeSvg = useMemo(() => {
    if (!svg || typeof svg !== 'string') return null;
    // Basic validation - must start with <svg
    if (!svg.trim().toLowerCase().startsWith('<svg')) {
      setError('Некорректный SVG код');
      return null;
    }
    setError(null);
    return svg;
  }, [svg]);

  const handleCopy = () => {
    navigator.clipboard.writeText(svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error || !safeSvg) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-bold">SVG недоступен</span>
        </div>
        {error && <p className="text-xs text-yellow-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl p-6 flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-80"
        dangerouslySetInnerHTML={{ __html: safeSvg }}
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

// ==================== MAIN COMPONENT ====================

export interface GeoArticleData {
  article?: StructuredArticle | null;
  visuals?: StructuredVisuals | null;
  faq?: FaqItem[];
  seo?: StructuredSeo | null;
  content?: string; // Legacy fallback
}

interface GeoArticleRendererProps {
  data: GeoArticleData | string | null | undefined;
}

export const GeoArticleRenderer: React.FC<GeoArticleRendererProps> = ({ data }) => {
  // 1. Protection against null/undefined
  if (!data) {
    return (
      <div className="glass-panel p-6 rounded-xl text-center">
        <p className="text-slate-400">Нет данных для отображения</p>
      </div>
    );
  }

  // 2. Legacy string format support
  if (typeof data === 'string') {
    return (
      <div className="glass-panel rounded-xl p-6">
        <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // 3. Destructure new JSON format
  const { article, visuals, faq, seo } = data;

  // If object came but empty or broken - show legacy content if available
  if (!article) {
    if (data.content) {
      return (
        <div className="glass-panel rounded-xl p-6">
          <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
          </div>
        </div>
      );
    }
    return (
      <div className="glass-panel p-6 rounded-xl text-center">
        <p className="text-red-400">Ошибка формата данных: отсутствует article</p>
      </div>
    );
  }

  return (
    <div className="geo-article w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* --- HEADER --- */}
      <div className="glass-panel rounded-xl sm:rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-brand-green/20 to-brand-purple/20 px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
            {article.h1 || 'Без заголовка'}
          </h1>
        </div>

        {/* Introduction */}
        {article.intro && (
          <div className="p-4 sm:p-6 border-b border-white/5">
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:text-slate-200 prose-p:leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.intro}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* SVG Infographic */}
        {visuals?.svg && (
          <div className="p-4 sm:p-6 border-b border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-brand-green" />
              <span className="font-bold text-white">Инфографика</span>
            </div>
            <SvgRenderer svg={visuals.svg} />
          </div>
        )}

        {/* Sections */}
        {article.sections && article.sections.length > 0 ? (
          <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            {article.sections.map((section, index) => (
              <div key={index} className="space-y-4">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 bg-brand-purple/20 text-brand-purple rounded-lg flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  {section?.h2 || `Раздел ${index + 1}`}
                </h2>
                <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-slate-300 prose-a:text-brand-green prose-strong:text-white prose-ul:text-slate-300 prose-ol:text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{section?.content || ''}</ReactMarkdown>
                </div>
                {section?.table && (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="px-4 sm:px-0 prose prose-invert prose-sm max-w-none prose-table:border-collapse prose-th:bg-white/10 prose-th:border prose-th:border-white/20 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.table}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Fallback: if sections empty, show legacy content */
          data.content && (
            <div className="p-4 sm:p-6 lg:p-8 prose prose-invert prose-sm sm:prose-base max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
            </div>
          )
        )}

        {/* Mermaid Diagram */}
        {visuals?.mermaid && (
          <div className="p-4 sm:p-6 border-t border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-white">Диаграмма процесса</span>
            </div>
            <MermaidDiagram code={visuals.mermaid} />
          </div>
        )}

        {/* Conclusion */}
        {article.conclusion && (
          <div className="p-4 sm:p-6 bg-white/5 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-brand-green" />
              <span className="font-bold text-white">Заключение</span>
            </div>
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:text-slate-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.conclusion}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* FAQ Accordion */}
      {faq && faq.length > 0 && (
        <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl">
          <h3 className="font-bold text-sm sm:text-base lg:text-lg mb-4 text-white flex items-center gap-2">
            <MessageCircleQuestion className="w-5 h-5 text-amber-400" />
            FAQ — Часто задаваемые вопросы
            <span className="ml-auto text-xs font-normal bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg">
              {faq.length} вопросов
            </span>
          </h3>
          <FaqAccordion items={faq} />
        </div>
      )}
    </div>
  );
};

export default GeoArticleRenderer;
