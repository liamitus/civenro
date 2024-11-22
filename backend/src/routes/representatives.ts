// backend/src/routes/representatives.ts

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getRepresentativesByAddress } from '../utils/civicApi';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

type Representative = {
  bioguideId: string;
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
              bioguideId: official.bioguideId || '',
            });
          });
        }
      });

      // For each representative, fetch their vote on the bill
      const repsWithVotes = await Promise.all(
        reps.map(async (rep) => {
          // If the Civic API provides bioguideId, use it
          const bioguideId = rep.bioguideId;

          let dbRep;

          if (bioguideId) {
            dbRep = await prisma.representative.findUnique({
              where: { bioguideId },
            });
          } else {
            // Normalize names
            const normalizeName = (name: string) =>
              name.toLowerCase().replace(/[^a-z]/g, '');
            const officialFirstName = normalizeName(rep.name.split(' ')[0]);
            const officialLastName = normalizeName(
              rep.name.split(' ').slice(1).join(' ')
            );

            dbRep = await prisma.representative.findFirst({
              where: {
                firstName: { contains: officialFirstName, mode: 'insensitive' },
                lastName: { contains: officialLastName, mode: 'insensitive' },
              },
            });
          }

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

            return {
              ...rep,
              vote: repVote?.vote || 'No vote recorded',
              imageUrl: dbRep.imageUrl,
              link: dbRep.link,
            };
          } else {
            return {
              ...rep,
              vote: 'Representative not found in database',
              imageUrl: null, // Or provide a default image URL
              link: null, // Or provide a default link
            };
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
