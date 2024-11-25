import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const getBills = async () => {
  try {
    const response = await axios.get(`${API_URL}/bills`);
    return response.data.map((bill: any) => ({
      id: bill.id,
      billId: bill.billId,
      title: bill.title,
      summary: bill.summary,
      date: bill.date,
      billType: bill.billType,
      currentChamber: bill.currentChamber,
    }));
  } catch (error) {
    console.error('Error fetching bills:', error);
    throw error;
  }
};
