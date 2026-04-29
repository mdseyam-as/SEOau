import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, AlertCircle, CheckCircle, Database, RefreshCw } from 'lucide-react';
import type { KnowledgeBaseFile } from '../types';
import { apiService } from '../services/apiService';

interface KnowledgeBaseUploaderProps {
  onFilesChange?: (files: KnowledgeBaseFile[]) => void;
}

export const KnowledgeBaseUploader: React.FC<KnowledgeBaseUploaderProps> = ({ onFilesChange }) => {
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await apiService.getKnowledgeBase();
      setFiles(data.files || []);
      onFilesChange?.(data.files || []);
    } catch (err) {
      console.error('Failed to load knowledge base files:', err);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiService.uploadKnowledgeBaseFile(file);
      const newFiles = [...files, result];
      setFiles(newFiles);
      onFilesChange?.(newFiles);
      setSuccess(`Файл "${result.fileName}" успешно загружен`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки файла');
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
      await apiService.deleteKnowledgeBaseFile(id);
      const newFiles = files.filter(f => f.id !== id);
      setFiles(newFiles);
      onFilesChange?.(newFiles);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleReindex = async (id: string) => {
    setReindexingId(id);
    setError(null);
    setSuccess(null);

    try {
      const { file } = await apiService.reindexKnowledgeBaseFile(id);
      const newFiles = files.map((item) => item.id === id ? file : item);
      setFiles(newFiles);
      onFilesChange?.(newFiles);
      setSuccess(`Файл "${file.fileName}" переиндексирован`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка переиндексации файла');
    } finally {
      setReindexingId(null);
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
    <div className="app-dark-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#46fa9c]/20 bg-[rgba(70,250,156,0.08)]">
          <Database className="w-5 h-5 text-[#46fa9c]" />
        </div>
        <h3 className="font-semibold text-white">База знаний</h3>
        <span className="text-xs text-[#ab888e] ml-auto">{files.length}/10 файлов</span>
      </div>

      <p className="text-sm text-[#ab888e] mb-4 leading-relaxed">
        Загрузите PDF, DOCX или TXT файлы с информацией о компании, услугах и Tone of Voice.
        AI будет использовать эти данные при генерации контента.
      </p>

      {/* Upload area */}
      <div
        onClick={() => !uploading && files.length < 10 && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-[8px] p-4 text-center transition-all
          ${files.length >= 10 ? 'border-white/10 bg-white/[0.03] cursor-not-allowed' :
            uploading ? 'border-[#5b3f44] bg-white/[0.04]' :
            'border-[#5b3f44] hover:border-[#ffb1c0] hover:bg-white/[0.04] cursor-pointer'}
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
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#ffb1c0]"></div>
            <span className="text-[#ab888e]">Загрузка...</span>
          </div>
        ) : files.length >= 10 ? (
          <p className="text-[#ab888e] text-sm">Достигнут лимит файлов</p>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-[#ab888e]" />
            <p className="text-sm text-[#d7c1c7]">Нажмите для загрузки</p>
            <p className="text-xs text-[#ab888e]">.pdf, .docx, .txt до 10MB</p>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 mt-3 text-red-200 text-sm bg-[rgba(74,23,29,0.88)] p-2 rounded-[8px] border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 mt-3 text-[#8cf7ba] text-sm bg-[rgba(17,54,37,0.86)] p-2 rounded-[8px] border border-[#46fa9c]/20">
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
              className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-[8px] border border-white/10"
            >
              <div className="w-10 h-10 bg-[rgba(70,250,156,0.08)] rounded-[8px] border border-[#46fa9c]/20 flex items-center justify-center">
                <span className="text-xs font-bold text-[#46fa9c]">
                  {getFileIcon(file.fileType)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-white break-all">{file.fileName}</p>
                <p className="text-xs text-[#ab888e]">
                  {formatFileSize(file.fileSize)}
                  {typeof file.chunkCount === 'number' && ` · ${file.chunkCount} чанков`}
                  {file.hasEmbeddings ? ' · embeddings ready' : ' · keyword fallback'}
                </p>
              </div>

              <button
                onClick={() => handleReindex(file.id)}
                className="p-2 text-slate-400 hover:text-[#46fa9c] transition-colors disabled:opacity-50"
                title="Переиндексировать"
                disabled={reindexingId === file.id}
              >
                <RefreshCw className={`w-4 h-4 ${reindexingId === file.id ? 'animate-spin' : ''}`} />
              </button>

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
