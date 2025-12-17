import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    telegramId: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    username: {
        type: String,
        default: null
    },
    firstName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    planId: {
        type: String,
        default: 'free'
    },
    subscriptionExpiry: {
        type: Date,
        default: null
    },
    // Usage tracking
    generationsUsed: {
        type: Number,
        default: 0
    },
    lastGenerationMonth: {
        type: String, // Format: "YYYY-MM"
        default: null
    },
    generationsUsedToday: {
        type: Number,
        default: 0
    },
    lastGenerationDate: {
        type: String, // Format: "YYYY-MM-DD"
        default: null
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

export default mongoose.model('User', userSchema);
