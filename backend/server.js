import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import middleware
import { validateTelegramAuth } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import historyRoutes from './routes/history.js';
import planRoutes from './routes/plans.js';
import webhookRoutes from './routes/webhook.js';
import settingsRoutes from './routes/settings.js';

// Import utilities
import { initializeBot } from './utils/subscriptionManager.js';
import { setupWebAppCommands } from './utils/botCommands.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/seo-generator')
    .then(() => {
        console.log('✅ Connected to MongoDB');
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

// Initialize Telegram Bot
if (process.env.BOT_TOKEN) {
    const bot = initializeBot(process.env.BOT_TOKEN);
    setupWebAppCommands(bot);
    console.log('✅ Telegram Bot initialized');
} else {
    console.warn('⚠️  BOT_TOKEN not set - Telegram notifications disabled');
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Public routes (no auth required)
app.use('/api/plans', planRoutes); // Plans are public for viewing
app.use('/api/webhook', webhookRoutes); // Webhook doesn't use Telegram auth

// Protected routes (require Telegram auth)
app.use('/api/auth', validateTelegramAuth, authRoutes);
app.use('/api/users', validateTelegramAuth, userRoutes);
app.use('/api/projects', validateTelegramAuth, projectRoutes);
app.use('/api/history', validateTelegramAuth, historyRoutes);
app.use('/api/settings', validateTelegramAuth, settingsRoutes);

// Serve Vite-built frontend
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

// Serve static files from dist folder
app.use(express.static(distPath));

// SPA fallback - все неизвестные маршруты отправляем на index.html
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});
