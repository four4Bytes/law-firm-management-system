-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MilestoneDueDateChanged';

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "notify_email_milestone_rescheduled" BOOLEAN NOT NULL DEFAULT true;
