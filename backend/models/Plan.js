import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    maxChars: {
        type: Number,
        required: true
    },
    allowedModels: {
        type: [String],
        default: []
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    maxGenerationsPerMonth: {
        type: Number,
        default: 0 // 0 means unlimited
    },
    maxGenerationsPerDay: {
        type: Number,
        default: 0 // 0 means unlimited
    },
    maxKeywords: {
        type: Number,
        default: 0 // 0 means unlimited
    },
    canCheckSpam: {
        type: Boolean,
        default: false
    },
    canOptimizeRelevance: {
        type: Boolean,
        default: false
    },
    // Pricing for ЮKassa
    priceRub: {
        type: Number,
        default: 0
    },
    durationDays: {
        type: Number,
        default: 30
    }
}, {
    timestamps: true
});



export default mongoose.model('Plan', planSchema);
