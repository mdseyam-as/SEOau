import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from './models/Plan.js';

dotenv.config();

const defaultPlans = [
    {
        id: 'free',
        name: 'Free',
        maxChars: 2500,
        allowedModels: ['grok-beta'],
        isDefault: true,
        maxGenerationsPerMonth: 10,
        maxGenerationsPerDay: 1,
        maxKeywords: 30,
        canCheckSpam: false,
        canOptimizeRelevance: false,
        priceRub: 0,
        durationDays: 0 // Permanent
    },
    {
        id: 'basic',
        name: 'Базовый',
        maxChars: 3500,
        allowedModels: ['gemini-2.0-flash-exp', 'gpt-4o-mini', 'grok-beta'],
        isDefault: false,
        maxGenerationsPerMonth: 50,
        maxGenerationsPerDay: 5,
        maxKeywords: 200,
        canCheckSpam: true,
        canOptimizeRelevance: false,
        priceRub: 500,
        durationDays: 30
    },
    {
        id: 'pro',
        name: 'PRO',
        maxChars: 8000,
        allowedModels: [
            'gemini-2.0-flash-exp',
            'gemini-exp-1206',
            'gemini-2.0-flash-thinking-exp-1219',
            'gpt-4o-mini',
            'gpt-4o',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022'
        ],
        maxGenerationsPerMonth: 200,
        maxGenerationsPerDay: 20,
        maxKeywords: 1000,
        canCheckSpam: true,
        canOptimizeRelevance: true,
        priceRub: 1500,
        durationDays: 30
    },
    {
        id: 'unlimited',
        name: 'Unlimited',
        maxChars: 20000,
        allowedModels: [
            'gemini-2.0-flash-exp',
            'gemini-exp-1206',
            'gemini-2.0-flash-thinking-exp-1219',
            'gemini-1.5-pro-latest',
            'claude-3-5-sonnet-20241022',
            'claude-sonnet-4-20250514',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229',
            'gpt-4o',
            'gpt-4o-mini',
            'o1-mini',
            'grok-4-fast',
            'grok-4.1-fast',
            'grok-beta',
            'grok-2-1212',
            'qwen-max',
            'qwen-plus',
            'deepseek-r1',
            'deepseek-chat'
        ],
        maxGenerationsPerMonth: 0, // Unlimited
        maxGenerationsPerDay: 0, // Unlimited
        maxKeywords: 0, // Unlimited
        canCheckSpam: true,
        canOptimizeRelevance: true,
        priceRub: 5000,
        durationDays: 30
    }
];

async function initializeDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/seo-generator');
        console.log('✅ Connected to MongoDB');

        // Clear existing plans
        await Plan.deleteMany({});
        console.log('🗑️  Cleared existing plans');

        // Insert default plans
        await Plan.insertMany(defaultPlans);
        console.log('✅ Inserted default plans');

        console.log('\n📊 Database initialized successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase();
