import { isDatabaseConnected } from '../lib/prisma.js';
import { processLock } from '../utils/processLock.js';
import logger from '../utils/logger.js';
import { processDueMonitoringChecks } from './monitoringService.js';

const LOCK_NAME = 'seo-monitoring-scheduler';
const POLL_INTERVAL_MS = 60 * 1000;

class MonitoringSchedulerService {
  constructor() {
    this.intervalId = null;
    this.isLeader = false;
    this.processing = false;
  }

  async start() {
    if (this.intervalId) return;

    this.isLeader = await processLock.acquireLock(LOCK_NAME);

    this.intervalId = setInterval(async () => {
      if (!this.isLeader) {
        this.isLeader = await processLock.acquireLock(LOCK_NAME);
        return;
      }

      if (this.processing || !processLock.isProcessLeader(LOCK_NAME) || !isDatabaseConnected()) {
        return;
      }

      this.processing = true;
      try {
        await processDueMonitoringChecks();
      } catch (error) {
        logger.error({ error }, 'Monitoring scheduler tick failed');
      } finally {
        this.processing = false;
      }
    }, POLL_INTERVAL_MS);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await processLock.releaseLock(LOCK_NAME);
    this.isLeader = false;
  }
}

export const monitoringScheduler = new MonitoringSchedulerService();
