import axiosInstance from '../api/axiosInstance';
import { API_URL } from './API_URL';

const COMMENTS_API_URL = `${API_URL}/comments`;
const COMMENT_VOTES_API_URL = `${API_URL}/comment-votes`;

// Function to submit a comment
export const submitComment = async (
  billId: number,
  content: string,
  userId?: number,
  parentCommentId?: number
) => {
  try {
    const response = await axiosInstance.post(COMMENTS_API_URL, {
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
export const getComments = async (
  billId: number,
  page: number = 1,
  limit: number = 20,
  sort: string = 'new'
) => {
  try {
    const response = await axiosInstance.get(`/comments/bill/${billId}`, {
      params: { page, limit, sort },
    });
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
    const response = await axiosInstance.post(COMMENT_VOTES_API_URL, {
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

export const getUserComments = async (
  userId: number,
  page: number = 1,
  limit: number = 20
) => {
  try {
    const response = await axiosInstance.get(`/comments/user/${userId}`, {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user comments:', error);
    throw error;
  }
};
