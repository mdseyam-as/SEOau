/**
 * Process Lock - prevents duplicate background processes across multiple instances
 * Uses database as distributed lock mechanism
 */

import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

const INSTANCE_ID = crypto.randomUUID();
const LOCK_REFRESH_INTERVAL = 10000; // 10 seconds
const LOCK_EXPIRY = 30000; // 30 seconds - lock expires if not refreshed

class ProcessLock {
  constructor() {
    this.locks = new Map(); // lockName -> intervalId
    this.isLeader = new Map(); // lockName -> boolean
    this.lockTableReady = null; // null = unknown, true = ready, false = disabled
  }

  /**
   * Try to acquire a lock for a specific process
   * @param {string} lockName - Name of the lock (e.g., 'task-queue', 'telegram-bot')
   * @returns {Promise<boolean>} - true if lock acquired
   */
  async acquireLock(lockName, hasRetried = false) {
    if (this.lockTableReady === false) {
      this.isLeader.set(lockName, true);
      return true;
    }
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + LOCK_EXPIRY);

      // Try to create or update lock
      // Use upsert with conditional update (only if expired or same instance)
      const result = await prisma.$executeRaw`
        INSERT INTO "ProcessLock" ("name", "instanceId", "acquiredAt", "expiresAt")
        VALUES (${lockName}, ${INSTANCE_ID}, ${now}, ${expiresAt})
        ON CONFLICT ("name") DO UPDATE
        SET "instanceId" = ${INSTANCE_ID},
            "acquiredAt" = ${now},
            "expiresAt" = ${expiresAt}
        WHERE "ProcessLock"."expiresAt" < ${now}
           OR "ProcessLock"."instanceId" = ${INSTANCE_ID}
      `;

      // Check if we got the lock
      const lock = await prisma.$queryRaw`
        SELECT "instanceId" FROM "ProcessLock" WHERE "name" = ${lockName}
      `;

      const hasLock = lock.length > 0 && lock[0].instanceId === INSTANCE_ID;
      this.isLeader.set(lockName, hasLock);

      if (hasLock) {
        console.log(`🔒 [${INSTANCE_ID.slice(0, 8)}] Acquired lock: ${lockName}`);
        this.startRefresh(lockName);
      }

      return hasLock;
    } catch (error) {
      if (this.isMissingTableError(error)) {
        const created = await this.ensureProcessLockTable();
        this.lockTableReady = created ? true : false;

        if (created && !hasRetried) {
          return this.acquireLock(lockName, true);
        }
      }

      // Table might not exist yet - that's ok, we're the only instance
      if (error.code === 'P2010' || error.message?.includes('does not exist')) {
        this.lockTableReady = false;
        console.log(`⚠️ ProcessLock table not found - assuming single instance mode`);
        this.isLeader.set(lockName, true);
        return true;
      }
      console.error(`Failed to acquire lock ${lockName}:`, error.message);
      return false;
    }
  }

  /**
   * Detect missing ProcessLock table errors
   */
  isMissingTableError(error) {
    const message = error?.message || '';
    return (
      error?.code === 'P2010' ||
      error?.code === '42P01' ||
      message.includes('does not exist') ||
      message.includes('relation "ProcessLock"')
    );
  }

  /**
   * Create ProcessLock table on the fly (safe for prod)
   */
  async ensureProcessLockTable() {
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "ProcessLock" (
          "name" TEXT PRIMARY KEY,
          "instanceId" TEXT NOT NULL,
          "acquiredAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "expiresAt" TIMESTAMPTZ NOT NULL
        )
      `;
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "ProcessLock_expiresAt_idx"
        ON "ProcessLock" ("expiresAt")
      `;
      console.log('✅ ProcessLock table ensured');
      return true;
    } catch (error) {
      console.error('Failed to create ProcessLock table:', error.message);
      return false;
    }
  }

  /**
   * Start refreshing the lock periodically
   */
  startRefresh(lockName) {
    if (this.lockTableReady === false) {
      return;
    }

    // Clear existing refresh if any
    if (this.locks.has(lockName)) {
      clearInterval(this.locks.get(lockName));
    }

    const intervalId = setInterval(async () => {
      try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + LOCK_EXPIRY);

        await prisma.$executeRaw`
          UPDATE "ProcessLock"
          SET "expiresAt" = ${expiresAt}
          WHERE "name" = ${lockName} AND "instanceId" = ${INSTANCE_ID}
        `;
      } catch (error) {
        console.error(`Failed to refresh lock ${lockName}:`, error.message);
        this.isLeader.set(lockName, false);
      }
    }, LOCK_REFRESH_INTERVAL);

    this.locks.set(lockName, intervalId);
  }

  /**
   * Release a lock
   */
  async releaseLock(lockName) {
    try {
      if (this.lockTableReady === false) {
        this.isLeader.set(lockName, false);
        return;
      }

      if (this.locks.has(lockName)) {
        clearInterval(this.locks.get(lockName));
        this.locks.delete(lockName);
      }

      await prisma.$executeRaw`
        DELETE FROM "ProcessLock"
        WHERE "name" = ${lockName} AND "instanceId" = ${INSTANCE_ID}
      `;

      this.isLeader.set(lockName, false);
      console.log(`🔓 [${INSTANCE_ID.slice(0, 8)}] Released lock: ${lockName}`);
    } catch (error) {
      console.error(`Failed to release lock ${lockName}:`, error.message);
    }
  }

  /**
   * Check if this instance is the leader for a process
   */
  isProcessLeader(lockName) {
    return this.isLeader.get(lockName) || false;
  }

  /**
   * Get instance ID
   */
  getInstanceId() {
    return INSTANCE_ID;
  }
}

export const processLock = new ProcessLock();
export default processLock;
