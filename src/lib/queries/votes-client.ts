import type { VoteAggregation, UserVoteStatus, VoteType } from "@/types";

export function billVotesQueryKey(billId: number) {
  return ["bill-votes", billId] as const;
}

export function userVoteQueryKey(billId: number, userId: string | null) {
  return ["user-vote", billId, userId] as const;
}

export async function fetchBillVotes(
  billId: number,
  signal?: AbortSignal,
): Promise<VoteAggregation> {
  const res = await fetch(`/api/votes/${billId}`, { signal });
  if (!res.ok) throw new Error("Failed to load votes");
  return res.json();
}

export async function fetchUserVote(
  billId: number,
  signal?: AbortSignal,
): Promise<UserVoteStatus> {
  const res = await fetch(`/api/votes/${billId}/user`, { signal });
  if (!res.ok) throw new Error("Failed to load your vote");
  return res.json();
}

export async function submitVote(
  billId: number,
  voteType: VoteType,
): Promise<void> {
  const res = await fetch("/api/votes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ billId, voteType }),
  });
  if (!res.ok) throw new Error("Failed to record vote");
}

export interface BillComment {
  id: string;
  content: string;
  username: string;
  createdAt: string;
  parentId: string | null;
  score: number;
}

export function billCommentsQueryKey(billId: number) {
  return ["bill-comments", billId] as const;
}

export async function fetchBillComments(
  billId: number,
  signal?: AbortSignal,
): Promise<{ comments: BillComment[] }> {
  const res = await fetch(`/api/comments/${billId}`, { signal });
  if (!res.ok) throw new Error("Failed to load comments");
  return res.json();
}
