export interface AssignmentRecipientsPayload {
  directUserIds?: string[];
  entityId?: string;
  getExistingDirectUserIds?: (entityId: string) => Promise<string[]>;
}

export function diffNewAssigneeIds(
  incoming: string[] | undefined,
  existingIds: string[],
): string[] {
  return incoming ? incoming.filter((id) => !existingIds.includes(id)) : [];
}

export async function resolveAssignmentRecipients(
  payload: AssignmentRecipientsPayload,
): Promise<string[]> {
  const { directUserIds, entityId, getExistingDirectUserIds } = payload;

  if (directUserIds !== undefined) return directUserIds;

  if (entityId && getExistingDirectUserIds) {
    return getExistingDirectUserIds(entityId);
  }

  return [];
}
