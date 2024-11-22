import React from 'react';
import { Typography } from '@mui/material';

interface Bill {
  id: number;
  billId: string;
  title: string;
  summary: string;
  date: string;
}

interface BillSummaryProps {
  bill: Bill;
}

const BillSummary: React.FC<BillSummaryProps> = ({ bill }) => {
  return (
    <>
      <Typography variant="h5" gutterBottom>
        {bill.title}
      </Typography>
      <Typography variant="body2" gutterBottom>
        {bill.summary}
      </Typography>
    </>
  );
};

export default BillSummary;
