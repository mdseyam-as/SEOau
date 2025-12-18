import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import Prisma client
import { prisma } from './lib/prisma.js';

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
import generateRoutes from './routes/generate.js';

// Import utilities
import { initializeBot } from './utils/subscriptionManager.js';
import { setupWebAppCommands } from './utils/botCommands.js';
import { initRedis } from './utils/cache.js';

// Load environment variables
dotenv.config();

// Initialize Redis cache
initRedis();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Middleware - CORS configuration
const configuredOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);

// Default origins for Telegram WebApp
const defaultOrigins = [
    'https://web.telegram.org',
    'https://webk.telegram.org',
    'https://webz.telegram.org'
];

const allowedOrigins = [...new Set([...configuredOrigins, ...defaultOrigins])];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Telegram desktop)
        if (!origin) {
            return callback(null, true);
        }

        // In development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        // Check whitelist
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow known hosting platforms (same-origin when serving frontend)
        if (origin.includes('.twc1.net') || origin.includes('.amvera.io')) {
            return callback(null, true);
        }

        console.warn('CORS: Blocked request from:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use Telegram user ID if available, otherwise IP
        return req.telegramUser?.id?.toString() || req.ip;
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 auth requests per 15 minutes
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const generateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 generation requests per minute
    message: { error: 'Too many generation requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.telegramUser?.id?.toString() || req.ip;
    }
});

// Apply general rate limit to all requests
app.use(generalLimiter);

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Database connection check
async function checkDatabase() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Connected to PostgreSQL (Supabase)');
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL connection error:', error.message);
        return false;
    }
}

// Initialize database connection (non-fatal - will retry on requests)
checkDatabase().then(connected => {
    if (!connected) {
        console.warn('⚠️ Database not available at startup - will retry on requests');
        // Don't exit - let the server start and handle DB errors per-request
    }
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
app.get('/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
    } catch (e) {
        dbStatus = 'error';
    }

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbStatus
    });
});

// Public routes (no auth required)
app.use('/api/plans', planRoutes); // Plans are public for viewing
app.use('/api/webhook', webhookRoutes); // Webhook doesn't use Telegram auth

// Protected routes (require Telegram auth)
app.use('/api/auth', authLimiter, validateTelegramAuth, authRoutes);
app.use('/api/users', validateTelegramAuth, userRoutes);
app.use('/api/projects', validateTelegramAuth, projectRoutes);
app.use('/api/history', validateTelegramAuth, historyRoutes);
app.use('/api/settings', validateTelegramAuth, settingsRoutes);
app.use('/api/generate', generateLimiter, validateTelegramAuth, generateRoutes);

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

// Start server - bind to 0.0.0.0 for container accessibility
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Listening on: 0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    await prisma.$disconnect();
    process.exit(0);
});
