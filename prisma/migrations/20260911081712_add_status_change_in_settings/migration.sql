-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "notify_email_case_status_changed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_email_consultation_status_changed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_email_milestone_status_changed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_email_task_status_changed" BOOLEAN NOT NULL DEFAULT true;
