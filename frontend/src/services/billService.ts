// frontend/src/services/billService.ts

import axiosInstance from '../api/axiosInstance';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export interface GetBillsParams {
  page?: number;
  limit?: number;
  chamber?: string;
  status?: string;
  sortBy?: string;
  order?: string;
  search?: string;
}

export const getBills = async (params: GetBillsParams = {}) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/bills`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching bills:', error);
    throw error;
  }
};

// New function to get a single bill by ID
export const getBillById = async (id: number) => {
  try {
    const response = await axiosInstance.get(`${API_URL}/bills/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching bill:', error);
    throw error;
  }
};
