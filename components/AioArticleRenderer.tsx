import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy, Check, ChevronDown, ChevronUp, AlertCircle,
  Image, MessageCircleQuestion, Layers, Code, Network, Database
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

export interface AioArticleData {
  knowledgeGraph?: {
    entities?: Array<{ id: string; name: string; type: string; description?: string }>;
    locations?: Array<{ id: string; name: string; region?: string; country?: string; coordinates?: { latitude?: number | null; longitude?: number | null } }>;
    relations?: Array<{ source: string; target: string; relation: string; evidence?: string }>;
  } | null;
  ragChunks?: Array<{
    id: string;
    question: string;
    answer: string;
    facts?: string[];
    geoSignals?: string[];
  }> | null;
  jsonLd?: object | null;
  markdownContent?: string | null;
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
  seo?: {
    schemaLD?: object | null;
  } | null;
  content?: string;
}

interface AioArticleRendererProps {
  data: AioArticleData | string | null | undefined;
}

export const AioArticleRenderer: React.FC<AioArticleRendererProps> = ({ data }) => {
  const jsonLd = data && typeof data === 'object'
    ? data.jsonLd || data.seo?.schemaLD || null
    : null;

  useEffect(() => {
    const scriptId = 'aio-json-ld';
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.remove();
    }

    if (!jsonLd) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [jsonLd]);

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
    return (
      <article className="glass-panel rounded-xl p-6">
        <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
        </div>
      </article>
    );
  }

  // 3. Parse object
  const article = data?.article;
  const visuals = data?.visuals;
  const faq = data?.faq;
  const knowledgeGraph = data?.knowledgeGraph;
  const ragChunks = data?.ragChunks || [];
  const legacyContent = data?.content;
  const markdownContent = data?.markdownContent;

  // 4. No article - show fallback or debug
  if (!article) {
    if ((markdownContent || legacyContent) && typeof (markdownContent || legacyContent) === 'string') {
      return (
        <div className="space-y-4">
          <article className="glass-panel rounded-xl p-6">
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownContent || legacyContent || ''}</ReactMarkdown>
            </div>
          </article>
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
      <article className="safe-aio-article w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ==================== BLOCK 1: ARTICLE TEXT ==================== */}
      <section className="glass-panel rounded-xl sm:rounded-2xl overflow-hidden">
        {/* Header with H1 */}
        <div className="bg-gradient-to-r from-brand-green/20 to-brand-purple/20 px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight flex items-start gap-3">
            <span className="inline-flex items-center justify-center px-2 py-0.5 bg-brand-green/30 text-brand-green text-xs font-bold rounded shrink-0 mt-1">
              H1
            </span>
            <span>{h1}</span>
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

        {/* SECTIONS */}
        <section className="p-4 sm:p-6 lg:p-8">
          {hasSections ? (
            <div className="space-y-8">
              {sections.map((sec: any, idx: number) => {
                const sectionH2 = sec?.h2 || sec?.heading || sec?.title || `Раздел ${idx + 1}`;
                const sectionContent = sec?.content || sec?.text || sec?.body || '';
                const sectionTable = sec?.table;

                return (
                  <section key={idx} className="space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-start gap-2">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs font-bold rounded shrink-0 mt-0.5">
                        H2
                      </span>
                      <span>{sectionH2}</span>
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
                  </section>
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
        </section>

        {/* Conclusion */}
        {conclusion && (
          <div className="p-4 sm:p-6 bg-white/5 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center px-2 py-0.5 bg-cyan-500/30 text-cyan-300 text-xs font-bold rounded shrink-0">
                H3
              </span>
              <Layers className="w-5 h-5 text-brand-green" />
              <span className="font-bold text-white">Заключение</span>
            </div>
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:text-slate-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{conclusion}</ReactMarkdown>
            </div>
          </div>
        )}
      </section>

      {/* ==================== BLOCK 2: AIO STRUCTURED DATA ==================== */}
      {knowledgeGraph && (
        <section className="glass-panel p-4 sm:p-6 rounded-xl sm:rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Network className="w-5 h-5 text-brand-green" />
            <h2 className="font-bold text-white text-lg">AIO Knowledge Graph</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Entities</h3>
              <div className="space-y-2">
                {(knowledgeGraph.entities || []).slice(0, 8).map((entity) => (
                  <div key={entity.id} className="text-sm">
                    <div className="font-semibold text-white">{entity.name}</div>
                    <div className="text-xs text-brand-green">{entity.type}</div>
                    {entity.description && <p className="text-xs text-slate-400 mt-1">{entity.description}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Locations</h3>
              <div className="space-y-2">
                {(knowledgeGraph.locations || []).slice(0, 6).map((location) => (
                  <div key={location.id} className="text-sm">
                    <div className="font-semibold text-white">{location.name}</div>
                    <div className="text-xs text-slate-400">{[location.region, location.country].filter(Boolean).join(', ')}</div>
                    {(location.coordinates?.latitude || location.coordinates?.longitude) && (
                      <div className="text-xs text-cyan-300 mt-1">
                        {location.coordinates.latitude}, {location.coordinates.longitude}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Relations</h3>
              <div className="space-y-2">
                {(knowledgeGraph.relations || []).slice(0, 8).map((relation, index) => (
                  <div key={`${relation.source}-${relation.target}-${index}`} className="text-xs text-slate-300">
                    <span className="text-white">{relation.source}</span>
                    <span className="text-brand-green"> {relation.relation} </span>
                    <span className="text-white">{relation.target}</span>
                    {relation.evidence && <p className="text-slate-500 mt-1">{relation.evidence}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {ragChunks.length > 0 && (
        <section className="glass-panel p-4 sm:p-6 rounded-xl sm:rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-white text-lg">RAG Chunks</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {ragChunks.map((chunk) => (
              <section key={chunk.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="font-semibold text-white text-sm mb-2">{chunk.question}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{chunk.answer}</p>
                {chunk.facts && chunk.facts.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-slate-400 list-disc list-inside">
                    {chunk.facts.slice(0, 3).map((fact, index) => (
                      <li key={index}>{fact}</li>
                    ))}
                  </ul>
                )}
                {chunk.geoSignals && chunk.geoSignals.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {chunk.geoSignals.slice(0, 4).map((signal) => (
                      <span key={signal} className="text-[11px] text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-0.5">
                        {signal}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </section>
      )}

      {/* ==================== BLOCK 3: SVG INFOGRAPHIC ==================== */}
      {visuals?.svg && (
        <section className="glass-panel p-4 sm:p-6 rounded-xl sm:rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-5 h-5 text-brand-green" />
            <span className="font-bold text-white text-lg">📊 Инфографика</span>
          </div>
          <SafeSvgRenderer svg={visuals.svg} />
        </section>
      )}

      {/* ==================== BLOCK 4: MERMAID DIAGRAM ==================== */}
      {visuals?.mermaid && (
        <section className="glass-panel p-4 sm:p-6 rounded-xl sm:rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-white text-lg">🔀 Диаграмма процесса</span>
          </div>
          <SafeMermaidDisplay code={visuals.mermaid} />
        </section>
      )}

      {/* ==================== BLOCK 5: FAQ ==================== */}
      {faq && Array.isArray(faq) && faq.length > 0 && (
        <section className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl">
          <h3 className="font-bold text-sm sm:text-base lg:text-lg mb-4 text-white flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-2 py-0.5 bg-amber-500/30 text-amber-300 text-xs font-bold rounded shrink-0">
              H3
            </span>
            <MessageCircleQuestion className="w-5 h-5 text-amber-400" />
            FAQ — Часто задаваемые вопросы
            <span className="ml-auto text-xs font-normal bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg">
              {faq.length} вопросов
            </span>
          </h3>
          <FaqAccordion items={faq} />
        </section>
      )}
    </article>
  );
};

export default AioArticleRenderer;
