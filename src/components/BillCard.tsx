// src/components/BillCard.tsx

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import { Link } from 'react-router-dom';
import HouseIcon from '@mui/icons-material/House';
import GavelIcon from '@mui/icons-material/Gavel';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import dayjs from 'dayjs'; // Import dayjs for consistent date formatting

interface Bill {
  id: number;
  billId: string;
  title: string;
  date: string;
  billType: string;
  currentChamber: string;
  currentStatus: string;
  currentStatusLabel?: string;
  currentStatusDate: string;
  introducedDate: string;
  link: string;
}

interface BillCardProps {
  bill: Bill;
}

const BillCard: React.FC<BillCardProps> = ({ bill }) => {
  // Determine chamber icon and color
  const getChamberFromBillType = () => {
    if (bill.billType.toLowerCase().startsWith('house')) {
      return 'house';
    } else if (bill.billType.toLowerCase().startsWith('senate')) {
      return 'senate';
    }
    return 'unknown';
  };

  const getChamberIcon = () => {
    const chamber = bill.currentChamber || getChamberFromBillType();
    if (chamber === 'house') {
      return <HouseIcon style={{ color: '#28a745' }} aria-label="House" />;
    } else if (chamber === 'senate') {
      return <GavelIcon style={{ color: '#007bff' }} aria-label="Senate" />;
    } else {
      return <HelpOutlineIcon aria-label="Unknown" />;
    }
  };

  // Determine bill type label
  const getBillTypeLabel = () => {
    switch (bill.billType.toLowerCase()) {
      case 'house_bill':
        return 'H.R.';
      case 'senate_bill':
        return 'S.';
      case 'house_concurrent_resolution':
        return 'H.Con.Res.';
      case 'senate_concurrent_resolution':
        return 'S.Con.Res.';
      // Add other cases as needed
      default:
        return '';
    }
  };

  // Determine status chip color
  const getStatusChipColor = () => {
    switch (bill.currentStatus.toLowerCase()) {
      case 'introduced':
        return 'default';
      case 'passed':
        return 'primary';
      case 'enacted':
        return 'success';
      default:
        return 'default';
    }
  };

  function toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  return (
    <Card
      data-testid="bill-card"
      variant="outlined"
      style={{ marginBottom: '16px' }}
    >
      <CardContent>
        <Box display="flex" alignItems="center">
          {/* Chamber Icon */}
          <Tooltip
            title={`${toTitleCase(
              bill.currentChamber || getChamberFromBillType()
            )}`}
          >
            {getChamberIcon()}
          </Tooltip>

          {/* Bill Title */}
          <Box ml={2} flexGrow={1}>
            <Link to={`/bill/${bill.id}`}>
              <Typography variant="h6">
                {getBillTypeLabel()} {bill.billId.split('-')[1]}: {bill.title}
              </Typography>
            </Link>
          </Box>

          {/* Status Chip */}
          <Chip
            data-testid="status-chip"
            label={bill.currentStatusLabel || bill.currentStatus}
            color={getStatusChipColor()}
            variant="outlined"
          />
        </Box>

        {/* Date Introduced */}
        <Box display="flex" alignItems="center" mt={1}>
          <CalendarTodayIcon fontSize="small" />
          <Typography variant="body2" color="textSecondary" ml={1}>
            Introduced on {dayjs(bill.introducedDate).format('M/D/YYYY')}
          </Typography>
        </Box>

        {/* Optional: Brief Summary */}
        {/* <Typography variant="body2" mt={2}>
          {bill.summary || 'No summary available.'}
        </Typography> */}
      </CardContent>
    </Card>
  );
};

export default BillCard;
