// src/api/axiosInstance.ts

import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5001/api',
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
