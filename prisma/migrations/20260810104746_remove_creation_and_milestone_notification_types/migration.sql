/*
  Warnings:

  - The values [ConsultationCreated,MilestoneCompleted,MilestoneUpdated] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('ConsultationReminder', 'ConsultationOverdue', 'MilestoneDueSoon', 'MilestoneStatusChanged', 'MilestoneOverdue', 'TaskAssigned', 'CaseAssigned', 'ConsultationAssigned');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;
