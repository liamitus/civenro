import React from 'react';
import { Typography, Link } from '@mui/material';

interface Bill {
  id: number;
  billId: string;
  title: string;
  summary: string;
  date: string;
  link: string;
}

interface BillSummaryProps {
  bill: Bill;
}

const BillSummary: React.FC<BillSummaryProps> = ({ bill }) => {
  return (
    <>
      <Link
        href={bill.link}
        target="_blank"
        rel="noopener noreferrer"
        underline="none"
        color="inherit"
      >
        <Typography variant="h5" gutterBottom>
          {bill.title}
        </Typography>
      </Link>
      <Typography variant="body2" gutterBottom>
        {bill.summary}
      </Typography>
    </>
  );
};

export default BillSummary;
