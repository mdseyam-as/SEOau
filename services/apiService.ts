import { User, SubscriptionPlan, Project, HistoryItem, GenerationConfig, SeoResult } from '../types';

// Безопасно читаем переменные окружения Vite через any-каст,
// чтобы не ломать типы в TypeScript и не требовать глобальных переменных.
const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : {}) || {};
const API_URL: string = env.VITE_API_URL || '/api';

class ApiService {
    private initData: string = '';
    // Dev-only Telegram ID used when running outside Telegram WebApp
    private devTelegramId: number | null = null;

    setInitData(initData: string) {
        this.initData = initData;
    }

    // Used in dev-mode to send X-Dev-Telegram-Id header
    setDevTelegramId(id: number | null) {
        this.devTelegramId = id;
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': this.initData,
            ...options.headers
        };

        // In Vite dev-mode we can bypass Telegram auth via X-Dev-Telegram-Id
        const isDev = !!env.DEV;

        if (isDev && this.devTelegramId) {
            (headers as any)['X-Dev-Telegram-Id'] = String(this.devTelegramId);
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Auth
    async login(): Promise<{ user: User }> {
        return this.request('/auth/login', { method: 'POST' });
    }

    async getMe(): Promise<{ user: User }> {
        return this.request('/auth/me');
    }

    // Users
    async getAllUsers(): Promise<{ users: User[] }> {
        return this.request('/users');
    }

    async createUser(data: Partial<User>): Promise<{ user: User }> {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getUser(telegramId: number): Promise<{ user: User }> {
        return this.request(`/users/${telegramId}`);
    }

    async updateUser(telegramId: number, data: Partial<User>): Promise<{ user: User }> {
        return this.request(`/users/${telegramId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async incrementUsage(telegramId: number): Promise<{ user: User }> {
        return this.request(`/users/${telegramId}/increment-usage`, {
            method: 'POST'
        });
    }

    async checkLimits(telegramId: number): Promise<{ allowed: boolean; reason?: string }> {
        return this.request(`/users/${telegramId}/check-limits`, {
            method: 'POST'
        });
    }

    // Projects
    async getProjects(): Promise<{ projects: Project[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
        return this.request('/projects');
    }

    async createProject(name: string, description?: string): Promise<{ project: Project }> {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
    }

    async deleteProject(projectId: string): Promise<{ success: boolean }> {
        return this.request(`/projects/${projectId}`, {
            method: 'DELETE'
        });
    }

    // History
    async getHistory(projectId: string): Promise<{ history: HistoryItem[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
        return this.request(`/history/${projectId}`);
    }

    async addToHistory(projectId: string, config: GenerationConfig, result: SeoResult): Promise<{ historyItem: HistoryItem }> {
        return this.request('/history', {
            method: 'POST',
            body: JSON.stringify({ projectId, config, result })
        });
    }

    async deleteHistoryItem(itemId: string): Promise<{ success: boolean }> {
        return this.request(`/history/${itemId}`, {
            method: 'DELETE'
        });
    }

    // Plans
    async getPlans(): Promise<{ plans: SubscriptionPlan[] }> {
        return this.request('/plans');
    }

    async getPlan(planId: string): Promise<{ plan: SubscriptionPlan }> {
        return this.request(`/plans/${planId}`);
    }

    // Admin only
    async createPlan(plan: SubscriptionPlan): Promise<{ plan: SubscriptionPlan }> {
        return this.request('/plans', {
            method: 'POST',
            body: JSON.stringify(plan)
        });
    }

    async updatePlan(planId: string, data: Partial<SubscriptionPlan>): Promise<{ plan: SubscriptionPlan }> {
        return this.request(`/plans/${planId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deletePlan(planId: string): Promise<{ success: boolean }> {
        return this.request(`/plans/${planId}`, {
            method: 'DELETE'
        });
    }

    // Settings
    async getSettings(): Promise<{ settings: { openRouterApiKey: string; systemPrompt: string; seoPrompt: string; geoPrompt: string; telegramLink: string; spamCheckModel: string } }> {
        return this.request('/settings');
    }

    async updateSettings(settings: { openRouterApiKey?: string; systemPrompt?: string; seoPrompt?: string; geoPrompt?: string; telegramLink?: string; spamCheckModel?: string }): Promise<{ settings: { openRouterApiKey: string; systemPrompt: string; seoPrompt: string; geoPrompt: string; telegramLink: string; spamCheckModel: string } }> {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    // Generation
    async generate(config: GenerationConfig, keywords: { keyword: string; frequency: number }[]): Promise<{ result: SeoResult; user: User }> {
        return this.request('/generate', {
            method: 'POST',
            body: JSON.stringify({ config, keywords })
        });
    }

    async checkSpam(content: string): Promise<{ spamScore: number; spamAnalysis: string }> {
        return this.request('/generate/spam-check', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    async fixSpam(content: string, analysis: string, model: string): Promise<{ content: string; user: User }> {
        return this.request('/generate/fix-spam', {
            method: 'POST',
            body: JSON.stringify({ content, analysis, model })
        });
    }

    async optimizeRelevance(content: string, missingKeywords: string[], config: GenerationConfig): Promise<{ content: string; user: User }> {
        return this.request('/generate/optimize', {
            method: 'POST',
            body: JSON.stringify({ content, missingKeywords, config })
        });
    }

    async seoAudit(url: string, model?: string): Promise<{
        url: string;
        extracted: {
            title: string;
            titleLength: number;
            metaDescription: string;
            metaDescriptionLength: number;
            h1: string[];
            h2: string[];
            h3: string[];
            images: { total: number; withoutAlt: number };
            links: { internal: number; external: number; nofollow: number };
            canonical: string;
            robots: string;
            ogTags: Record<string, string>;
            schemaOrg: boolean;
            viewport: boolean;
            contentLength: number;
        };
        analysis: {
            score: number;
            summary: string;
            issues: Array<{
                severity: 'critical' | 'warning' | 'info';
                category: string;
                title: string;
                description: string;
                recommendation: string;
            }>;
            positives: string[];
        };
        user: User;
    }> {
        return this.request('/generate/seo-audit', {
            method: 'POST',
            body: JSON.stringify({ url, model })
        });
    }

    // FAQ Generation
    async generateFaq(params: {
        topic?: string;
        content?: string;
        language?: string;
        count?: number;
    }): Promise<{
        faq: Array<{ question: string; answer: string }>;
        schema: object;
        schemaHtml: string;
    }> {
        return this.request('/generate/faq', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }
}

export const apiService = new ApiService();
