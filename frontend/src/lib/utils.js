// Shared frontend utilities (moved out of the old mock-data module).

export function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export const BLOOD_GROUPS_FALLBACK = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
