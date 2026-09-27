import type { UserSummary } from "@/features/users/types";

export interface UserDirectoryMerge {
  directory: UserSummary[];
  selectedIds: Set<string>;
  snapshot: { id: string; name: string }[];
}

export function mergeMissingUsers(payload: UserDirectoryMerge): UserSummary[] {
  const { directory, selectedIds, snapshot } = payload;
  const directoryIds = new Set(directory.map((user) => user.id));
  const missing = snapshot
    .filter((user) => selectedIds.has(user.id) && !directoryIds.has(user.id))
    .map((user) => ({ ...user, is_online: false }));
  return [...directory, ...missing];
}
