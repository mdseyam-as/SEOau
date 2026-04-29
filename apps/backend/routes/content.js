import express from 'express';
import { z } from 'zod';
import { validateParams } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

const contentIdParamSchema = z.object({
    id: z.string().uuid('Invalid content ID')
});

/**
 * GET /api/content/:id/raw
 * Public crawler endpoint for AIO Markdown.
 */
router.get('/:id/raw', validateParams(contentIdParamSchema), async (req, res) => {
    try {
        const historyItem = await prisma.history.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                mode: true,
                markdownContent: true,
                result: true
            }
        });

        if (!historyItem) {
            return res.status(404).type('text/plain; charset=utf-8').send('Content not found');
        }

        const markdown = historyItem.markdownContent || historyItem.result?.markdownContent || '';
        const isAioContent = historyItem.mode === 'geo' || historyItem.mode === 'aio' || Boolean(markdown);

        if (!isAioContent || !markdown) {
            return res.status(404).type('text/plain; charset=utf-8').send('Raw AIO Markdown not found');
        }

        res
            .type('text/markdown; charset=utf-8')
            .set({
                'Cache-Control': 'public, max-age=300',
                'X-Robots-Tag': 'index, follow',
                'Content-Disposition': `inline; filename="${historyItem.id}.md"`
            })
            .send(markdown);
    } catch (error) {
        console.error('Public raw AIO content error:', error);
        res.status(500).type('text/plain; charset=utf-8').send('Failed to get raw AIO content');
    }
});

export default router;
