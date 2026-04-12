// Shared types used across client and server

export interface BillSummary {
  id: number;
  billId: string;
  title: string;
  date: string;
  billType: string;
  currentChamber: string | null;
  currentStatus: string;
  currentStatusDate: string;
  introducedDate: string;
  link: string;
  shortText: string | null;
}

export interface BillDetail extends BillSummary {
  fullText: string | null;
}

export interface BillListResponse {
  total: number;
  page: number;
  pageSize: number;
  bills: BillSummary[];
}

export interface RepresentativeInfo {
  id: number;
  bioguideId: string;
  firstName: string;
  lastName: string;
  state: string;
  district: string | null;
  party: string;
  chamber: string;
  imageUrl: string | null;
  link: string | null;
}

export interface RepVoteHistoryEntry {
  vote: string;
  rollCallNumber: number | null;
  chamber: string | null;
  votedAt: string | null;
}

export interface RepresentativeWithVote extends RepresentativeInfo {
  name: string;
  vote: string;
  voteHistory: RepVoteHistoryEntry[] | null;
}

export interface VersionInfo {
  id: number;
  versionCode: string;
  versionType: string;
  versionDate: string;
}

export interface RollCallVote {
  rollCallNumber: number | null;
  chamber: string | null;
  votedAt: string | null;
  votes: { vote: string; count: number }[];
}

export interface VoteAggregation {
  publicVotes: { voteType: string; count: number }[];
  congressionalVotes: { vote: string; count: number }[];
  rollCalls: RollCallVote[];
  latestVersion: VersionInfo | null;
}

export interface UserVoteStatus {
  vote: { voteType: VoteType; textVersionId: number | null; votedAt: string } | null;
  isStale: boolean;
  staleInfo: {
    votedOnVersion: { versionCode: string; versionType: string; versionDate: string } | null;
    currentVersion: { versionCode: string; versionType: string; versionDate: string };
    changeSummary: string | null;
  } | null;
  voteHistory: {
    voteType: string;
    createdAt: string;
    versionCode: string | null;
    versionType: string | null;
  }[];
}

export interface CommentData {
  id: number;
  content: string;
  userId: string | null;
  username: string;
  billId: number;
  parentCommentId: number | null;
  date: string;
  voteCount: number;
  replies: CommentData[];
  bill?: { id: number; title: string };
}

export interface ConversationMessage {
  sender: string;
  text: string;
  createdAt: string;
}

export type VoteType = "For" | "Against" | "Abstain";

export interface RepVoteRecord {
  billId: number;
  billSlug: string;
  title: string;
  date: string;
  repVote: string;
  link: string;
}

export interface RepVotingStats {
  totalVotes: number;
  missedVotes: number;
  missedVotePct: number;
  yeaCount: number;
  nayCount: number;
}

export interface RepresentativeDetailResponse {
  representative: RepresentativeInfo;
  votingRecord: RepVoteRecord[];
  userVotes: Record<number, string> | null;
  stats: RepVotingStats;
}
