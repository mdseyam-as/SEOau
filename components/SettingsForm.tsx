
import React, { useRef, useState, useEffect } from 'react';
import { GenerationConfig, TextTone, TextStyle, GenerationMode, ContentLanguage } from '../types';
import { Settings2, Type, AlignLeft, Link as LinkIcon, FileText, Upload, X, Globe, Feather, Mic, Plus, Trash2, FileSpreadsheet, Sparkles, Search, Lock } from 'lucide-react';
import { parseDocxFile } from '../services/docxParser';
import { parseExcelToRawText } from '../services/excelParser';
import { SubscriptionPlan } from '../services/authService';
import { useToast } from './Toast';
import { KnowledgeBaseUploader } from './KnowledgeBaseUploader';
import { InternalLinksManager } from './InternalLinksManager';
import { StyledSelect } from './StyledSelect';

interface SettingsFormProps {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
  disabled: boolean;
  isLocked?: boolean;
  onSubmit: () => void;
  onClear?: () => void;
  userPlan?: SubscriptionPlan | null;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ config, onChange, disabled, isLocked = false, onSubmit, onClear, userPlan }) => {
  const toast = useToast();
  const [docxFileName, setDocxFileName] = useState<string | null>(null);
  const [isDocxLoading, setIsDocxLoading] = useState(false);

  // Competitor Inputs State - Initialize lazily from props
  const [competitorLinks, setCompetitorLinks] = useState<string[]>(() => {
    const links = config.competitorUrls ? config.competitorUrls.split('\n').filter(l => l.trim()) : [];
    return links.length > 0 ? links : [''];
  });

  const [competitorFiles, setCompetitorFiles] = useState<{ name: string, content: string }[]>(() =>
    config.competitorFiles || []
  );

  const [isFileLoading, setIsFileLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const competitorFileRef = useRef<HTMLInputElement>(null);

  const isDisabled = disabled || isLocked;
  const isOverLimit = userPlan ? config.maxChars > userPlan.maxChars : false;
  const sectionClass = 'rounded-[10px] border border-white/10 bg-white/[0.03] p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';
  const sectionLabelClass = 'mb-2 flex items-center gap-2 border-b border-white/10 pb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#d7c1c7] sm:text-sm';
  const inputClass = 'app-input-dark';
  const modeButtonBase = 'relative rounded-[8px] border p-3 text-left transition-all';





  // Initialize docx placeholder state
  useEffect(() => {
    // Check if example content is loaded to show file name placeholder
    if (config.exampleContent) {
      setDocxFileName('Пример загружен');
    } else {
      setDocxFileName(null);
    }
  }, [config.exampleContent]);

  // Sync links back to config
  useEffect(() => {
    const urlsString = competitorLinks.filter(l => l.trim()).join('\n');
    if (urlsString !== config.competitorUrls) {
      handleChange('competitorUrls', urlsString);
    }
  }, [competitorLinks]);

  // Sync files back to config
  useEffect(() => {
    if (config.competitorFiles !== competitorFiles) {
      onChange({ ...config, competitorFiles: competitorFiles });
    }
  }, [competitorFiles]);

  const handleChange = (field: keyof GenerationConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const parseNumericInput = (value: string, fallback: number) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      toast.warning('Неверный формат', 'Пожалуйста, выберите файл .docx');
      return;
    }

    setIsDocxLoading(true);
    try {
      const text = await parseDocxFile(file);
      handleChange('exampleContent', text);
      setDocxFileName(file.name);
      toast.success('Файл загружен', file.name);
    } catch (error) {
      console.error(error);
      toast.error('Ошибка', 'Не удалось прочитать .docx файл');
    } finally {
      setIsDocxLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Competitor Files Upload
  const handleCompetitorFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isDocx = file.name.endsWith('.docx');
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isDocx && !isXlsx) {
      toast.warning('Неверный формат', 'Поддерживаются только .docx и .xlsx/.xls');
      return;
    }

    setIsFileLoading(true);
    try {
      let text = '';
      if (isDocx) {
        text = await parseDocxFile(file);
      } else {
        text = await parseExcelToRawText(file);
      }

      setCompetitorFiles(prev => [...prev, { name: file.name, content: text }]);
      toast.success('Файл добавлен', file.name);

    } catch (error) {
      console.error(error);
      toast.error('Ошибка', 'Не удалось прочитать файл');
    } finally {
      setIsFileLoading(false);
      if (competitorFileRef.current) competitorFileRef.current.value = '';
    }
  };

  const clearExample = () => {
    handleChange('exampleContent', '');
    setDocxFileName(null);
  };

  const addCompetitorLink = () => {
    setCompetitorLinks(prev => [...prev, '']);
  };

  const updateCompetitorLink = (index: number, value: string) => {
    setCompetitorLinks(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  // Handle pasting multiple links into one input
  const handleLinkPaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const pastedData = e.clipboardData.getData('Text');
    if (!pastedData) return;

    const lines = pastedData.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // If multiple lines, prevent default paste and handle splitting
    if (lines.length > 1) {
      e.preventDefault();
      setCompetitorLinks(prev => {
        const newLinks = [...prev];
        // Replace current index with first line
        newLinks[index] = lines[0];
        // Insert remaining lines after current index
        newLinks.splice(index + 1, 0, ...lines.slice(1));
        return newLinks;
      });
    }
    // If single line, standard behavior applies (allow default paste)
  };

  const removeCompetitorLink = (index: number) => {
    if (competitorLinks.length === 1 && competitorLinks[0] === '') return; // Don't delete if it's the only empty one
    if (competitorLinks.length === 1) {
      setCompetitorLinks(['']); // Clear if last one
      return;
    }
    setCompetitorLinks(prev => prev.filter((_, i) => i !== index));
  };

  const removeCompetitorFile = (index: number) => {
    setCompetitorFiles(prev => prev.filter((_, i) => i !== index));
  };

  const renderGenerateButton = () => (
    <button
      onClick={onSubmit}
      disabled={isDisabled || !config.topic || !config.websiteName || isOverLimit}
      className={`
        w-full py-3.5 md:py-4.5 rounded-[8px] font-bold shadow-lg transition-all mt-4 text-sm md:text-base flex items-center justify-center gap-2
        ${isLocked
          ? 'border border-white/10 bg-white/[0.06] text-slate-100 cursor-not-allowed'
          : (disabled || !config.topic || !config.websiteName || isOverLimit)
            ? 'border border-white/10 bg-white/[0.06] text-slate-200 cursor-not-allowed'
            : 'border border-[#ffb1c0] bg-[#ffb1c0] text-[#660029] hover:bg-[#ff4c83] hover:text-white hover:shadow-[0_22px_52px_rgba(255,76,131,0.20)] transform hover:-translate-y-0.5 active:scale-95'}
      `}
    >
      {isLocked ? (
        <>
          <Lock className="w-4 h-4" /> Требуется подписка
        </>
      ) : disabled ? (
        'Генерация контента...'
      ) : (
        'Сгенерировать статью'
      )}
    </button>
  );

  return (
    <div className={`app-dark-card flex flex-col ${isLocked ? 'opacity-85' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5 bg-white/[0.03] rounded-t-[10px] backdrop-blur-sm">
        <h3 className="font-bold text-white flex items-center gap-2.5 text-base sm:text-lg">
          <div className="p-1.5 bg-[rgba(255,76,131,0.08)] rounded-[8px] border border-[#ffb1c0]/20">
            <Settings2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffb1c0]" />
          </div>
          Настройки генерации
        </h3>
        <span className="hidden sm:inline-flex items-center rounded-full border border-[#5b3f44] bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ab888e]">
          Operator Setup
        </span>
      </div>

      <div className="p-2.5 sm:p-4 md:p-5 relative space-y-3 sm:space-y-4 md:space-y-5">
        {isLocked && (
          <div className="absolute inset-0 z-10 bg-white/20 cursor-not-allowed" />
        )}

        {/* Context & Brand Section */}
        <div className={`${sectionClass} space-y-3 sm:space-y-4`}>
          <div className={sectionLabelClass}>
            <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-[#46fa9c]" />
            Контекст Бренда
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-[#f7d6dc] mb-1.5">Название сайта/бренда</label>
              <input
                type="text"
                value={config.websiteName}
                onChange={(e) => handleChange('websiteName', e.target.value)}
                placeholder="Например: MyShop, CryptoBlog"
                className={inputClass}
                disabled={isDisabled}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#f7d6dc] mb-1.5">Целевая страна/регион</label>
              <input
                type="text"
                value={config.targetCountry}
                onChange={(e) => handleChange('targetCountry', e.target.value)}
                placeholder="Казахстан, РФ, США..."
                className={inputClass}
                disabled={isDisabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-[#f7d6dc] mb-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Язык текста
              </label>
              <StyledSelect
                value={config.language}
                onChange={(value) => handleChange('language', value)}
                className="app-input-dark"
                disabled={isDisabled}
                options={Object.values(ContentLanguage).map((lang) => ({ value: lang, label: lang }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#f7d6dc] mb-1.5 flex items-center gap-1">
                <Mic className="w-3 h-3" /> Тон голоса (Tone of Voice)
              </label>
              <StyledSelect
                value={config.tone}
                onChange={(value) => handleChange('tone', value)}
                className="app-input-dark"
                disabled={isDisabled}
                options={Object.values(TextTone).map((tone) => ({ value: tone, label: tone }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#f7d6dc] mb-1.5 flex items-center gap-1">
                <Feather className="w-3 h-3" /> Стиль текста (Style)
              </label>
              <StyledSelect
                value={config.style}
                onChange={(value) => handleChange('style', value)}
                className="app-input-dark"
                disabled={isDisabled}
                options={Object.values(TextStyle).map((style) => ({ value: style, label: style }))}
              />
            </div>
          </div>
        </div>

        {/* Generation Mode Toggle */}
        <div className={`${sectionClass} bg-[linear-gradient(135deg,rgba(255,76,131,0.08),rgba(255,177,192,0.04))] border-[#5b3f44]`}>
          <div className={sectionLabelClass}>
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-[#ffb1c0]" />
            Режим генерации
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Classic SEO Option */}
            <button
              type="button"
              onClick={() => handleChange('generationMode', 'seo' as GenerationMode)}
              disabled={isDisabled}
              className={`
                ${modeButtonBase}
                ${config.generationMode === 'seo'
                  ? 'border-[#46fa9c]/40 bg-[rgba(70,250,156,0.08)] shadow-lg shadow-[#46fa9c]/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className={`p-1.5 sm:p-2 rounded-[6px] shrink-0 ${config.generationMode === 'seo' ? 'bg-[#46fa9c]/12' : 'bg-white/10'}`}>
                  <Search className={`w-4 h-4 sm:w-5 sm:h-5 ${config.generationMode === 'seo' ? 'text-[#46fa9c]' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-sm sm:text-base">🍏</span>
                    <span className={`font-bold text-xs sm:text-sm ${config.generationMode === 'seo' ? 'text-white' : 'text-slate-300'}`}>
                      SEO
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">
                    Для Google, Яндекс
                  </p>
                </div>
              </div>
              {config.generationMode === 'seo' && (
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#46fa9c] rounded-full animate-pulse" />
              )}
            </button>

            {/* GEO Mode Option */}
            <button
              type="button"
              onClick={() => handleChange('generationMode', 'geo' as GenerationMode)}
              disabled={isDisabled}
              className={`
                ${modeButtonBase}
                ${config.generationMode === 'geo'
                  ? 'border-[#ffb1c0]/40 bg-[rgba(255,76,131,0.08)] shadow-lg shadow-[#ffb1c0]/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className={`p-1.5 sm:p-2 rounded-[6px] shrink-0 ${config.generationMode === 'geo' ? 'bg-[#ff4c83]/12' : 'bg-white/10'}`}>
                  <Sparkles className={`w-4 h-4 sm:w-5 sm:h-5 ${config.generationMode === 'geo' ? 'text-[#ffb1c0]' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-sm sm:text-base">🤖</span>
                    <span className={`font-bold text-xs sm:text-sm ${config.generationMode === 'geo' ? 'text-white' : 'text-slate-300'}`}>
                      GEO
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">
                    Для AI-поисковиков
                  </p>
                </div>
              </div>
              {config.generationMode === 'geo' && (
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#ffb1c0] rounded-full animate-pulse" />
              )}
            </button>
          </div>

          {config.generationMode === 'geo' && (
            <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-[rgba(255,76,131,0.08)] rounded-[8px] border border-[#ffb1c0]/20">
              <p className="text-[10px] sm:text-xs text-[#f7d6dc]">
                <strong>GEO</strong> — контент с таблицами, FAQ для AI-поисковиков.
              </p>
            </div>
          )}
        </div>

        {/* Topic & URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#f7d6dc] mb-1.5 sm:mb-2">Тема статьи</label>
            <input
              type="text"
              value={config.topic}
              onChange={(e) => handleChange('topic', e.target.value)}
              placeholder="Например: Обзор смартфонов 2024"
              className={inputClass}
              disabled={isDisabled}
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-bold text-[#f7d6dc] mb-1.5 sm:mb-2">URL страницы (Slug)</label>
            <input
              type="text"
              value={config.targetUrl}
              onChange={(e) => handleChange('targetUrl', e.target.value)}
              placeholder="/blog/smartphones-2024"
              className={inputClass}
              disabled={isDisabled}
            />
          </div>
        </div>

        {/* Competitor Links & Files */}
        <div className={sectionClass}>
          <label className={sectionLabelClass}>
            <LinkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#46fa9c]" /> Ссылки на конкурентов
          </label>

          <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
            {competitorLinks.map((link, idx) => (
              <div key={idx} className="flex gap-1.5 sm:gap-2">
                <input
                  type="text"
                  value={link}
                  onChange={(e) => updateCompetitorLink(idx, e.target.value)}
                  onPaste={(e) => handleLinkPaste(e, idx)}
                  placeholder="https://competitor.com/..."
                  className={`${inputClass} text-xs sm:text-sm`}
                  disabled={isDisabled}
                />
                <button
                  onClick={() => removeCompetitorLink(idx)}
                  disabled={isDisabled}
                  className="p-2 sm:p-2.5 text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-[8px] transition-colors border border-transparent hover:border-red-500/20"
                  title="Удалить ссылку"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            ))}
          </div>

          {competitorFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {competitorFiles.map((file, idx) => (
                <div key={`file-${idx}`} className="flex items-center justify-between p-3 bg-[rgba(70,250,156,0.08)] border border-[#46fa9c]/20 rounded-[8px]">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-[6px]">
                      {file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? (
                        <FileSpreadsheet className="w-4 h-4 text-green-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-200 truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeCompetitorFile(idx)}
                    disabled={isDisabled}
                    className="text-slate-400 hover:text-red-400 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={addCompetitorLink}
              disabled={isDisabled}
              className="app-btn-dark flex-1 py-3 text-sm"
            >
              <Plus className="w-4 h-4" /> Добавить ссылку
            </button>

            <div className="flex-1 relative">
              <input
                type="file"
                ref={competitorFileRef}
                onChange={handleCompetitorFileUpload}
                accept=".docx, .xlsx, .xls"
                className="hidden"
                disabled={isDisabled || isFileLoading}
              />
              <button
                onClick={() => !isDisabled && competitorFileRef.current?.click()}
                disabled={isDisabled || isFileLoading}
                className="app-btn-dark w-full h-full py-3 text-sm"
              >
                {isFileLoading ? (
                  <div className="w-4 h-4 border-2 border-[#ffb1c0] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {isFileLoading ? 'Загрузка...' : 'Загрузить .docx/.xlsx'}
              </button>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-[#ab888e] mt-3">
            Укажите ссылки или загрузите файлы конкурентов для анализа структуры.
            Файлы .docx и Excel будут использованы как контекст.
          </p>
        </div>

        {/* Example Content (DOCX Upload) */}
        <div>
          <label className="block text-sm font-bold text-[#f7d6dc] mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#46fa9c]" /> Пример текста (файл .docx)
          </label>

          {!docxFileName ? (
            <div
              onClick={() => !isDisabled && fileInputRef.current?.click()}
              className={`
                border-2 border-dashed border-[#5b3f44] rounded-[8px] p-6 
                text-center transition-all bg-white/[0.03]
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#ffb1c0] hover:bg-white/[0.05]'}
              `}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleDocxUpload}
                accept=".docx"
                className="hidden"
                disabled={isDisabled}
              />
              {isDocxLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                  <div className="w-4 h-4 border-2 border-[#ffb1c0] border-t-transparent rounded-full animate-spin"></div>
                  Чтение...
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-[#ab888e]" />
                  <span className="text-sm text-[#ab888e] font-medium">Загрузить .docx</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[rgba(70,250,156,0.08)] border border-[#46fa9c]/30 rounded-[8px] p-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-white/10 p-2 rounded-[6px] flex-shrink-0">
                  <FileText className="w-4 h-4 text-[#46fa9c]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {docxFileName}
                  </p>
                  <p className="text-xs text-[#ab888e]">
                    {config.exampleContent ? `${config.exampleContent.length} символов` : 'Файл загружен'}
                  </p>
                </div>
              </div>
              <button
                onClick={clearExample}
                disabled={isDisabled}
                className="text-slate-400 hover:text-red-400 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* LSI Keywords */}
        <div>
          <label className="block text-sm font-bold text-[#f7d6dc] mb-2 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#46fa9c]" /> LSI ключи (набор слов)
          </label>
          <textarea
            value={config.lsiKeywords}
            onChange={(e) => handleChange('lsiKeywords', e.target.value)}
            placeholder="дополнительные тематические слова через запятую..."
            className="app-input-dark h-20 md:h-24 resize-none"
            disabled={isDisabled}
          />
        </div>

        {/* Length Controls */}
        <div className={sectionClass}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#f7d6dc] mb-2 flex items-center gap-2 justify-between">
                <span className="flex items-center gap-2"><Type className="w-4 h-4 text-[#46fa9c]" /> Количество символов</span>
                {userPlan && (
                  <span className="text-[10px] text-[#ab888e] font-normal">Лимит: {userPlan.maxChars}</span>
                )}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={config.minChars}
                  onChange={(e) => handleChange('minChars', parseNumericInput(e.target.value, config.minChars))}
                  className={inputClass}
                  placeholder="Мин"
                  disabled={isDisabled}
                />
                <span className="text-[#ab888e] font-bold">-</span>
                <input
                  type="number"
                  value={config.maxChars}
                  onChange={(e) => handleChange('maxChars', parseNumericInput(e.target.value, config.maxChars))}
                  className={`app-input-dark ${isOverLimit ? 'border-red-500 focus:ring-red-500/20' : ''}`}
                  placeholder="Макс"
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#f7d6dc] mb-2 flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-[#46fa9c]" /> Абзацы
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={config.minParas}
                  onChange={(e) => handleChange('minParas', parseNumericInput(e.target.value, config.minParas))}
                  className={inputClass}
                  placeholder="Мин"
                  disabled={isDisabled}
                />
                <span className="text-[#ab888e] font-bold">-</span>
                <input
                  type="number"
                  value={config.maxParas}
                  onChange={(e) => handleChange('maxParas', parseNumericInput(e.target.value, config.maxParas))}
                  className={inputClass}
                  placeholder="Макс"
                  disabled={isDisabled}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Base & Internal Links */}
        <div className="space-y-3 sm:space-y-4">
          <KnowledgeBaseUploader />
          <InternalLinksManager />
        </div>

        {/* Generate + Clear Buttons */}
        <div className="pt-2 pointer-events-auto relative z-20">
          {renderGenerateButton()}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={isDisabled}
              className={`
                w-full mt-2 py-3 rounded-[8px] font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all
                ${isDisabled
                  ? 'bg-white/[0.04] text-slate-500 cursor-not-allowed'
                  : 'bg-white/[0.03] text-slate-200 border border-white/10 hover:border-red-400/30 hover:text-red-300 hover:bg-red-500/5'}
              `}
            >
              <Trash2 className="w-4 h-4" />
              Очистить настройки
            </button>
          )}
          {isOverLimit && (
            <p className="text-red-500 text-xs text-center mt-2 font-medium animate-in fade-in">
              не может быть выбрано количество символов свыше лимита
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
