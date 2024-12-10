// src/api/axiosInstance.ts

import axios from 'axios';
import { API_URL } from '../services/API_URL';

const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add the token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Adjust based on your token storage
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
