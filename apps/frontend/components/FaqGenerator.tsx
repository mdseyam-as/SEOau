import React, { useState } from 'react';
import { MessageCircleQuestion, Sparkles, Copy, Check, Code, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { apiService } from '../services/apiService';
import { SubscriptionPlan, FaqItem } from '../types';

interface FaqGeneratorProps {
    topic?: string;
    content?: string;
    userPlan?: SubscriptionPlan | null;
    onFaqGenerated?: (faq: FaqItem[]) => void;
}

export const FaqGenerator: React.FC<FaqGeneratorProps> = ({
    topic = '',
    content = '',
    userPlan,
    onFaqGenerated
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
    const [schemaHtml, setSchemaHtml] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [copiedSchema, setCopiedSchema] = useState(false);
    const [showSchema, setShowSchema] = useState(false);
    const [faqCount, setFaqCount] = useState(5);
    const [customTopic, setCustomTopic] = useState(topic);

    const canGenerateFaq = userPlan?.canGenerateFaq;

    const handleGenerate = async () => {
        if (!canGenerateFaq) return;

        setIsGenerating(true);
        setError(null);

        try {
            const result = await apiService.generateFaq({
                topic: customTopic || topic,
                content: content,
                language: 'Russian',
                count: faqCount
            });

            setFaqItems(result.faq);
            setSchemaHtml(result.schemaHtml);
            onFaqGenerated?.(result.faq);
        } catch (err: any) {
            setError(err.message || 'Ошибка генерации FAQ');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopySchema = () => {
        navigator.clipboard.writeText(schemaHtml);
        setCopiedSchema(true);
        setTimeout(() => setCopiedSchema(false), 2000);
    };

    const handleCopyFaq = (item: FaqItem) => {
        navigator.clipboard.writeText(`Q: ${item.question}\nA: ${item.answer}`);
    };

    return (
        <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl relative">
            {/* Locked overlay */}
            {!canGenerateFaq && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center z-10">
                    <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-300 font-medium">Генерация FAQ</p>
                        <p className="text-slate-500 text-sm">Доступно в Pro тарифе</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm sm:text-base lg:text-lg text-white flex items-center gap-2">
                    <MessageCircleQuestion className="w-5 h-5 text-amber-400" />
                    Генератор FAQ
                </h3>
                {faqItems.length > 0 && (
                    <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg">
                        {faqItems.length} вопросов
                    </span>
                )}
            </div>

            {/* Input section */}
            <div className="space-y-3 mb-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">
                        Тема для FAQ
                    </label>
                    <input
                        type="text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="Введите тему или оставьте пустым для использования контента"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">
                            Количество вопросов
                        </label>
                        <select
                            value={faqCount}
                            onChange={(e) => setFaqCount(Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 [&>option]:text-slate-900"
                        >
                            <option value={3}>3 вопроса</option>
                            <option value={5}>5 вопросов</option>
                            <option value={7}>7 вопросов</option>
                            <option value={10}>10 вопросов</option>
                        </select>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !canGenerateFaq}
                        className={`mt-5 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            isGenerating
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg hover:shadow-amber-500/25'
                        }`}
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Генерация...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Сгенерировать
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* FAQ Items */}
            {faqItems.length > 0 && (
                <div className="space-y-3 mb-4">
                    {faqItems.map((item, index) => (
                        <div
                            key={index}
                            className="bg-white/5 border border-white/10 rounded-xl p-4 group"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-white text-sm mb-2">
                                        <span className="text-amber-400 mr-2">Q{index + 1}:</span>
                                        {item.question}
                                    </p>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        <span className="text-green-400 mr-2">A:</span>
                                        {item.answer}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleCopyFaq(item)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg"
                                    title="Копировать"
                                >
                                    <Copy className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* JSON-LD Schema */}
            {schemaHtml && (
                <div className="border-t border-white/10 pt-4">
                    <button
                        onClick={() => setShowSchema(!showSchema)}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <span className="font-bold text-sm text-white flex items-center gap-2">
                            <Code className="w-4 h-4 text-purple-400" />
                            JSON-LD Schema (FAQPage)
                        </span>
                        {showSchema ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                    </button>

                    {showSchema && (
                        <div className="mt-3">
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={handleCopySchema}
                                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-purple-400 transition-colors"
                                >
                                    {copiedSchema ? (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            Скопировано!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            Копировать код
                                        </>
                                    )}
                                </button>
                            </div>
                            <pre className="bg-slate-900/50 rounded-lg p-4 text-xs text-purple-300 font-mono overflow-x-auto whitespace-pre-wrap">
                                {schemaHtml}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FaqGenerator;
