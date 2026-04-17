import type { CommentData } from "@/types";

export interface UserCommentsPage {
  comments: CommentData[];
  total: number;
  page: number;
  pageSize: number;
}

export function userCommentsQueryKey(userId: string) {
  return ["user-comments", userId] as const;
}

export async function fetchUserCommentsPage(
  userId: string,
  page: number,
  signal?: AbortSignal,
): Promise<UserCommentsPage> {
  const res = await fetch(`/api/comments/user/${userId}?page=${page}`, {
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to load your comments (${res.status})`);
  }
  return res.json();
}

export interface DonationRow {
  id: string;
  amountCents: number;
  currency: string;
  isRecurring: boolean;
  recurringStatus: string | null;
  displayMode: string;
  displayName: string | null;
  tributeName: string | null;
  createdAt: string;
  hiddenAt: string | null;
}

export function donationsQueryKey(userId: string) {
  return ["donations", userId] as const;
}

export async function fetchDonations(
  signal?: AbortSignal,
): Promise<{ donations: DonationRow[] }> {
  const res = await fetch(`/api/account/donations`, { signal });
  if (!res.ok) throw new Error("Failed to load donations");
  return res.json();
}

export async function mutateDonation(
  donationId: string,
  action: "anonymize" | "hide",
): Promise<void> {
  const res = await fetch(`/api/account/donations`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ donationId, action }),
  });
  if (!res.ok) throw new Error(`Donation ${action} failed`);
}
