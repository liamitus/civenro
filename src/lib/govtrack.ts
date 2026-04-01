import axios from "axios";

const BASE_URL = "https://www.govtrack.us/api/v2";

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGovTrackBills(params: Record<string, unknown>) {
  const response = await axios.get(`${BASE_URL}/bill`, { params });
  return response.data.objects;
}

export async function fetchGovTrackBill(govtrackId: number) {
  const response = await axios.get(`${BASE_URL}/bill/${govtrackId}`);
  return response.data;
}

export async function fetchGovTrackRoles(params: Record<string, unknown>) {
  const response = await axios.get(`${BASE_URL}/role`, { params });
  return response.data.objects;
}

export async function fetchGovTrackVoteVoters(
  params: Record<string, unknown>
) {
  const response = await axios.get(`${BASE_URL}/vote_voter`, { params });
  return response.data.objects;
}
