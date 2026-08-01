import { getActiveUserIdsByRoles } from "@/features/users/queries";
import { notificationRoleConfig } from "@/lib/notification-config";

export async function getRoleRecipientIds(
  type: keyof typeof notificationRoleConfig,
): Promise<string[]> {
  return getActiveUserIdsByRoles({ roles: notificationRoleConfig[type] });
}

export interface AssignmentRecipientsPayload {
  type: keyof typeof notificationRoleConfig;
  directUserIds?: string[];
  entityId?: string;
  getExistingDirectUserIds?: (entityId: string) => Promise<string[]>;
}

export async function resolveAssignmentRecipients(
  payload: AssignmentRecipientsPayload,
): Promise<string[]> {
  const { type, directUserIds, entityId, getExistingDirectUserIds } = payload;

  const roleIds = await getRoleRecipientIds(type);

  const direct = directUserIds?.length
    ? directUserIds
    : entityId && getExistingDirectUserIds
      ? await getExistingDirectUserIds(entityId)
      : [];

  return [...new Set([...roleIds, ...direct])];
}
