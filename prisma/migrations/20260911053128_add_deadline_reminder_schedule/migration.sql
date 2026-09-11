/*
  Warnings:

  - You are about to drop the column `reminder_days` on the `CaseMilestone` table. All the data in the column will be lost.
  - You are about to drop the column `reminder_days` on the `Consultation` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('KeyDays', 'Daily');

-- AlterTable
ALTER TABLE "CaseMilestone" DROP COLUMN "reminder_days";

-- AlterTable
ALTER TABLE "Consultation" DROP COLUMN "reminder_days";

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "consultation_notify_overdue" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "consultation_reminder_days" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "consultation_reminder_frequency" "ReminderFrequency" NOT NULL DEFAULT 'KeyDays',
ADD COLUMN     "milestone_notify_overdue" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "milestone_reminder_days" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "milestone_reminder_frequency" "ReminderFrequency" NOT NULL DEFAULT 'KeyDays';
