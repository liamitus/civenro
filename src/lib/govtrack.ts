import axios from "axios";
import { withRetry } from "./congress-api";

const govtrackClient = axios.create({
  baseURL: "https://www.govtrack.us/api/v2",
  timeout: 15_000,
});

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGovTrackBills(params: Record<string, unknown>) {
  const response = await withRetry(() => govtrackClient.get("/bill", { params }));
  return response.data.objects;
}

export async function fetchGovTrackBill(govtrackId: number) {
  const response = await withRetry(() => govtrackClient.get(`/bill/${govtrackId}`));
  return response.data;
}

export async function fetchGovTrackRoles(params: Record<string, unknown>) {
  const response = await withRetry(() => govtrackClient.get("/role", { params }));
  return response.data.objects;
}

export async function fetchGovTrackVoteVoters(
  params: Record<string, unknown>
) {
  const response = await withRetry(() => govtrackClient.get("/vote_voter", { params }));
  return response.data.objects;
}
