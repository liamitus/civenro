// src/services/billService.ts

import axiosInstance from '../api/axiosInstance';

export interface GetBillsParams {
  page?: number;
  limit?: number;
  chamber?: string;
  status?: string;
  sortBy?: string;
  order?: string;
  search?: string;
}

export interface GetBillsResult {
  bills: any[];
  total: number;
}

export const getBills = async (
  params: GetBillsParams = {}
): Promise<GetBillsResult> => {
  try {
    const url = `${import.meta.env.VITE_API_URL}/bills`;
    const response = await axiosInstance.get(url, {
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
    const url = `${import.meta.env.VITE_API_URL}/bills/${id}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching bill:', error);
    throw error;
  }
};
