// frontend/src/services/voteService.ts

import axios from 'axios';
import { API_URL } from './API_URL';

// Function to submit a vote
export const submitVote = async (
  billId: number,
  voteType: 'For' | 'Against' | 'Abstain'
) => {
  try {
    const response = await axios.post(API_URL, {
      billId,
      voteType,
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting vote:', error);
    throw error;
  }
};

// Function to get votes for a bill
export const getVotes = async (billId: number) => {
  try {
    const response = await axios.get(`${API_URL}/${billId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching votes:', error);
    throw error;
  }
};
