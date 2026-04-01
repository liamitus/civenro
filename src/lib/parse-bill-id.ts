const BILL_TYPE_MAP: Record<string, string> = {
  house_bill: "hr",
  senate_bill: "s",
  house_concurrent_resolution: "hconres",
  house_joint_resolution: "hjres",
  house_resolution: "hres",
  senate_concurrent_resolution: "sconres",
  senate_joint_resolution: "sjres",
  senate_resolution: "sres",
};

/**
 * Parses a billId like "house_bill-30-119" into components for the Congress.gov API.
 */
export function parseBillId(billId: string): {
  congress: number | null;
  apiBillType: string | null;
  billNumber: number | null;
} {
  try {
    const parts = billId.split("-");
    if (parts.length < 3) {
      return { congress: null, apiBillType: null, billNumber: null };
    }

    const [billTypeRaw, numberRaw, congressRaw] = parts;
    const apiBillType = BILL_TYPE_MAP[billTypeRaw] || null;
    const billNumber = parseInt(numberRaw, 10) || null;
    const congress = parseInt(congressRaw, 10) || null;

    return { congress, apiBillType, billNumber };
  } catch {
    return { congress: null, apiBillType: null, billNumber: null };
  }
}
