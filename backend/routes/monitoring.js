import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import {
  createMonitoredPageSchema,
  paginationSchema,
  updateMonitoredPageSchema
} from '../schemas/index.js';
import {
  createMonitoredPage,
  deleteMonitoringPage,
  getMonitoringPageEvents,
  getProjectMonitoringPages,
  runMonitoringCheck,
  updateMonitoredPage
} from '../services/monitoringService.js';

const router = express.Router();

const projectParamSchema = z.object({
  projectId: z.string().uuid('Invalid project ID')
});

const pageParamSchema = z.object({
  id: z.string().uuid('Invalid monitoring page ID')
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

async function assertPageOwnership(pageId, userId) {
  const page = await prisma.monitoredPage.findUnique({
    where: { id: pageId },
    include: {
      project: true
    }
  });

  if (!page) {
    return { error: { status: 404, body: { error: 'Monitoring page not found' } } };
  }

  if (page.project.userId !== userId) {
    return { error: { status: 403, body: { error: 'Forbidden' } } };
  }

  return { page };
}

function transformPage(page) {
  const latestSnapshot = page.snapshots?.[0] || null;
  const { snapshots, events, ...rest } = page;
  return {
    ...rest,
    latestSnapshot,
    recentEvents: events || []
  };
}

router.get('/projects/:projectId/pages', validateParams(projectParamSchema), async (req, res) => {
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

    const pages = await getProjectMonitoringPages(projectId);
    res.json({ pages: pages.map(transformPage) });
  } catch (error) {
    console.error('Get monitoring pages error:', error);
    res.status(500).json({ error: 'Failed to get monitoring pages' });
  }
});

router.post('/projects/:projectId/pages', validateParams(projectParamSchema), validate(createMonitoredPageSchema), async (req, res) => {
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

    const page = await createMonitoredPage(projectId, req.body);
    res.json({ success: true, page: transformPage(page) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'This URL is already monitored in the project' });
    }
    console.error('Create monitoring page error:', error);
    res.status(500).json({ error: 'Failed to create monitoring page' });
  }
});

router.put('/pages/:id', validateParams(pageParamSchema), validate(updateMonitoredPageSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertPageOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const page = await updateMonitoredPage(id, req.body);
    res.json({ success: true, page: transformPage(page) });
  } catch (error) {
    console.error('Update monitoring page error:', error);
    res.status(500).json({ error: 'Failed to update monitoring page' });
  }
});

router.delete('/pages/:id', validateParams(pageParamSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertPageOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    await deleteMonitoringPage(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete monitoring page error:', error);
    res.status(500).json({ error: 'Failed to delete monitoring page' });
  }
});

router.post('/pages/:id/check', validateParams(pageParamSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertPageOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const result = await runMonitoringCheck(id);
    const page = await prisma.monitoredPage.findUnique({
      where: { id },
      include: {
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    });

    res.json({
      success: true,
      page: transformPage(page),
      event: result.event
    });
  } catch (error) {
    console.error('Run monitoring check error:', error);
    res.status(500).json({ error: 'Failed to run monitoring check' });
  }
});

router.get('/pages/:id/events', validateParams(pageParamSchema), validateQuery(paginationSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertPageOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const { limit } = req.validatedQuery;
    const events = await getMonitoringPageEvents(id, limit);
    res.json({ events });
  } catch (error) {
    console.error('Get monitoring events error:', error);
    res.status(500).json({ error: 'Failed to get monitoring events' });
  }
});

export default router;
