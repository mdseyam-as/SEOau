import React, { useState } from 'react';
import { RefreshCw, Link, FileText, Copy, Check, Sparkles, Globe, Palette } from 'lucide-react';
import { apiService } from '../services/apiService';
import { User } from '../types';

interface RewriteModeProps {
    onUserUpdate?: (user: User) => void;
}

type InputMode = 'url' | 'text';

const LANGUAGES = [
    { value: 'ru', label: 'Русский' },
    { value: 'en', label: 'English' },
    { value: 'kk', label: 'Қазақша' },
    { value: 'uk', label: 'Українська' },
    { value: 'de', label: 'Deutsch' },
];

const TONES = [
    'Professional',
    'Casual',
    'Academic',
    'Friendly',
    'Formal',
];

const STYLES = [
    'Informative',
    'Persuasive',
    'Narrative',
    'Analytical',
    'Conversational',
];

export const RewriteMode: React.FC<RewriteModeProps> = ({ onUserUpdate }) => {
    const [inputMode, setInputMode] = useState<InputMode>('text');
    const [sourceUrl, setSourceUrl] = useState('');
    const [sourceText, setSourceText] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('ru');
    const [tone, setTone] = useState('Professional');
    const [style, setStyle] = useState('Informative');
    const [preserveStructure, setPreserveStructure] = useState(true);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        original: { text: string; length: number; words: number };
        rewritten: { text: string; length: number; words: number };
    } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleRewrite = async () => {
        if (inputMode === 'url' && !sourceUrl.trim()) {
            setError('Введите URL страницы');
            return;
        }
        if (inputMode === 'text' && !sourceText.trim()) {
            setError('Введите текст для рерайта');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await apiService.rewrite({
                sourceUrl: inputMode === 'url' ? sourceUrl.trim() : undefined,
                sourceText: inputMode === 'text' ? sourceText.trim() : undefined,
                targetLanguage,
                tone,
                style,
                preserveStructure,
            });

            setResult({
                original: response.original,
                rewritten: response.rewritten,
            });

            if (response.user && onUserUpdate) {
                onUserUpdate(response.user);
            }
        } catch (err: any) {
            setError(err.message || 'Ошибка рерайта');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (result?.rewritten.text) {
            navigator.clipboard.writeText(result.rewritten.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass-panel p-4 sm:p-5 rounded-xl">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-purple-400" />
                    Рерайт текста
                </h2>
                <p className="text-slate-400 text-sm">
                    Перепишите текст или контент с веб-страницы, сохраняя смысл и делая его уникальным
                </p>
            </div>

            {/* Input Mode Toggle */}
            <div className="glass-panel p-4 sm:p-5 rounded-xl">
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setInputMode('text')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                            inputMode === 'text'
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        Текст
                    </button>
                    <button
                        onClick={() => setInputMode('url')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
                            inputMode === 'url'
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                    >
                        <Link className="w-4 h-4" />
                        URL страницы
                    </button>
                </div>

                {/* Input */}
                {inputMode === 'text' ? (
                    <textarea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="Вставьте текст для рерайта..."
                        className="w-full h-48 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    />
                ) : (
                    <input
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://example.com/article"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                )}

                {inputMode === 'text' && sourceText && (
                    <p className="text-xs text-slate-500 mt-2">
                        {sourceText.length} символов · {sourceText.split(/\s+/).filter(Boolean).length} слов
                    </p>
                )}
            </div>

            {/* Settings */}
            <div className="glass-panel p-4 sm:p-5 rounded-xl">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Настройки рерайта
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Language */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">
                            <Globe className="w-3 h-3 inline mr-1" />
                            Язык результата
                        </label>
                        <select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&>option]:text-slate-900"
                        >
                            {LANGUAGES.map((lang) => (
                                <option key={lang.value} value={lang.value}>
                                    {lang.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tone */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">
                            Тон
                        </label>
                        <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&>option]:text-slate-900"
                        >
                            {TONES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Style */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">
                            Стиль
                        </label>
                        <select
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 [&>option]:text-slate-900"
                        >
                            {STYLES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Preserve Structure */}
                <label className="flex items-center gap-3 mt-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={preserveStructure}
                        onChange={(e) => setPreserveStructure(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500/50"
                    />
                    <span className="text-sm text-slate-300">
                        Сохранять структуру заголовков (H1, H2, H3)
                    </span>
                </label>
            </div>

            {/* Generate Button */}
            <button
                onClick={handleRewrite}
                disabled={isLoading}
                className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                    isLoading
                        ? 'bg-slate-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-lg hover:shadow-purple-500/25'
                }`}
            >
                {isLoading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Переписываю...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-5 h-5" />
                        Переписать текст
                    </>
                )}
            </button>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="glass-panel p-4 sm:p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-400" />
                            Результат рерайта
                        </h3>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-purple-400 transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Скопировано!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Копировать
                                </>
                            )}
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-slate-500 mb-1">Оригинал</p>
                            <p className="text-sm text-slate-300">
                                {result.original.words} слов · {result.original.length} символов
                            </p>
                        </div>
                        <div className="bg-purple-500/10 rounded-lg p-3">
                            <p className="text-xs text-purple-400 mb-1">Результат</p>
                            <p className="text-sm text-white">
                                {result.rewritten.words} слов · {result.rewritten.length} символов
                            </p>
                        </div>
                    </div>

                    {/* Rewritten Text */}
                    <div className="bg-slate-900/50 rounded-xl p-4 max-h-96 overflow-y-auto">
                        <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-slate-200">
                            {result.rewritten.text}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RewriteMode;
