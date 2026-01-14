import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connection state tracking
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

export async function connectWithRetry() {
  while (connectionAttempts < MAX_RETRIES) {
    try {
      await prisma.$connect();
      isConnected = true;
      console.log('✅ Connected to PostgreSQL (Supabase)');
      return true;
    } catch (error) {
      connectionAttempts++;
      console.error(`❌ Database connection attempt ${connectionAttempts}/${MAX_RETRIES} failed:`, error.message);
      
      if (connectionAttempts < MAX_RETRIES) {
        console.log(`⏳ Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  console.error('❌ Failed to connect to database after', MAX_RETRIES, 'attempts');
  return false;
}

export function isDatabaseConnected() {
  return isConnected;
}

export function setDatabaseConnected(value) {
  isConnected = value;
}

export default prisma;
