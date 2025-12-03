import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    topic: {
        type: String,
        default: ''
    },
    targetUrl: {
        type: String,
        default: ''
    },
    config: {
        type: mongoose.Schema.Types.Mixed, // Store entire config object
        required: true
    },
    result: {
        type: mongoose.Schema.Types.Mixed, // Store entire result object
        required: true
    }
}, {
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    },
    toObject: {
        virtuals: true
    }
});

// Index for faster project history queries
historySchema.index({ projectId: 1, timestamp: -1 });

export default mongoose.model('History', historySchema);
