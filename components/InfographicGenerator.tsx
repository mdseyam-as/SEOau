import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, Copy, Check, RefreshCw, Download, ChevronDown } from 'lucide-react';
import mermaid from 'mermaid';
import { apiService } from '../services/apiService';
import { SubscriptionPlan, InfographicData } from '../types';

interface InfographicGeneratorProps {
  topic: string;
  content: string;
  userPlan?: SubscriptionPlan | null;
}

type DiagramType = 'flowchart' | 'sequence' | 'mindmap' | 'timeline' | 'pie' | 'comparison';

const diagramOptions: { value: DiagramType; label: string; description: string }[] = [
  { value: 'flowchart', label: 'Блок-схема', description: 'Процессы и связи' },
  { value: 'sequence', label: 'Sequence', description: 'Взаимодействие элементов' },
  { value: 'mindmap', label: 'Mind Map', description: 'Иерархия идей' },
  { value: 'timeline', label: 'Timeline', description: 'Хронология событий' },
  { value: 'pie', label: 'Круговая', description: 'Распределение долей' },
  { value: 'comparison', label: 'Сравнение', description: 'Сопоставление вариантов' },
];

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#00dc82',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#00dc82',
    lineColor: '#64748b',
    secondaryColor: '#475569',
    tertiaryColor: '#1e293b',
    background: '#0f172a',
    mainBkg: '#1e293b',
    nodeBorder: '#00dc82',
    clusterBkg: '#1e293b',
    clusterBorder: '#334155',
    titleColor: '#ffffff',
    edgeLabelBackground: '#1e293b',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
  },
});

export const InfographicGenerator: React.FC<InfographicGeneratorProps> = ({
  topic,
  content,
  userPlan,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [infographic, setInfographic] = useState<InfographicData | null>(null);
  const [selectedType, setSelectedType] = useState<DiagramType>('flowchart');
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [renderedSvg, setRenderedSvg] = useState<string | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  const canGenerate = userPlan?.canGenerateInfographic;

  // Render mermaid diagram when code changes
  useEffect(() => {
    if (infographic?.mermaidCode && diagramRef.current) {
      renderDiagram();
    }
  }, [infographic?.mermaidCode]);

  const renderDiagram = async () => {
    if (!infographic?.mermaidCode || !diagramRef.current) return;

    try {
      // Clear previous content
      diagramRef.current.innerHTML = '';

      // Generate unique ID for the diagram
      const id = `mermaid-${Date.now()}`;

      // Render the diagram
      const { svg } = await mermaid.render(id, infographic.mermaidCode);

      setRenderedSvg(svg);
      diagramRef.current.innerHTML = svg;
    } catch (err: any) {
      console.error('Mermaid render error:', err);
      setError('Ошибка рендеринга диаграммы. Проверьте код Mermaid.');
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const { infographic: data } = await apiService.generateInfographic(
        topic,
        content,
        selectedType
      );

      setInfographic({
        mermaidCode: data.mermaidCode,
        title: data.title,
        description: data.description
      });
    } catch (err: any) {
      setError(err.message || 'Не удалось сгенерировать инфографику');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!infographic?.mermaidCode) return;
    navigator.clipboard.writeText(infographic.mermaidCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!renderedSvg) return;

    const blob = new Blob([renderedSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `infographic-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = async () => {
    if (!renderedSvg) return;

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([renderedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width * 2; // 2x for better quality
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `infographic-${Date.now()}.png`;
      link.click();

      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  if (!canGenerate) {
    return (
      <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl opacity-60">
        <div className="flex items-center gap-3 text-slate-400">
          <GitBranch className="w-5 h-5" />
          <div>
            <h3 className="font-bold text-sm sm:text-base">Генератор инфографики</h3>
            <p className="text-xs">Недоступно для вашего тарифа</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl">
      <h3 className="font-bold text-sm sm:text-base lg:text-lg mb-4 text-white flex items-center gap-2">
        <GitBranch className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
        Генератор инфографики (Mermaid)
      </h3>

      {/* Diagram Type Selection */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-400 mb-2">
          Тип диаграммы
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {diagramOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedType(option.value)}
              disabled={isGenerating}
              className={`
                p-2 rounded-lg text-left transition-all border
                ${selectedType === option.value
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="text-xs font-bold">{option.label}</div>
              <div className="text-[10px] opacity-70 hidden sm:block">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`
          w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all
          ${isGenerating
            ? 'bg-slate-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-lg hover:shadow-cyan-500/25'}
        `}
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Генерация диаграммы...
          </>
        ) : infographic ? (
          <>
            <RefreshCw className="w-4 h-4" />
            Сгенерировать заново
          </>
        ) : (
          <>
            <GitBranch className="w-4 h-4" />
            Сгенерировать инфографику
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Generated Infographic Display */}
      {infographic && (
        <div className="mt-4 space-y-3">
          {/* Title & Description */}
          {infographic.title && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <h4 className="text-sm font-bold text-white mb-1">{infographic.title}</h4>
              {infographic.description && (
                <p className="text-xs text-slate-400">{infographic.description}</p>
              )}
            </div>
          )}

          {/* Rendered Diagram */}
          <div className="relative bg-slate-900/80 rounded-xl overflow-hidden border border-white/10">
            <div className="absolute top-2 right-2 flex gap-2 z-10">
              <button
                onClick={handleDownloadSvg}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors text-xs flex items-center gap-1"
                title="Скачать SVG"
              >
                <Download className="w-3 h-3" />
                SVG
              </button>
              <button
                onClick={handleDownloadPng}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors text-xs flex items-center gap-1"
                title="Скачать PNG"
              >
                <Download className="w-3 h-3" />
                PNG
              </button>
            </div>
            <div
              ref={diagramRef}
              className="p-4 min-h-[200px] flex items-center justify-center overflow-auto [&_svg]:max-w-full"
            />
          </div>

          {/* Mermaid Code */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mermaid код
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-400 transition-colors"
              >
                {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedCode ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <pre className="text-xs text-cyan-300 font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              <code>{infographic.mermaidCode}</code>
            </pre>
          </div>

          {/* Usage Tip */}
          <div className="text-[10px] text-slate-500 leading-relaxed">
            <strong>Совет:</strong> Вставьте код Mermaid в <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">mermaid.live</a> для дополнительного редактирования или в статью с поддержкой Mermaid (GitHub, Notion и др.).
          </div>
        </div>
      )}
    </div>
  );
};
