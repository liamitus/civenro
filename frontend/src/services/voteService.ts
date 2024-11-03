import axios from 'axios';

const API_URL = 'http://localhost:5001/api/votes';

// Function to submit a vote
export const submitVote = async (
  billId: number,
  voteType: 'For' | 'Against' | 'Abstain',
  userId?: number
) => {
  try {
    const response = await axios.post(API_URL, {
      billId,
      voteType,
      userId, // Optional for anonymous votes
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
