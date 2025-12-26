import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
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
import knowledgeBaseRoutes from './routes/knowledge-base.js';
import internalLinksRoutes from './routes/internal-links.js';
import outlineRoutes from './routes/outline.js';
import tasksRoutes from './routes/tasks.js';
import exportRoutes from './routes/export.js';

// Import services
import { taskQueue } from './services/taskQueueService.js';

// Import utilities
import { initializeBot } from './utils/subscriptionManager.js';
import { setupWebAppCommands } from './utils/botCommands.js';
import { initRedis } from './utils/cache.js';

// Load environment variables
dotenv.config();

// ==================== SECURITY: Production Safety Checks ====================
if (process.env.NODE_ENV === 'production') {
    if (process.env.DEV_BYPASS_TELEGRAM === 'true') {
        console.error('🚨 FATAL: DEV_BYPASS_TELEGRAM is enabled in production!');
        console.error('🚨 This is a critical security vulnerability. Exiting...');
        process.exit(1);
    }

    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
        console.error('🚨 FATAL: ENCRYPTION_KEY not set or too short (min 32 chars).');
        console.error('🚨 API keys would be stored unencrypted. Exiting...');
        process.exit(1);
    }
}

// Initialize Redis cache
initRedis();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ==================== SECURITY: Helmet.js ====================
// CSP disabled for Telegram WebApp compatibility (iframe + inline styles/scripts)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// ==================== SECURITY: CORS Configuration ====================
const configuredOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);

// Default origins for Telegram WebApp
const defaultOrigins = [
    'https://web.telegram.org',
    'https://webk.telegram.org',
    'https://webz.telegram.org'
];

// Specific allowed hosting origins (NOT wildcards)
const hostingOrigins = (process.env.ALLOWED_HOSTING_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

const allowedOrigins = [...new Set([...configuredOrigins, ...defaultOrigins, ...hostingOrigins])];

// Development origins (only used in dev mode)
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Telegram desktop)
        if (!origin) {
            return callback(null, true);
        }

        // In development, allow only specific dev origins
        if (process.env.NODE_ENV !== 'production') {
            if (devOrigins.includes(origin) || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
        }

        // Check whitelist
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.warn('CORS: Blocked request from:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// ==================== SECURITY: CSRF Protection (Double Submit Cookie) ====================
const csrfTokens = new Map(); // In production, use Redis

function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
    const token = generateCsrfToken();
    const tokenId = crypto.randomBytes(16).toString('hex');

    // Store token with expiry (15 minutes)
    csrfTokens.set(tokenId, { token, expires: Date.now() + 15 * 60 * 1000 });

    // Clean up expired tokens periodically
    if (csrfTokens.size > 1000) {
        const now = Date.now();
        for (const [key, value] of csrfTokens.entries()) {
            if (value.expires < now) csrfTokens.delete(key);
        }
    }

    res.cookie('csrf_token_id', tokenId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
    });

    res.json({ csrfToken: token });
});

// CSRF validation middleware for state-changing operations
function validateCsrf(req, res, next) {
    // Skip CSRF for webhooks (they use signature validation)
    if (req.path.startsWith('/api/webhook')) {
        return next();
    }

    // Skip for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const tokenId = req.cookies?.csrf_token_id;
    const submittedToken = req.headers['x-csrf-token'];

    if (!tokenId || !submittedToken) {
        // For Telegram WebApp, CSRF is less critical due to initData validation
        // Log but allow if Telegram auth is present
        if (req.headers['x-telegram-init-data']) {
            return next();
        }
        return res.status(403).json({ error: 'Missing CSRF token' });
    }

    const storedData = csrfTokens.get(tokenId);
    if (!storedData || storedData.expires < Date.now()) {
        csrfTokens.delete(tokenId);
        return res.status(403).json({ error: 'CSRF token expired' });
    }

    if (storedData.token !== submittedToken) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    next();
}

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply CSRF validation to all routes
app.use(validateCsrf);

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

// Rate limiter for webhooks (15 minutes window)
const webhookLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 webhook calls per 15 minutes per IP
    message: { error: 'Too many webhook requests' },
    standardHeaders: true,
    legacyHeaders: false
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
app.use('/api/webhook', webhookLimiter, webhookRoutes); // Webhook with rate limiting

// Protected routes (require Telegram auth)
app.use('/api/auth', authLimiter, validateTelegramAuth, authRoutes);
app.use('/api/users', validateTelegramAuth, userRoutes);
app.use('/api/projects', validateTelegramAuth, projectRoutes);
app.use('/api/history', validateTelegramAuth, historyRoutes);
app.use('/api/settings', validateTelegramAuth, settingsRoutes);
app.use('/api/generate', generateLimiter, validateTelegramAuth, generateRoutes);
app.use('/api/knowledge-base', validateTelegramAuth, knowledgeBaseRoutes);
app.use('/api/internal-links', validateTelegramAuth, internalLinksRoutes);
app.use('/api/outline', generateLimiter, validateTelegramAuth, outlineRoutes);
app.use('/api/tasks', validateTelegramAuth, tasksRoutes);
app.use('/api/export', validateTelegramAuth, exportRoutes);

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

    // Start background task queue processor
    taskQueue.start();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    taskQueue.stop();
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    taskQueue.stop();
    await prisma.$disconnect();
    process.exit(0);
});
