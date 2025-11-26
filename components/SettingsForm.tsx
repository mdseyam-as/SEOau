
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { GenerationConfig, ModelConfig, TextTone, TextStyle } from '../types';
import { Settings2, Type, AlignLeft, Cpu, Link as LinkIcon, FileText, Upload, X, Lock, Globe, Feather, Mic, Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import { parseDocxFile } from '../services/docxParser';
import { parseExcelToRawText } from '../services/excelParser';
import { SubscriptionPlan, authService } from '../services/authService';

interface SettingsFormProps {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
  disabled: boolean;
  isLocked?: boolean;
  onSubmit: () => void;
  userPlan?: SubscriptionPlan | null;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ config, onChange, disabled, isLocked = false, onSubmit, userPlan }) => {
  const [docxFileName, setDocxFileName] = useState<string | null>(null);
  const [isDocxLoading, setIsDocxLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  
  // Competitor Inputs State - Initialize lazily from props
  const [competitorLinks, setCompetitorLinks] = useState<string[]>(() => {
    const links = config.competitorUrls ? config.competitorUrls.split('\n').filter(l => l.trim()) : [];
    return links.length > 0 ? links : [''];
  });

  const [competitorFiles, setCompetitorFiles] = useState<{name: string, content: string}[]>(() => 
    config.competitorFiles || []
  );
  
  const [isFileLoading, setIsFileLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const competitorFileRef = useRef<HTMLInputElement>(null);

  const isDisabled = disabled || isLocked;
  const isOverLimit = userPlan ? config.maxChars > userPlan.maxChars : false;

  // Check if current plan is 'free' to hide model details
  const isFreePlan = userPlan?.id === 'free';

  useEffect(() => {
    // Load dynamic models from storage
    setAvailableModels(authService.getModels());
  }, []);

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

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('Пожалуйста, выберите файл .docx');
      return;
    }

    setIsDocxLoading(true);
    try {
      const text = await parseDocxFile(file);
      handleChange('exampleContent', text);
      setDocxFileName(file.name);
    } catch (error) {
      console.error(error);
      alert('Не удалось прочитать .docx файл');
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
      alert('Поддерживаются только форматы .docx и .xlsx/.xls');
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
      
    } catch (error) {
       console.error(error);
       alert('Ошибка чтения файла');
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
        w-full py-3 md:py-4 rounded-lg font-bold text-white shadow-lg transition-all mt-2 text-sm md:text-base flex items-center justify-center gap-2
        ${isLocked 
          ? 'bg-gray-400 cursor-not-allowed' 
          : (disabled || !config.topic || !config.websiteName || isOverLimit)
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-brand-green hover:bg-green-700 hover:shadow-xl active:scale-[0.99]'}
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

  const isModelAllowed = (modelId: string) => {
    if (!userPlan) return true;
    return userPlan.allowedModels.includes(modelId);
  };

  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelConfig[]> = {};
    availableModels.forEach(m => {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    });
    return groups;
  }, [availableModels]);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col ${isLocked ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className="flex border-b border-gray-200 p-4 bg-gray-50/50 rounded-t-xl">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
          <Settings2 className="w-5 h-5 text-brand-green" />
          Настройки генерации
        </h3>
      </div>

      <div className="p-4 md:p-6 relative space-y-5 md:space-y-6">
        {isLocked && (
          <div className="absolute inset-0 z-10 bg-white/20 cursor-not-allowed" />
        )}
        
        {/* Context & Brand Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-4">
           <div className="flex items-center gap-2 text-sm font-bold text-slate-700 border-b border-gray-200 pb-2 mb-2">
             <Globe className="w-4 h-4 text-brand-green" />
             Контекст Бренда
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Название сайта/бренда</label>
                 <input
                    type="text"
                    value={config.websiteName}
                    onChange={(e) => handleChange('websiteName', e.target.value)}
                    placeholder="Например: MyShop, CryptoBlog"
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-green outline-none text-sm"
                    disabled={isDisabled}
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1">Целевая страна/регион</label>
                 <input
                    type="text"
                    value={config.targetCountry}
                    onChange={(e) => handleChange('targetCountry', e.target.value)}
                    placeholder="Казахстан, РФ, США..."
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-green outline-none text-sm"
                    disabled={isDisabled}
                 />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                   <Mic className="w-3 h-3" /> Тон голоса (Tone of Voice)
                 </label>
                 <select
                    value={config.tone}
                    onChange={(e) => handleChange('tone', e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-green outline-none text-sm"
                    disabled={isDisabled}
                 >
                   {Object.values(TextTone).map(t => (
                     <option key={t} value={t}>{t}</option>
                   ))}
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                   <Feather className="w-3 h-3" /> Стиль текста (Style)
                 </label>
                 <select
                    value={config.style}
                    onChange={(e) => handleChange('style', e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-green outline-none text-sm"
                    disabled={isDisabled}
                 >
                   {Object.values(TextStyle).map(s => (
                     <option key={s} value={s}>{s}</option>
                   ))}
                 </select>
              </div>
           </div>
        </div>

        {/* Topic & URL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Тема статьи</label>
            <input
              type="text"
              value={config.topic}
              onChange={(e) => handleChange('topic', e.target.value)}
              placeholder="Например: Обзор смартфонов 2024"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-green outline-none shadow-sm placeholder-gray-400 text-sm"
              disabled={isDisabled}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">URL страницы (Slug)</label>
            <input
              type="text"
              value={config.targetUrl}
              onChange={(e) => handleChange('targetUrl', e.target.value)}
              placeholder="/blog/smartphones-2024"
              className="w-full p-3 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-green outline-none shadow-sm placeholder-gray-400 text-sm"
              disabled={isDisabled}
            />
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-green" /> Модель ИИ
          </label>
          
          {isFreePlan ? (
            <div className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-slate-500 text-sm flex items-center justify-between select-none">
              <span>Автоматический выбор (Free)</span>
              <Lock className="w-4 h-4 text-gray-400" />
            </div>
          ) : (
            <div className="relative">
              <select
                value={config.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-green focus:border-transparent shadow-sm text-sm appearance-none"
                disabled={isDisabled}
              >
                {Object.keys(groupedModels).map(provider => {
                  const providerModels = groupedModels[provider].filter(m => isModelAllowed(m.id));
                  if (providerModels.length === 0) return null;
                  return (
                    <optgroup key={provider} label={provider}>
                      {providerModels.map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          )}
          {userPlan && (
            <p className="text-[10px] text-gray-400 mt-1">
              {isFreePlan ? 'Базовый доступ' : `Доступно моделей: ${userPlan.allowedModels.length} (Тариф: ${userPlan.name})`}
            </p>
          )}
        </div>

        {/* Competitor Links & Files */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-brand-green" /> Ссылки на конкурентов
          </label>
          
          <div className="space-y-3 mb-4">
             {competitorLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                   <input
                      type="text"
                      value={link}
                      onChange={(e) => updateCompetitorLink(idx, e.target.value)}
                      onPaste={(e) => handleLinkPaste(e, idx)}
                      placeholder="https://competitor.com/article..."
                      className="flex-1 p-3 bg-white border border-gray-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-green outline-none shadow-sm placeholder-gray-400 text-sm"
                      disabled={isDisabled}
                   />
                   <button 
                      onClick={() => removeCompetitorLink(idx)}
                      disabled={isDisabled}
                      className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                      title="Удалить ссылку"
                   >
                      <Trash2 className="w-5 h-5" />
                   </button>
                </div>
             ))}
          </div>
          
          {competitorFiles.length > 0 && (
             <div className="space-y-2 mb-4">
                {competitorFiles.map((file, idx) => (
                   <div key={`file-${idx}`} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                         <div className="bg-white p-2 rounded-lg">
                           {file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? (
                              <FileSpreadsheet className="w-4 h-4 text-green-600" />
                           ) : (
                              <FileText className="w-4 h-4 text-blue-600" />
                           )}
                         </div>
                         <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <button 
                         onClick={() => removeCompetitorFile(idx)}
                         disabled={isDisabled}
                         className="text-gray-400 hover:text-red-500 p-1"
                      >
                         <X className="w-4 h-4" />
                      </button>
                   </div>
                ))}
             </div>
          )}

          <div className="flex gap-3">
             <button
                onClick={addCompetitorLink}
                disabled={isDisabled}
                className="flex-1 py-3 border border-gray-300 bg-white rounded-lg text-slate-600 font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
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
                   className="w-full h-full py-3 border border-gray-300 bg-white rounded-lg text-slate-600 font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                   {isFileLoading ? (
                      <div className="w-4 h-4 border-2 border-brand-green border-t-transparent rounded-full animate-spin"></div>
                   ) : (
                      <Upload className="w-4 h-4" />
                   )}
                   {isFileLoading ? 'Загрузка...' : 'Загрузить .docx/.xlsx'}
                </button>
             </div>
          </div>
          <p className="text-[10px] md:text-xs text-gray-500 mt-2">
            Укажите ссылки или загрузите файлы конкурентов для анализа структуры. 
            Файлы .docx и Excel будут использованы как контекст.
          </p>
        </div>

        {/* Example Content (DOCX Upload) */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-green" /> Пример текста (файл .docx)
          </label>
          
          {!docxFileName ? (
            <div 
              onClick={() => !isDisabled && fileInputRef.current?.click()}
              className={`
                border-2 border-dashed border-gray-300 rounded-lg p-6 
                text-center transition-colors
                ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-brand-green hover:bg-green-50'}
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
                <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                  <div className="w-4 h-4 border-2 border-brand-green border-t-transparent rounded-full animate-spin"></div>
                  Чтение...
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-slate-600 font-medium">Загрузить .docx</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-green-50 border border-brand-green rounded-lg p-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-white p-2 rounded-full flex-shrink-0">
                  <FileText className="w-4 h-4 text-brand-green" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {docxFileName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {config.exampleContent ? `${config.exampleContent.length} символов` : 'Файл загружен'}
                  </p>
                </div>
              </div>
              <button 
                onClick={clearExample}
                disabled={isDisabled}
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* LSI Keywords */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-brand-green" /> LSI ключи (набор слов)
          </label>
          <textarea
            value={config.lsiKeywords}
            onChange={(e) => handleChange('lsiKeywords', e.target.value)}
            placeholder="дополнительные тематические слова через запятую..."
            className="w-full p-3 bg-white border border-gray-300 rounded-lg text-slate-900 h-20 md:h-24 focus:ring-2 focus:ring-brand-green outline-none resize-none shadow-sm placeholder-gray-400 text-sm"
            disabled={isDisabled}
          />
        </div>

        {/* Length Controls */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2 justify-between">
                  <span className="flex items-center gap-2"><Type className="w-4 h-4 text-brand-green" /> Количество символов</span>
                  {userPlan && (
                    <span className="text-[10px] text-slate-400 font-normal">Лимит: {userPlan.maxChars}</span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                <input
                    type="number"
                    value={config.minChars}
                    onChange={(e) => handleChange('minChars', parseInt(e.target.value))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-slate-900 shadow-sm focus:ring-1 focus:ring-brand-green text-sm"
                    placeholder="Мин"
                    disabled={isDisabled}
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                    type="number"
                    value={config.maxChars}
                    onChange={(e) => handleChange('maxChars', parseInt(e.target.value))}
                    className={`w-full p-2 bg-white border rounded-lg text-slate-900 shadow-sm focus:ring-1 text-sm ${isOverLimit ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-brand-green'}`}
                    placeholder="Макс"
                    disabled={isDisabled}
                />
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-brand-green" /> Абзацы
                </label>
                <div className="flex items-center gap-2">
                <input
                    type="number"
                    value={config.minParas}
                    onChange={(e) => handleChange('minParas', parseInt(e.target.value))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-slate-900 shadow-sm focus:ring-1 focus:ring-brand-green text-sm"
                    placeholder="Мин"
                    disabled={isDisabled}
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                    type="number"
                    value={config.maxParas}
                    onChange={(e) => handleChange('maxParas', parseInt(e.target.value))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-slate-900 shadow-sm focus:ring-1 focus:ring-brand-green text-sm"
                    placeholder="Макс"
                    disabled={isDisabled}
                />
                </div>
            </div>
            </div>
        </div>

        {/* Generate Button */}
        <div className="pt-2 pointer-events-auto relative z-20">
          {renderGenerateButton()}
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
