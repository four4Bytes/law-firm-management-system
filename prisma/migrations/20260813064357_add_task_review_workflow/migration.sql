/*
  Warnings:

  - The values [Ongoing,Accepted,Rejected] on the enum `TaskStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `delegated_by_userid` on the `TaskReviewer` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `TaskReviewer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[task_id,reviewer_user_id]` on the table `TaskReviewer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('Pending', 'Accepted', 'Rejected');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TaskStatusChanged';

-- AlterEnum
BEGIN;
CREATE TYPE "TaskStatus_new" AS ENUM ('Pending', 'Submitted', 'Completed', 'Cancelled');
ALTER TABLE "public"."Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'Pending';
COMMIT;

-- DropForeignKey
ALTER TABLE "TaskReviewer" DROP CONSTRAINT "TaskReviewer_delegated_by_userid_fkey";

-- DropIndex
DROP INDEX "TaskReviewer_task_id_is_active_idx";

-- AlterTable
ALTER TABLE "TaskReviewer" DROP COLUMN "delegated_by_userid",
DROP COLUMN "is_active",
ADD COLUMN     "decision" "ReviewDecision" NOT NULL DEFAULT 'Pending',
ADD COLUMN     "reviewed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TaskReviewer_reviewer_user_id_decision_idx" ON "TaskReviewer"("reviewer_user_id", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "TaskReviewer_task_id_reviewer_user_id_key" ON "TaskReviewer"("task_id", "reviewer_user_id");
