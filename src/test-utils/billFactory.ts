// test-utils/billFactory.ts

type Bill = {
  id: number;
  billId: string;
  title: string;
  date: string;
  billType: string;
  currentChamber: string;
  currentStatus: string;
  currentStatusDate: string;
  currentStatusLabel: string;
  introducedDate: string;
  link: string;
};

export const makeBill = (overrides?: Partial<Bill>): Bill => {
  return {
    id: 1,
    billId: 'house_bill-123',
    title: 'Default Bill Title',
    date: '2024-01-01T00:00:00.000Z',
    billType: 'house_bill',
    currentChamber: 'house',
    currentStatus: 'introduced',
    currentStatusDate: '2024-01-02T00:00:00.000Z',
    currentStatusLabel: 'H.R. 123: Default Bill Title',
    introducedDate: '2024-01-01T12:00:00.000Z',
    link: 'https://example.com/bills/house_bill-123',
    ...overrides,
  };
};
