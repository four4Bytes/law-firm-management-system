/*
  Warnings:

  - You are about to drop the `MilestoneNotification` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ConsultationCreated', 'ConsultationUpdated', 'ConsultationReminder', 'MilestoneDueSoon', 'MilestoneCompleted', 'MilestoneOverdue', 'TaskAssigned', 'TaskStatusChanged', 'CaseAssigned');

-- DropForeignKey
ALTER TABLE "MilestoneNotification" DROP CONSTRAINT "MilestoneNotification_milestone_id_fkey";

-- DropForeignKey
ALTER TABLE "MilestoneNotification" DROP CONSTRAINT "MilestoneNotification_user_id_fkey";

-- DropTable
DROP TABLE "MilestoneNotification";

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "action_url" TEXT,
    "case_id" UUID,
    "consultation_id" UUID,
    "milestone_id" UUID,
    "task_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_user_id_is_read_created_at_idx" ON "Notification"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "Notification_user_id_created_at_idx" ON "Notification"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "CaseMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
