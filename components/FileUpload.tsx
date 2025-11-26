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
          relative border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-all
          ${disabled ? 'bg-gray-100 border-gray-300' : 'cursor-pointer'}
          ${!disabled && isDragging ? 'border-brand-green bg-green-50' : ''}
          ${!disabled && !isDragging ? 'border-gray-300 hover:border-brand-green hover:bg-gray-50' : ''}
          ${fileName ? 'bg-green-50 border-brand-green' : ''}
        `}
      >
        <input 
          type="file" 
          ref={inputRef} 
          onChange={handleChange} 
          className="hidden" 
          accept=".xlsx, .xls" 
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          {loading ? (
            <div className="animate-spin rounded-full h-8 w-8 md:h-10 md:w-10 border-b-2 border-brand-green"></div>
          ) : fileName ? (
            <>
              <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-brand-green" />
              <div>
                <p className="font-semibold text-slate-700 text-sm md:text-base truncate max-w-[200px] md:max-w-xs">{fileName}</p>
                <p className="text-xs md:text-sm text-slate-500">Нажмите, чтобы заменить</p>
              </div>
            </>
          ) : (
            <>
              <div className={`p-3 md:p-4 rounded-full ${disabled ? 'bg-gray-200' : 'bg-green-100'}`}>
                <FileSpreadsheet className={`w-6 h-6 md:w-8 md:h-8 ${disabled ? 'text-gray-400' : 'text-brand-green'}`} />
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm md:text-base">
                  {disabled ? 'Загрузка недоступна' : 'Нажмите для загрузки Excel'}
                </p>
                <p className="text-xs md:text-sm text-slate-500">
                  {disabled ? 'Требуется активная подписка' : 'или перетащите файл .xlsx сюда'}
                </p>
              </div>
              {!disabled && <p className="text-[10px] md:text-xs text-slate-400 mt-2">Колонки: Ключ (keywords), Частота</p>}
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 mt-2 text-red-600 text-xs md:text-sm bg-red-50 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {warning && (
        <div className="flex items-center gap-2 mt-2 text-orange-700 text-xs md:text-sm bg-orange-50 p-2 rounded-lg">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {warning}
        </div>
      )}
    </div>
  );
};