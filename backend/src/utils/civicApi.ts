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
    const data = response.data;

    // Attach bioguideId if available
    if (data.officials) {
      data.officials.forEach((official: any) => {
        const bioguideId = official.urls?.find((url: string) =>
          url.includes('bioguide.congress.gov')
        );
        if (bioguideId) {
          official.bioguideId = bioguideId.split('/').pop(); // Extract bioguideId from URL
        }
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching representatives:', error);
    throw error;
  }
};
