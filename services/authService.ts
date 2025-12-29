

import { AIModel, ModelConfig } from '../types';

export interface SubscriptionPlan {
  id: string;
  name: string;
  maxChars: number;
  allowedModels: string[]; // List of AIModel values
  isDefault?: boolean;
  maxGenerationsPerMonth?: number; // null or 0 means unlimited
  maxGenerationsPerDay?: number; // null or 0 means unlimited
  maxKeywords?: number; // Limit rows from Excel. null or 0 means unlimited
  canCheckSpam?: boolean; // Ability to check and fix spam using Grok
  canOptimizeRelevance?: boolean; // Ability to use "Increase Relevance" feature
  canUseGeoMode?: boolean; // Ability to use GEO mode
  canGenerateFaq?: boolean; // Ability to generate FAQ with JSON-LD schema
  canUseSocialPack?: boolean; // Ability to use Social Media Pack
  canAudit?: boolean; // Ability to use SEO Audit
  canRewrite?: boolean; // Ability to use Rewrite/Paraphrase
  canHumanize?: boolean; // Ability to use AI Humanizer
  priceRub?: number; // Price in rubles
  durationDays?: number; // Subscription duration in days
}

export interface User {
  telegramId: number;
  username?: string;
  firstName: string;
  role: 'user' | 'admin';
  subscriptionExpiry?: string | null; // ISO Date string
  planId?: string; // ID of the assigned SubscriptionPlan

  // Usage Tracking
  generationsUsed?: number; // Monthly accumulator
  lastGenerationMonth?: string; // Format: "YYYY-MM"

  generationsUsedToday?: number; // Daily accumulator
  lastGenerationDate?: string; // Format: "YYYY-MM-DD"
}

export interface GlobalSettings {
  telegramLink: string;
  // NOTE: openRouterApiKey is NOT stored on frontend for security
  // All API calls go through backend which has the key
  systemPrompt?: string; // Legacy - kept for backward compatibility
  seoPrompt?: string;
  geoPrompt?: string;
  spamCheckModel?: string;
}

// ADD YOUR TELEGRAM ID HERE TO BECOME ADMIN
const ADMIN_IDS: number[] = [
  691131427,
];

const USERS_STORAGE_KEY = 'seo_gen_users_tg';
const SETTINGS_STORAGE_KEY = 'seo_gen_settings';
const PLANS_STORAGE_KEY = 'seo_gen_plans';
const MODELS_STORAGE_KEY = 'seo_gen_models';

// Initialize default models from the Enum for backward compatibility
const DEFAULT_MODELS_LIST: ModelConfig[] = [
  { id: AIModel.GEMINI_3_PRO_PREVIEW, name: 'Google Gemini 3 Pro Preview', provider: 'Google' },
  { id: AIModel.GEMINI_3_FLASH, name: 'Google Gemini 3 Flash', provider: 'Google' },
  { id: AIModel.GEMINI_2_0_PRO_EXP, name: 'Google Gemini 2.0 Pro Exp', provider: 'Google' },
  { id: AIModel.GEMINI_1_5_PRO, name: 'Google Gemini 1.5 Pro', provider: 'Google' },

  { id: AIModel.CLAUDE_3_5_SONNET, name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: AIModel.CLAUDE_SONNET_4_5, name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
  { id: AIModel.CLAUDE_3_5_HAIKU, name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { id: AIModel.CLAUDE_3_OPUS, name: 'Claude 3 Opus', provider: 'Anthropic' },

  { id: AIModel.GPT_4O, name: 'GPT-4o', provider: 'OpenAI' },
  { id: AIModel.GPT_4O_MINI, name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: AIModel.GPT_O1_MINI, name: 'o1 Mini', provider: 'OpenAI' },

  { id: AIModel.GROK_4_FAST, name: 'Grok 4 Fast', provider: 'xAI (Grok)' },
  { id: AIModel.GROK_4_1_FAST, name: 'Grok 4.1 Fast', provider: 'xAI (Grok)' },
  { id: AIModel.GROK_4_1_FAST_FREE, name: 'Grok 4.1 Fast (Free)', provider: 'xAI (Grok)' },
  { id: AIModel.GROK_2_1212, name: 'Grok 2 (1212)', provider: 'xAI (Grok)' },

  { id: AIModel.QWEN_MAX, name: 'Qwen Max', provider: 'Qwen' },
  { id: AIModel.QWEN_PLUS, name: 'Qwen Plus', provider: 'Qwen' },

  { id: AIModel.DEEPSEEK_R1, name: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: AIModel.DEEPSEEK_V3, name: 'DeepSeek V3', provider: 'DeepSeek' },
];

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    maxChars: 2500,
    allowedModels: [AIModel.GROK_4_1_FAST_FREE],
    isDefault: true,
    maxGenerationsPerMonth: 10,
    maxGenerationsPerDay: 1,
    maxKeywords: 30,
    canCheckSpam: false,
    canOptimizeRelevance: false
  },
  {
    id: 'basic',
    name: 'Базовый',
    maxChars: 3500,
    allowedModels: [AIModel.GEMINI_3_FLASH, AIModel.GPT_4O_MINI, AIModel.GROK_4_1_FAST_FREE],
    isDefault: false,
    maxGenerationsPerMonth: 50,
    maxGenerationsPerDay: 5,
    maxKeywords: 200,
    canCheckSpam: true,
    canOptimizeRelevance: false
  },
  {
    id: 'pro',
    name: 'PRO',
    maxChars: 8000,
    allowedModels: [
      AIModel.GEMINI_3_FLASH, AIModel.GEMINI_2_0_PRO_EXP, AIModel.GEMINI_3_PRO_PREVIEW,
      AIModel.GPT_4O_MINI, AIModel.GPT_4O,
      AIModel.CLAUDE_3_5_SONNET, AIModel.CLAUDE_3_5_HAIKU
    ],
    maxGenerationsPerMonth: 200,
    maxGenerationsPerDay: 20,
    maxKeywords: 1000,
    canCheckSpam: true,
    canOptimizeRelevance: true
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    maxChars: 20000,
    allowedModels: DEFAULT_MODELS_LIST.map(m => m.id),
    maxGenerationsPerMonth: 0, // Unlimited
    maxGenerationsPerDay: 0, // Unlimited
    maxKeywords: 0, // Unlimited
    canCheckSpam: true,
    canOptimizeRelevance: true
  }
];

// In-memory cache for global settings loaded from backend
let cachedGlobalSettings: GlobalSettings = {
  telegramLink: 'https://t.me/bankkz_admin',
  // API key is NOT stored on frontend
  systemPrompt: '', // Legacy
  seoPrompt: '',
  geoPrompt: '',
  spamCheckModel: 'x-ai/grok-4.1-fast'
};

export const authService = {
  // --- Settings ---

  // Load settings from backend (should be called on app initialization)
  loadGlobalSettings: async (): Promise<GlobalSettings> => {
    try {
      // Import apiService dynamically to avoid circular dependency
      const { apiService } = await import('./apiService');
      const { settings } = await apiService.getSettings();
      cachedGlobalSettings = settings;
      return settings;
    } catch (e) {
      console.error('Failed to load global settings from backend:', e);
      return cachedGlobalSettings; // Return cached/default values
    }
  },

  getGlobalSettings: (): GlobalSettings => {
    return cachedGlobalSettings;
  },

  saveGlobalSettings: async (settings: GlobalSettings): Promise<void> => {
    try {
      // Import apiService dynamically to avoid circular dependency
      const { apiService } = await import('./apiService');
      const { settings: updatedSettings } = await apiService.updateSettings(settings);
      cachedGlobalSettings = updatedSettings;
    } catch (e) {
      console.error('Failed to save global settings:', e);
      throw e;
    }
  },

  // --- Model Management ---
  getModels: (): ModelConfig[] => {
    const stored = localStorage.getItem(MODELS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initial Load
    localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(DEFAULT_MODELS_LIST));
    return DEFAULT_MODELS_LIST;
  },

  saveModels: (models: ModelConfig[]) => {
    localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(models));
  },

  addModel: (model: ModelConfig) => {
    const models = authService.getModels();
    models.push(model);
    authService.saveModels(models);
  },

  updateModel: (updatedModel: ModelConfig) => {
    const models = authService.getModels();
    const index = models.findIndex(m => m.id === updatedModel.id); // Using ID as key, implies we can't change ID easily without delete/add
    if (index !== -1) {
      models[index] = updatedModel;
      authService.saveModels(models);
    }
  },

  deleteModel: (modelId: string) => {
    let models = authService.getModels();
    models = models.filter(m => m.id !== modelId);
    authService.saveModels(models);
  },

  // --- Plan Management ---
  getPlans: (): SubscriptionPlan[] => {
    let plans: SubscriptionPlan[] = [];
    const stored = localStorage.getItem(PLANS_STORAGE_KEY);

    if (stored) {
      plans = JSON.parse(stored);
    } else {
      plans = [...DEFAULT_PLANS];
    }

    // Ensure 'free' plan exists (migration for existing data)
    if (!plans.find(p => p.id === 'free')) {
      const freePlan = DEFAULT_PLANS.find(p => p.id === 'free');
      if (freePlan) {
        // Remove old default flags
        plans.forEach(p => p.isDefault = false);
        // Add free plan as default
        plans.unshift(freePlan);
        localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
      }
    }

    return plans;
  },

  savePlans: (plans: SubscriptionPlan[]) => {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
  },

  getPlanById: (planId?: string): SubscriptionPlan => {
    const plans = authService.getPlans();
    return plans.find(p => p.id === planId) || plans.find(p => p.isDefault) || plans[0];
  },

  // --- User Management ---

  getUsers: (): User[] => {
    const users = localStorage.getItem(USERS_STORAGE_KEY);
    return users ? JSON.parse(users) : [];
  },

  getUserById: (telegramId: number): User | undefined => {
    const users = authService.getUsers();
    return users.find(u => u.telegramId === telegramId);
  },

  saveUsers: (users: User[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  },

  updateUser: (updatedUser: User): void => {
    const users = authService.getUsers();
    const index = users.findIndex(u => u.telegramId === updatedUser.telegramId);
    if (index !== -1) {
      users[index] = updatedUser;
      authService.saveUsers(users);
    }
  },

  // --- Usage Tracking Logic ---

  /**
   * Checks if a user can generate content based on their plan limits.
   * Checks both MONTHLY and DAILY limits.
   * Returns { allowed: boolean, reason: string }
   */
  checkGenerationLimit: (user: User): { allowed: boolean; reason?: string } => {
    if (user.role === 'admin') return { allowed: true };

    const plan = authService.getPlanById(user.planId);
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const currentDay = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    // 1. Check Monthly Limit
    if (plan.maxGenerationsPerMonth && plan.maxGenerationsPerMonth > 0) {
      // If month changed, usage is effectively 0
      const monthlyUsage = (user.lastGenerationMonth === currentMonth) ? (user.generationsUsed || 0) : 0;
      if (monthlyUsage >= plan.maxGenerationsPerMonth) {
        return { allowed: false, reason: 'monthly_limit' };
      }
    }

    // 2. Check Daily Limit
    if (plan.maxGenerationsPerDay && plan.maxGenerationsPerDay > 0) {
      // If day changed, usage is effectively 0
      const dailyUsage = (user.lastGenerationDate === currentDay) ? (user.generationsUsedToday || 0) : 0;
      if (dailyUsage >= plan.maxGenerationsPerDay) {
        return { allowed: false, reason: 'daily_limit' };
      }
    }

    return { allowed: true };
  },

  incrementGenerationUsage: (telegramId: number): User => {
    const users = authService.getUsers();
    const index = users.findIndex(u => u.telegramId === telegramId);

    if (index === -1) throw new Error("User not found");

    const user = users[index];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentDay = new Date().toISOString().slice(0, 10);

    // Update Monthly
    if (user.lastGenerationMonth !== currentMonth) {
      user.generationsUsed = 1;
      user.lastGenerationMonth = currentMonth;
    } else {
      user.generationsUsed = (user.generationsUsed || 0) + 1;
    }

    // Update Daily
    if (user.lastGenerationDate !== currentDay) {
      user.generationsUsedToday = 1;
      user.lastGenerationDate = currentDay;
    } else {
      user.generationsUsedToday = (user.generationsUsedToday || 0) + 1;
    }

    authService.saveUsers(users);
    return user;
  },

  // --- Login / Registration ---

  // Log in or Register new user via Telegram
  loginOrRegisterTelegram: async (tgUser: any): Promise<User> => {
    const users = authService.getUsers();
    let user = users.find(u => u.telegramId === tgUser.id);

    if (!user) {
      // Get Default Plan (Free)
      const plans = authService.getPlans();
      const defaultPlan = plans.find(p => p.isDefault) || plans[0];

      // Create new user with default plan
      user = {
        telegramId: tgUser.id,
        username: tgUser.username,
        firstName: tgUser.first_name,
        role: ADMIN_IDS.includes(tgUser.id) ? 'admin' : 'user',
        planId: defaultPlan.id,
        subscriptionExpiry: null,
        generationsUsed: 0,
        lastGenerationMonth: new Date().toISOString().slice(0, 7),
        generationsUsedToday: 0,
        lastGenerationDate: new Date().toISOString().slice(0, 10)
      };
      users.push(user);
      authService.saveUsers(users);
    } else {
      // Update info if changed
      let changed = false;
      if (user.username !== tgUser.username) {
        user.username = tgUser.username;
        changed = true;
      }
      if (user.firstName !== tgUser.first_name) {
        user.firstName = tgUser.first_name;
        changed = true;
      }

      // Ensure user has a planId (migration)
      if (!user.planId) {
        const plans = authService.getPlans();
        const defaultPlan = plans.find(p => p.isDefault) || plans[0];
        user.planId = defaultPlan.id;
        changed = true;
      }

      if (changed) authService.saveUsers(users);
    }

    return user;
  },

  // Direct subscription assignment (Manual Admin Action)
  grantSubscription: (telegramId: number, planId: string, days: number): void => {
    const users = authService.getUsers();
    const index = users.findIndex(u => u.telegramId === telegramId);

    // Calculate expiry
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + days);
    // Set to end of day
    newExpiry.setHours(23, 59, 59, 999);

    if (index !== -1) {
      // Update existing user
      users[index].planId = planId;
      users[index].subscriptionExpiry = newExpiry.toISOString();
    } else {
      // Create a user placeholder (stub)
      const defaultRole = ADMIN_IDS.includes(telegramId) ? 'admin' : 'user';
      const newUser: User = {
        telegramId: telegramId,
        firstName: `User ${telegramId}`, // Placeholder name
        role: defaultRole,
        planId: planId,
        subscriptionExpiry: newExpiry.toISOString(),
        generationsUsed: 0,
        lastGenerationMonth: new Date().toISOString().slice(0, 7),
        generationsUsedToday: 0,
        lastGenerationDate: new Date().toISOString().slice(0, 10)
      };
      users.push(newUser);
    }

    authService.saveUsers(users);
  }
};