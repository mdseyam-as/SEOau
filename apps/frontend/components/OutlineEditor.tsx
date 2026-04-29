import React, { useState } from 'react';
import { ListTree, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Sparkles, FileText, Loader2 } from 'lucide-react';
import type { ArticleOutline, OutlineSection, GenerationConfig, KeywordRow } from '../types';

interface OutlineEditorProps {
  config: GenerationConfig;
  keywords: KeywordRow[];
  onGenerateContent: (outline: ArticleOutline) => void;
  isGenerating?: boolean;
}

export const OutlineEditor: React.FC<OutlineEditorProps> = ({
  config,
  keywords,
  onGenerateContent,
  isGenerating = false
}) => {
  const [outline, setOutline] = useState<ArticleOutline | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleGenerateOutline = async () => {
    setIsGeneratingOutline(true);
    setError(null);

    try {
      const response = await fetch('/api/outline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topic: config.topic,
          language: config.language,
          keywords: keywords.slice(0, 10),
          sectionsCount: 6,
          model: config.model
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOutline(data.outline);
      } else {
        const data = await response.json();
        setError(data.error || 'Не удалось сгенерировать план');
      }
    } catch (err) {
      setError('Ошибка генерации плана');
      console.error('Outline generation failed:', err);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleH1Change = (value: string) => {
    if (outline) {
      setOutline({ ...outline, h1: value });
    }
  };

  const handleH2Change = (index: number, value: string) => {
    if (outline) {
      const newSections = [...outline.sections];
      newSections[index] = { ...newSections[index], h2: value };
      setOutline({ ...outline, sections: newSections });
    }
  };

  const handleH3Change = (sectionIndex: number, h3Index: number, value: string) => {
    if (outline) {
      const newSections = [...outline.sections];
      const newH3s = [...newSections[sectionIndex].h3s];
      newH3s[h3Index] = value;
      newSections[sectionIndex] = { ...newSections[sectionIndex], h3s: newH3s };
      setOutline({ ...outline, sections: newSections });
    }
  };

  const handleAddSection = () => {
    if (outline) {
      setOutline({
        ...outline,
        sections: [...outline.sections, { h2: '', h3s: [''], description: '' }]
      });
    }
  };

  const handleDeleteSection = (index: number) => {
    if (outline && outline.sections.length > 1) {
      const newSections = outline.sections.filter((_, i) => i !== index);
      setOutline({ ...outline, sections: newSections });
    }
  };

  const handleAddH3 = (sectionIndex: number) => {
    if (outline) {
      const newSections = [...outline.sections];
      newSections[sectionIndex].h3s.push('');
      setOutline({ ...outline, sections: newSections });
    }
  };

  const handleDeleteH3 = (sectionIndex: number, h3Index: number) => {
    if (outline && outline.sections[sectionIndex].h3s.length > 1) {
      const newSections = [...outline.sections];
      newSections[sectionIndex].h3s = newSections[sectionIndex].h3s.filter((_, i) => i !== h3Index);
      setOutline({ ...outline, sections: newSections });
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!outline) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= outline.sections.length) return;

    const newSections = [...outline.sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setOutline({ ...outline, sections: newSections });
  };

  const handleGenerateContent = () => {
    if (outline) {
      onGenerateContent(outline);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ListTree className="w-5 h-5 text-brand-green" />
          <span className="font-semibold text-white">Режим "Outline First"</span>
          {outline && (
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
              {outline.sections.length} секций
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700 pt-4">
          <p className="text-sm text-slate-400 mb-4">
            Сначала сгенерируйте структуру статьи, отредактируйте её, затем создайте полный контент.
          </p>

          {!outline ? (
            <button
              onClick={handleGenerateOutline}
              disabled={isGeneratingOutline || !config.topic}
              className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingOutline ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Генерация плана...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Сгенерировать план статьи
                </>
              )}
            </button>
          ) : (
            <div className="space-y-4">
              {/* H1 */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Заголовок H1</label>
                <input
                  type="text"
                  value={outline.h1}
                  onChange={(e) => handleH1Change(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-brand-green focus:outline-none"
                  placeholder="Главный заголовок статьи"
                />
              </div>

              {/* Sections */}
              <div className="space-y-3">
                {outline.sections.map((section, sectionIndex) => (
                  <div
                    key={sectionIndex}
                    className="bg-slate-900/50 rounded-lg p-3 border border-slate-700"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="w-4 h-4 text-slate-500" />

                      <input
                        type="text"
                        value={section.h2}
                        onChange={(e) => handleH2Change(sectionIndex, e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:border-brand-green focus:outline-none"
                        placeholder={`H2 Заголовок секции ${sectionIndex + 1}`}
                      />

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSection(sectionIndex, 'up')}
                          disabled={sectionIndex === 0}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveSection(sectionIndex, 'down')}
                          disabled={sectionIndex === outline.sections.length - 1}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(sectionIndex)}
                          disabled={outline.sections.length <= 1}
                          className="p-1 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* H3s */}
                    <div className="ml-6 space-y-1">
                      {section.h3s.map((h3, h3Index) => (
                        <div key={h3Index} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">H3</span>
                          <input
                            type="text"
                            value={h3}
                            onChange={(e) => handleH3Change(sectionIndex, h3Index, e.target.value)}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-brand-green focus:outline-none"
                            placeholder="Подзаголовок"
                          />
                          <button
                            onClick={() => handleDeleteH3(sectionIndex, h3Index)}
                            disabled={section.h3s.length <= 1}
                            className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => handleAddH3(sectionIndex)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-green transition-colors mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        Добавить H3
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add section button */}
              <button
                onClick={handleAddSection}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-600 hover:border-brand-green text-slate-400 hover:text-brand-green px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить секцию
              </button>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleGenerateOutline}
                  disabled={isGeneratingOutline}
                  className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Перегенерировать
                </button>

                <button
                  onClick={handleGenerateContent}
                  disabled={isGenerating || !outline.h1}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-green text-black px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-green/90 transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Генерация контента...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Сгенерировать контент по плану
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 text-red-400 text-sm bg-red-500/10 p-2 rounded-lg">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
