// src/pages/HomePage.test.tsx

// 1) Mock the getBills function
vi.mock('../services/billService');

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage';
import { getBills } from '../services/billService';
import { MemoryRouter } from 'react-router-dom';
import { makeBill } from '../test-utils/billFactory';

describe('HomePage', () => {
  const mockBills = [
    makeBill({
      id: 1,
      billId: 'HR100',
      title: 'An Act to Do Something',
      date: '2023-01-01',
      billType: 'hr',
      currentChamber: 'house',
      currentStatus: 'introduced',
      currentStatusDate: '2023-01-02',
      introducedDate: '2023-01-01',
      link: 'http://example.com/hr100',
    }),
    makeBill({
      id: 2,
      billId: 'SB200',
      title: 'Another Bill',
      date: '2023-02-01',
      billType: 's',
      currentChamber: 'senate',
      currentStatus: 'passed',
      currentStatusDate: '2023-02-15',
      introducedDate: '2023-02-01',
      link: 'http://example.com/sb200',
    }),
  ];

  beforeEach(() => {
    // Reset mocks before each test, so each test has a fresh start
    vi.resetAllMocks();
  });

  it('renders bills from a successful fetch', async () => {
    // 2) Make getBills resolve with sample data
    vi.mocked(getBills).mockResolvedValue({
      bills: mockBills,
      total: 2,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // 3) Wait for the bills to appear
    // We expect the Bill titles to appear on the screen
    const billOneTitle = await screen.findByText(/An Act to Do Something/i);
    const billTwoTitle = await screen.findByText(/Another Bill/i);
    expect(billOneTitle).toBeInTheDocument();
    expect(billTwoTitle).toBeInTheDocument();
  });

  it('shows a message when no bills are returned', async () => {
    // Return empty bills array
    vi.mocked(getBills).mockResolvedValue({
      bills: [],
      total: 0,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // Since we are using an InfiniteScroll, you might see "No more bills" or something
    // But you can assert that we have no Bill titles
    await waitFor(() => {
      // e.g. if your code shows "No more bills to display." or an empty state:
      expect(screen.getByText(/No more bills to display/i)).toBeInTheDocument();
    });
  });

  it('displays an error message if fetching bills fails', async () => {
    // Force getBills to reject
    vi.mocked(getBills).mockRejectedValue(new Error('Server is down'));

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // Wait for error message
    const errorElement = await screen.findByText(/Failed to load bills/i);
    expect(errorElement).toBeInTheDocument();
  });

  it('handles filter changes and fetches new data', async () => {
    // For the initial load, return some data
    vi.mocked(getBills).mockResolvedValueOnce({
      bills: mockBills,
      total: 2,
    });
    // For the second load (after changing filters), return different data
    vi.mocked(getBills).mockResolvedValueOnce({
      bills: [
        {
          id: 3,
          billId: 'HR999',
          title: 'A House Bill after Filter Change',
          date: '2024-01-01',
          billType: 'hr',
          currentChamber: 'house',
          currentStatus: 'introduced',
          currentStatusDate: '2024-01-02',
          introducedDate: '2024-01-01',
          link: 'http://example.com/hr999',
        },
      ],
      total: 1,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // Wait for initial bills
    const billOneTitle = await screen.findByText(/An Act to Do Something/i);
    const billTwoTitle = await screen.findByText(/Another Bill/i);
    expect(billOneTitle).toBeInTheDocument();
    expect(billTwoTitle).toBeInTheDocument();

    // **Change a filter**: e.g., Chamber from "Both" to "House"
    const chamberSelect = screen.getByLabelText('Chamber');
    userEvent.click(chamberSelect);
    const houseOption = await screen.findByRole('option', { name: /house/i });
    userEvent.click(houseOption);

    // Wait for the new bill to appear
    const newBillTitle = await screen.findByText(
      /A House Bill after Filter Change/i
    );
    expect(newBillTitle).toBeInTheDocument();

    // Optionally assert that the old bills are not shown if your code resets them
    // For instance, if you reset the array on filter change
    expect(
      screen.queryByText('An Act to Do Something')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Another Bill')).not.toBeInTheDocument();

    // You can also check how many times getBills was called
    expect(getBills).toHaveBeenCalledTimes(2);

    // The second call should include updated filters (chamber: 'house')
    // You can inspect the arguments if your code calls getBills(filters)
    // But you'll need to pass the same shape to the mock as your real code
    expect(getBills).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        chamber: 'house',
        page: 1,
      })
    );
  });
});
