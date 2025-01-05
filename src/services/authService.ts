// src/services/authService.ts

import axiosInstance from '../api/axiosInstance';

export const getToken = () => {
  return localStorage.getItem('token'); // Adjust based on how you store the token
};

export const login = async (email: string, password: string) => {
  const response = await axiosInstance.post('/auth/login', { email, password });
  return response.data.token;
};

export const registerUser = async (
  username: string,
  email: string,
  password: string
) => {
  await axiosInstance.post('/auth/register', { username, email, password });
};

export const decodeUserFromToken = (token: string) => {
  const user = JSON.parse(atob(token.split('.')[1]));
  user.id = user.userId;
  return user;
};
