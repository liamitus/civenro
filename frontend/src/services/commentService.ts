import axios from 'axios';

const API_URL = 'http://localhost:5000/api/comments';

// Function to submit a comment
export const submitComment = async (
  billId: number,
  content: string,
  userId?: number
) => {
  try {
    const response = await axios.post(API_URL, {
      billId,
      content,
      userId, // Optional for anonymous comments
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting comment:', error);
    throw error;
  }
};

// Function to get comments for a bill
export const getComments = async (billId: number) => {
  try {
    const response = await axios.get(`${API_URL}/${billId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};
