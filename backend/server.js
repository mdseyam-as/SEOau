import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import Prisma client
import { prisma } from './lib/prisma.js';
import { ensureMonitoringSchemaReady } from './lib/monitoringSchema.js';

// Import middleware
import { validateTelegramAuth } from './middleware/auth.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { ipRateLimiter, userRateLimiter, generateRateLimiter, seoAuditRateLimiter } from './middleware/rateLimit.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import historyRoutes from './routes/history.js';
import planRoutes from './routes/plans.js';
import paymentRoutes from './routes/payments.js';
import webhookRoutes from './routes/webhook.js';
import settingsRoutes from './routes/settings.js';
import generateRoutes from './routes/generate.js';
import knowledgeBaseRoutes from './routes/knowledge-base.js';
import internalLinksRoutes from './routes/internal-links.js';
import outlineRoutes from './routes/outline.js';
import tasksRoutes from './routes/tasks.js';
import exportRoutes from './routes/export.js';
import streamingRoutes from './routes/streaming.js';
import queueRoutes from './routes/queue.js';
import monitoringRoutes from './routes/monitoring.js';
import competitorRoutes from './routes/competitors.js';
import projectSiteRoutes from './routes/project-site.js';

// Import services
import { taskQueue } from './services/taskQueueService.js';
import { monitoringScheduler } from './services/monitoringSchedulerService.js';
import { competitorWatcherScheduler } from './services/competitorWatcherSchedulerService.js';
import { projectSiteScheduler } from './services/projectSiteSchedulerService.js';

// Import Swagger
import { setupSwagger } from './swagger.js';

// Import workers
import { generationWorker } from './workers/generationWorker.js';

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

// Setup Swagger documentation
setupSwagger(app);
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

// Apply middleware in correct order
app.use(requestId); // Generate request ID first
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply CSRF validation to all routes
app.use(validateCsrf);

// Apply rate limiting
app.use(ipRateLimiter); // IP-based rate limiting for DDoS protection
app.use(userRateLimiter); // User-based rate limiting

// Request logging (now uses structured logger)
app.use((req, res, next) => {
    logger.info({
        requestId: req.id,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    }, 'Incoming request');
    next();
});

// Database connection check with retry
import { connectWithRetry, isDatabaseConnected } from './lib/prisma.js';

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

async function initTelegramBot() {
    if (!process.env.BOT_TOKEN) {
        console.warn('⚠️  BOT_TOKEN not set - Telegram notifications disabled');
        return;
    }

    try {
        const bot = initializeBot(process.env.BOT_TOKEN);
        setupWebAppCommands(bot);
        console.log('✅ Telegram Bot initialized (webhook ready)');
    } catch (error) {
        console.error('❌ Telegram Bot initialization failed:', error.message);
    }
}

// Initialize database connection with retry logic (non-blocking)
connectWithRetry().then(connected => {
    if (!connected) {
        console.warn('⚠️ Database not available - some features may not work');
        console.warn('⚠️ Check if Supabase project is paused (free tier pauses after 7 days of inactivity)');
    } else {
        ensureMonitoringSchemaReady().catch((error) => {
            console.error('⚠️ Monitoring schema bootstrap failed:', error.message);
        });
    }

    // Initialize Telegram Bot after DB init
    initTelegramBot();
}).catch(err => {
    console.error('❌ Database connection error:', err.message);
});

// Health check - with no-cache headers to prevent Telegram caching
// Supports both GET and POST to bypass aggressive caching
const healthCheckHandler = async (req, res) => {
    // Set headers to prevent caching
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });

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
        database: dbStatus,
        random: Math.random() // Extra randomness to prevent any caching
    });
};

app.get('/health', healthCheckHandler);
app.post('/health', healthCheckHandler);

// Public routes (no auth required)
app.use('/api/plans', planRoutes); // Plans are public for viewing
app.use('/api/webhook', seoAuditRateLimiter, webhookRoutes); // Webhook with rate limiting

// Protected routes (require Telegram auth)
app.use('/api/auth', validateTelegramAuth, authRoutes);
app.use('/api/users', validateTelegramAuth, userRoutes);
app.use('/api/projects', validateTelegramAuth, projectRoutes);
app.use('/api/history', validateTelegramAuth, historyRoutes);
app.use('/api/settings', validateTelegramAuth, settingsRoutes);
app.use('/api/payments', validateTelegramAuth, paymentRoutes);
app.use('/api/generate', generateRateLimiter, validateTelegramAuth, generateRoutes);
app.use('/api/knowledge-base', validateTelegramAuth, knowledgeBaseRoutes);
app.use('/api/internal-links', validateTelegramAuth, internalLinksRoutes);
app.use('/api/outline', generateRateLimiter, validateTelegramAuth, outlineRoutes);
app.use('/api/tasks', validateTelegramAuth, tasksRoutes);
app.use('/api/export', validateTelegramAuth, exportRoutes);
app.use('/api/streaming', generateRateLimiter, validateTelegramAuth, streamingRoutes);
app.use('/api/queue', validateTelegramAuth, queueRoutes);
app.use('/api/monitoring', validateTelegramAuth, monitoringRoutes);
app.use('/api/competitors', validateTelegramAuth, competitorRoutes);
app.use('/api/project-site', validateTelegramAuth, projectSiteRoutes);

// Serve Vite-built frontend
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

// Middleware to add no-cache headers for index.html (critical for Telegram WebApp)
const noCacheHtml = (req, res, next) => {
    if (req.path === '/' || req.path.endsWith('.html')) {
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
    }
    next();
};

// Apply no-cache middleware before static files
app.use(noCacheHtml);

// Serve static files from dist folder
app.use(express.static(distPath, {
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
        // No cache for HTML files
        if (filePath.endsWith('.html')) {
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
        }
    }
}));

// SPA fallback - все неизвестные маршруты отправляем на index.html
app.get(/.*/, (req, res) => {
    // Set no-cache headers for SPA fallback
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    res.sendFile(path.join(distPath, 'index.html'));
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server - bind to 0.0.0.0 for container accessibility
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Listening on: 0.0.0.0:${PORT}`);

    // Start background task queue processor
    taskQueue.start();
    monitoringScheduler.start();
    competitorWatcherScheduler.start();
    projectSiteScheduler.start();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await taskQueue.stop();
    await monitoringScheduler.stop();
    await competitorWatcherScheduler.stop();
    await projectSiteScheduler.stop();
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    await taskQueue.stop();
    await monitoringScheduler.stop();
    await competitorWatcherScheduler.stop();
    await projectSiteScheduler.stop();
    await prisma.$disconnect();
    process.exit(0);
});
