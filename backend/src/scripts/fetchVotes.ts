import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'https://www.govtrack.us/api/v2';

async function fetchVotes() {
  try {
    // Fetch recent votes
    const params = {
      limit: 1000,
      order_by: '-created',
    };
    const response = await axios.get(`${BASE_URL}/vote_voter`, { params });
    const voteVoters = response.data.objects;

    for (const voteVoter of voteVoters) {
      const person = voteVoter.person;
      const vote = voteVoter.vote;

      // Find the representative in the database
      const representative = await prisma.representative.findUnique({
        where: { govtrackId: person.id },
      });

      // Find the bill in the database
      const billId = vote.bill?.id;
      if (!representative || !billId) continue;

      const bill = await prisma.bill.findUnique({
        where: { govtrackId: billId },
      });

      if (!bill) continue;

      // Upsert the representative's vote
      await prisma.representativeVote.upsert({
        where: {
          representativeId_billId: {
            representativeId: representative.id,
            billId: bill.id,
          },
        },
        update: {
          vote: voteVoter.option.value,
        },
        create: {
          representativeId: representative.id,
          billId: bill.id,
          vote: voteVoter.option.value,
        },
      });
    }
    console.log('Votes fetched and stored successfully.');
  } catch (error) {
    console.error('Error fetching votes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchVotes();
