import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'https://www.govtrack.us/api/v2';

async function fetchBills() {
  try {
    const params = {
      congress: 'current',
      limit: 1000,
      order_by: '-introduced_date',
    };
    const response = await axios.get(`${BASE_URL}/bill`, { params });
    const bills = response.data.objects;

    for (const bill of bills) {
      await prisma.bill.upsert({
        where: { govtrackId: bill.id },
        update: {
          billType: bill.bill_type,
          number: bill.number,
          congress: bill.congress,
          title: bill.title_without_number,
          summary: bill.summary || bill.title_without_number,
          introducedDate: new Date(bill.introduced_date),
          currentStatus: bill.current_status,
        },
        create: {
          govtrackId: bill.id,
          billType: bill.bill_type,
          number: bill.number,
          congress: bill.congress,
          title: bill.title_without_number,
          summary: bill.summary || bill.title_without_number,
          introducedDate: new Date(bill.introduced_date),
          currentStatus: bill.current_status,
        },
      });
    }
    console.log('Bills fetched and stored successfully.');
  } catch (error) {
    console.error('Error fetching bills:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchBills();
