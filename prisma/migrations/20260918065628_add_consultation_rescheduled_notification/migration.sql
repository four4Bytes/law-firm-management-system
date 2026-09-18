-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ConsultationRescheduled';

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "notify_email_consultation_rescheduled" BOOLEAN NOT NULL DEFAULT true;
