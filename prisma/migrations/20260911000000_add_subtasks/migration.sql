-- CreateEnum
CREATE TYPE "SubtaskStatus" AS ENUM ('Pending', 'InProgress', 'Completed', 'Cancelled');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SubtaskDueSoon';
ALTER TYPE "NotificationType" ADD VALUE 'SubtaskOverdue';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "subtask_id" UUID;

-- CreateTable
CREATE TABLE "Subtask" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SubtaskStatus" NOT NULL DEFAULT 'Pending',
    "priority" TEXT,
    "due_date" TIMESTAMP(3),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reminder_days" INTEGER,
    "last_reminded_at" TIMESTAMP(3),

    CONSTRAINT "Subtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtaskAssignment" (
    "id" UUID NOT NULL,
    "subtask_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubtaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subtask_task_id_updated_at_idx" ON "Subtask"("task_id", "updated_at");

-- CreateIndex
CREATE INDEX "Subtask_status_due_date_idx" ON "Subtask"("status", "due_date");

-- CreateIndex
CREATE INDEX "SubtaskAssignment_subtask_id_idx" ON "SubtaskAssignment"("subtask_id");

-- CreateIndex
CREATE UNIQUE INDEX "SubtaskAssignment_subtask_id_user_id_key" ON "SubtaskAssignment"("subtask_id", "user_id");

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtaskAssignment" ADD CONSTRAINT "SubtaskAssignment_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "Subtask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtaskAssignment" ADD CONSTRAINT "SubtaskAssignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "Subtask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
