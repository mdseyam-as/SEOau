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
    onPurchaseComplete?: () => Promise<void> | void;
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
    canCheckSpam: <AlertOctagon className="w-4 h-4" />,
    canOptimizeRelevance: <Zap className="w-4 h-4" />,
    canUseGeoMode: <Globe className="w-4 h-4" />,
    canGenerateFaq: <MessageCircleQuestion className="w-4 h-4" />,
    canUseSocialPack: <Share2 className="w-4 h-4" />,
};

const FEATURE_LABELS: Record<string, string> = {
    canCheckSpam: 'Проверка переспама',
    canOptimizeRelevance: 'Оптимизация релевантности',
    canUseGeoMode: 'GEO режим (AI-поисковики)',
    canGenerateFaq: 'Генерация FAQ',
    canUseSocialPack: 'Social Media Pack',
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
    isOpen,
    onClose,
    currentPlanId,
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

    const selectedPlanData = plans.find((plan) => plan.id === selectedPlan);
    const canPurchaseWithStars = !!selectedPlanData?.priceStars && selectedPlan !== currentPlanId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/10 animate-in zoom-in-95 fade-in duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-5 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Crown className="w-6 h-6 text-amber-400" />
                                Выберите тариф
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">
                                Разблокируйте все возможности SEO Generator
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-slate-400">
                            Оплата проходит внутри Telegram Stars. Активация подписки происходит автоматически.
                        </p>
                        {purchaseError && (
                            <p className="text-xs text-red-300">
                                {purchaseError}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handlePurchase}
                            disabled={!canPurchaseWithStars || purchaseLoading}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                canPurchaseWithStars && !purchaseLoading
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400 shadow-lg'
                                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <ExternalLink className="w-4 h-4" />
                            {purchaseLoading ? 'Открываем счет...' : 'Оплатить в Stars'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
