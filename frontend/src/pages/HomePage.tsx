import React, { useEffect, useState } from 'react';
import { getBills, GetBillsParams } from '../services/billService';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import BillCard from '../components/BillCard';
import InfiniteScroll from 'react-infinite-scroll-component';

interface Bill {
  id: number;
  billId: string;
  title: string;
  date: string;
  billType: string;
  currentChamber: string;
  currentStatus: string;
  currentStatusDate: string;
  introducedDate: string;
  link: string;
}

const HomePage = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalBills, setTotalBills] = useState(0);
  const [filters, setFilters] = useState<GetBillsParams>({
    page: 1,
    limit: 20,
    chamber: 'both',
    status: '',
    sortBy: 'introducedDate',
    order: 'desc',
    search: '',
  });

  const fetchBills = async () => {
    try {
      const data = await getBills(filters);
      setBills((prevBills) => [...prevBills, ...data.bills]);
      setTotalBills(data.total);
      setHasMore(bills.length + data.bills.length < data.total);
      setPage((prevPage) => prevPage + 1);
      setFilters((prevFilters) => ({
        ...prevFilters,
        page: prevFilters.page! + 1,
      }));
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  useEffect(() => {
    // Reset bills when filters change
    setBills([]);
    setPage(1);
    setHasMore(true);
    setFilters((prevFilters) => ({ ...prevFilters, page: 1 }));
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.chamber,
    filters.status,
    filters.search,
    filters.sortBy,
    filters.order,
  ]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: event.target.value, page: 1 });
  };

  const handleChamberChange = (event: SelectChangeEvent<string>) => {
    setFilters({ ...filters, chamber: event.target.value as string, page: 1 });
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setFilters({ ...filters, status: event.target.value as string, page: 1 });
  };

  const handleSortByChange = (event: SelectChangeEvent<string>) => {
    setFilters({ ...filters, sortBy: event.target.value as string, page: 1 });
  };

  const handleOrderChange = (event: SelectChangeEvent<string>) => {
    setFilters({ ...filters, order: event.target.value as string, page: 1 });
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Latest Bills
      </Typography>

      {/* Filters */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
        {/* Search Field */}
        <TextField
          variant="outlined"
          label="Search Bills"
          value={filters.search}
          onChange={handleSearchChange}
        />

        {/* Chamber Filter */}
        <FormControl variant="outlined">
          <InputLabel>Chamber</InputLabel>
          <Select
            value={filters.chamber}
            onChange={handleChamberChange}
            label="Chamber"
          >
            <MenuItem value="both">Both</MenuItem>
            <MenuItem value="house">House</MenuItem>
            <MenuItem value="senate">Senate</MenuItem>
          </Select>
        </FormControl>

        {/* Status Filter */}
        <FormControl variant="outlined">
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            onChange={handleStatusChange}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="introduced">Introduced</MenuItem>
            <MenuItem value="passed">Passed</MenuItem>
            <MenuItem value="enacted">Enacted</MenuItem>
            {/* Add other statuses as needed */}
          </Select>
        </FormControl>

        {/* Sort By */}
        <FormControl variant="outlined">
          <InputLabel>Sort By</InputLabel>
          <Select
            value={filters.sortBy}
            onChange={handleSortByChange}
            label="Sort By"
          >
            <MenuItem value="introducedDate">Introduced Date</MenuItem>
            <MenuItem value="currentStatusDate">Status Date</MenuItem>
            {/* Add other sort options as needed */}
          </Select>
        </FormControl>

        {/* Order */}
        <FormControl variant="outlined">
          <InputLabel>Order</InputLabel>
          <Select
            value={filters.order}
            onChange={handleOrderChange}
            label="Order"
          >
            <MenuItem value="desc">Descending</MenuItem>
            <MenuItem value="asc">Ascending</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Bills List with Infinite Scroll */}
      <InfiniteScroll
        dataLength={bills.length}
        next={fetchBills}
        hasMore={hasMore}
        loader={<h4>Loading...</h4>}
        endMessage={<p>No more bills to display.</p>}
      >
        {bills.map((bill) => (
          <BillCard key={bill.id} bill={bill} />
        ))}
      </InfiniteScroll>
    </Container>
  );
};

export default HomePage;
