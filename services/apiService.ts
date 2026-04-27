import {
    User,
    SubscriptionPlan,
    Project,
    ProjectSite,
    ProjectSiteImportResult,
    HistoryItem,
    GenerationConfig,
    SeoResult,
    SerpAnalysisResult,
    MonitoredPage,
    MonitoringEvent,
    MonitoringFrequency,
    Competitor,
    CompetitorComparison,
    CompetitorPageChange,
    CompetitorPriority,
    CompetitorWeeklySummary
} from '../types';

// Безопасно читаем переменные окружения Vite через any-каст,
// чтобы не ломать типы в TypeScript и не требовать глобальных переменных.
const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : {}) || {};
const API_URL: string = env.VITE_API_URL || '/api';

const toFiniteNumber = (value: unknown, fallback: number): number => {
    if (value === null || value === undefined || value === '') return fallback;

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeKeywords = (keywords: { keyword: string; frequency: number }[]) =>
    keywords
        .map((keyword) => ({
            keyword: String(keyword?.keyword ?? '').trim(),
            frequency: toFiniteNumber(keyword?.frequency, 1)
        }))
        .filter((keyword) => keyword.keyword.length > 0);

const normalizeGenerationConfig = (config: GenerationConfig): GenerationConfig => ({
    ...config,
    minChars: toFiniteNumber(config.minChars, 2500),
    maxChars: toFiniteNumber(config.maxChars, 5000),
    minParas: toFiniteNumber(config.minParas, 3),
    maxParas: toFiniteNumber(config.maxParas, 12)
});

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
            const details = Array.isArray(error.details) && error.details.length > 0
                ? `: ${error.details.map((item: any) => `${item.field} - ${item.message}`).join('; ')}`
                : '';
            const requestError = new Error(`${error.error || `HTTP ${response.status}`}${details}`) as Error & {
                code?: string;
                hint?: string;
                raw?: unknown;
            };

            if (typeof error.code === 'string') {
                requestError.code = error.code;
            }

            if (typeof error.hint === 'string') {
                requestError.hint = error.hint;
            }

            requestError.raw = error;
            throw requestError;
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

    // Project Site ("Мы")
    async getProjectSite(projectId: string): Promise<{ site: ProjectSite | null }> {
        return this.request(`/project-site/projects/${projectId}/site`);
    }

    async createProjectSite(projectId: string, data: { homepageUrl: string; name?: string; scanFrequency: MonitoringFrequency }): Promise<{ site: ProjectSite }> {
        return this.request(`/project-site/projects/${projectId}/site`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateProjectSite(siteId: string, data: { homepageUrl?: string; name?: string; scanFrequency?: MonitoringFrequency; isActive?: boolean }): Promise<{ site: ProjectSite }> {
        return this.request(`/project-site/site/${siteId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteProjectSite(siteId: string): Promise<{ success: boolean }> {
        return this.request(`/project-site/site/${siteId}`, {
            method: 'DELETE'
        });
    }

    async scanProjectSite(siteId: string): Promise<{ site: ProjectSite }> {
        return this.request(`/project-site/site/${siteId}/scan`, {
            method: 'POST'
        });
    }

    async importProjectSiteLinks(siteId: string): Promise<{ site: ProjectSite | null; result: ProjectSiteImportResult }> {
        return this.request(`/project-site/site/${siteId}/import-links`, {
            method: 'POST'
        });
    }

    // SEO Monitoring
    async getMonitoringPages(projectId: string): Promise<{ pages: MonitoredPage[] }> {
        return this.request(`/monitoring/projects/${projectId}/pages`);
    }

    async createMonitoringPage(projectId: string, data: { url: string; label?: string; frequency: MonitoringFrequency }): Promise<{ page: MonitoredPage }> {
        return this.request(`/monitoring/projects/${projectId}/pages`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateMonitoringPage(pageId: string, data: { label?: string; frequency?: MonitoringFrequency; isActive?: boolean }): Promise<{ page: MonitoredPage }> {
        return this.request(`/monitoring/pages/${pageId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteMonitoringPage(pageId: string): Promise<{ success: boolean }> {
        return this.request(`/monitoring/pages/${pageId}`, {
            method: 'DELETE'
        });
    }

    async runMonitoringCheck(pageId: string): Promise<{ page: MonitoredPage; event?: MonitoringEvent | null }> {
        return this.request(`/monitoring/pages/${pageId}/check`, {
            method: 'POST'
        });
    }

    async getMonitoringEvents(pageId: string, limit: number = 20): Promise<{ events: MonitoringEvent[] }> {
        return this.request(`/monitoring/pages/${pageId}/events?limit=${limit}`);
    }

    // Competitor Watcher
    async getCompetitors(projectId: string): Promise<{ competitors: Competitor[] }> {
        return this.request(`/competitors/projects/${projectId}/competitors`);
    }

    async createCompetitor(projectId: string, data: { homepageUrl: string; name?: string; priority: CompetitorPriority; scanFrequency: MonitoringFrequency; notes?: string }): Promise<{ competitor: Competitor }> {
        return this.request(`/competitors/projects/${projectId}/competitors`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateCompetitor(competitorId: string, data: { homepageUrl?: string; name?: string; priority?: CompetitorPriority; scanFrequency?: MonitoringFrequency; notes?: string; isActive?: boolean }): Promise<{ competitor: Competitor }> {
        return this.request(`/competitors/${competitorId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteCompetitor(competitorId: string): Promise<{ success: boolean }> {
        return this.request(`/competitors/${competitorId}`, {
            method: 'DELETE'
        });
    }

    async scanCompetitor(competitorId: string): Promise<{ competitor: Competitor; changes: CompetitorPageChange[]; weeklySummary: CompetitorWeeklySummary }> {
        return this.request(`/competitors/${competitorId}/scan`, {
            method: 'POST'
        });
    }

    async getCompetitorChanges(competitorId: string, limit: number = 20): Promise<{ changes: CompetitorPageChange[] }> {
        return this.request(`/competitors/${competitorId}/changes?limit=${limit}`);
    }

    async getCompetitorComparison(competitorId: string): Promise<{ comparisons: CompetitorComparison[] }> {
        return this.request(`/competitors/${competitorId}/comparison`);
    }

    async getCompetitorWeeklySummary(competitorId: string, days: number = 7): Promise<{ summary: CompetitorWeeklySummary }> {
        return this.request(`/competitors/${competitorId}/summary?days=${days}`);
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

    async createStarsInvoice(planId: string): Promise<{
        ok: boolean;
        invoiceLink: string;
        starsAmount: number;
        currency: 'XTR';
        plan: {
            id: string;
            name: string;
            durationDays: number;
        };
    }> {
        return this.request('/payments/stars/create', {
            method: 'POST',
            body: JSON.stringify({ planId })
        });
    }

    // Settings
    async getSettings(): Promise<{ settings: { systemPrompt: string; seoPrompt: string; aioPrompt: string; telegramLink: string; spamCheckModel: string } }> {
        return this.request('/settings');
    }

    async updateSettings(settings: { openRouterApiKey?: string; systemPrompt?: string; seoPrompt?: string; aioPrompt?: string; telegramLink?: string; spamCheckModel?: string }): Promise<{ settings: { seoPrompt: string; aioPrompt: string; telegramLink: string; spamCheckModel: string } }> {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    // Generation
    async generate(config: GenerationConfig, keywords: { keyword: string; frequency: number }[]): Promise<{ result: SeoResult; user: User }> {
        const normalizedConfig = normalizeGenerationConfig(config);
        const normalizedKeywords = normalizeKeywords(keywords);

        return this.request('/generate', {
            method: 'POST',
            body: JSON.stringify({ config: normalizedConfig, keywords: normalizedKeywords })
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

    async humanize(
        content: string,
        language: string,
        intensity: 'light' | 'medium' | 'strong',
        model: string
    ): Promise<{ content: string; intensity: string; user: User }> {
        return this.request('/generate/humanize', {
            method: 'POST',
            body: JSON.stringify({ content, language, intensity, model })
        });
    }

    async serpAnalyze(
        query: string,
        searchEngine: 'google' | 'yandex' = 'google',
        region: string = 'ru',
        count: number = 10
    ): Promise<SerpAnalysisResult> {
        return this.request('/generate/serp-analyze', {
            method: 'POST',
            body: JSON.stringify({ query, searchEngine, region, count })
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

    // Rewrite/Paraphrase
    async rewrite(params: {
        sourceUrl?: string;
        sourceText?: string;
        targetLanguage?: string;
        tone?: string;
        style?: string;
        preserveStructure?: boolean;
        model?: string;
    }): Promise<{
        original: {
            text: string;
            length: number;
            words: number;
        };
        rewritten: {
            text: string;
            length: number;
            words: number;
        };
        sourceUrl: string | null;
        user: User;
    }> {
        return this.request('/generate/rewrite', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }

    // Social Media Pack
    async generateSocialPack(params: {
        content: string;
        topic?: string;
    }): Promise<{
        pack: {
            twitter: string[];
            telegram: string;
            linkedin: string;
            videoScript: string;
        };
        user: User | null;
    }> {
        return this.request('/generate/social-pack', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }

    // Knowledge Base
    async getKnowledgeBase(): Promise<{ files: Array<{ id: string; fileName: string; fileType: string; fileSize: number; createdAt: string }> }> {
        return this.request('/knowledge-base');
    }

    async uploadKnowledgeBaseFile(file: File): Promise<{ id: string; fileName: string; fileType: string; fileSize: number; createdAt: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const headers: HeadersInit = {
            'X-Telegram-Init-Data': this.initData,
        };

        const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : {}) || {};
        if (env.DEV && this.devTelegramId) {
            (headers as any)['X-Dev-Telegram-Id'] = String(this.devTelegramId);
        }

        const response = await fetch(`${API_URL}/knowledge-base/upload`, {
            method: 'POST',
            headers,
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    async deleteKnowledgeBaseFile(id: string): Promise<void> {
        return this.request(`/knowledge-base/${id}`, { method: 'DELETE' });
    }

    // Internal Links
    async getInternalLinks(): Promise<{ links: Array<{ id: string; url: string; anchorText?: string; keywords: string[]; priority: number; createdAt?: string }> }> {
        return this.request('/internal-links');
    }

    async addInternalLink(link: { url: string; anchorText?: string; keywords: string[]; priority: number }): Promise<{ link: { id: string; url: string; anchorText?: string; keywords: string[]; priority: number } }> {
        return this.request('/internal-links', {
            method: 'POST',
            body: JSON.stringify(link)
        });
    }

    async deleteInternalLink(id: string): Promise<void> {
        return this.request(`/internal-links/${id}`, { method: 'DELETE' });
    }

    async deleteAllInternalLinks(): Promise<void> {
        return this.request('/internal-links', { method: 'DELETE' });
    }

    // Background Tasks
    async getTasks(): Promise<{ tasks: Array<{ id: string; type: string; status: string; error?: string; createdAt: string; hasResult: boolean }> }> {
        return this.request('/tasks');
    }

    async deleteTask(id: string): Promise<void> {
        return this.request(`/tasks/${id}`, { method: 'DELETE' });
    }

    async getTaskNotificationSettings(): Promise<{ notificationsEnabled: boolean }> {
        return this.request('/tasks/settings/notifications');
    }

    async updateTaskNotificationSettings(enabled: boolean): Promise<void> {
        return this.request('/tasks/settings/notifications', {
            method: 'PUT',
            body: JSON.stringify({ enabled })
        });
    }
}

export const apiService = new ApiService();
