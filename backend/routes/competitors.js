import express from 'express';
import { z } from 'zod';
import { ensureCompetitorWatcherSchemaReady } from '../lib/competitorWatcherSchema.js';
import { prisma } from '../lib/prisma.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import {
  createCompetitorSchema,
  paginationSchema,
  updateCompetitorSchema
} from '../schemas/index.js';
import {
  createCompetitor,
  deleteCompetitor,
  getCompetitorChanges,
  getCompetitorComparison,
  getCompetitorWeeklySummary,
  getProjectCompetitors,
  scanCompetitor,
  updateCompetitor
} from '../services/competitorWatcherService.js';

const router = express.Router();

const projectParamSchema = z.object({
  projectId: z.string().uuid('Invalid project ID')
});

const competitorParamSchema = z.object({
  id: z.string().uuid('Invalid competitor ID')
});

const summaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7)
});

async function getUserId(telegramId) {
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
    select: { id: true }
  });

  return user?.id || null;
}

async function assertProjectOwnership(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    return { error: { status: 404, body: { error: 'Project not found' } } };
  }

  if (project.userId !== userId) {
    return { error: { status: 403, body: { error: 'Forbidden' } } };
  }

  return { project };
}

async function assertCompetitorOwnership(competitorId, userId) {
  await ensureCompetitorWatcherSchemaReady();

  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
    include: {
      project: true
    }
  });

  if (!competitor) {
    return { error: { status: 404, body: { error: 'Competitor not found' } } };
  }

  if (competitor.project.userId !== userId) {
    return { error: { status: 403, body: { error: 'Forbidden' } } };
  }

  return { competitor };
}

function transformCompetitor(competitor) {
  const { pageChanges, topicClusters, comparisons, ...rest } = competitor;
  return {
    ...rest,
    recentChanges: pageChanges || [],
    topClusters: topicClusters || [],
    comparisonItems: [...(comparisons || [])].sort((left, right) => (right.theirCoverage - right.ourCoverage) - (left.theirCoverage - left.ourCoverage))
  };
}

router.get('/projects/:projectId/competitors', validateParams(projectParamSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { projectId } = req.validatedParams || req.params;
    const ownership = await assertProjectOwnership(projectId, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const competitors = await getProjectCompetitors(projectId);
    res.json({ competitors: competitors.map(transformCompetitor) });
  } catch (error) {
    console.error('Get competitors error:', error);
    res.status(500).json({ error: 'Failed to get competitors' });
  }
});

router.post('/projects/:projectId/competitors', validateParams(projectParamSchema), validate(createCompetitorSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { projectId } = req.validatedParams || req.params;
    const ownership = await assertProjectOwnership(projectId, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const competitor = await createCompetitor(projectId, req.body);
    res.json({ success: true, competitor: transformCompetitor(competitor) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'This competitor domain is already tracked in the project' });
    }
    console.error('Create competitor error:', error);
    res.status(500).json({ error: 'Failed to create competitor' });
  }
});

router.put('/:id', validateParams(competitorParamSchema), validate(updateCompetitorSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertCompetitorOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const competitor = await updateCompetitor(id, req.body);
    res.json({ success: true, competitor: transformCompetitor(competitor) });
  } catch (error) {
    console.error('Update competitor error:', error);
    res.status(500).json({ error: 'Failed to update competitor' });
  }
});

router.delete('/:id', validateParams(competitorParamSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertCompetitorOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    await deleteCompetitor(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete competitor error:', error);
    res.status(500).json({ error: 'Failed to delete competitor' });
  }
});

router.post('/:id/scan', validateParams(competitorParamSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertCompetitorOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const result = await scanCompetitor(id);
    res.json({
      success: true,
      competitor: transformCompetitor(result.competitor),
      changes: result.changes,
      weeklySummary: result.weeklySummary
    });
  } catch (error) {
    console.error('Scan competitor error:', error);
    res.status(500).json({ error: 'Failed to scan competitor' });
  }
});

router.get('/:id/changes', validateParams(competitorParamSchema), validateQuery(paginationSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertCompetitorOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const { limit } = req.validatedQuery;
    const changes = await getCompetitorChanges(id, limit);
    res.json({ changes });
  } catch (error) {
    console.error('Get competitor changes error:', error);
    res.status(500).json({ error: 'Failed to get competitor changes' });
  }
});

router.get('/:id/comparison', validateParams(competitorParamSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertCompetitorOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const comparisons = await getCompetitorComparison(id);
    res.json({ comparisons });
  } catch (error) {
    console.error('Get competitor comparison error:', error);
    res.status(500).json({ error: 'Failed to get competitor comparison' });
  }
});

router.get('/:id/summary', validateParams(competitorParamSchema), validateQuery(summaryQuerySchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertCompetitorOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const { days } = req.validatedQuery;
    const summary = await getCompetitorWeeklySummary(id, days);
    res.json({ summary });
  } catch (error) {
    console.error('Get competitor summary error:', error);
    res.status(500).json({ error: 'Failed to get competitor summary' });
  }
});

export default router;
