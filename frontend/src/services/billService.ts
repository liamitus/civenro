import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const getBills = async () => {
  const response = await axios.get(`${API_URL}/bills`);
  return response.data;
};
