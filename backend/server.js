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
