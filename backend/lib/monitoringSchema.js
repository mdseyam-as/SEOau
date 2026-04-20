import logger from '../utils/logger.js';
import { prisma } from './prisma.js';

let schemaReady = false;
let schemaInitPromise = null;

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function isMonitoringSchemaMissingError(error) {
  return (
    error?.code === 'P2021' &&
    typeof error?.meta?.table === 'string' &&
    ['MonitoredPage', 'MonitoringSnapshot', 'MonitoringEvent'].some((tableName) =>
      error.meta.table.includes(tableName)
    )
  );
}

async function monitoringTableExists() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS "count"
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('MonitoredPage', 'MonitoringSnapshot', 'MonitoringEvent')
  `);

  return Number(result?.[0]?.count || 0) === 3;
}

async function executeStatements(statements) {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

export async function ensureMonitoringSchemaReady(force = false) {
  if (schemaReady && !force) {
    return;
  }

  if (!force && schemaInitPromise) {
    return schemaInitPromise;
  }

  schemaInitPromise = (async () => {
    if (!force && await monitoringTableExists()) {
      schemaReady = true;
      return;
    }

    logger.warn('Monitoring tables are missing. Applying lightweight monitoring schema bootstrap.');

    const statements = [
      `
        CREATE TABLE IF NOT EXISTS "MonitoredPage" (
          "id" TEXT NOT NULL,
          "projectId" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "normalizedUrl" TEXT NOT NULL,
          "label" TEXT,
          "frequency" TEXT NOT NULL DEFAULT '1h',
          "frequencyMinutes" INTEGER NOT NULL DEFAULT 60,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "lastCheckedAt" TIMESTAMP(3),
          "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastStatusCode" INTEGER,
          "lastFinalUrl" TEXT,
          "lastTitle" TEXT,
          "lastSeverity" TEXT,
          "lastEventAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MonitoredPage_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "MonitoredPage_projectId_fkey"
            FOREIGN KEY ("projectId")
            REFERENCES "Project"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS "MonitoringSnapshot" (
          "id" TEXT NOT NULL,
          "monitoredPageId" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "finalUrl" TEXT,
          "statusCode" INTEGER NOT NULL,
          "title" TEXT,
          "h1" TEXT,
          "metaDescription" TEXT,
          "canonical" TEXT,
          "robotsMeta" TEXT,
          "wordCount" INTEGER NOT NULL DEFAULT 0,
          "contentText" TEXT,
          "contentHash" TEXT,
          "hasFaq" BOOLEAN NOT NULL DEFAULT false,
          "hasSchema" BOOLEAN NOT NULL DEFAULT false,
          "fetchError" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MonitoringSnapshot_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "MonitoringSnapshot_monitoredPageId_fkey"
            FOREIGN KEY ("monitoredPageId")
            REFERENCES "MonitoredPage"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS "MonitoringEvent" (
          "id" TEXT NOT NULL,
          "monitoredPageId" TEXT NOT NULL,
          "snapshotId" TEXT,
          "previousSnapshotId" TEXT,
          "severity" TEXT NOT NULL,
          "changeTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "title" TEXT NOT NULL,
          "summary" TEXT NOT NULL,
          "diff" JSONB NOT NULL,
          "notifiedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MonitoringEvent_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "MonitoringEvent_monitoredPageId_fkey"
            FOREIGN KEY ("monitoredPageId")
            REFERENCES "MonitoredPage"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE,
          CONSTRAINT "MonitoringEvent_snapshotId_fkey"
            FOREIGN KEY ("snapshotId")
            REFERENCES "MonitoringSnapshot"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE,
          CONSTRAINT "MonitoringEvent_previousSnapshotId_fkey"
            FOREIGN KEY ("previousSnapshotId")
            REFERENCES "MonitoringSnapshot"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE
        )
      `,
      `CREATE UNIQUE INDEX IF NOT EXISTS "MonitoredPage_projectId_normalizedUrl_key" ON "MonitoredPage"("projectId", "normalizedUrl")`,
      `CREATE INDEX IF NOT EXISTS "MonitoredPage_projectId_idx" ON "MonitoredPage"("projectId")`,
      `CREATE INDEX IF NOT EXISTS "MonitoredPage_projectId_createdAt_idx" ON "MonitoredPage"("projectId", "createdAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "MonitoredPage_isActive_nextCheckAt_idx" ON "MonitoredPage"("isActive", "nextCheckAt")`,
      `CREATE INDEX IF NOT EXISTS "MonitoringSnapshot_monitoredPageId_idx" ON "MonitoringSnapshot"("monitoredPageId")`,
      `CREATE INDEX IF NOT EXISTS "MonitoringSnapshot_monitoredPageId_createdAt_idx" ON "MonitoringSnapshot"("monitoredPageId", "createdAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "MonitoringEvent_monitoredPageId_idx" ON "MonitoringEvent"("monitoredPageId")`,
      `CREATE INDEX IF NOT EXISTS "MonitoringEvent_monitoredPageId_createdAt_idx" ON "MonitoringEvent"("monitoredPageId", "createdAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "MonitoringEvent_severity_idx" ON "MonitoringEvent"("severity")`,
    ];

    await executeStatements(statements);

    const metadataStatements = [
      `
        ALTER TABLE "MonitoredPage"
        ALTER COLUMN "frequency" SET DEFAULT ${quoteLiteral('1h')},
        ALTER COLUMN "frequencyMinutes" SET DEFAULT 60,
        ALTER COLUMN "isActive" SET DEFAULT true,
        ALTER COLUMN "nextCheckAt" SET DEFAULT CURRENT_TIMESTAMP,
        ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
        ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP
      `,
      `
        ALTER TABLE "MonitoringSnapshot"
        ALTER COLUMN "wordCount" SET DEFAULT 0,
        ALTER COLUMN "hasFaq" SET DEFAULT false,
        ALTER COLUMN "hasSchema" SET DEFAULT false,
        ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP
      `,
      `
        ALTER TABLE "MonitoringEvent"
        ALTER COLUMN "changeTypes" SET DEFAULT ARRAY[]::TEXT[],
        ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP
      `,
    ];

    await executeStatements(metadataStatements);

    schemaReady = true;
    logger.info('Monitoring schema bootstrap completed successfully.');
  })();

  try {
    await schemaInitPromise;
  } finally {
    schemaInitPromise = null;
  }
}
