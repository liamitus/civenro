// frontend/src/services/userService.ts

import axiosInstance from '../api/axiosInstance';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const getUserProfile = async (userId: number) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const updateUsername = async (username: string) => {
  try {
    const response = await axiosInstance.put(`${API_URL}/users/username`, {
      username,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating username:', error);
    throw error;
  }
};

export const updateEmail = async (email: string) => {
  try {
    const response = await axiosInstance.put(`${API_URL}/users/email`, {
      email,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating email:', error);
    throw error;
  }
};

export const updatePassword = async (
  currentPassword: string,
  newPassword: string
) => {
  try {
    const response = await axiosInstance.put(`${API_URL}/users/password`, {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};
