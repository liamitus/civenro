// backend/src/index.ts

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import billsRouter from './routes/bills';
import votesRouter from './routes/votes';
import commentsRouter from './routes/comments';
import commentVotesRouter from './routes/commentVotes';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5001;
const CORS_ORIGIN_PORT = process.env.CORS_ORIGIN_PORT || 4000;

app.use(
  cors({
    origin: `http://localhost:${CORS_ORIGIN_PORT}`, // Frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json());

// Define routes here
app.use('/api/bills', billsRouter);
app.use('/api/votes', votesRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/comment-votes', commentVotesRouter);

// Health Check Route
app.get('/', (req, res) => {
  res.send('Government Bills Platform API is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
