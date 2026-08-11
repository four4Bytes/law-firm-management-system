export function diffNewAssigneeIds(
  incoming: string[] | undefined,
  existingIds: string[],
): string[] {
  return incoming ? incoming.filter((id) => !existingIds.includes(id)) : [];
}
