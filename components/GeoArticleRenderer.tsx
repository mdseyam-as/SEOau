import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy, Check, ChevronDown, ChevronUp, AlertCircle,
  Image, MessageCircleQuestion, Layers, Code
} from 'lucide-react';

// ==================== SAFE SVG RENDERER ====================

interface SvgRendererProps {
  svg: string;
}

const SafeSvgRenderer: React.FC<SvgRendererProps> = ({ svg }) => {
  const [copied, setCopied] = React.useState(false);

  // Validate SVG
  if (!svg || typeof svg !== 'string') return null;
  
  const trimmed = svg.trim();
  if (!trimmed.toLowerCase().includes('<svg')) {
    console.warn('SafeSvgRenderer: Invalid SVG');
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div
        className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-xl p-6 flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-80"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-brand-green bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Скопировано' : 'SVG код'}
      </button>
    </div>
  );
};

// ==================== SAFE MERMAID (TEXT ONLY) ====================

interface SafeMermaidProps {
  code: string;
}

const SafeMermaidDisplay: React.FC<SafeMermaidProps> = ({ code }) => {
  const [copied, setCopied] = React.useState(false);

  if (!code || typeof code !== 'string') return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Диаграмма (код)
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
          <a
            href={`https://mermaid.live/edit#pako:${btoa(code)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Открыть в редакторе →
          </a>
        </div>
      </div>
      <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
};

// ==================== FAQ ACCORDION ====================

interface FaqItem {
  question?: string;
  answer?: string;
  q?: string;
  a?: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

const FaqAccordion: React.FC<FaqAccordionProps> = ({ items }) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  if (!items || !Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const question = item?.question || item?.q || `Вопрос ${index + 1}`;
        const answer = item?.answer || item?.a || '';
        
        if (!answer) return null;

        return (
          <div
            key={index}
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
            >
              <span className="font-semibold text-white text-sm sm:text-base pr-4">
                {question}
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==================== DEBUG VIEW ====================

const DebugView: React.FC<{ data: any; title?: string }> = ({ data, title = 'Debug' }) => {
  const [copied, setCopied] = React.useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="bg-amber-500/10 px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-amber-400">{title}</span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(jsonString);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-xs font-bold text-slate-400 hover:text-amber-400"
        >
          {copied ? 'Скопировано!' : 'Копировать'}
        </button>
      </div>
      <pre className="p-4 text-xs text-slate-300 font-mono overflow-auto max-h-96 whitespace-pre-wrap">
        {jsonString}
      </pre>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

export interface GeoArticleData {
  article?: {
    h1?: string;
    intro?: string;
    introduction?: string;
    sections?: any[] | string;
    body?: string;
    conclusion?: string;
  } | null;
  visuals?: {
    mermaid?: string | null;
    svg?: string | null;
  } | null;
  faq?: FaqItem[];
  content?: string;
}

interface GeoArticleRendererProps {
  data: GeoArticleData | string | null | undefined;
}

export const GeoArticleRenderer: React.FC<GeoArticleRendererProps> = ({ data }) => {
  // DIAGNOSTIC LOGGING
  useEffect(() => {
    console.log('🔵 SafeGeoRenderer mounted');
    console.log('🔵 Data type:', typeof data);
    console.log('🔵 Data:', data);
    if (data && typeof data === 'object') {
      console.log('🔵 Keys:', Object.keys(data));
      console.log('🔵 article:', data.article);
      console.log('🔵 visuals:', data.visuals);
      console.log('🔵 faq:', data.faq);
    }
  }, [data]);

  // 1. No data
  if (!data) {
    return (
      <div className="glass-panel p-10 rounded-xl text-center">
        <p className="text-slate-400">Загрузка данных...</p>
      </div>
    );
  }

  // 2. String format (legacy)
  if (typeof data === 'string') {
    console.log('🔵 Rendering as string (legacy)');
    return (
      <div className="glass-panel rounded-xl p-6">
        <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // 3. Parse object
  const article = data?.article;
  const visuals = data?.visuals;
  const faq = data?.faq;
  const legacyContent = data?.content;

  // 4. No article - show fallback or debug
  if (!article) {
    console.warn('🔵 No article field');
    
    if (legacyContent && typeof legacyContent === 'string') {
      return (
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <p className="text-yellow-400 text-sm">⚠️ Показан резервный контент</p>
          </div>
          <div className="glass-panel rounded-xl p-6">
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{legacyContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">Ошибка: нет поля article</span>
          </div>
        </div>
        <DebugView data={data} title="Полученные данные" />
      </div>
    );
  }

  // 5. Extract fields
  const h1 = article?.h1 || 'Сгенерированная статья';
  const intro = article?.intro || article?.introduction || '';
  const conclusion = article?.conclusion || '';
  const sections = article?.sections;
  const body = article?.body;

  const hasSections = Array.isArray(sections) && sections.length > 0;

  return (
    <div className="safe-geo-article w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="glass-panel rounded-xl sm:rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-brand-green/20 to-brand-purple/20 px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
            {h1}
          </h1>
        </div>

        {/* Intro */}
        {intro && (
          <div className="p-4 sm:p-6 border-b border-white/5">
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:text-slate-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* SVG (SAFE) */}
        {visuals?.svg && (
          <div className="p-4 sm:p-6 border-b border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-brand-green" />
              <span className="font-bold text-white">Инфографика</span>
            </div>
            <SafeSvgRenderer svg={visuals.svg} />
          </div>
        )}

        {/* SECTIONS */}
        <div className="p-4 sm:p-6 lg:p-8">
          {hasSections ? (
            <div className="space-y-8">
              {sections.map((sec: any, idx: number) => {
                const sectionH2 = sec?.h2 || sec?.heading || sec?.title || `Раздел ${idx + 1}`;
                const sectionContent = sec?.content || sec?.text || sec?.body || '';
                const sectionTable = sec?.table;

                return (
                  <div key={idx} className="space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <span className="w-8 h-8 bg-brand-purple/20 text-brand-purple rounded-lg flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </span>
                      {sectionH2}
                    </h2>
                    {sectionContent && (
                      <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:text-slate-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {String(sectionContent)}
                        </ReactMarkdown>
                      </div>
                    )}
                    {sectionTable && (
                      <div className="overflow-x-auto">
                        <div className="prose prose-invert prose-sm max-w-none prose-table:border-collapse prose-th:bg-white/10 prose-th:border prose-th:border-white/20 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-white/10 prose-td:px-3 prose-td:py-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {String(sectionTable)}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : typeof sections === 'string' || typeof body === 'string' ? (
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {String(sections || body || '')}
              </ReactMarkdown>
            </div>
          ) : legacyContent ? (
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{legacyContent}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-slate-400 italic text-center">Контент недоступен</p>
          )}
        </div>

        {/* MERMAID (TEXT ONLY - NO CRASH) */}
        {visuals?.mermaid && (
          <div className="p-4 sm:p-6 border-t border-white/5">
            <SafeMermaidDisplay code={visuals.mermaid} />
          </div>
        )}

        {/* Conclusion */}
        {conclusion && (
          <div className="p-4 sm:p-6 bg-white/5 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-brand-green" />
              <span className="font-bold text-white">Заключение</span>
            </div>
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:text-slate-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{conclusion}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* FAQ */}
      {faq && Array.isArray(faq) && faq.length > 0 && (
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
