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

// Index for faster user project queries
projectSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Project', projectSchema);
