import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, AlertCircle, CheckCircle, Database, Search } from 'lucide-react';
import type { KnowledgeBaseFile } from '../types';

interface KnowledgeBaseUploaderProps {
  onFilesChange?: (files: KnowledgeBaseFile[]) => void;
}

export const KnowledgeBaseUploader: React.FC<KnowledgeBaseUploaderProps> = ({ onFilesChange }) => {
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await fetch('/api/knowledge-base', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        onFilesChange?.(data.files || []);
      }
    } catch (err) {
      console.error('Failed to load knowledge base files:', err);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        const newFiles = [...files, result];
        setFiles(newFiles);
        onFilesChange?.(newFiles);
        setSuccess(`Файл "${result.fileName}" успешно загружен`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка загрузки файла');
      }
    } catch (err) {
      setError('Не удалось загрузить файл');
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        const newFiles = files.filter(f => f.id !== id);
        setFiles(newFiles);
        onFilesChange?.(newFiles);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('word') || fileType.includes('docx')) return 'DOC';
    return 'TXT';
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-brand-green" />
        <h3 className="font-semibold text-white">База знаний</h3>
        <span className="text-xs text-slate-400 ml-auto">{files.length}/10 файлов</span>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        Загрузите PDF, DOCX или TXT файлы с информацией о компании, услугах и Tone of Voice.
        AI будет использовать эти данные при генерации контента.
      </p>

      {/* Upload area */}
      <div
        onClick={() => !uploading && files.length < 10 && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center transition-all
          ${files.length >= 10 ? 'border-slate-600 bg-slate-800/30 cursor-not-allowed' :
            uploading ? 'border-slate-600 bg-slate-800/50' :
            'border-slate-600 hover:border-brand-green hover:bg-slate-800/30 cursor-pointer'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.docx,.txt"
          disabled={uploading || files.length >= 10}
        />

        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-green"></div>
            <span className="text-slate-400">Загрузка...</span>
          </div>
        ) : files.length >= 10 ? (
          <p className="text-slate-500 text-sm">Достигнут лимит файлов</p>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-slate-400" />
            <p className="text-sm text-slate-400">Нажмите для загрузки</p>
            <p className="text-xs text-slate-500">.pdf, .docx, .txt до 10MB</p>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 mt-3 text-red-400 text-sm bg-red-500/10 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 mt-3 text-green-400 text-sm bg-green-500/10 p-2 rounded-lg">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Files list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map(file => (
            <div
              key={file.id}
              className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700"
            >
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-brand-green">
                  {getFileIcon(file.fileType)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{file.fileName}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.fileSize)}</p>
              </div>

              <button
                onClick={() => handleDelete(file.id)}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Удалить файл"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
