import { ONLINE_THRESHOLD_MS } from "@/features/users/constants";

/**
 * Computes whether a user is currently online based on their last_seen_at timestamp.
 * A user is considered online if they were seen within the last 2 minutes.
 *
 * @param lastSeenAt - The user's last_seen_at timestamp, or null if never seen
 * @returns true if the user was active within the last 2 minutes, false otherwise
 */
export function isOnline(lastSeenAt: Date | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt.getTime() < ONLINE_THRESHOLD_MS;
}
