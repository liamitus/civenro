import React, { useEffect, useState } from 'react';
import { getBills } from '../services/billService';
import { Link } from 'react-router-dom';
import { Container, Box, Typography } from '@mui/material';

const HomePage = () => {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    const fetchBills = async () => {
      const data = await getBills();
      setBills(data);
    };
    fetchBills();
  }, []);

  return (
    <Container>
      {bills.map((bill: any) => (
        <Box key={bill.id} mt={2}>
          <Link to={`/bills/${bill.id}`} style={{ textDecoration: 'none' }}>
            <Typography variant="h6">{bill.title}</Typography>
          </Link>
        </Box>
      ))}
    </Container>
  );
};

export default HomePage;
