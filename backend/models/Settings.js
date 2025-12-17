import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    // Singleton pattern - only one document should exist
    _id: { type: String, default: 'global' },

    openRouterApiKey: {
        type: String,
        default: ''
    },

    // Legacy field - kept for backward compatibility
    systemPrompt: {
        type: String,
        default: ''
    },

    // Separate prompts for SEO and GEO modes
    seoPrompt: {
        type: String,
        default: ''
    },

    geoPrompt: {
        type: String,
        default: ''
    },

    telegramLink: {
        type: String,
        default: 'https://t.me/bankkz_admin'
    },

    spamCheckModel: {
        type: String,
        default: 'x-ai/grok-4.1-fast'
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
settingsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model('Settings', settingsSchema);
