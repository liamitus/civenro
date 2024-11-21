// backend/src/utils/civicApi.ts

import axios from 'axios';
import qs from 'qs';

const API_KEY = process.env.GOOGLE_CIVIC_API_KEY;
const BASE_URL = 'https://www.googleapis.com/civicinfo/v2';

export const getRepresentativesByAddress = async (address: string) => {
  try {
    const params = {
      address,
      key: API_KEY,
      roles: ['legislatorLowerBody', 'legislatorUpperBody'],
      levels: ['country'],
    };

    const response = await axios.get(`${BASE_URL}/representatives`, {
      params,
      paramsSerializer: (params) => {
        return qs.stringify(params, { arrayFormat: 'repeat' }); // Serializes as 'roles=value1&roles=value2'
      },
    });
    const data = response.data;

    // Attach bioguideId if available
    if (data.officials) {
      data.officials.forEach((official: any) => {
        let bioguideId = '';
        if (
          official.photoUrl &&
          official.photoUrl.includes('bioguide.congress.gov')
        ) {
          const urlParts = official.photoUrl.split('/');
          const fileName = urlParts[urlParts.length - 1]; // e.g., 'S000148.jpg'
          bioguideId = fileName.split('.')[0]; // Remove '.jpg' extension
        }
        official.bioguideId = bioguideId;
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching representatives:', error);
    throw error;
  }
};
