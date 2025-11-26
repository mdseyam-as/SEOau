import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster user project queries
projectSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Project', projectSchema);
