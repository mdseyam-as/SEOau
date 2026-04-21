import logger from '../utils/logger.js';
import { prisma } from './prisma.js';

let schemaReady = false;
let schemaInitPromise = null;

export function isCompetitorWatcherSchemaMissingError(error) {
  return (
    error?.code === 'P2021' &&
    typeof error?.meta?.table === 'string' &&
    [
      'Competitor',
      'CompetitorPageSnapshot',
      'CompetitorPageChange',
      'TopicCluster',
      'CompetitorComparison'
    ].some((tableName) => error.meta.table.includes(tableName))
  );
}

async function competitorTablesExist() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS "count"
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('Competitor', 'CompetitorPageSnapshot', 'CompetitorPageChange', 'TopicCluster', 'CompetitorComparison')
  `);

  return Number(result?.[0]?.count || 0) === 5;
}

async function executeStatements(statements) {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

export async function ensureCompetitorWatcherSchemaReady(force = false) {
  if (schemaReady && !force) {
    return;
  }

  if (!force && schemaInitPromise) {
    return schemaInitPromise;
  }

  schemaInitPromise = (async () => {
    if (!force && await competitorTablesExist()) {
      schemaReady = true;
      return;
    }

    logger.warn('Competitor Watcher tables are missing. Applying lightweight schema bootstrap.');

    const statements = [
      `
        CREATE TABLE IF NOT EXISTS "Competitor" (
          "id" TEXT NOT NULL,
          "projectId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "domain" TEXT NOT NULL,
          "normalizedDomain" TEXT NOT NULL,
          "homepageUrl" TEXT NOT NULL,
          "priority" TEXT NOT NULL DEFAULT 'medium',
          "scanFrequency" TEXT NOT NULL DEFAULT '1d',
          "frequencyMinutes" INTEGER NOT NULL DEFAULT 1440,
          "notes" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "lastScannedAt" TIMESTAMP(3),
          "nextScanAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastStatus" TEXT,
          "lastPageCount" INTEGER NOT NULL DEFAULT 0,
          "lastChangeCount" INTEGER NOT NULL DEFAULT 0,
          "lastClusterCount" INTEGER NOT NULL DEFAULT 0,
          "lastSummary" TEXT,
          "lastSeverity" TEXT,
          "lastImportantChangeAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "Competitor_projectId_fkey"
            FOREIGN KEY ("projectId")
            REFERENCES "Project"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS "CompetitorPageSnapshot" (
          "id" TEXT NOT NULL,
          "competitorId" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "normalizedUrl" TEXT NOT NULL,
          "finalUrl" TEXT,
          "statusCode" INTEGER NOT NULL,
          "title" TEXT,
          "h1" TEXT,
          "h2List" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "h3List" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "metaDescription" TEXT,
          "canonical" TEXT,
          "faqQuestions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "contentText" TEXT,
          "wordCount" INTEGER NOT NULL DEFAULT 0,
          "contentHash" TEXT,
          "structureHash" TEXT,
          "ctaText" TEXT,
          "internalLinks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "pageType" TEXT,
          "topicKey" TEXT,
          "semanticSummary" TEXT,
          "fetchError" TEXT,
          "isDeletedPage" BOOLEAN NOT NULL DEFAULT false,
          "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CompetitorPageSnapshot_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "CompetitorPageSnapshot_competitorId_fkey"
            FOREIGN KEY ("competitorId")
            REFERENCES "Competitor"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS "CompetitorPageChange" (
          "id" TEXT NOT NULL,
          "competitorId" TEXT NOT NULL,
          "snapshotId" TEXT,
          "previousSnapshotId" TEXT,
          "url" TEXT NOT NULL,
          "normalizedUrl" TEXT NOT NULL,
          "severity" TEXT NOT NULL,
          "changeType" TEXT NOT NULL,
          "changeTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "pageType" TEXT,
          "topicKey" TEXT,
          "significanceScore" INTEGER NOT NULL DEFAULT 0,
          "impactScore" INTEGER NOT NULL DEFAULT 0,
          "isImportant" BOOLEAN NOT NULL DEFAULT false,
          "title" TEXT NOT NULL,
          "summary" TEXT NOT NULL,
          "diff" JSONB NOT NULL,
          "notifiedAt" TIMESTAMP(3),
          "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CompetitorPageChange_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "CompetitorPageChange_competitorId_fkey"
            FOREIGN KEY ("competitorId")
            REFERENCES "Competitor"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE,
          CONSTRAINT "CompetitorPageChange_snapshotId_fkey"
            FOREIGN KEY ("snapshotId")
            REFERENCES "CompetitorPageSnapshot"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE,
          CONSTRAINT "CompetitorPageChange_previousSnapshotId_fkey"
            FOREIGN KEY ("previousSnapshotId")
            REFERENCES "CompetitorPageSnapshot"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS "TopicCluster" (
          "id" TEXT NOT NULL,
          "competitorId" TEXT NOT NULL,
          "key" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          "pageCount" INTEGER NOT NULL DEFAULT 0,
          "trendScore" INTEGER NOT NULL DEFAULT 0,
          "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "TopicCluster_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "TopicCluster_competitorId_fkey"
            FOREIGN KEY ("competitorId")
            REFERENCES "Competitor"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS "CompetitorComparison" (
          "id" TEXT NOT NULL,
          "competitorId" TEXT NOT NULL,
          "topicKey" TEXT NOT NULL,
          "ourTopic" TEXT NOT NULL,
          "theirTopic" TEXT NOT NULL,
          "ourCoverage" INTEGER NOT NULL DEFAULT 0,
          "theirCoverage" INTEGER NOT NULL DEFAULT 0,
          "gapSummary" TEXT NOT NULL,
          "recommendation" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CompetitorComparison_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "CompetitorComparison_competitorId_fkey"
            FOREIGN KEY ("competitorId")
            REFERENCES "Competitor"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Competitor_projectId_normalizedDomain_key" ON "Competitor"("projectId", "normalizedDomain")`,
      `CREATE INDEX IF NOT EXISTS "Competitor_projectId_idx" ON "Competitor"("projectId")`,
      `CREATE INDEX IF NOT EXISTS "Competitor_projectId_createdAt_idx" ON "Competitor"("projectId", "createdAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "Competitor_isActive_nextScanAt_idx" ON "Competitor"("isActive", "nextScanAt")`,
      `CREATE INDEX IF NOT EXISTS "CompetitorPageSnapshot_competitorId_idx" ON "CompetitorPageSnapshot"("competitorId")`,
      `CREATE INDEX IF NOT EXISTS "CompetitorPageSnapshot_competitorId_scannedAt_idx" ON "CompetitorPageSnapshot"("competitorId", "scannedAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "CompetitorPageSnapshot_competitorId_normalizedUrl_idx" ON "CompetitorPageSnapshot"("competitorId", "normalizedUrl")`,
      `CREATE INDEX IF NOT EXISTS "CompetitorPageSnapshot_competitorId_normalizedUrl_scannedAt_idx" ON "CompetitorPageSnapshot"("competitorId", "normalizedUrl", "scannedAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "CompetitorPageChange_competitorId_idx" ON "CompetitorPageChange"("competitorId")`,
      `CREATE INDEX IF NOT EXISTS "CompetitorPageChange_competitorId_detectedAt_idx" ON "CompetitorPageChange"("competitorId", "detectedAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "CompetitorPageChange_competitorId_isImportant_detectedAt_idx" ON "CompetitorPageChange"("competitorId", "isImportant", "detectedAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "CompetitorPageChange_severity_idx" ON "CompetitorPageChange"("severity")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "TopicCluster_competitorId_key_key" ON "TopicCluster"("competitorId", "key")`,
      `CREATE INDEX IF NOT EXISTS "TopicCluster_competitorId_idx" ON "TopicCluster"("competitorId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "CompetitorComparison_competitorId_topicKey_key" ON "CompetitorComparison"("competitorId", "topicKey")`,
      `CREATE INDEX IF NOT EXISTS "CompetitorComparison_competitorId_idx" ON "CompetitorComparison"("competitorId")`
    ];

    await executeStatements(statements);

    schemaReady = true;
    logger.info('Competitor Watcher schema bootstrap completed successfully.');
  })();

  try {
    await schemaInitPromise;
  } finally {
    schemaInitPromise = null;
  }
}
