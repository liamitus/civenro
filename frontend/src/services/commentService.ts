import axios from 'axios';

const API_URL = 'http://localhost:5001/api/comments';
const COMMENT_VOTES_API_URL = 'http://localhost:5001/api/comment-votes';

// Function to submit a comment
export const submitComment = async (
  billId: number,
  content: string,
  userId?: number,
  parentCommentId?: number
) => {
  try {
    const response = await axios.post(API_URL, {
      billId,
      content,
      userId, // Optional for anonymous comments
      parentCommentId,
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data.error) {
      // Forward the error message
      throw new Error(error.response.data.error);
    }
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

export const submitCommentVote = async (
  commentId: number,
  voteType: number,
  userId: number
) => {
  try {
    const response = await axios.post(COMMENT_VOTES_API_URL, {
      commentId,
      voteType,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting comment vote:', error);
    throw error;
  }
};
