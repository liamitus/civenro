// src/services/authService.ts

export const getToken = () => {
  return localStorage.getItem('token'); // Adjust based on how you store the token
};
