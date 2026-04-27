import React, { useState, useEffect } from 'react';
import { 
    X, Crown, Check, Zap, Star, Sparkles, 
    ExternalLink, Shield, Clock, Infinity,
    MessageCircleQuestion, Globe, Share2, AlertOctagon
} from 'lucide-react';
import { SubscriptionPlan } from '../types';
import { apiService } from '../services/apiService';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlanId?: string;
    telegramLink?: string;
    onPurchaseComplete?: () => Promise<void> | void;
}

const normalizeTelegramLink = (value: string) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return 'https://t.me/bankkz_admin';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^t\.me\//i.test(trimmed)) return `https://${trimmed}`;
    if (/^@/.test(trimmed)) return `https://t.me/${trimmed.slice(1)}`;
    return `https://t.me/${trimmed}`;
};

const buildTelegramPurchaseLink = (baseLink: string, plan?: SubscriptionPlan | null) => {
    const normalized = normalizeTelegramLink(baseLink);

    try {
        const url = new URL(normalized);
        const message = plan
            ? `Здравствуйте! Хочу оплатить тариф "${plan.name}" (${plan.durationDays || 30} дней).`
            : 'Здравствуйте! Хочу оплатить подписку.';

        url.searchParams.set('text', message);
        return url.toString();
    } catch {
        return normalized;
    }
};

const FEATURE_ICONS: Record<string, React.ReactNode> = {
    canCheckSpam: <AlertOctagon className="w-4 h-4" />,
    canOptimizeRelevance: <Zap className="w-4 h-4" />,
    canUseAioMode: <Globe className="w-4 h-4" />,
    canGenerateFaq: <MessageCircleQuestion className="w-4 h-4" />,
    canUseSocialPack: <Share2 className="w-4 h-4" />,
};

const FEATURE_LABELS: Record<string, string> = {
    canCheckSpam: 'Проверка переспама',
    canOptimizeRelevance: 'Оптимизация релевантности',
    canUseAioMode: 'AIO режим (AI-поисковики)',
    canGenerateFaq: 'Генерация FAQ',
    canUseSocialPack: 'Social Media Pack',
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
    isOpen,
    onClose,
    currentPlanId,
    telegramLink = 'https://t.me/bankkz_admin',
    onPurchaseComplete
}) => {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadPlans();
        }
    }, [isOpen]);

    const loadPlans = async () => {
        setLoading(true);
        setPurchaseError(null);
        try {
            const { plans: loadedPlans } = await apiService.getPlans();
            // Sort by price
            const sorted = loadedPlans.sort((a, b) => (a.priceRub || 0) - (b.priceRub || 0));
            setPlans(sorted);
        } catch (e) {
            console.error('Failed to load plans:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = (planId: string) => {
        if (planId === currentPlanId) return;
        setSelectedPlan(planId);
        setPurchaseError(null);
    };

    const handlePurchase = async () => {
        if (!selectedPlan || selectedPlan === currentPlanId) {
            return;
        }

        setPurchaseLoading(true);
        setPurchaseError(null);

        try {
            const { invoiceLink } = await apiService.createStarsInvoice(selectedPlan);
            const webApp = (window as any).Telegram?.WebApp;

            if (webApp?.openInvoice) {
                webApp.openInvoice(invoiceLink, async (status: string) => {
                    if (status === 'paid') {
                        await onPurchaseComplete?.();
                        onClose();
                    }
                });
            } else {
                window.open(invoiceLink, '_blank', 'noopener,noreferrer');
                onClose();
            }
        } catch (error) {
            console.error('Failed to create Telegram Stars invoice:', error);
            setPurchaseError(error instanceof Error ? error.message : 'Не удалось открыть оплату в Telegram Stars');
        } finally {
            setPurchaseLoading(false);
        }
    };

    const handleTelegramPurchase = () => {
        if (!selectedPlanData || selectedPlan === currentPlanId) {
            return;
        }

        const purchaseLink = buildTelegramPurchaseLink(telegramLink, selectedPlanData);
        window.open(purchaseLink, '_blank', 'noopener,noreferrer');
        onClose();
    };

    if (!isOpen) return null;

    const getPlanIcon = (planId: string) => {
        if (planId === 'free') return <Star className="w-6 h-6" />;
        if (planId === 'pro') return <Crown className="w-6 h-6" />;
        return <Sparkles className="w-6 h-6" />;
    };

    const getPlanColor = (planId: string) => {
        if (planId === 'free') return 'from-slate-500 to-slate-600';
        if (planId === 'pro') return 'from-purple-500 to-pink-500';
        return 'from-amber-500 to-orange-500';
    };

    const getPlanBorder = (planId: string, isSelected: boolean, isCurrent: boolean) => {
        if (isCurrent) return 'border-green-500/50 bg-green-500/5';
        if (isSelected) return 'border-purple-500 bg-purple-500/10';
        if (planId === 'pro') return 'border-purple-500/30';
        if (planId === 'unlimited') return 'border-amber-500/30';
        return 'border-white/10';
    };

    const selectedPlanData = plans.find((plan) => plan.id === selectedPlan) || null;
    const canPurchaseWithStars = !!selectedPlanData?.priceStars && selectedPlan !== currentPlanId;
    const canPurchaseViaTelegram = !!selectedPlanData && selectedPlan !== currentPlanId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative flex w-full max-w-5xl max-h-[min(92vh,56rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                {/* Header */}
                <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-4 py-4 sm:px-5 sm:py-5 md:px-6">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-3">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
                                <Crown className="h-5 w-5 text-amber-400 sm:h-6 sm:w-6" />
                                Выберите тариф
                            </h2>
                            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                                Разблокируйте все возможности SEO Generator
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 transition-colors hover:bg-white/10 shrink-0"
                        >
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
                    {loading ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white/5 rounded-xl p-6 animate-pulse">
                                    <div className="h-8 bg-white/10 rounded w-24 mb-4" />
                                    <div className="h-10 bg-white/10 rounded w-32 mb-4" />
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4].map(j => (
                                            <div key={j} className="h-4 bg-white/5 rounded" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {plans.map((plan) => {
                                const isCurrent = plan.id === currentPlanId;
                                const isSelected = plan.id === selectedPlan;
                                const isPro = plan.id === 'pro';

                                return (
                                    <div
                                        key={plan.id}
                                        onClick={() => handleSelectPlan(plan.id)}
                                        className={`relative rounded-xl border-2 p-5 transition-all cursor-pointer hover:scale-[1.02] ${getPlanBorder(plan.id, isSelected, isCurrent)} ${isCurrent ? 'cursor-default' : ''}`}
                                    >
                                        {/* Popular badge */}
                                        {isPro && !isCurrent && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                                Популярный
                                            </div>
                                        )}

                                        {/* Current badge */}
                                        {isCurrent && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Текущий
                                            </div>
                                        )}

                                        {/* Plan header */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-lg bg-gradient-to-br ${getPlanColor(plan.id)} text-white`}>
                                                {getPlanIcon(plan.id)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                                                <p className="text-xs text-slate-400">
                                                    {plan.durationDays ? `${plan.durationDays} дней` : 'Бессрочно'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="mb-4">
                                            {(plan.priceRub || 0) > 0 ? (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-3xl font-bold text-white">{plan.priceRub}</span>
                                                        <span className="text-slate-400">₽/мес</span>
                                                    </div>
                                                    {plan.priceStars ? (
                                                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                                                            <Star className="w-3.5 h-3.5" />
                                                            {plan.priceStars} Stars
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-500">
                                                            Stars-цена будет доступна после настройки
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-3xl font-bold text-white">Бесплатно</div>
                                            )}
                                        </div>

                                        {/* Limits */}
                                        <div className="space-y-2 mb-4 pb-4 border-b border-white/10">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-400">Генераций/день</span>
                                                <span className="font-bold text-white">
                                                    {plan.maxGenerationsPerDay === 0 ? <Infinity className="w-4 h-4" /> : plan.maxGenerationsPerDay}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-400">Генераций/месяц</span>
                                                <span className="font-bold text-white">
                                                    {plan.maxGenerationsPerMonth === 0 ? <Infinity className="w-4 h-4" /> : plan.maxGenerationsPerMonth}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-400">Макс. символов</span>
                                                <span className="font-bold text-white">{plan.maxChars?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-400">Ключевых слов</span>
                                                <span className="font-bold text-white">
                                                    {plan.maxKeywords === 0 ? <Infinity className="w-4 h-4" /> : plan.maxKeywords}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <div className="space-y-2">
                                            {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                                                const enabled = plan[key as keyof SubscriptionPlan];
                                                return (
                                                    <div 
                                                        key={key}
                                                        className={`flex items-center gap-2 text-sm ${enabled ? 'text-white' : 'text-slate-500'}`}
                                                    >
                                                        <div className={`p-1 rounded ${enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-slate-500'}`}>
                                                            {enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                        </div>
                                                        <span>{label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Models count */}
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Shield className="w-4 h-4" />
                                                <span>{plan.allowedModels?.length || 0} AI моделей</span>
                                            </div>
                                        </div>

                                        {/* Selection indicator */}
                                        {isSelected && !isCurrent && (
                                            <div className="absolute inset-0 rounded-xl ring-2 ring-purple-500 pointer-events-none" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-white/10 bg-white/5 px-4 py-4 sm:px-5 md:px-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-1 lg:max-w-xl">
                            <p className="text-xs text-slate-400 sm:text-sm">
                            Вы можете оплатить подписку через Telegram Stars или открыть личные сообщения в Telegram для ручной оплаты.
                            </p>
                            {purchaseError && (
                                <p className="text-xs text-red-300">
                                    {purchaseError}
                                </p>
                            )}
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto">
                            <button
                                onClick={onClose}
                                className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:text-white sm:w-auto"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleTelegramPurchase}
                                disabled={!canPurchaseViaTelegram || purchaseLoading}
                                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:w-auto ${
                                    canPurchaseViaTelegram && !purchaseLoading
                                        ? 'border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                                        : 'cursor-not-allowed bg-slate-700 text-slate-400'
                                }`}
                            >
                                <ExternalLink className="h-4 w-4" />
                                Оплатить в Telegram
                            </button>
                            <button
                                onClick={handlePurchase}
                                disabled={!canPurchaseWithStars || purchaseLoading}
                                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:w-auto ${
                                    canPurchaseWithStars && !purchaseLoading
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:from-purple-400 hover:to-pink-400'
                                        : 'cursor-not-allowed bg-slate-700 text-slate-400'
                                }`}
                            >
                                <ExternalLink className="h-4 w-4" />
                                {purchaseLoading ? 'Открываем счет...' : 'Оплатить в Stars'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
