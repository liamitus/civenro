// backend/src/routes/votes.ts

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/votes
// Submit a vote on a bill
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const { userId, billId, voteType } = req.body;

  // Basic validation
  if (!billId || !voteType) {
    return res.status(400).json({ error: 'billId and voteType are required' });
  }

  if (!['For', 'Against', 'Abstain'].includes(voteType)) {
    return res.status(400).json({ error: 'Invalid voteType' });
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

      // Upsert vote for authenticated user
      const vote = await prisma.vote.upsert({
        where: { userId_billId: { userId, billId } },
        update: { voteType },
        create: {
          userId,
          billId,
          voteType,
        },
      });

      return res.status(200).json(vote);
    } else {
      // Create a new vote for anonymous user
      const vote = await prisma.vote.create({
        data: {
          userId: null,
          billId,
          voteType,
        },
      });

      return res.status(201).json(vote);
    }
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/votes/:billId
// Retrieve votes for a specific bill
router.get('/:billId', async (req: Request, res: Response) => {
  const { billId } = req.params;

  try {
    const votes = await prisma.vote.findMany({
      where: { billId: parseInt(billId) },
      include: { user: true },
    });

    res.status(200).json(votes);
  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
