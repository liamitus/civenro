import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getRepresentativesByAddress } from '../utils/civicApi';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

type Representative = {
  name: any;
  party: any;
  office: any;
};

type RepresentativeDetails = {
  levels: string | string[];
  roles: string | string[];
  officialIndices: number[];
  name: any;
};

// POST /api/representatives/by-address
router.post(
  '/by-address',
  authenticateToken,
  async (req: Request, res: Response) => {
    const { address, billId } = req.body;

    if (!address || !billId) {
      return res.status(400).json({ error: 'Address and billId are required' });
    }

    try {
      const data = await getRepresentativesByAddress(address);

      // Process the data to extract representatives
      const { officials, offices } = data;

      const reps: Representative[] = [];

      offices.forEach((office: RepresentativeDetails) => {
        if (
          office.levels &&
          office.levels.includes('country') &&
          (office.roles.includes('legislatorLowerBody') ||
            office.roles.includes('legislatorUpperBody'))
        ) {
          office.officialIndices.forEach((index: number) => {
            const official = officials[index];
            reps.push({
              name: official.name,
              party: official.party,
              office: office.name,
            });
          });
        }
      });

      // For each representative, fetch their vote on the bill
      const repsWithVotes = await Promise.all(
        reps.map(async (rep) => {
          // Match representative in your database
          const dbRep = await prisma.representative.findFirst({
            where: {
              OR: [
                { firstName: { contains: rep.name.split(' ')[0] } },
                { lastName: { contains: rep.name.split(' ').slice(-1)[0] } },
              ],
            },
          });

          if (dbRep) {
            // Get their vote on the bill
            const repVote = await prisma.representativeVote.findUnique({
              where: {
                representativeId_billId: {
                  representativeId: dbRep.id,
                  billId: parseInt(billId),
                },
              },
            });

            return { ...rep, vote: repVote?.vote || 'No vote recorded' };
          } else {
            return { ...rep, vote: 'Representative not found in database' };
          }
        })
      );

      res.status(200).json({ representatives: repsWithVotes });
    } catch (error) {
      console.error('Error fetching representatives:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
