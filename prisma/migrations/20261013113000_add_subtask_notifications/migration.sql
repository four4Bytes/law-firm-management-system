-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SubtaskAssigned';
ALTER TYPE "NotificationType" ADD VALUE 'SubtaskCompleted';

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "notify_email_subtask_assigned" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_settings" ADD COLUMN     "notify_email_subtask_completed" BOOLEAN NOT NULL DEFAULT true;
