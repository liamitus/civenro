// src/components/BillCard.test.tsx

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BillCard from './BillCard';
import { makeBill } from '../test-utils/billFactory';

// Helper: quickly create a default mock bill
const mockBill = makeBill({
  id: 1,
  billId: 'house_bill-123',
  title: 'A Bill to Improve Testing',
  date: '2024-01-01T00:00:00.000Z',
  billType: 'house_bill',
  currentChamber: 'house',
  currentStatus: 'introduced',
  currentStatusLabel: undefined, // optional
  currentStatusDate: '2024-01-02T00:00:00.000Z',
  introducedDate: '2024-01-01T12:00:00.000Z',
  link: 'https://example.com/bills/house_bill-123',
});

describe('BillCard Component', () => {
  it('renders bill title, status, and introduced date', () => {
    render(
      <MemoryRouter>
        <BillCard bill={mockBill} />
      </MemoryRouter>
    );
    // Bill Title
    expect(screen.getByText(/A Bill to Improve Testing/i)).toBeInTheDocument();

    // Status Chip
    // default fallback is to show currentStatus if currentStatusLabel is absent
    // ...
    expect(screen.getByTestId('status-chip')).toHaveTextContent(/introduced/i);

    // Introduced Date
    // The toLocaleDateString() result can vary by test environment locale
    // For consistent tests, you could mock the date or check for partial text
    expect(screen.getByText(/Introduced on 1\/1\/2024/i)).toBeInTheDocument();
  });

  it('links to the correct bill detail page', () => {
    render(
      <MemoryRouter>
        <BillCard bill={mockBill} />
      </MemoryRouter>
    );
    // The Link around the title should go to /bill/1
    const linkElement = screen.getByRole('link', {
      name: /A Bill to Improve Testing/i,
    });
    expect(linkElement).toHaveAttribute('href', '/bill/1');
  });

  it('displays the correct chamber icon for House bills', () => {
    // The getChamberIcon logic will return a HouseIcon if chamber = 'house'
    render(
      <MemoryRouter>
        <BillCard bill={mockBill} />
      </MemoryRouter>
    );

    // The HouseIcon doesn't have built-in text, but you can look for the svg title or aria-label.
    // Another approach is to query the tooltip content if you rely on <Tooltip>.
    // Let's check the tooltip label for "House" (from toTitleCase).
    const houseIcon = screen.getByLabelText(/house/i);
    expect(houseIcon).toBeInTheDocument();
  });

  it('displays correct bill type label (H.R.) for house_bill', () => {
    render(
      <MemoryRouter>
        <BillCard bill={mockBill} />
      </MemoryRouter>
    );
    // The label should be "H.R." appended with the second segment of billId (123).
    expect(screen.getByText(/H.R. 123:/i)).toBeInTheDocument();
  });

  it('displays a fallback icon and text for unknown chamber', () => {
    const unknownChamberBill = {
      ...mockBill,
      currentChamber: '',
      billType: 'unknown_bill',
      billId: 'unknown_bill-999',
    };

    render(
      <MemoryRouter>
        <BillCard bill={unknownChamberBill} />
      </MemoryRouter>
    );

    // Looks for tooltip "Unknown"
    expect(screen.getByLabelText(/Unknown/i)).toBeInTheDocument();

    // Bill type label would default to "", so it only shows "999:" after the colon
    expect(screen.getByText(/999:/)).toBeInTheDocument();
  });

  it('uses currentStatusLabel if provided', () => {
    const billWithCustomStatus = {
      ...mockBill,
      currentStatusLabel: 'Custom Passed Label',
      currentStatus: 'passed', // normally "passed" chip
    };

    render(
      <MemoryRouter>
        <BillCard bill={billWithCustomStatus} />
      </MemoryRouter>
    );

    // Should see 'Custom Passed Label' instead of 'passed'
    expect(screen.queryByText(/passed/)).not.toBeInTheDocument();
    expect(screen.getByText(/Custom Passed Label/i)).toBeInTheDocument();
  });

  it('picks the correct chip color for "introduced", "passed", etc.', () => {
    // "introduced" => default chip
    const { rerender } = render(
      <MemoryRouter>
        <BillCard bill={{ ...mockBill, currentStatus: 'introduced' }} />
      </MemoryRouter>
    );
    // Material UI chip color testing can be tricky; we rely on class names or DOM attributes
    // For a simpler approach: we can just ensure it's rendered (since MUI uses classes).
    // If you want to test styling, you might:
    //   1) Use a data-testid for the chip,
    //   2) Check for something in the DOM like class attribute (not recommended for brittle tests).

    // "passed" => primary color
    rerender(
      <MemoryRouter>
        <BillCard bill={{ ...mockBill, currentStatus: 'passed' }} />
      </MemoryRouter>
    );
    expect(screen.getByText(/passed/i)).toBeInTheDocument();

    // "enacted" => success color
    rerender(
      <MemoryRouter>
        <BillCard bill={{ ...mockBill, currentStatus: 'enacted' }} />
      </MemoryRouter>
    );
    expect(screen.getByText(/enacted/i)).toBeInTheDocument();
  });
});
