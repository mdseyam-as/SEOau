import express from 'express';
import { z } from 'zod';
import { ensureProjectSiteSchemaReady } from '../lib/projectSiteSchema.js';
import { prisma } from '../lib/prisma.js';
import { validate, validateParams } from '../middleware/validate.js';
import {
  createProjectSiteSchema,
  updateProjectSiteSchema
} from '../schemas/index.js';
import {
  createProjectSite,
  deleteProjectSite,
  getProjectSite,
  importProjectSiteLinks,
  scanProjectSite,
  updateProjectSite
} from '../services/projectSiteService.js';

const router = express.Router();

const projectParamSchema = z.object({
  projectId: z.string().uuid('Invalid project ID')
});

const siteParamSchema = z.object({
  id: z.string().uuid('Invalid site ID')
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

async function assertSiteOwnership(siteId, userId) {
  await ensureProjectSiteSchemaReady();

  const site = await prisma.projectSite.findUnique({
    where: { id: siteId },
    include: {
      project: true
    }
  });

  if (!site) {
    return { error: { status: 404, body: { error: 'Project site not found' } } };
  }

  if (site.project.userId !== userId) {
    return { error: { status: 403, body: { error: 'Forbidden' } } };
  }

  return { site };
}

router.get('/projects/:projectId/site', validateParams(projectParamSchema), async (req, res) => {
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

    const site = await getProjectSite(projectId);
    res.json({ site });
  } catch (error) {
    console.error('Get project site error:', error);
    res.status(500).json({ error: 'Failed to get project site' });
  }
});

router.post('/projects/:projectId/site', validateParams(projectParamSchema), validate(createProjectSiteSchema), async (req, res) => {
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

    const site = await createProjectSite(projectId, req.body);
    res.json({ success: true, site });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'This project already has a configured site' });
    }
    console.error('Create project site error:', error);
    res.status(500).json({ error: 'Failed to create project site' });
  }
});

router.put('/site/:id', validateParams(siteParamSchema), validate(updateProjectSiteSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertSiteOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const site = await updateProjectSite(id, req.body);
    res.json({ success: true, site });
  } catch (error) {
    console.error('Update project site error:', error);
    res.status(500).json({ error: 'Failed to update project site' });
  }
});

router.delete('/site/:id', validateParams(siteParamSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertSiteOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    await deleteProjectSite(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete project site error:', error);
    res.status(500).json({ error: 'Failed to delete project site' });
  }
});

router.post('/site/:id/scan', validateParams(siteParamSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertSiteOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const site = await scanProjectSite(id);
    res.json({ success: true, site });
  } catch (error) {
    console.error('Scan project site error:', error);
    res.status(500).json({ error: 'Failed to scan project site' });
  }
});

router.post('/site/:id/import-links', validateParams(siteParamSchema), async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = req.validatedParams || req.params;
    const ownership = await assertSiteOwnership(id, userId);
    if (ownership.error) {
      return res.status(ownership.error.status).json(ownership.error.body);
    }

    const result = await importProjectSiteLinks(id, userId);
    const site = await getProjectSite(ownership.site.projectId);
    res.json({ success: true, result, site });
  } catch (error) {
    console.error('Import project site links error:', error);
    res.status(500).json({ error: 'Failed to import project site links' });
  }
});

export default router;
