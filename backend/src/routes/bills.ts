// backend/src/routes/bills.ts

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

// Fetch bills from API and cache in database
router.get('/', async (req, res) => {
  console.log('Retrieving bills...');
  try {
    // Check if bills are already in the database
    let bills = await prisma.bill.findMany();

    // If no bills are found, fetch from the GovTrack API
    if (bills.length === 0) {
      // Fetch bills from the GovTrack API
      const response = await axios.get('https://www.govtrack.us/api/v2/bill', {
        params: {
          congress: '118', // Current Congress session (as of 2023-2024)
          // chamber: 'senate', // Only Senate bills
          order_by: '-introduced_date', // Latest bills first
          limit: 20, // Number of bills to fetch (adjust as needed)
        },
      });

      // Process and save bills to the database
      const billsData = response.data.objects;

      console.log(billsData);
      const processedBills = billsData.map((bill: any) => ({
        billId: bill.id.toString(),
        title: bill.title,
        summary: bill.summary || 'No summary available.',
        date: new Date(bill.introduced_date),
      }));

      // Save the bills to the database using Prisma's createMany
      await prisma.bill.createMany({
        data: processedBills,
        skipDuplicates: true, // Avoids error if the bill already exists
      });

      // Retrieve the bills again from the database
      bills = await prisma.bill.findMany();
    }

    res.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

export default router;
