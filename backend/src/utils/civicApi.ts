// backend/src/utils/civicApi.ts

import axios from 'axios';

const API_KEY = process.env.GOOGLE_CIVIC_API_KEY;
const BASE_URL = 'https://www.googleapis.com/civicinfo/v2';

export const getRepresentativesByAddress = async (address: string) => {
  try {
    const params = {
      address,
      key: API_KEY,
      roles: 'legislatorLowerBody,legislatorUpperBody',
    };
    const response = await axios.get(`${BASE_URL}/representatives`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching representatives:', error);
    throw error;
  }
};
