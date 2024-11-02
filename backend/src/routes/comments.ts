// backend/src/routes/votes.ts

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/comments
// Submit a comment on a bill
router.post('/', async (req: Request, res: Response) => {
  const { userId, billId, content } = req.body;

  // Basic validation
  if (!billId || !content) {
    return res.status(400).json({ error: 'billId and content are required' });
  }

  try {
    // Check if the bill exists
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // If userId is provided, check if the user exists
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        userId: userId || null,
        billId,
        content,
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error submitting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/comments/:billId
// Retrieve comments for a specific bill
router.get('/:billId', async (req: Request, res: Response) => {
  const { billId } = req.params;

  try {
    const comments = await prisma.comment.findMany({
      where: { billId: parseInt(billId) },
      include: { user: true },
      orderBy: { date: 'desc' },
    });

    res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
