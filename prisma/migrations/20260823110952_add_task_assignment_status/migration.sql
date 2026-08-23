-- CreateEnum
CREATE TYPE "TaskAssignmentStatus" AS ENUM ('Pending', 'Submitted');

-- AlterTable
ALTER TABLE "TaskAssignment" ADD COLUMN     "status" "TaskAssignmentStatus" NOT NULL DEFAULT 'Pending';

-- CreateIndex
CREATE INDEX "TaskAssignment_task_id_status_idx" ON "TaskAssignment"("task_id", "status");
