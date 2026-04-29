import logger from '../utils/logger.js';
import { prisma } from './prisma.js';

let schemaReady = false;
let schemaInitPromise = null;

export function isProjectSiteSchemaMissingError(error) {
  return (
    error?.code === 'P2021' &&
    typeof error?.meta?.table === 'string' &&
    ['ProjectSite', 'ProjectSitePageSnapshot'].some((tableName) => error.meta.table.includes(tableName))
  );
}

async function projectSiteTablesExist() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS "count"
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('ProjectSite', 'ProjectSitePageSnapshot')
  `);

  return Number(result?.[0]?.count || 0) === 2;
}

async function executeStatements(statements) {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

export async function ensureProjectSiteSchemaReady(force = false) {
  if (schemaReady && !force) {
    return;
  }

  if (!force && schemaInitPromise) {
    return schemaInitPromise;
  }

  schemaInitPromise = (async () => {
    if (!force && await projectSiteTablesExist()) {
      schemaReady = true;
      return;
    }

    logger.warn('Project site tables are missing. Applying lightweight schema bootstrap.');

    const statements = [
      `
        CREATE TABLE IF NOT EXISTS "ProjectSite" (
          "id" TEXT NOT NULL,
          "projectId" TEXT NOT NULL,
          "name" TEXT,
          "domain" TEXT NOT NULL,
          "normalizedDomain" TEXT NOT NULL,
          "homepageUrl" TEXT NOT NULL,
          "scanFrequency" TEXT NOT NULL DEFAULT '1d',
          "frequencyMinutes" INTEGER NOT NULL DEFAULT 1440,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "lastScannedAt" TIMESTAMP(3),
          "nextScanAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastStatus" TEXT,
          "lastPageCount" INTEGER NOT NULL DEFAULT 0,
          "lastSummary" TEXT,
          "lastImportedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProjectSite_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ProjectSite_projectId_fkey"
            FOREIGN KEY ("projectId")
            REFERENCES "Project"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS "ProjectSitePageSnapshot" (
          "id" TEXT NOT NULL,
          "projectSiteId" TEXT NOT NULL,
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
          "fetchError" TEXT,
          "isDeletedPage" BOOLEAN NOT NULL DEFAULT false,
          "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProjectSitePageSnapshot_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ProjectSitePageSnapshot_projectSiteId_fkey"
            FOREIGN KEY ("projectSiteId")
            REFERENCES "ProjectSite"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE
        )
      `,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ProjectSite_projectId_key" ON "ProjectSite"("projectId")`,
      `CREATE INDEX IF NOT EXISTS "ProjectSite_projectId_idx" ON "ProjectSite"("projectId")`,
      `CREATE INDEX IF NOT EXISTS "ProjectSite_isActive_nextScanAt_idx" ON "ProjectSite"("isActive", "nextScanAt")`,
      `CREATE INDEX IF NOT EXISTS "ProjectSitePageSnapshot_projectSiteId_idx" ON "ProjectSitePageSnapshot"("projectSiteId")`,
      `CREATE INDEX IF NOT EXISTS "ProjectSitePageSnapshot_projectSiteId_scannedAt_idx" ON "ProjectSitePageSnapshot"("projectSiteId", "scannedAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "ProjectSitePageSnapshot_projectSiteId_normalizedUrl_idx" ON "ProjectSitePageSnapshot"("projectSiteId", "normalizedUrl")`,
      `CREATE INDEX IF NOT EXISTS "ProjectSitePageSnapshot_projectSiteId_normalizedUrl_scannedAt_idx" ON "ProjectSitePageSnapshot"("projectSiteId", "normalizedUrl", "scannedAt" DESC)`
    ];

    await executeStatements(statements);

    schemaReady = true;
    logger.info('Project site schema bootstrap completed successfully.');
  })();

  try {
    await schemaInitPromise;
  } finally {
    schemaInitPromise = null;
  }
}
