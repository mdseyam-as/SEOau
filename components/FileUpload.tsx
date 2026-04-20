import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { parseExcelFile } from '../services/excelParser';
import { KeywordRow } from '../types';

interface FileUploadProps {
  onKeywordsLoaded: (keywords: KeywordRow[]) => void;
  disabled?: boolean;
  maxKeywords?: number; // Optional limit
}

export const FileUpload: React.FC<FileUploadProps> = ({ onKeywordsLoaded, disabled = false, maxKeywords }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (disabled) return;
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Пожалуйста, загрузите файл Excel (.xlsx)');
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      let keywords = await parseExcelFile(file);
      
      // Limit check
      if (maxKeywords && maxKeywords > 0 && keywords.length > maxKeywords) {
         setWarning(`Файл содержит ${keywords.length} ключей, но ваш тариф ограничен ${maxKeywords}. Загружены только топ-${maxKeywords}.`);
         keywords = keywords.slice(0, maxKeywords);
      }

      setFileName(file.name);
      onKeywordsLoaded(keywords);
    } catch (err) {
      setError('Не удалось прочитать файл. Проверьте формат.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div className={`w-full mb-6 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div
        onClick={handleClick}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative overflow-hidden border-2 border-dashed rounded-[24px] p-6 md:p-8 text-center transition-all duration-300
          ${disabled ? 'bg-slate-100 border-slate-300' : 'cursor-pointer'}
          ${!disabled && isDragging ? 'border-emerald-400 bg-[linear-gradient(135deg,rgba(16,185,129,0.10),rgba(56,189,248,0.08))] shadow-[0_18px_40px_rgba(16,185,129,0.15)] scale-[1.01]' : ''}
          ${!disabled && !isDragging ? 'border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.92))] hover:border-emerald-300 hover:shadow-[0_18px_40px_rgba(148,163,184,0.10)]' : ''}
          ${fileName ? 'bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.9))] border-emerald-300 shadow-[0_18px_40px_rgba(16,185,129,0.12)]' : ''}
        `}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_28%),radial-gradient(circle_at_left_center,rgba(56,189,248,0.08),transparent_22%)]" />
        <input 
          type="file" 
          ref={inputRef} 
          onChange={handleChange} 
          className="hidden" 
          accept=".xlsx, .xls" 
          disabled={disabled}
        />

        <div className="relative flex flex-col items-center justify-center gap-3">
          {loading ? (
            <div className="animate-spin rounded-full h-8 w-8 md:h-10 md:w-10 border-b-2 border-brand-green"></div>
          ) : fileName ? (
            <>
              <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-emerald-500" />
              <div>
                <p className="font-semibold text-slate-800 text-sm md:text-base truncate max-w-[200px] md:max-w-xs">{fileName}</p>
                <p className="text-xs md:text-sm text-slate-500">Нажмите, чтобы заменить</p>
              </div>
            </>
          ) : (
            <>
              <div className={`p-3 md:p-4 rounded-[20px] border ${disabled ? 'bg-slate-200 border-slate-300' : 'bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(56,189,248,0.10))] border-emerald-200/70 shadow-[0_14px_36px_rgba(16,185,129,0.10)]'}`}>
                <FileSpreadsheet className={`w-6 h-6 md:w-8 md:h-8 ${disabled ? 'text-gray-400' : 'text-emerald-600'}`} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm md:text-base">
                  {disabled ? 'Загрузка недоступна' : 'Нажмите для загрузки Excel'}
                </p>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  {disabled ? 'Требуется активная подписка' : 'или перетащите файл .xlsx сюда'}
                </p>
              </div>
              {!disabled && <div className="app-badge mt-2">Ключ | Частота</div>}
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 mt-3 text-red-600 text-xs md:text-sm bg-red-50 p-3 rounded-2xl border border-red-100">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {warning && (
        <div className="flex items-center gap-2 mt-3 text-orange-700 text-xs md:text-sm bg-orange-50 p-3 rounded-2xl border border-orange-100">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {warning}
        </div>
      )}
    </div>
  );
};
