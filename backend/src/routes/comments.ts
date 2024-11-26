// backend/src/routes/comments.ts

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/comments
// Submit a comment on a bill
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  // Access req.user, making sure to handle the possibility that it might be undefined
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { billId, content, parentCommentId } = req.body;
  const userId = req.user.userId;

  // Basic validation
  if (!billId || !content) {
    return res.status(400).json({ error: 'billId and content are required' });
  }

  // Validation for comment length (e.g., max 10,000 characters)
  if (content.length > 10000) {
    return res.status(400).json({ error: 'Comment is too long.' });
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
        userId: userId,
        billId,
        content,
        parentCommentId: parentCommentId || null,
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
  const sortOption =
    req.query.sort === 'best' ? { voteCount: 'desc' } : { date: 'desc' };

  try {
    const comments = await getCommentsWithVotes(
      null,
      parseInt(billId),
      sortOption
    );

    res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recursive function to fetch comments with vote counts and replies
async function getCommentsWithVotes(
  parentCommentId: number | null,
  billId: number,
  sortOption?: any
): Promise<any[]> {
  const comments = await prisma.comment.findMany({
    where: {
      billId,
      parentCommentId,
    },
    include: {
      user: true,
    },
    orderBy: sortOption || { date: 'desc' },
  });

  // Fetch vote counts and replies for each comment
  const commentsWithVotes = await Promise.all(
    comments.map(async (comment: any) => {
      const voteCount = await getVoteCount(comment.id);
      const replies = await getCommentsWithVotes(comment.id, billId);
      return {
        ...comment,
        username: comment.user.username || 'Anonymous',
        voteCount,
        replies,
      };
    })
  );

  return commentsWithVotes;
}

// Helper function to get the vote count for a comment
async function getVoteCount(commentId: number): Promise<number> {
  const result = await prisma.commentVote.aggregate({
    where: { commentId },
    _sum: {
      voteType: true,
    },
  });
  return result._sum.voteType || 0;
}

export default router;
