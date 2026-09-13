/*
  Warnings:

  - The values [Accepted] on the enum `ReviewDecision` will be removed. If these variants are still used in the database, this will fail.
  - The values [Pending,Submitted] on the enum `TaskAssignmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [Pending,Submitted,Completed,Cancelled] on the enum `TaskStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReviewDecision_new" AS ENUM ('Pending', 'Approved', 'Rejected');
ALTER TABLE "public"."TaskReviewer" ALTER COLUMN "decision" DROP DEFAULT;
ALTER TABLE "TaskReviewer" ALTER COLUMN "decision" TYPE "ReviewDecision_new" USING ("decision"::text::"ReviewDecision_new");
ALTER TYPE "ReviewDecision" RENAME TO "ReviewDecision_old";
ALTER TYPE "ReviewDecision_new" RENAME TO "ReviewDecision";
DROP TYPE "public"."ReviewDecision_old";
ALTER TABLE "TaskReviewer" ALTER COLUMN "decision" SET DEFAULT 'Pending';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TaskAssignmentStatus_new" AS ENUM ('Todo', 'Done');
ALTER TABLE "public"."TaskAssignment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "TaskAssignment" ALTER COLUMN "status" TYPE "TaskAssignmentStatus_new" USING ("status"::text::"TaskAssignmentStatus_new");
ALTER TYPE "TaskAssignmentStatus" RENAME TO "TaskAssignmentStatus_old";
ALTER TYPE "TaskAssignmentStatus_new" RENAME TO "TaskAssignmentStatus";
DROP TYPE "public"."TaskAssignmentStatus_old";
ALTER TABLE "TaskAssignment" ALTER COLUMN "status" SET DEFAULT 'Todo';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TaskStatus_new" AS ENUM ('Todo', 'InReview', 'Done');
ALTER TABLE "public"."Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'Todo';
COMMIT;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'Todo';

-- AlterTable
ALTER TABLE "TaskAssignment" ALTER COLUMN "status" SET DEFAULT 'Todo';
