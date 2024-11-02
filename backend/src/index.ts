// backend/src/index.ts

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import billsRouter from './routes/bills';
import votesRouter from './routes/votes';
import commentsRouter from './routes/comments';

const app = express();
const prisma = new PrismaClient();

app.use(
  cors({
    origin: 'http://localhost:3000', // Frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json());

// Define routes here
app.use('/api/bills', billsRouter);
app.use('/api/votes', votesRouter);
app.use('/api/comments', commentsRouter);

// Health Check Route
app.get('/', (req, res) => {
  res.send('Government Bills Platform API is running.');
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
