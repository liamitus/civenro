import { getToken } from './authService';
import axiosInstance from '../api/axiosInstance';

export const getRepresentativesByAddress = async (
  address: string,
  billId: number
) => {
  const token = getToken(); // Retrieve the JWT token from localStorage or context
  const response = await axiosInstance.post(
    `/representatives/by-address`,
    {
      address,
      billId,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const representatives = response.data.representatives;
  return representatives.map((rep: any) => ({
    name: rep.name,
    vote: rep.vote,
    imageUrl: rep.imageUrl ?? null, // Set to null if undefined
    link: rep.link ?? null, // Set to null if undefined
    ...rep,
  }));
};
