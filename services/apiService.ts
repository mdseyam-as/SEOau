import { User, SubscriptionPlan, Project, HistoryItem, GenerationConfig, SeoResult } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
    private initData: string = '';

    setInitData(initData: string) {
        this.initData = initData;
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': this.initData,
            ...options.headers
        };

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
    async getProjects(): Promise<{ projects: Project[] }> {
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
    async getHistory(projectId: string): Promise<{ history: HistoryItem[] }> {
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
}

export const apiService = new ApiService();
