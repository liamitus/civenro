// src/services/voteService.ts

import axios from 'axios';
import { API_URL } from './API_URL';

const BASE_URL = `${API_URL}/votes`;

// Function to submit a vote
export const submitVote = async (
  billId: number,
  voteType: 'For' | 'Against' | 'Abstain'
) => {
  try {
    const response = await axios.post(BASE_URL, {
      billId,
      voteType,
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting vote:', error);
    throw error;
  }
};

// Function to get aggregated votes for a bill
export const getVotes = async (billId: number) => {
  try {
    const response = await axios.get(`${BASE_URL}/${billId}`);

    return response.data; // { publicVotes: [{ voteType: string, count: number }], congressionalVotes: [{ vote: string, count: number }] }
  } catch (error) {
    console.error('Error fetching votes:', error);
    throw error;
  }
};
