import Redis from 'ioredis';

let redis = null;
let isConnected = false;

// Cache TTL in seconds
const CACHE_TTL = {
    settings: 300,     // 5 minutes
    plans: 600,        // 10 minutes
    plan: 600,         // 10 minutes for individual plan
};

// Initialize Redis connection
export function initRedis() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        console.log('⚠️  REDIS_URL not set - using in-memory cache fallback');
        return null;
    }

    try {
        redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            enableReadyCheck: true,
            lazyConnect: true
        });

        redis.on('connect', () => {
            isConnected = true;
            console.log('✅ Redis connected');
        });

        redis.on('error', (err) => {
            console.error('Redis error:', err.message);
            isConnected = false;
        });

        redis.on('close', () => {
            isConnected = false;
            console.log('Redis connection closed');
        });

        // Connect asynchronously
        redis.connect().then(() => {
            isConnected = true;
        }).catch(err => {
            console.error('Redis connection failed:', err.message);
            isConnected = false;
            redis = null;
        });

        return redis;
    } catch (error) {
        console.error('Failed to initialize Redis:', error.message);
        return null;
    }
}

// In-memory cache fallback
const memoryCache = new Map();
const memoryCacheTimestamps = new Map();

function isExpired(key, ttl) {
    const timestamp = memoryCacheTimestamps.get(key);
    if (!timestamp) return true;
    return Date.now() - timestamp > ttl * 1000;
}

// Get from cache
export async function cacheGet(key) {
    try {
        if (redis && isConnected) {
            const value = await redis.get(key);
            return value ? JSON.parse(value) : null;
        }

        // Fallback to memory cache
        if (memoryCache.has(key)) {
            const ttl = CACHE_TTL[key.split(':')[0]] || 300;
            if (!isExpired(key, ttl)) {
                return memoryCache.get(key);
            }
            memoryCache.delete(key);
            memoryCacheTimestamps.delete(key);
        }
        return null;
    } catch (error) {
        console.error('Cache get error:', error.message);
        return null;
    }
}

// Set to cache
export async function cacheSet(key, value, ttlSeconds) {
    try {
        const ttl = ttlSeconds || CACHE_TTL[key.split(':')[0]] || 300;

        if (redis && isConnected) {
            await redis.setex(key, ttl, JSON.stringify(value));
            return true;
        }

        // Fallback to memory cache
        memoryCache.set(key, value);
        memoryCacheTimestamps.set(key, Date.now());
        return true;
    } catch (error) {
        console.error('Cache set error:', error.message);
        return false;
    }
}

// Delete from cache
export async function cacheDel(key) {
    try {
        if (redis && isConnected) {
            await redis.del(key);
        }
        memoryCache.delete(key);
        memoryCacheTimestamps.delete(key);
        return true;
    } catch (error) {
        console.error('Cache del error:', error.message);
        return false;
    }
}

// Delete by pattern (e.g., "plans:*")
export async function cacheDelPattern(pattern) {
    try {
        if (redis && isConnected) {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        }

        // Clear matching keys from memory cache
        const prefix = pattern.replace('*', '');
        for (const key of memoryCache.keys()) {
            if (key.startsWith(prefix)) {
                memoryCache.delete(key);
                memoryCacheTimestamps.delete(key);
            }
        }
        return true;
    } catch (error) {
        console.error('Cache del pattern error:', error.message);
        return false;
    }
}

// Cache keys
export const CACHE_KEYS = {
    SETTINGS: 'settings:global',
    PLANS_ALL: 'plans:all',
    PLAN: (id) => `plan:${id}`,
};

export default {
    initRedis,
    cacheGet,
    cacheSet,
    cacheDel,
    cacheDelPattern,
    CACHE_KEYS,
    CACHE_TTL
};
