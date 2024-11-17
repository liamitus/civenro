import axios from 'axios';
import { API_URL } from './API_URL';

export const getRepresentativesByAddress = async (
  address: string,
  billId: number
) => {
  const response = await axios.post(`${API_URL}/by-address`, {
    address,
    billId,
  });
  return response.data.representatives;
};
