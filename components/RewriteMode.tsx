import React, { useState } from 'react';
import { RefreshCw, Link, FileText, Copy, Check, Sparkles, Palette, Languages, Mic, Feather } from 'lucide-react';
import { apiService } from '../services/apiService';
import { User } from '../types';
import { StyledSelect } from './StyledSelect';

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

const fieldShellClass = 'rounded-[8px] border border-[#5b3f44] bg-[linear-gradient(180deg,rgba(43,27,30,0.76),rgba(15,18,24,0.8))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:border-[#ffb1c0]/45 focus-within:border-[#ffb1c0]/70 focus-within:shadow-[0_0_0_1px_rgba(255,177,192,0.12)]';
const inputClass = 'app-shell-input min-h-[1.5rem]';
const sectionLabelClass = 'flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#f7d6dc]';
const modeButtonBase = 'flex items-center justify-center gap-2 rounded-[8px] border px-4 py-3 text-sm font-semibold transition-all';

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
            <section className="app-dark-card p-4 sm:p-5">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-[#ffb1c0]" />
                    Рерайт текста
                </h2>
                <p className="text-[#ab888e] text-sm">
                    Перепишите текст или контент с веб-страницы, сохраняя смысл и делая его уникальным
                </p>
            </section>

            {/* Input Mode Toggle */}
            <section className="app-dark-card p-4 sm:p-5">
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setInputMode('text')}
                        className={`${modeButtonBase} flex-1 ${
                            inputMode === 'text'
                                ? 'border-[#ffb1c0]/40 bg-[linear-gradient(135deg,rgba(255,76,131,0.22),rgba(255,177,192,0.14))] text-white shadow-[0_18px_34px_rgba(255,76,131,0.12)]'
                                : 'border-white/10 bg-white/[0.03] text-[#ab888e] hover:border-white/15 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        Текст
                    </button>
                    <button
                        onClick={() => setInputMode('url')}
                        className={`${modeButtonBase} flex-1 ${
                            inputMode === 'url'
                                ? 'border-[#ffb1c0]/40 bg-[linear-gradient(135deg,rgba(255,76,131,0.22),rgba(255,177,192,0.14))] text-white shadow-[0_18px_34px_rgba(255,76,131,0.12)]'
                                : 'border-white/10 bg-white/[0.03] text-[#ab888e] hover:border-white/15 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <Link className="w-4 h-4" />
                        URL страницы
                    </button>
                </div>

                {/* Input */}
                {inputMode === 'text' ? (
                    <label className={`${fieldShellClass} block cursor-text`}>
                        <textarea
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            placeholder="Вставьте текст для рерайта..."
                            className={`${inputClass} h-48 resize-none`}
                        />
                    </label>
                ) : (
                    <label className={`${fieldShellClass} block cursor-text`}>
                        <input
                            type="url"
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                            placeholder="https://example.com/article"
                            className={inputClass}
                        />
                    </label>
                )}

                {inputMode === 'text' && sourceText && (
                    <p className="text-xs text-[#ab888e] mt-2">
                        {sourceText.length} символов · {sourceText.split(/\s+/).filter(Boolean).length} слов
                    </p>
                )}
            </section>

            {/* Settings */}
            <section className="app-dark-card p-4 sm:p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#ffb1c0]" />
                    Настройки рерайта
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Language */}
                    <div>
                        <label className={`${sectionLabelClass} mb-1.5`}>
                            <Languages className="w-3.5 h-3.5 text-[#46fa9c]" />
                            Язык результата
                        </label>
                        <StyledSelect
                            value={targetLanguage}
                            onChange={setTargetLanguage}
                            className={fieldShellClass}
                            options={LANGUAGES}
                        />
                    </div>

                    {/* Tone */}
                    <div>
                        <label className={`${sectionLabelClass} mb-1.5`}>
                            <Mic className="w-3.5 h-3.5 text-[#46fa9c]" />
                            Тон
                        </label>
                        <StyledSelect
                            value={tone}
                            onChange={setTone}
                            className={fieldShellClass}
                            options={TONES.map((t) => ({ value: t, label: t }))}
                        />
                    </div>

                    {/* Style */}
                    <div>
                        <label className={`${sectionLabelClass} mb-1.5`}>
                            <Feather className="w-3.5 h-3.5 text-[#46fa9c]" />
                            Стиль
                        </label>
                        <StyledSelect
                            value={style}
                            onChange={setStyle}
                            className={fieldShellClass}
                            options={STYLES.map((s) => ({ value: s, label: s }))}
                        />
                    </div>
                </div>

                {/* Preserve Structure */}
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/15 hover:bg-white/[0.05]">
                    <input
                        type="checkbox"
                        checked={preserveStructure}
                        onChange={(e) => setPreserveStructure(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent text-[#ff4c83] focus:ring-[#ff4c83]/35"
                    />
                    <span className="text-sm text-[#f7d6dc]">
                        Сохранять структуру заголовков (H1, H2, H3)
                    </span>
                </label>
            </section>

            {/* Generate Button */}
            <button
                onClick={handleRewrite}
                disabled={isLoading}
                className={`app-btn-primary w-full py-3.5 rounded-[8px] font-bold flex items-center justify-center gap-2 transition-all ${
                    isLoading
                        ? 'cursor-not-allowed opacity-60'
                        : ''
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
                <div className="rounded-[10px] border border-[#ffb4ab]/20 bg-[#93000a]/18 p-4">
                    <p className="text-sm text-[#ffdad6]">{error}</p>
                </div>
            )}

            {/* Result */}
            {result && (
                <section className="app-dark-card p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Check className="w-5 h-5 text-[#46fa9c]" />
                            Результат рерайта
                        </h3>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-sm font-medium text-[#ab888e] transition-colors hover:text-[#ffb1c0]"
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
                        <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3">
                            <p className="mb-1 text-xs text-[#ab888e]">Оригинал</p>
                            <p className="text-sm text-[#f7d6dc]">
                                {result.original.words} слов · {result.original.length} символов
                            </p>
                        </div>
                        <div className="rounded-[8px] border border-[#ff2d78]/18 bg-[#ff2d78]/8 p-3">
                            <p className="mb-1 text-xs text-[#ffb1c0]">Результат</p>
                            <p className="text-sm text-white">
                                {result.rewritten.words} слов · {result.rewritten.length} символов
                            </p>
                        </div>
                    </div>

                    {/* Rewritten Text */}
                    <div className="max-h-96 overflow-y-auto rounded-[8px] border border-white/10 bg-[rgba(2,3,5,0.45)] p-4">
                        <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-[#f7d6dc]">
                            {result.rewritten.text}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default RewriteMode;
