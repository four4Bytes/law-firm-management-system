/**
 * Centralized mapping of notification types to recipient roles.
 *
 * Changing the roles here updates who receives each type of notification
 * across the entire application — no need to hunt through individual
 * action files.
 */

import { NotificationType, Role } from "@/generated/prisma/browser";

export const notificationRoleConfig = {
  [NotificationType.ConsultationCreated]: [Role.Admin, Role.BranchManager],
  [NotificationType.ConsultationUpdated]: [Role.Admin, Role.BranchManager],
};
