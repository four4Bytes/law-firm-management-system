-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "priority" TEXT;

-- AlterTable
ALTER TABLE "Subtask" DROP COLUMN "priority";
