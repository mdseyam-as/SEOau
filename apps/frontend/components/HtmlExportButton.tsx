import React, { useState } from 'react';
import { Code, Copy, Check, Download, Settings } from 'lucide-react';

interface HtmlExportButtonProps {
  content: string;
  keywords?: string[];
  meta?: {
    title?: string;
    description?: string;
  };
}

export const HtmlExportButton: React.FC<HtmlExportButtonProps> = ({
  content,
  keywords = [],
  meta
}) => {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [options, setOptions] = useState({
    wrapKeywords: false,
    keywordTag: 'strong',
    fullDocument: false
  });

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          markdown: content,
          options: {
            wrapKeywords: options.wrapKeywords,
            keywordTag: options.keywordTag,
            keywords,
            fullDocument: options.fullDocument,
            meta
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        await navigator.clipboard.writeText(data.html);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/export/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          markdown: content,
          options: {
            wrapKeywords: options.wrapKeywords,
            keywordTag: options.keywordTag,
            keywords,
            fullDocument: true,
            meta
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${meta?.title || 'article'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          disabled={!content}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span>Скопировано!</span>
            </>
          ) : (
            <>
              <Code className="w-4 h-4" />
              <span>Копировать HTML</span>
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          disabled={!content}
          className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Скачать HTML файл"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${
            showSettings
              ? 'bg-brand-green text-black'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Настройки экспорта"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {showSettings && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-xl z-10">
          <h4 className="text-sm font-medium text-white mb-3">Настройки экспорта</h4>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.wrapKeywords}
                onChange={(e) => setOptions({ ...options, wrapKeywords: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 text-brand-green focus:ring-brand-green focus:ring-offset-0 bg-slate-700"
              />
              <span className="text-sm text-slate-300">Выделять ключевые слова</span>
            </label>

            {options.wrapKeywords && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Тег для ключевых слов</label>
                <select
                  value={options.keywordTag}
                  onChange={(e) => setOptions({ ...options, keywordTag: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-brand-green focus:outline-none"
                >
                  <option value="strong">&lt;strong&gt;</option>
                  <option value="b">&lt;b&gt;</option>
                  <option value="em">&lt;em&gt;</option>
                  <option value="mark">&lt;mark&gt;</option>
                  <option value="span">&lt;span&gt;</option>
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.fullDocument}
                onChange={(e) => setOptions({ ...options, fullDocument: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 text-brand-green focus:ring-brand-green focus:ring-offset-0 bg-slate-700"
              />
              <span className="text-sm text-slate-300">Полный HTML документ</span>
            </label>

            <p className="text-xs text-slate-500">
              {options.fullDocument
                ? 'Включает &lt;html&gt;, &lt;head&gt;, meta-теги'
                : 'Только содержимое статьи'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
