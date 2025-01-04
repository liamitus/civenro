// src/services/userService.ts

import axiosInstance from '../api/axiosInstance';

export const getUserProfile = async (userId: number) => {
  try {
    const response = await axiosInstance.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const updateUsername = async (username: string) => {
  try {
    const response = await axiosInstance.put('/users/username', {
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
    const response = await axiosInstance.put('/users/email', {
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
    const response = await axiosInstance.put('/users/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};
