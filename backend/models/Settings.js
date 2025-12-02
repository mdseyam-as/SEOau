import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    // Singleton pattern - only one document should exist
    _id: { type: String, default: 'global' },

    openRouterApiKey: {
        type: String,
        default: ''
    },

    systemPrompt: {
        type: String,
        default: ''
    },

    telegramLink: {
        type: String,
        default: 'https://t.me/bankkz_admin'
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
