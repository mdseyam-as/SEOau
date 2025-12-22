import React, { useState } from 'react';
import { 
    Share2, Twitter, Send, Linkedin, Video, 
    Copy, Check, Sparkles, ChevronDown, ChevronUp,
    MessageSquare, Hash, Lock
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { User, SubscriptionPlan } from '../types';

interface SocialMediaPackProps {
    content: string;
    topic: string;
    userPlan?: SubscriptionPlan | null;
    onUserUpdate?: (user: User) => void;
}

interface SocialPack {
    twitter: string[];      // 5 tweets thread
    telegram: string;       // Telegram post
    linkedin: string;       // LinkedIn post
    videoScript: string;    // YouTube Shorts / TikTok script
}

type Platform = 'twitter' | 'telegram' | 'linkedin' | 'videoScript';

const PLATFORM_CONFIG: Record<Platform, { 
    icon: React.ReactNode; 
    label: string; 
    color: string;
    bgColor: string;
    description: string;
}> = {
    twitter: {
        icon: <Twitter className="w-5 h-5" />,
        label: 'Twitter/X Thread',
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/10 border-sky-500/20',
        description: '5 твитов для треда'
    },
    telegram: {
        icon: <Send className="w-5 h-5" />,
        label: 'Telegram',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10 border-blue-500/20',
        description: 'Пост для канала'
    },
    linkedin: {
        icon: <Linkedin className="w-5 h-5" />,
        label: 'LinkedIn',
        color: 'text-blue-500',
        bgColor: 'bg-blue-600/10 border-blue-600/20',
        description: 'Деловой пост'
    },
    videoScript: {
        icon: <Video className="w-5 h-5" />,
        label: 'Shorts / TikTok',
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 border-pink-500/20',
        description: 'Сценарий на 60 сек'
    }
};

export const SocialMediaPack: React.FC<SocialMediaPackProps> = ({
    content,
    topic,
    userPlan,
    onUserUpdate
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [socialPack, setSocialPack] = useState<SocialPack | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>('twitter');
    const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

    const canUseSocialPack = userPlan?.canUseSocialPack;

    const handleGenerate = async () => {
        if (!canUseSocialPack) return;
        
        if (!content || content.length < 100) {
            setError('Контент слишком короткий для репакинга');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const result = await apiService.generateSocialPack({
                content,
                topic
            });

            setSocialPack(result.pack);
            if (result.user && onUserUpdate) {
                onUserUpdate(result.user);
            }
        } catch (err: any) {
            setError(err.message || 'Ошибка генерации');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = (platform: Platform) => {
        if (!socialPack) return;

        let textToCopy = '';
        if (platform === 'twitter') {
            textToCopy = socialPack.twitter.map((t, i) => `${i + 1}/ ${t}`).join('\n\n');
        } else {
            textToCopy = socialPack[platform];
        }

        navigator.clipboard.writeText(textToCopy);
        setCopiedPlatform(platform);
        setTimeout(() => setCopiedPlatform(null), 2000);
    };

    const togglePlatform = (platform: Platform) => {
        setExpandedPlatform(expandedPlatform === platform ? null : platform);
    };

    return (
        <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl relative">
            {/* Locked overlay */}
            {!canUseSocialPack && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center z-10">
                    <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-300 font-medium">Social Media Pack</p>
                        <p className="text-slate-500 text-sm">Доступно в Pro тарифе</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm sm:text-base lg:text-lg text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-purple-400" />
                    Social Media Pack
                </h3>
                {!socialPack && (
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !content}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            isGenerating
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg hover:shadow-purple-500/25'
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
                                Превратить в посты
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Description */}
            {!socialPack && !isGenerating && (
                <p className="text-slate-400 text-sm mb-4">
                    Превратите статью в готовые посты для соцсетей: Twitter тред, Telegram пост, LinkedIn и сценарий для Shorts/TikTok
                </p>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Loading skeleton */}
            {isGenerating && (
                <div className="space-y-3">
                    {(['twitter', 'telegram', 'linkedin', 'videoScript'] as Platform[]).map((platform) => (
                        <div key={platform} className="bg-white/5 rounded-xl p-4 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-lg" />
                                <div className="flex-1">
                                    <div className="h-4 bg-white/10 rounded w-32 mb-2" />
                                    <div className="h-3 bg-white/5 rounded w-24" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Results */}
            {socialPack && (
                <div className="space-y-3">
                    {(['twitter', 'telegram', 'linkedin', 'videoScript'] as Platform[]).map((platform) => {
                        const config = PLATFORM_CONFIG[platform];
                        const isExpanded = expandedPlatform === platform;
                        const isCopied = copiedPlatform === platform;

                        return (
                            <div
                                key={platform}
                                className={`border rounded-xl overflow-hidden transition-all ${config.bgColor}`}
                            >
                                {/* Platform header */}
                                <button
                                    onClick={() => togglePlatform(platform)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-white/10 ${config.color}`}>
                                            {config.icon}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-white text-sm">{config.label}</p>
                                            <p className="text-xs text-slate-400">{config.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(platform);
                                            }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isCopied
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                            }`}
                                        >
                                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            {isCopied ? 'Скопировано' : 'Копировать'}
                                        </button>
                                        {isExpanded ? (
                                            <ChevronUp className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                </button>

                                {/* Content */}
                                <div className={`overflow-hidden transition-all duration-300 ${
                                    isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                                }`}>
                                    <div className="p-4 pt-0 border-t border-white/10">
                                        {platform === 'twitter' ? (
                                            <TwitterThread tweets={socialPack.twitter} />
                                        ) : (
                                            <div className="bg-slate-900/50 rounded-lg p-4">
                                                <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                                                    {socialPack[platform]}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Regenerate button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Сгенерировать заново
                    </button>
                </div>
            )}
        </div>
    );
};

// Twitter Thread Component
const TwitterThread: React.FC<{ tweets: string[] }> = ({ tweets }) => {
    return (
        <div className="space-y-3">
            {tweets.map((tweet, index) => (
                <div key={index} className="bg-slate-900/50 rounded-lg p-4 relative">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-sky-500/20 text-sky-400 rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-200 leading-relaxed">{tweet}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    {tweet.length}/280
                                </span>
                                {index < tweets.length - 1 && (
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        Тред
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {index < tweets.length - 1 && (
                        <div className="absolute left-[1.35rem] top-12 bottom-0 w-0.5 bg-sky-500/20" />
                    )}
                </div>
            ))}
        </div>
    );
};

export default SocialMediaPack;
