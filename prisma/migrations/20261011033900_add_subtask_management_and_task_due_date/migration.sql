-- CreateEnum
CREATE TYPE "SubtaskStatus" AS ENUM ('Pending', 'InProgress', 'Done');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "due_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Subtask" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SubtaskStatus" NOT NULL DEFAULT 'Pending',
    "due_date" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3),
    "completed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

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
CREATE INDEX "Subtask_task_id_due_date_idx" ON "Subtask"("task_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "SubtaskAssignment_subtask_id_user_id_key" ON "SubtaskAssignment"("subtask_id", "user_id");

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtaskAssignment" ADD CONSTRAINT "SubtaskAssignment_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "Subtask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtaskAssignment" ADD CONSTRAINT "SubtaskAssignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
